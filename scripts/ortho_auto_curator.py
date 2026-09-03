#!/usr/bin/env python3
"""OrthoFlow Auto Curator V3.1 Content Engine.

V3 expands the scheduler from Procedure-only drafting to three draft types:
- patient_guide
- rehab_contract
- procedure

Principles:
- process the entire existing disease library; viewCount is NOT used for priority;
- build in phases: all Patient Guides -> all Rehab Contracts -> all Procedures;
- each run handles a small batch so failures/cost are easy to control;
- never auto-publish;
- ambiguous/not-applicable tasks are recorded so they are not repeatedly regenerated;
- Procedure generation adapts to procedure category and may leave non-applicable fields empty.
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
SCHEMA_PATH = ROOT / "autocurator" / "schema" / "content_engine_response.schema.json"
OUTPUT_DIR = ROOT / "autocurator_output"

MODEL = os.getenv("AUTOCURATOR_MODEL", "deepseek-v4-flash")
CONTENT_PRIORITY = {"patient_guide": 0, "rehab_contract": 1, "procedure": 2}
CREATE_ACTION = {
    "patient_guide": "create_patient_guide",
    "rehab_contract": "create_rehab_contract",
    "procedure": "create_procedure",
}


def need_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def supabase_headers() -> dict[str, str]:
    return {
        "apikey": need_env("SUPABASE_SECRET_KEY"),
        "Content-Type": "application/json",
        "User-Agent": "orthoflow-auto-curator/3.2",
    }


def sb_get(path: str, params: dict[str, Any] | None = None) -> Any:
    url = need_env("SUPABASE_URL").rstrip("/") + "/rest/v1/" + path.lstrip("/")
    r = requests.get(url, headers=supabase_headers(), params=params, timeout=45)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase GET failed {r.status_code}: {r.text[:1200]}")
    return r.json()


def sb_post(path: str, payload: Any, prefer: str = "return=representation") -> Any:
    url = need_env("SUPABASE_URL").rstrip("/") + "/rest/v1/" + path.lstrip("/")
    headers = supabase_headers()
    headers["Prefer"] = prefer
    r = requests.post(url, headers=headers, json=payload, timeout=45)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase POST failed {r.status_code}: {r.text[:1600]}")
    if not r.text.strip():
        return None
    return r.json()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def disease_from_row(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row.get("data") or {})
    if not data.get("id") and row.get("id"):
        data["id"] = row["id"]
    data["viewCount"] = int(row.get("view_count") or data.get("viewCount") or 0)
    return data


def compact_disease(disease: dict[str, Any]) -> dict[str, Any]:
    keep = {
        "id", "name", "englishName", "searchKeywords", "learningSummary",
        "imagingGuide", "classifications", "surgeryTable", "decisionFlow",
        "rehabPlan", "procedureRefs", "patientGuide", "rehabContract",
        "redFlags", "treatment", "followUp"
    }
    clean = {k: disease.get(k) for k in keep if k in disease}
    clean["viewCount"] = int(disease.get("viewCount") or 0)
    return clean


def procedure_related_to(proc: dict[str, Any], disease_id: str) -> bool:
    data = proc.get("data") or {}
    return disease_id in (data.get("relatedDiseaseIds") or [])


def is_placeholder(proc_id: str, disease_id: str) -> bool:
    return proc_id == f"{disease_id}_surgery_pro" or proc_id.endswith("_surgery_pro")


def related_procedures(disease_id: str, procedures: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [p for p in procedures if procedure_related_to(p, disease_id)]


def concrete_procedure_ids(disease: dict[str, Any], procedures: list[dict[str, Any]]) -> list[str]:
    did = disease.get("id", "")
    ids: set[str] = set()
    for ref in disease.get("procedureRefs") or []:
        if not isinstance(ref, dict):
            continue
        pid = ref.get("id", "")
        if pid and not is_placeholder(pid, did):
            ids.add(pid)
    for proc in related_procedures(did, procedures):
        pid = proc.get("id", "")
        if pid and not is_placeholder(pid, did):
            ids.add(pid)
    return sorted(ids)


def has_patient_guide(disease: dict[str, Any]) -> bool:
    guide = disease.get("patientGuide")
    return isinstance(guide, dict) and bool(guide)


def has_rehab_contract(disease: dict[str, Any], procedures: list[dict[str, Any]]) -> bool:
    contract = disease.get("rehabContract")
    if isinstance(contract, dict) and bool(contract):
        return True
    for proc in related_procedures(disease.get("id", ""), procedures):
        pdata = proc.get("data") or {}
        contract = pdata.get("rehabContract")
        if isinstance(contract, dict) and bool(contract):
            return True
    return False


def pending_pairs() -> set[tuple[str, str]]:
    """Return (disease_id, content_type) for V3 pending drafts.

    Old V1/V2 Procedure rows do not block Patient/Rehab generation.
    V3 uses generation_mode=v3_<content_type>.
    """
    try:
        rows = sb_get("auto_curator_drafts", {
            "select": "disease_id,generation_mode,status",
            "status": "eq.pending_review",
        })
    except RuntimeError as exc:
        if "auto_curator_drafts" in str(exc):
            raise RuntimeError(
                "Auto Curator tables are not installed. Run supabase/10_auto_curator_v1.sql first."
            ) from exc
        raise

    pairs: set[tuple[str, str]] = set()
    for row in rows:
        did = row.get("disease_id")
        mode = row.get("generation_mode") or ""
        if not did:
            continue
        for content_type in CONTENT_PRIORITY:
            if mode == f"v3_{content_type}":
                pairs.add((did, content_type))
    return pairs


def task_candidates(diseases: list[dict[str, Any]], procedures: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build all missing-content tasks without using traffic/viewCount priority.

    Stable ordering is by content phase, then disease name/id. Pending-review rows count
    as already generated for scheduling purposes so repeated runs do not duplicate drafts.
    """
    pending = pending_pairs()
    tasks: list[dict[str, Any]] = []

    for row in diseases:
        d = disease_from_row(row)
        did = d.get("id")
        if not did or not d.get("name"):
            continue

        missing: list[str] = []
        if not has_patient_guide(d):
            missing.append("patient_guide")
        if not has_rehab_contract(d, procedures):
            missing.append("rehab_contract")
        if not concrete_procedure_ids(d, procedures):
            missing.append("procedure")

        for content_type in missing:
            if (did, content_type) in pending:
                continue
            tasks.append({
                "disease": compact_disease(d),
                "contentType": content_type,
                # Kept only for logs/backward compatibility; never used for ordering.
                "viewCount": int(d.get("viewCount") or 0),
            })

    tasks.sort(key=lambda t: (
        CONTENT_PRIORITY[t["contentType"]],
        t["disease"].get("name", ""),
        t["disease"].get("id", ""),
    ))
    return tasks


