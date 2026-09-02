#!/usr/bin/env python3
"""OrthoFlow Auto Curator V1.

- scan_one: scan Supabase and generate one missing concrete Procedure draft.
- pfna_test: force-generate a PFNA draft for quality comparison, without using PFNA gold content.

All AI output is a draft. Nothing is published automatically.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from jsonschema import validate
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).resolve().parents[1]
SKILL_PATH = ROOT / "autocurator" / "skills" / "ORTHOFLOW_AUTOCURATOR_SKILL_V1.md"
GOLD_PATH = ROOT / "autocurator" / "skills" / "gold_examples" / "TIBIAL_PLATEAU_ORIF_GOLD_STRUCTURE.json"
SCHEMA_PATH = ROOT / "autocurator" / "schema" / "curator_response.schema.json"
OUTPUT_DIR = ROOT / "autocurator_output"

MODEL = os.getenv("AUTOCURATOR_MODEL", "deepseek-v4-flash")


def need_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def supabase_headers() -> dict[str, str]:
    # New Supabase sb_secret_* keys should be sent in the apikey header, not as Bearer JWT.
    return {
        "apikey": need_env("SUPABASE_SECRET_KEY"),
        "Content-Type": "application/json",
        "User-Agent": "orthoflow-auto-curator/1.0",
    }


def sb_get(path: str, params: dict[str, Any] | None = None) -> Any:
    url = need_env("SUPABASE_URL").rstrip("/") + "/rest/v1/" + path.lstrip("/")
    r = requests.get(url, headers=supabase_headers(), params=params, timeout=45)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase GET failed {r.status_code}: {r.text[:1000]}")
    return r.json()


def sb_post(path: str, payload: Any, prefer: str = "return=representation") -> Any:
    url = need_env("SUPABASE_URL").rstrip("/") + "/rest/v1/" + path.lstrip("/")
    headers = supabase_headers()
    headers["Prefer"] = prefer
    r = requests.post(url, headers=headers, json=payload, timeout=45)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase POST failed {r.status_code}: {r.text[:1200]}")
    if not r.text.strip():
        return None
    return r.json()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sanitize_disease(row: dict[str, Any]) -> dict[str, Any]:
    data = row.get("data") or {}
    keep = {
        "id", "name", "englishName", "searchKeywords", "learningSummary",
        "imagingGuide", "classifications", "surgeryTable", "decisionFlow",
        "rehabPlan", "procedureRefs"
    }
    clean = {k: data.get(k) for k in keep if k in data}
    clean["viewCount"] = int(row.get("view_count") or data.get("viewCount") or 0)
    return clean


def procedure_related_to(proc: dict[str, Any], disease_id: str) -> bool:
    data = proc.get("data") or {}
    return disease_id in (data.get("relatedDiseaseIds") or [])


def is_placeholder(proc_id: str, disease_id: str) -> bool:
    return proc_id == f"{disease_id}_surgery_pro" or proc_id.endswith("_surgery_pro")


def concrete_procedures_for(disease: dict[str, Any], procedures: list[dict[str, Any]]) -> list[str]:
    did = disease.get("id", "")
    ids: set[str] = set()
    for ref in disease.get("procedureRefs") or []:
        pid = (ref or {}).get("id", "")
        if pid and not is_placeholder(pid, did):
            ids.add(pid)
    for proc in procedures:
        pid = proc.get("id", "")
        if pid and procedure_related_to(proc, did) and not is_placeholder(pid, did):
            ids.add(pid)
    return sorted(ids)


def pending_disease_ids() -> set[str]:
    try:
        rows = sb_get("auto_curator_drafts", {
            "select": "disease_id,status",
            "status": "eq.pending_review",
        })
        return {r["disease_id"] for r in rows}
    except RuntimeError as exc:
        if "auto_curator_drafts" in str(exc):
            raise RuntimeError(
                "Auto Curator tables are not installed. Run supabase/10_auto_curator_v1.sql first."
            ) from exc
        raise


def pick_missing_disease(diseases: list[dict[str, Any]], procedures: list[dict[str, Any]]) -> dict[str, Any] | None:
    pending = pending_disease_ids()
    candidates = []
    for row in diseases:
        d = sanitize_disease(row)
        did = d.get("id")
        if not did or not d.get("name") or did in pending:
            continue
        if concrete_procedures_for(d, procedures):
            continue
        candidates.append(d)
    candidates.sort(key=lambda x: (-int(x.get("viewCount", 0)), x.get("name", "")))
    return candidates[0] if candidates else None


def find_pfna_disease(diseases: list[dict[str, Any]]) -> dict[str, Any]:
    needles = ["股骨转子间", "股骨粗隆间", "intertrochanteric", "pertrochanteric"]
    for row in diseases:
        d = sanitize_disease(row)
        hay = " ".join(str(d.get(k, "")) for k in ("id", "name", "englishName", "searchKeywords")).lower()
        if any(n.lower() in hay for n in needles):
            return d
    raise RuntimeError("PFNA test: could not find intertrochanteric/pertrochanteric fracture disease.")


def build_prompt(disease: dict[str, Any], mode: str, existing: list[str]) -> str:
    skill = SKILL_PATH.read_text(encoding="utf-8")
    gold = GOLD_PATH.read_text(encoding="utf-8")
    special = ""
    if mode == "pfna_test":
        special = """