def select_phase_tasks(all_tasks: list[dict[str, Any]], mode: str) -> tuple[str | None, list[dict[str, Any]]]:
    """Select one phase for a run.

    content_scan always finishes the whole Patient Guide phase first, then Rehab,
    then Procedure. Explicit *_scan modes only run their requested phase.
    """
    explicit = {
        "patient_scan": "patient_guide",
        "rehab_scan": "rehab_contract",
        "procedure_scan": "procedure",
    }.get(mode)

    if explicit:
        return explicit, [t for t in all_tasks if t["contentType"] == explicit]

    for content_type in ("patient_guide", "rehab_contract", "procedure"):
        phase_tasks = [t for t in all_tasks if t["contentType"] == content_type]
        if phase_tasks:
            return content_type, phase_tasks

    return None, []


def find_pfna_disease(diseases: list[dict[str, Any]]) -> dict[str, Any]:
    needles = ["股骨转子间", "股骨粗隆间", "intertrochanteric", "pertrochanteric"]
    for row in diseases:
        d = disease_from_row(row)
        hay = " ".join(str(d.get(k, "")) for k in ("id", "name", "englishName", "searchKeywords")).lower()
        if any(n.lower() in hay for n in needles):
            return compact_disease(d)
    raise RuntimeError("PFNA test: could not find intertrochanteric/pertrochanteric fracture disease.")