### 本次盲测任务
请为该疾病独立生成 **PFNA / Proximal Femoral Nail Antirotation** Procedure 草稿。
这是质量对比测试：你没有得到任何 PFNA Gold Example，因此不要提及或猜测人工 PFNA 模板内容。
procedure.id 固定使用：intertrochanteric_pfna_ai_test
procedure.name 使用：PFNA 内固定术
"""
    else:
        special = """
### 本次自动补全任务
判断该疾病是否应建立一个具体 Procedure。
若适合，从临床常见性与规培学习价值出发，只选择 1 个最基础、最值得优先建立的具体手术。
若无法安全选择，返回 needs_human_selection；若该病通常不应为了页面而强行建立手术，返回 no_procedure_recommended。
"""

    return f"""
你是 OrthoFlow Auto Curator。严格执行以下 Skill。

===== SKILL =====
{skill}
===== END SKILL =====

下面是一个不同疾病的 Gold Example。它只用于学习 JSON 结构、文字粒度和安全措辞；
严禁复制其中任何具体解剖、入路、器械或复位事实到本疾病。

===== GOLD STRUCTURE EXAMPLE =====
{gold}
===== END GOLD =====

当前疾病数据：
{json.dumps(disease, ensure_ascii=False, indent=2)}

当前已知具体 Procedures：
{json.dumps(existing, ensure_ascii=False)}

{special}

额外硬规则：
1. 输出必须符合给定 JSON Schema。
2. action=create_procedure 时，procedure.relatedDiseaseIds 必须只包含当前疾病 id：{disease.get('id')}。
3. reviewStatus 必须为 draft；contentStatus 必须为 ai_draft。
4. 不能联网核验的精确阈值、固定周数、指南级强结论不要装作已核验；放到 reviewFlags。
5. 不编造来源、PMID、DOI、URL。
6. 不写患者个体信息。
""".strip()


def deepseek_structured(prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
    """Call DeepSeek in JSON mode, then let local jsonschema enforce the exact schema."""
    api_key = need_env("DEEPSEEK_API_KEY")
    url = "https://api.deepseek.com/chat/completions"

    # DeepSeek JSON mode guarantees valid JSON, but it does not enforce our JSON Schema.
    # Therefore the schema is included in the prompt and validated again locally.
    schema_text = json.dumps(schema, ensure_ascii=False)
    user_prompt = f"""{prompt}

你必须只输出 JSON object，不要输出 Markdown 代码块或解释文字。
最终 JSON 必须符合下面的 JSON Schema：
{schema_text}
"""

    body = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是 OrthoFlow Auto Curator。你必须输出严格 JSON。"
                    "不要编造来源，不要把未经核验的医疗细节写成确定结论。"
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "thinking": {"type": "enabled"},
        "temperature": 0.2,
        "max_tokens": 24000,
    }

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            r = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "orthoflow-auto-curator/1.1",
                },
                json=body,
                timeout=240,
            )
            if r.status_code >= 400:
                raise RuntimeError(f"DeepSeek API failed {r.status_code}: {r.text[:1800]}")

            raw = r.json()
            try:
                choice = raw["choices"][0]
                text = choice["message"]["content"]
                finish_reason = choice.get("finish_reason")
            except Exception as exc:
                raise RuntimeError(
                    f"Unexpected DeepSeek response: {json.dumps(raw, ensure_ascii=False)[:1800]}"
                ) from exc

            if finish_reason == "length":
                raise RuntimeError("DeepSeek output was truncated (finish_reason=length).")
            if not isinstance(text, str) or not text.strip():
                raise RuntimeError("DeepSeek returned empty content in JSON mode.")

            result = json.loads(text)
            validate(instance=result, schema=schema)
            return result
        except (RuntimeError, json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            if attempt < 2:
                print(f"DeepSeek structured output retry {attempt + 1}/2: {exc}", file=sys.stderr)
                continue
            raise RuntimeError(f"DeepSeek structured output failed after 3 attempts: {exc}") from exc

    raise RuntimeError(f"DeepSeek structured output failed: {last_error}")


def review_and_revise(first: dict[str, Any], disease: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    # A second independent pass improves consistency without pretending to be evidence verification.
    prompt = f"""
你是 OrthoFlow Auto Curator 的第二遍医学结构审稿器。
你不能联网检索，因此你的任务不是宣称证据已核验，而是发现明显遗漏、内部矛盾、过度精确和危险的强结论。

疾病：{disease.get('name')} / {disease.get('englishName')}

第一遍草稿：
{json.dumps(first, ensure_ascii=False, indent=2)}