def common_rules(disease: dict[str, Any], content_type: str) -> str:
    return f"""
当前疾病：{disease.get('name')} / {disease.get('englishName')}
疾病 id：{disease.get('id')}
本次 contentType：{content_type}

通用硬规则：
1. 只输出符合 JSON Schema 的 JSON object，不要 Markdown。
2. 所有输出都是待人工审核草稿；不得宣称已经完成文献核验。
3. 不编造来源、PMID、DOI、URL、指南名称或品牌 IFU 细节。
4. 精确毫米/角度/深度、固定周数、绝对的“必须/禁止”、设备特异动作放入 reviewFlags，除非只是明确标注“需按本院/厂商规范核对”。
5. 不把分型直接等同于术式；不把某一个影像表现自动等同于必须手术。
6. 康复优先使用“时间 + 组织/固定稳定性 + 症状 + 功能 + 风险”的条件解锁，不写成到了某周自动开放。
7. 内容面向教育和就诊理解，不能替代患者个体化诊断、查体、完整影像和线下医生判断。
""".strip()


def build_patient_prompt(disease: dict[str, Any]) -> str:
    return f"""
你是 OrthoFlow Patient Guide V3.2 患者端内容编辑器。
目标不是写百科、教科书或康复方案，而是让一个焦虑的普通患者在 10 秒内先抓住重点。

患者最想知道四件事：
1. 我这个严重吗？
2. 我需要手术吗？
3. 我大概怎样恢复？
4. 我下次复诊应该问什么？

{common_rules(disease, 'patient_guide')}

现有疾病资料（只能作为背景；不要照抄其中绝对化、过时或过细的句子）：
{json.dumps(disease, ensure_ascii=False, indent=2)}

===== Patient Guide Gold Standard V3.1 =====

总原则：
- 面向普通患者，尽量使用初中生能理解的中文；必须用医学词时立刻用一句白话解释。
- 先回答，再解释。不要先铺背景知识。
- 短。每个核心部分优先 3–5 个要点，避免长段落和同义重复。
- 不根据患者未提供的个体资料替他下诊断、决定术式或承诺预后。
- 不制造“精确感”。除非该数字对安全非常必要且明确需要人工核对，否则 Patient Guide 第一层不要主动给固定周数、天数、毫米、角度、百分比、分级阈值。
- Patient Guide 只讲恢复逻辑和大阶段；详细的脱拐、负重、跑步、驾驶、上班、运动时间表属于 Rehab Contract，不要在这里展开。

severity（我这个严重吗？）：
- 第一条先用一句话告诉患者：这个病的严重程度主要由什么决定，而不是单看“有没有这个诊断”。
- 只保留 3–5 个真正决定严重程度的维度。
- 清楚区分“通常相对简单的情况”和“更需要重视/更复杂的情况”。
- 不把影像截图、某个分型或单个指标直接等同于最终严重程度。

surgeryDecision（我需要手术吗？）：
- 先说明是否手术通常取决于哪些关键条件。
- 分成“通常可先考虑保守的条件”和“更可能需要讨论手术的条件”。
- 必须强调症状、稳定性/移位、功能需求、完整影像、软组织/神经血管及合并损伤等共同决定。
- 不能写“某分型=某手术”“看到某一个征象就必须手术”。

recovery（我什么时候能恢复？）：
- Patient Guide 不是康复处方。只允许保留 2–3 个“大阶段”，默认优先 3 个：①保护/稳定，②恢复基本功能，③回归较高需求活动。
- 每个 milestone 只回答两件事：“这一阶段主要目标是什么”“进入下一阶段主要看什么”。不要写训练菜单。
- whatUsuallyMatters 必须是患者理解层面的 1–2 句话；禁止展开具体肌群训练、动作次数、支具摘戴方案、负重等级、屈伸角度、跑跳测试、专项动作等。
- timingNote 原则上留空；只有必须提醒“以术式/固定方式/主治医师要求为准”时才写一句，不得给固定天数、周数或月份。
- 不列脱拐、负重、跑步、深蹲、驾驶、游泳、开车、上班、球类等逐项时间表；这些全部留给 Rehab Contract。
- recovery.plainAnswer 控制为 2–4 句：说明恢复不是按日历自动解锁，并点出稳定性/组织愈合、症状、功能、风险。
- unlockPrinciple 最多 3 条；recoveryNotGoingWell 最多 4 条。

redFlags：
- 只列真正值得及时就医/复诊的危险信号。
- 3–5 条为宜，不为了显得全面而堆砌罕见并发症。

visitPrep（下次复诊我该问什么？）：
- 优先给 3–5 个患者可以直接拿去问医生的问题。
- 问题应帮助患者澄清：目前是否稳定/严重、保守还是手术、下一阶段目标、复查依据、哪些情况需提前复诊。
- visitPrep 是患者端唯一主展示的“问医生什么”区域。surgeryDecision.questionsForDoctor 仍需满足 schema，但必须压缩为 2–3 条、不要和 visitPrep 逐句重复，前端默认不重复展示。
- 如 schema 还包含“带什么资料”，只保留最必要的完整影像、报告、既往手术/治疗资料。

动作规则：
- patient_scan 的正常动作只能是 create_patient_guide。
- 只有疾病概念本身确实不适合患者三问结构时才允许 not_applicable。
- Patient Guide 不允许因为“存在多个手术方式”就返回 needs_human_selection；那是 Procedure 阶段的问题。患者端仍应解释决定手术与否的原则。
- patientGuide.reviewStatus=draft，contentStatus=ai_draft。
""".strip()


def build_rehab_prompt(disease: dict[str, Any]) -> str:
    return f"""
你是 OrthoFlow 康复内容编辑器。你的任务是生成“功能回归 / Return to Activity”草稿，而不是固定时间表。

{common_rules(disease, 'rehab_contract')}

现有疾病资料：
{json.dumps(disease, ensure_ascii=False, indent=2)}

必须使用五把锁，且 id 固定为：time, tissue, symptoms, function, risk。
五把锁分别表达：时间窗口、组织/固定或生物学条件、疼痛肿胀等症状、力量/活动度/控制等功能、再受伤/并发症/跌倒等风险。

activities：
- 至少 6 项，优先覆盖该疾病患者真正会问的日常活动、工作和运动。
- typicalWindow 只允许写“常见阶段/大致窗口/需结合术式或固定方式”，不要把周数当作自动通行证。
- unlockWhen 必须写可观察条件；holdIf 写暂停升级的信号。
- 如果该疾病几乎没有可定义的康复/活动回归路径，action=not_applicable，说明原因，不要硬填。
- rehabContract.reviewStatus=draft，contentStatus=ai_draft。
""".strip()


def build_procedure_prompt(disease: dict[str, Any], existing: list[str], pfna_test: bool = False) -> str:
    skill = SKILL_PATH.read_text(encoding="utf-8")
    special = ""
    if pfna_test:
        special = """
本次为 PFNA 盲测：独立生成 PFNA / Proximal Femoral Nail Antirotation 草稿。
procedure.id 固定 intertrochanteric_pfna_ai_test，procedure.name 使用 PFNA 内固定术。
"""
    else:
        special = """
先判断能否从该疾病安全选择一个“最基础、最常见、最值得规培优先建立”的具体 Procedure。
若存在多个差异明显且不能从疾病数据安全选择的手术路径，action=needs_human_selection，并说明候选路径；不要硬选。
若该疾病通常不应为了页面完整而强行建立手术，action=not_applicable。
"""

    return f"""
你是 OrthoFlow Procedure Pro 内容编辑器。

===== Procedure Skill =====
{skill}
===== End Skill =====

{common_rules(disease, 'procedure')}

当前疾病资料：
{json.dumps(disease, ensure_ascii=False, indent=2)}

当前已知具体 Procedure：{json.dumps(existing, ensure_ascii=False)}

{special}

Procedure V3 额外规则：
1. 先给 procedureCategory 分类：fracture_fixation / arthroscopy / arthroplasty / spine / soft_tissue_repair / decompression / other。
2. 不再为了填模板强行写内容。某字段不适用时，允许返回空数组，并把字段名放入 notApplicableFields。
3. fracture_fixation：重点是复位、固定、透视/影像检查、内固定器械与失效模式。
4. arthroscopy：重点是体位、portal/入路、镜下解剖与危险结构、病灶评估、修复/处理步骤、镜下终末检查；C 臂通常不是核心时 cArm=[]。
5. arthroplasty：重点是暴露、软组织保护、骨性处理、假体定位/稳定性、肢体长度或力线、术后影像。
6. spine：重点是定位、减压/固定目标、神经结构风险、影像定位与神经功能检查；具体器械动作需谨慎。
7. soft_tissue_repair：重点是损伤模式、组织质量、张力/固定策略、保护期与功能恢复；不要生搬骨折复位模板。
8. imagingChecklist.intraop 的“view”可以是镜下终末检查/直接视野/透视体位等真正适用于该术式的检查，不强制 X 线。
9. action=create_procedure 时 relatedDiseaseIds 只能包含当前疾病 id：{disease.get('id')}。
10. reviewStatus=draft，contentStatus=ai_draft。
""".strip()