请返回同一个 Curator JSON 结构，并完成以下工作：
- 保留合理内容；
- 修正明显结构错误或内部矛盾；
- 对危险解剖、具体阈值、固定时间、品牌特异器械动作增加 high reviewFlag；
- 不新增虚构来源；
- 不能确认的内容用谨慎措辞；
- action=create_procedure 时 reviewStatus=draft、contentStatus=ai_draft。
""".strip()
    return deepseek_structured(prompt, schema)


def normalize_and_validate(result: dict[str, Any], disease: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    validate(instance=result, schema=schema)
    if result.get("action") == "create_procedure":
        proc = result["procedure"]
        proc["relatedDiseaseIds"] = [disease["id"]]
        proc["reviewStatus"] = "draft"
        proc["contentStatus"] = "ai_draft"
        proc["engineVersion"] = "procedure-engine-v1"
        proc["autoCuratorVersion"] = "auto-curator-v1"
        proc["autoCuratorModel"] = MODEL
        proc["generatedAt"] = datetime.now(timezone.utc).isoformat()
        # Basic ID safety. Do not allow arbitrary punctuation in procedure IDs.
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", proc.get("id", "")):
            raise RuntimeError(f"Unsafe procedure id returned by model: {proc.get('id')}")
    return result


def save_artifact(result: dict[str, Any], mode: str, disease: dict[str, Any]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    p = OUTPUT_DIR / f"{mode}_{disease['id']}_{stamp}.json"
    p.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def save_draft(result: dict[str, Any], disease: dict[str, Any], mode: str) -> Any:
    proc = result.get("procedure") or {}
    row = {
        "disease_id": disease["id"],
        "disease_name": disease["name"],
        "candidate_procedure_id": proc.get("id"),
        "candidate_procedure_name": proc.get("name"),
        "action": result["action"],
        "reason": result.get("reason"),
        "payload": proc if result["action"] == "create_procedure" else None,
        "review_flags": result.get("reviewFlags") or [],
        "model": MODEL,
        "generation_mode": mode,
        "status": "pending_review",
    }
    return sb_post("auto_curator_drafts", row)


def log_run(mode: str, disease: dict[str, Any] | None, outcome: str, detail: dict[str, Any]) -> None:
    try:
        sb_post("auto_curator_runs", {
            "mode": mode,
            "disease_id": (disease or {}).get("id"),
            "disease_name": (disease or {}).get("name"),
            "model": MODEL,
            "outcome": outcome,
            "detail": detail,
        }, prefer="return=minimal")
    except Exception as exc:
        print(f"WARNING: could not write run log: {exc}", file=sys.stderr)


def self_test() -> None:
    schema = load_json(SCHEMA_PATH)
    assert schema["type"] == "object"
    assert SKILL_PATH.exists() and GOLD_PATH.exists()
    fake = {"id": "fake", "name": "测试病", "procedureRefs": [], "viewCount": 0}
    assert concrete_procedures_for(fake, []) == []
    assert is_placeholder("fake_surgery_pro", "fake")
    print("SELF TEST OK")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["scan_one", "pfna_test"], default="scan_one")
    parser.add_argument("--save-draft", action="store_true", help="save result into auto_curator_drafts")
    parser.add_argument("--no-review", action="store_true", help="skip second AI review pass")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    schema = load_json(SCHEMA_PATH)
    try:
        try:
            diseases = sb_get("diseases", {"select": "data,view_count"})
        except RuntimeError:
            diseases = sb_get("diseases", {"select": "data"})
        procedures = sb_get("procedures", {"select": "id,data,is_published,updated_at"})

        if args.mode == "pfna_test":
            disease = find_pfna_disease(diseases)
        else:
            disease = pick_missing_disease(diseases, procedures)
            if not disease:
                print("No disease currently needs a concrete Procedure draft.")
                log_run(args.mode, None, "nothing_to_do", {"message": "No eligible disease"})
                return 0

        existing = concrete_procedures_for(disease, procedures)
        print(f"Target disease: {disease['name']} ({disease['id']})")
        print(f"Existing concrete procedures: {existing or 'none'}")
        print(f"Model: {MODEL}")

        prompt = build_prompt(disease, args.mode, existing)
        first = deepseek_structured(prompt, schema)
        first = normalize_and_validate(first, disease, schema)

        result = first
        if not args.no_review:
            result = review_and_revise(first, disease, schema)
            result = normalize_and_validate(result, disease, schema)

        # PFNA blind-test id is forced after both passes so the reviewer cannot drift.
        if args.mode == "pfna_test" and result.get("action") == "create_procedure":
            result["procedure"]["id"] = "intertrochanteric_pfna_ai_test"
            result["procedure"]["name"] = "PFNA 内固定术（AI盲测草稿）"

        artifact = save_artifact(result, args.mode, disease)
        print(f"Artifact: {artifact.relative_to(ROOT)}")
        print(f"Action: {result['action']}")
        print(f"Review flags: {len(result.get('reviewFlags') or [])}")

        saved = None
        if args.save_draft:
            saved = save_draft(result, disease, args.mode)
            print("Saved to Supabase auto_curator_drafts: YES")
        else:
            print("Saved to Supabase auto_curator_drafts: NO (test/dry-run)")

        log_run(args.mode, disease, "ok", {
            "action": result["action"],
            "artifact": str(artifact.relative_to(ROOT)),
            "savedDraft": bool(args.save_draft),
            "reviewFlags": len(result.get("reviewFlags") or []),
        })
        return 0

    except ValidationError as exc:
        print(f"SCHEMA VALIDATION FAILED: {exc.message}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"AUTO CURATOR FAILED: {exc}", file=sys.stderr)
        try:
            log_run(args.mode, None, "error", {"error": str(exc)[:1000]})
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