def deepseek_structured(prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
    api_key = need_env("DEEPSEEK_API_KEY")
    url = "https://api.deepseek.com/chat/completions"
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
                    "你是 OrthoFlow Auto Curator V3.1。你必须输出严格 JSON。"
                    "不要编造来源，不要把未经核验的医疗细节写成确定结论。"
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "thinking": {"type": "enabled"},
        "temperature": 0.15,
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
                    "User-Agent": "orthoflow-auto-curator/3.2",
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


def review_and_revise(first: dict[str, Any], disease: dict[str, Any], content_type: str, schema: dict[str, Any]) -> dict[str, Any]:
    if content_type == "patient_guide":
        focus = """
重点按 Patient Guide V3.2 重新审稿，而不是只做医学纠错：
1. 第一屏是否能快速回答“严重吗 / 要手术吗 / 恢复怎么看”，而不是先写百科背景。
2. 普通患者是否能理解；删除不必要术语、长句、同义重复和教材式解释。
3. severity / surgeryDecision 每部分优先压到 3–5 个核心要点；避免 summary、plainAnswer、列表反复说同一句话。
4. 删除 Patient Guide 中不必要的固定周数、天数、毫米、角度、百分比和伪精确阈值；确有必要但不能核证的数字放 reviewFlags。
5. recovery 必须执行“最小化”：最多 3 个 milestones；每个只写阶段目标和解锁条件，不得写训练菜单。whatUsuallyMatters 1–2 句；timingNote 默认空。详细负重、支具、屈伸角度、肌群训练、脱拐、驾驶、跑步、运动专项必须留给 Rehab Contract。
6. recovery.plainAnswer 2–4 句，unlockPrinciple 最多 3 条，recoveryNotGoingWell 最多 4 条。
7. 不把影像截图、分型或单个指标当最终诊断，也不把某分型直接等同手术。
8. 不制造焦虑，不承诺恢复结果。redFlags 只留真正需要及时就医/复诊的 3–5 类信号。
9. visitPrep 是前端主要“问医生什么”区域，保留 3–5 条；surgeryDecision.questionsForDoctor 压到 2–3 条且不要逐句重复。
10. patient_guide 不得因为存在多个术式而返回 needs_human_selection；这是 Procedure 阶段问题。
"""
    elif content_type == "rehab_contract":
        focus = """
重点检查：是否真的使用五把锁；是否把到了某周自动解锁；是否忽略疼痛肿胀、影像/组织愈合、力量控制与风险；活动项目是否与疾病相关。
"""
    else:
        focus = """
重点检查：procedureCategory 是否合理；是否为了填模板硬写 C 臂/复位/器械；危险解剖、精确阈值、品牌特异动作、固定负重周数是否需要 high reviewFlag；术式是否可能本应 needs_human_selection。
"""

    prompt = f"""
你是 OrthoFlow Auto Curator V3 的第二遍医学结构审稿器。你不能联网，因此不是证据核验器。

疾病：{disease.get('name')} / {disease.get('englishName')}
contentType：{content_type}

第一遍草稿：
{json.dumps(first, ensure_ascii=False, indent=2)}

{focus}

要求：
- 保留合理内容，修正明显结构错误和内部矛盾；
- 对不能确认的具体阈值、固定时间、强结论、危险操作增加 reviewFlags；
- 不新增虚构来源；
- 保持 contentType 不变；
- 若第一遍本来就不适用/需人工选择，可以保留该 action；
- create_* 时对应 payload.reviewStatus=draft、contentStatus=ai_draft。
""".strip()
    return deepseek_structured(prompt, schema)


def normalize_and_validate(result: dict[str, Any], disease: dict[str, Any], content_type: str, schema: dict[str, Any]) -> dict[str, Any]:
    validate(instance=result, schema=schema)
    if result.get("contentType") != content_type:
        raise RuntimeError(f"Model returned wrong contentType: {result.get('contentType')} != {content_type}")

    expected_create = CREATE_ACTION[content_type]
    action = result.get("action")
    if action.startswith("create_") and action != expected_create:
        raise RuntimeError(f"Model returned mismatched create action: {action} for {content_type}")

    payload_key = {
        "patient_guide": "patientGuide",
        "rehab_contract": "rehabContract",
        "procedure": "procedure",
    }[content_type]

    if action == expected_create:
        payload = result[payload_key]
        payload["reviewStatus"] = "draft"
        payload["contentStatus"] = "ai_draft"
        payload["autoCuratorVersion"] = "auto-curator-v3.2-patient-minimal"
        payload["autoCuratorModel"] = MODEL
        payload["generatedAt"] = datetime.now(timezone.utc).isoformat()

        if content_type == "procedure":
            payload["relatedDiseaseIds"] = [disease["id"]]
            payload["engineVersion"] = "procedure-engine-v1"
            pid = payload.get("id", "")
            if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", pid):
                raise RuntimeError(f"Unsafe procedure id returned by model: {pid}")

    return result


def build_prompt(content_type: str, disease: dict[str, Any], procedures: list[dict[str, Any]], pfna_test: bool = False) -> str:
    if content_type == "patient_guide":
        return build_patient_prompt(disease)
    if content_type == "rehab_contract":
        return build_rehab_prompt(disease)
    if content_type == "procedure":
        return build_procedure_prompt(disease, concrete_procedure_ids(disease, procedures), pfna_test=pfna_test)
    raise RuntimeError(f"Unknown content type: {content_type}")


def payload_for(result: dict[str, Any], content_type: str) -> dict[str, Any] | None:
    key = {
        "patient_guide": "patientGuide",
        "rehab_contract": "rehabContract",
        "procedure": "procedure",
    }[content_type]
    if result.get("action") == CREATE_ACTION[content_type]:
        return result.get(key)
    return None


def save_artifact(result: dict[str, Any], disease: dict[str, Any], content_type: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    p = OUTPUT_DIR / f"v3_{content_type}_{disease['id']}_{stamp}.json"
    p.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def save_draft(result: dict[str, Any], disease: dict[str, Any], content_type: str) -> Any:
    payload = payload_for(result, content_type)
    proc = result.get("procedure") or {}
    row = {
        "disease_id": disease["id"],
        "disease_name": disease["name"],
        "candidate_procedure_id": proc.get("id") if content_type == "procedure" else None,
        "candidate_procedure_name": proc.get("name") if content_type == "procedure" else None,
        "action": result["action"],
        "reason": result.get("reason"),
        "payload": payload,
        "review_flags": result.get("reviewFlags") or [],
        "model": MODEL,
        "generation_mode": f"v3_{content_type}",
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
    assert SKILL_PATH.exists()
    fake_disease = {"id": "fake", "name": "测试病", "procedureRefs": [], "viewCount": 10}
    assert concrete_procedure_ids(fake_disease, []) == []
    assert not has_patient_guide(fake_disease)
    assert not has_rehab_contract(fake_disease, [])
    assert is_placeholder("fake_surgery_pro", "fake")
    phase, phase_tasks = select_phase_tasks([
        {"disease": {"id": "b", "name": "乙"}, "contentType": "rehab_contract", "viewCount": 999},
        {"disease": {"id": "a", "name": "甲"}, "contentType": "patient_guide", "viewCount": 0},
    ], "content_scan")
    assert phase == "patient_guide" and len(phase_tasks) == 1

    # Schema sanity: minimal non-create decisions for every content type.
    for ctype in CONTENT_PRIORITY:
        validate(instance={
            "contentType": ctype,
            "action": "not_applicable",
            "reason": "self test",
            "reviewFlags": [],
        }, schema=schema)
    print("SELF TEST OK — V3.1 patient quality patch")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["content_scan", "patient_scan", "rehab_scan", "procedure_scan", "pfna_test"],
        default="content_scan",
    )
    parser.add_argument("--save-draft", action="store_true")
    parser.add_argument("--no-review", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    schema = load_json(SCHEMA_PATH)
    try:
        try:
            diseases = sb_get("diseases", {"select": "id,data,view_count"})
        except RuntimeError:
            diseases = sb_get("diseases", {"select": "data"})
        procedures = sb_get("procedures", {"select": "id,data,is_published,updated_at"})

        if args.mode == "pfna_test":
            disease = find_pfna_disease(diseases)
            tasks = [{"disease": disease, "contentType": "procedure", "viewCount": disease.get("viewCount", 0), "pfnaTest": True}]
            max_tasks = 1
        else:
            all_tasks = task_candidates(diseases, procedures)
            phase, tasks = select_phase_tasks(all_tasks, args.mode)
            max_tasks = int(os.getenv("AUTOCURATOR_MAX_TASKS", "5"))
            if phase:
                print(f"Active V3 phase: {phase}")
                print(f"Remaining eligible tasks in phase: {len(tasks)}")

        if not tasks:
            print("No eligible V3 content gap found.")
            log_run(args.mode, None, "nothing_to_do", {"message": "No eligible V3 task"})
            return 0

        decisions: list[dict[str, Any]] = []
        created = False
        last_disease: dict[str, Any] | None = None

        for task in tasks[:max_tasks]:
            disease = task["disease"]
            content_type = task["contentType"]
            last_disease = disease
            print("\n============================================================")
            print(f"Target disease: {disease['name']} ({disease['id']})")
            print(f"Content type: {content_type}")
            print(f"View count: {task.get('viewCount', 0)}")
            print(f"Model: {MODEL}")
            if content_type == "procedure":
                print(f"Existing concrete procedures: {concrete_procedure_ids(disease, procedures) or 'none'}")

            prompt = build_prompt(content_type, disease, procedures, pfna_test=bool(task.get("pfnaTest")))
            first = deepseek_structured(prompt, schema)
            first = normalize_and_validate(first, disease, content_type, schema)

            result = first
            # Second pass only for drafts that may become actual content.
            if first.get("action") == CREATE_ACTION[content_type] and not args.no_review:
                result = review_and_revise(first, disease, content_type, schema)
                result = normalize_and_validate(result, disease, content_type, schema)

            if args.mode == "pfna_test" and result.get("action") == "create_procedure":
                result["procedure"]["id"] = "intertrochanteric_pfna_ai_test"
                result["procedure"]["name"] = "PFNA 内固定术（AI盲测草稿）"

            artifact = save_artifact(result, disease, content_type)
            action = result["action"]
            print(f"Artifact: {artifact.relative_to(ROOT)}")
            print(f"Action: {action}")
            print(f"Review flags: {len(result.get('reviewFlags') or [])}")

            if args.save_draft:
                save_draft(result, disease, content_type)
                print("Saved to Supabase auto_curator_drafts: YES")
            else:
                print("Saved to Supabase auto_curator_drafts: NO (dry-run)")

            decisions.append({
                "diseaseId": disease["id"],
                "diseaseName": disease["name"],
                "contentType": content_type,
                "action": action,
                "artifact": str(artifact.relative_to(ROOT)),
                "reviewFlags": len(result.get("reviewFlags") or []),
            })

            if action == CREATE_ACTION[content_type]:
                created = True

            if args.mode == "pfna_test":
                break

            print(f"Continue batch after: {action}")

        outcome = "created_drafts" if created else "review_queue_only"
        log_run(args.mode, last_disease, outcome, {
            "checked": len(decisions),
            "created": created,
            "decisions": decisions,
            "savedDraft": bool(args.save_draft),
        })
        print(f"\nV3 scheduler summary: processed={len(decisions)}, any_created={created}")
        return 0

    except ValidationError as exc:
        print(f"SCHEMA VALIDATION FAILED: {exc.message}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"AUTO CURATOR FAILED: {exc}", file=sys.stderr)
        try:
            log_run(args.mode, None, "error", {"error": str(exc)[:1200]})
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
