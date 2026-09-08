#!/usr/bin/env python3
"""OrthoFlow Auto Curator V3.2.2 Content Engine.

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
from collections import defaultdict
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
PATIENT_VERSION = "auto-curator-v3.2.2-treatment-path-safety"
REHAB_VERSION = "auto-curator-rehab-v3.1.1-no-pseudo-precision"
API_USAGE: dict[str, int] = defaultdict(int)
CONTENT_PRIORITY = {"patient_guide": 0, "rehab_contract": 1, "procedure": 2}
CREATE_ACTION = {
    "patient_guide": "create_patient_guide",
    "rehab_contract": "create_rehab_contract",
    "procedure": "create_procedure",
}


def record_api_usage(usage: Any) -> None:
    """Accumulate numeric DeepSeek usage fields across all calls and retries."""
    if not isinstance(usage, dict):
        return
    for key, value in usage.items():
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            API_USAGE[str(key)] += int(value)


def usage_snapshot() -> dict[str, int]:
    return dict(sorted(API_USAGE.items()))


def is_fatal_full_run_error(exc: Exception) -> bool:
    """Stop a full-library run when continuing would likely waste API spend."""
    msg = str(exc)
    fatal_markers = (
        "DeepSeek API failed 401",
        "DeepSeek API failed 402",
        "Missing required environment variable",
        "Supabase POST failed",
        "Auto Curator tables are not installed",
    )
    return any(marker in msg for marker in fatal_markers)


def need_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def supabase_headers() -> dict[str, str]:
    return {
        "apikey": need_env("SUPABASE_SECRET_KEY"),
        "Content-Type": "application/json",
        "User-Agent": "orthoflow-auto-curator/3.2.2",
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
    """Disease-level Rehab is intentionally separate from Procedure rehabContract.

    diseases.data.diseaseRehabContract = disease-level common recovery logic
    procedures.data.rehabContract = procedure-specific postoperative rehab

    A Procedure rehabContract must NOT make a disease look complete for the disease Rehab phase.
    """
    contract = disease.get("diseaseRehabContract")
    return isinstance(contract, dict) and bool(contract)


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
        "patient_full": "patient_guide",
        "rehab_scan": "rehab_contract",
        "rehab_test": "rehab_contract",
        "procedure_scan": "procedure",
    }.get(mode)

    if explicit:
        return explicit, [t for t in all_tasks if t["contentType"] == explicit]

    for content_type in ("patient_guide", "rehab_contract", "procedure"):
        phase_tasks = [t for t in all_tasks if t["contentType"] == content_type]
        if phase_tasks:
            return content_type, phase_tasks

    return None, []


def validate_patient_full_queue() -> int:
    """Ensure old Patient Guide drafts cannot silently block final-version regeneration."""
    rows = sb_get("auto_curator_drafts", {
        "select": "disease_id,disease_name,payload,generation_mode,status",
        "status": "eq.pending_review",
        "generation_mode": "eq.v3_patient_guide",
    })
    old_rows: list[dict[str, Any]] = []
    final_rows = 0
    for row in rows:
        payload = row.get("payload") or {}
        version = payload.get("autoCuratorVersion") if isinstance(payload, dict) else None
        if version == PATIENT_VERSION:
            final_rows += 1
        else:
            old_rows.append(row)

    if old_rows:
        names = [str(r.get("disease_name") or r.get("disease_id") or "unknown") for r in old_rows[:10]]
        suffix = "" if len(old_rows) <= 10 else f" ... +{len(old_rows) - 10}"
        raise RuntimeError(
            "patient_full blocked: found "
            f"{len(old_rows)} old pending Patient Guide drafts that would hide diseases from the scheduler. "
            "Run the V3.2.2 cleanup SQL first. Examples: " + ", ".join(names) + suffix
        )

    print(f"Patient full queue guard: OK — final-version pending drafts already present: {final_rows}")
    return final_rows



def rehab_test_tasks(diseases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return five cross-category disease Rehab blind-test tasks in fixed order."""
    targets = [
        ("胫骨平台骨折", ["胫骨平台"]),
        ("肩袖损伤", ["肩袖"]),
        ("腰椎间盘突出症", ["腰椎间盘突出"]),
        ("膝关节骨关节炎", ["膝关节骨关节炎", "膝骨关节炎"]),
        ("踝关节外侧韧带损伤（踝扭伤）", ["踝关节外侧韧带", "踝扭伤"]),
    ]
    found: list[dict[str, Any]] = []
    converted = [compact_disease(disease_from_row(row)) for row in diseases]
    for display, needles in targets:
        match = None
        for d in converted:
            hay = " ".join(str(d.get(k, "")) for k in ("id", "name", "englishName", "searchKeywords")).lower()
            if any(n.lower() in hay for n in needles):
                match = d
                break
        if not match:
            raise RuntimeError(f"Rehab blind test disease not found: {display}")
        found.append({"disease": match, "contentType": "rehab_contract", "viewCount": int(match.get("viewCount") or 0)})
    return found

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
你是 OrthoFlow Patient Guide V3.2.2 患者端内容编辑器。
目标不是写百科、教科书或康复方案，而是让一个焦虑的普通患者在 10 秒内先抓住重点。

患者最想知道四件事：
1. 我这个严重吗？
2. 我需要手术吗？
3. 我大概怎样恢复？
4. 我下次复诊应该问什么？

{common_rules(disease, 'patient_guide')}

现有疾病资料（只能作为背景；不要照抄其中绝对化、过时或过细的句子）：
{json.dumps(disease, ensure_ascii=False, indent=2)}

===== Patient Guide Gold Standard V3.2.2 =====

总原则：
- 面向普通患者，尽量使用初中生能理解的中文；必须用医学词时立刻用一句白话解释。
- 先回答，再解释。不要先铺背景知识。
- 短。每个核心部分优先 3–5 个要点，避免长段落和同义重复。
- 不根据患者未提供的个体资料替他下诊断、决定术式或承诺预后。
- 不制造“精确感”。除非该数字对安全非常必要且明确需要人工核对，否则 Patient Guide 第一层不要主动给固定周数、天数、毫米、角度、百分比、分级阈值。
- Patient Guide 只讲恢复逻辑和大阶段；详细的脱拐、负重、跑步、驾驶、上班、运动时间表属于 Rehab Contract，不要在这里展开。

疾病级内容边界（V3.2.2 硬规则）：
- Patient Guide 是“疾病级”内容，不是“某个术式后的康复单”，不得默认患者已经手术、一定保守、一定卧床、一定不负重、一定使用石膏/支具/吊带、一定有内固定或人工关节。
- 同一疾病如果存在保守、内固定、关节置换、不同修复方式等多条治疗路径，recovery 必须只写这些路径都成立的共同逻辑；具体路径差异只允许用一句条件句提示“取决于治疗方式和稳定性，由主治团队决定”。
- 禁止把某个具体治疗路径的动作开放条件写成疾病通用规则。例如不得无条件写“暂时不能下地”“这一阶段不要求下地”“必须卧床”“完全不能踩地”“必须戴支具”“等 X 线出现骨痂后才开始关节活动”。
- 不得把“看到骨痂/某个影像征象”单独设为允许关节活动、负重、脱拐或训练的通用开关；这些属于具体治疗路径和 Rehab Contract。
- recovery 中不要用“几天、几周、几个月、半年、一年”等时间长度暗示患者何时应该恢复；即使是模糊时间，也优先改成“复查确认稳定 / 症状下降 / 功能达标 / 风险可接受”。
- 可以提到“手术、内固定、假体、石膏、支具”等词来解释为什么不同患者路径不同，但不能据此给出疾病级动作处方。

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
- recovery 的三个阶段必须是“治疗路径中立”的：不能把某一术式、某一固定方式或某一负重策略写成所有患者都适用。
- 若一个 milestone 只有在某类术式后才成立，就改写成更上位的共同目标；实在无法路径中立时，宁可写“具体活动开放取决于治疗方式和稳定性，由主治团队决定”，不要补训练细节。
- unlockPrinciple 最多 3 条；recoveryNotGoingWell 最多 4 条，且不要用“几天/几周/几个月后仍……”作为疾病级失败阈值。

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
你是 OrthoFlow Disease Rehab Contract V3.1 内容编辑器。
你的任务是生成“疾病级功能回归合同”，不是某个术式的术后医嘱，也不是固定周数时间表。

{common_rules(disease, 'rehab_contract')}

当前疾病资料（只作为背景，不要照抄其中绝对化旧句）：
{json.dumps(disease, ensure_ascii=False, indent=2)}

===== Disease Rehab Contract V3.1 Gold Standard =====

【数据边界】
- 本次输出字段必须是 diseaseRehabContract。
- diseaseRehabContract 属于 diseases.data，表达“这个疾病在不同治疗路径之间共同成立的功能回归逻辑”。
- procedures.data.rehabContract 是具体手术后的康复合同，两者绝不能混为一谈。
- 不因为数据库里某个 Procedure 已有 rehabContract，就认为疾病级 Rehab 已完成。

【治疗路径隔离：硬规则】
- 不得默认患者已经手术、一定保守、一定打石膏、一定戴支具/吊带、一定有内固定/假体、一定卧床或一定不负重。
- 同一疾病若存在保守、内固定、关节置换、修复、重建等多条路径，只写所有合理路径都成立的共同“解锁条件”。
- 如果某项活动的开放高度依赖具体治疗方式，必须写成条件句，例如：“在主治团队确认当前治疗方式允许后，再逐步增加……”。
- 禁止把“第几周”“几个月”“固定到某天”写成自动解锁规则。typicalWindow 默认应为空字符串；只有确有患者教育价值且不会误导时，才可写非常宽泛且明确标注“仅参考、治疗路径优先”的时间窗，并加入 reviewFlag。
- 禁止把单一 X 线骨痂、MRI 信号、某个角度或某个数值作为负重、脱拐、跑跳、驾驶、上班的唯一开关。
- 禁止疾病级处方化语句，例如“必须完全不负重”“必须戴支具 X 周”“术后第 X 周开始……”；这些属于具体治疗路径或 Procedure Rehab。
- 【V3.1.1 伪精确禁令】疾病级活动解锁条件不得出现具体负重百分比（如 25%/50%/100%）、固定分钟/小时/天/周/月、固定步行距离、固定次数/组数、固定重量、固定角度或固定疼痛分值作为放行标准；把它们改写成“症状不过度反跳、功能质量稳定、结构/治疗路径允许、风险可接受”等定性条件。
- typicalWindow 在 Disease Rehab Contract 中一律输出空字符串，不得填写任何时间范围。
- 不要用“连续步行 X 分钟”“症状在 24/48 小时内恢复”“完成 X 次动作”“负重达到 X%”这类看似客观但未经个体化验证的阈值。
- 疾病级正文尽量避免频繁使用“术后/保守治疗后”等单一路径措辞；如必须提醒路径差异，只能概括为“具体治疗方式可能附带额外限制，以治疗团队和对应 Procedure Rehab 为准”。

【五把锁】
locks 必须正好 5 个，id 固定且不重复：
1. time：时间窗口只作为背景，不单独放行。
2. tissue：组织、骨折/修复/固定或结构稳定性是否允许。
3. symptoms：疼痛、肿胀、夜间症状、神经症状等是否可控。
4. function：活动度、力量、控制、步态、耐力等是否达到当前活动要求。
5. risk：跌倒、再损伤、感染、血栓、神经血管、复发等风险是否可接受。
每个 lock 的 question 必须是患者/医生都能理解的“解锁问题”，不要写教科书定义。

【活动卡】
activities 目标是“患者真正想恢复什么”，建议 6–10 项，并按疾病相关性选择。可从以下池中选择或替换：
- 日常活动/基本自理
- 走路或上肢日常使用
- 负重（仅在该疾病相关时）
- 辅助器具/支具减量（仅在适用时）
- 楼梯/蹲起/坐站
- 驾驶
- 久坐/办公室工作
- 体力工作
- 骑车/游泳等低冲击运动
- 力量训练
- 跑步/跳跃/球类或专项运动
脊柱、上肢、儿童、感染、肿瘤等疾病不要硬塞“负重/脱拐”；换成真正相关的功能。

每个 activity：
- goal：一句话说明患者想恢复的功能。
- unlockWhen：至少 2 条，优先覆盖 tissue + symptoms + function + risk 中真正相关的条件；不要只写“医生同意”。
- holdIf：出现哪些变化应暂缓、退阶或复诊。
- notes：只写路径差异或必要解释，不写训练处方。
- typicalWindow：默认空字符串。

【warningSigns】
- 3–6 条与该疾病相关、需要及时就医/提前复诊的信号。
- 不制造恐慌，不把一般酸痛都写成急症。
- 急性神经血管问题、感染、进行性神经功能下降等如适用，应清楚提示。

【输出要求】
- action=create_rehab_contract。
- diseaseRehabContract.reviewStatus=draft。
- diseaseRehabContract.contentStatus=ai_draft。
- 不输出 procedure rehab。
- 对任何需要本院流程/术式/固定方式/具体阈值核对的内容，放入 reviewFlags。
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
                    "你是 OrthoFlow Auto Curator V3.2.2。你必须输出严格 JSON。"
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
                    "User-Agent": "orthoflow-auto-curator/3.2.2",
                },
                json=body,
                timeout=240,
            )
            if r.status_code >= 400:
                raise RuntimeError(f"DeepSeek API failed {r.status_code}: {r.text[:1800]}")

            raw = r.json()
            record_api_usage(raw.get("usage"))
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
重点按 Patient Guide V3.2.2 重新审稿，而不是只做医学纠错：
1. 第一屏是否能快速回答“严重吗 / 要手术吗 / 恢复怎么看”，而不是先写百科背景。
2. 普通患者是否能理解；删除不必要术语、长句、同义重复和教材式解释。
3. severity / surgeryDecision 每部分优先压到 3–5 个核心要点；避免 summary、plainAnswer、列表反复说同一句话。
4. 删除 Patient Guide 中不必要的固定周数、天数、毫米、角度、百分比和伪精确阈值；确有必要但不能核证的数字放 reviewFlags。
5. recovery 必须执行“最小化”：最多 3 个 milestones；每个只写阶段目标和解锁条件，不得写训练菜单。whatUsuallyMatters 1–2 句；timingNote 默认空。详细负重、支具、屈伸角度、肌群训练、脱拐、驾驶、跑步、运动专项必须留给 Rehab Contract。
6. 做一次“治疗路径污染检查”：Patient Guide 是疾病级内容，删除任何把患者默认成“已手术/一定保守/一定卧床/一定不负重/一定戴支具石膏/一定有内固定或假体”的句子。若保守、内固定、置换等路径不同，只保留共同逻辑，并用条件句提示具体活动开放由主治团队按治疗方式和稳定性决定。
7. 删除把“X 线出现骨痂/某个影像征象”单独当作关节活动、负重、脱拐或训练开放开关的通用表述。影像只能作为综合复查的一部分。
8. 删除 recovery 中作为恢复阈值或进度暗示的“几天、几周、几个月、半年、一年”等时间说法；改成稳定性、症状、功能和风险条件。recoveryNotGoingWell 同样不要用日历时间作为疾病级失败标准。
9. recovery.plainAnswer 2–4 句，unlockPrinciple 最多 3 条，recoveryNotGoingWell 最多 4 条。
10. 不把影像截图、分型或单个指标当最终诊断，也不把某分型直接等同手术。
11. 不制造焦虑，不承诺恢复结果。redFlags 只留真正需要及时就医/复诊的 3–5 类信号。
12. visitPrep 是前端主要“问医生什么”区域，保留 3–5 条；surgeryDecision.questionsForDoctor 压到 2–3 条且不要逐句重复。
13. patient_guide 不得因为存在多个术式而返回 needs_human_selection；这是 Procedure 阶段问题。
"""
    elif content_type == "rehab_contract":
        focus = """
重点检查 Disease Rehab Contract V3.1：
- 是否正好使用 time/tissue/symptoms/function/risk 五把锁且不重复；
- 是否把疾病级 Rehab 错写成“术后/保守治疗”的单一路径处方；
- 是否默认石膏、支具、吊带、内固定、假体、卧床或不负重；
- 是否出现“第几周/几个月自动解锁”或把单一影像征象当作活动开关；
- activities 是否真的是患者功能目标，并根据骨折/上肢/脊柱/退变/运动损伤等疾病类型调整，而不是硬塞统一清单；
- unlockWhen 是否体现组织稳定 + 症状 + 功能 + 风险，而不是只有“医生允许”；
- typicalWindow 必须全部为空字符串；发现任何非空值都删除，不再保留“参考时间窗”；
- 删除具体负重百分比、固定分钟/小时/天/周/月、固定距离、固定次数/组数、固定重量、固定角度、固定疼痛分值等作为活动解锁/退阶条件的伪精确阈值；
- 特别检查并改写类似“25%/50%/100%负重”“连续步行15–20分钟”“24小时内恢复”“完成10次”“屈曲达到90°”等句式。不要仅仅加 reviewFlag，应该从疾病级正文中移除数字阈值；
- 若出现大量“术后/保守治疗后/固定后”措辞，改写为治疗路径中立的共同逻辑；路径差异只保留一句原则性提醒；
- 是否把 Procedure-specific Rehab 与 diseaseRehabContract 混淆。
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
        "rehab_contract": "diseaseRehabContract",
        "procedure": "procedure",
    }[content_type]

    if action == expected_create:
        payload = result[payload_key]
        payload["reviewStatus"] = "draft"
        payload["contentStatus"] = "ai_draft"
        payload["autoCuratorVersion"] = PATIENT_VERSION if content_type == "patient_guide" else (REHAB_VERSION if content_type == "rehab_contract" else "auto-curator-v3.2.2-treatment-path-safety")
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
        "rehab_contract": "diseaseRehabContract",
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
    assert has_rehab_contract({"id": "x", "diseaseRehabContract": {"title": "x"}}, [])
    assert not has_rehab_contract({"id": "x"}, [{"data": {"rehabContract": {"title": "procedure only"}}}])
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
    print("SELF TEST OK — Patient V3.2.2 + Disease Rehab V3.1.1")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["content_scan", "patient_scan", "patient_full", "rehab_scan", "rehab_test", "procedure_scan", "pfna_test"],
        default="content_scan",
    )
    parser.add_argument("--save-draft", action="store_true")
    parser.add_argument("--no-review", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    if args.mode == "patient_full" and not args.save_draft:
        print("AUTO CURATOR FAILED: patient_full requires --save-draft to avoid an expensive unsaved full-library run.", file=sys.stderr)
        return 1

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
        elif args.mode == "rehab_test":
            tasks = rehab_test_tasks(diseases)
            max_tasks = 5
            print("REHAB V3.1 BLIND TEST MODE: ON — fixed five cross-category diseases")
        else:
            if args.mode == "patient_full":
                validate_patient_full_queue()
            all_tasks = task_candidates(diseases, procedures)
            phase, tasks = select_phase_tasks(all_tasks, args.mode)
            if args.mode in ("patient_full", "rehab_scan"):
                max_tasks = int(os.getenv("AUTOCURATOR_FULL_MAX_TASKS", "9999"))
                if args.mode == "patient_full":
                    print("FULL PATIENT LIBRARY MODE: ON")
                else:
                    print("FULL DISEASE REHAB LIBRARY MODE: ON")
            else:
                max_tasks = int(os.getenv("AUTOCURATOR_MAX_TASKS", "5"))
            if phase:
                print(f"Active V3 phase: {phase}")
                print(f"Remaining eligible tasks in phase: {len(tasks)}")
                print(f"Task cap for this run: {max_tasks}")

        if not tasks:
            print("No eligible V3 content gap found.")
            log_run(args.mode, None, "nothing_to_do", {"message": "No eligible V3 task"})
            return 0

        decisions: list[dict[str, Any]] = []
        failures: list[dict[str, str]] = []
        created_count = 0
        last_disease: dict[str, Any] | None = None
        selected_tasks = tasks[:max_tasks]

        for index, task in enumerate(selected_tasks, start=1):
            disease = task["disease"]
            content_type = task["contentType"]
            last_disease = disease
            print("\n============================================================")
            print(f"Progress: {index}/{len(selected_tasks)}")
            print(f"Target disease: {disease['name']} ({disease['id']})")
            print(f"Content type: {content_type}")
            print(f"View count: {task.get('viewCount', 0)}")
            print(f"Model: {MODEL}")

            try:
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
                    created_count += 1

                if args.mode == "pfna_test":
                    break

                print(f"Continue batch after: {action}")

            except Exception as exc:
                if args.mode != "patient_full" or is_fatal_full_run_error(exc):
                    raise
                error_text = str(exc)[:1200]
                failure = {
                    "diseaseId": str(disease.get("id") or ""),
                    "diseaseName": str(disease.get("name") or ""),
                    "error": error_text,
                }
                failures.append(failure)
                decisions.append({
                    "diseaseId": disease.get("id"),
                    "diseaseName": disease.get("name"),
                    "contentType": content_type,
                    "action": "error",
                    "error": error_text,
                })
                print(f"::warning::Skipped after per-disease failure: {disease.get('name')} — {error_text}", file=sys.stderr)
                print("Continuing full-library run; rerun patient_full later to retry missing diseases.")

        if failures:
            outcome = "partial_success"
        elif created_count > 0:
            outcome = "created_drafts"
        else:
            outcome = "review_queue_only"

        usage = usage_snapshot()
        log_run(args.mode, last_disease, outcome, {
            "checked": len(decisions),
            "createdCount": created_count,
            "failedCount": len(failures),
            "failures": failures,
            "decisions": decisions,
            "savedDraft": bool(args.save_draft),
            "apiUsage": usage,
        })
        print(f"\nV3 scheduler summary: processed={len(decisions)}, created={created_count}, failed={len(failures)}")
        print("DeepSeek usage totals: " + json.dumps(usage, ensure_ascii=False, sort_keys=True))
        if failures:
            print(f"::warning::Full run completed with {len(failures)} disease-level failures. Rerun patient_full to retry them.")
        elif args.mode == "patient_full" and len(selected_tasks) < len(tasks):
            print(f"::warning::Full run hit task cap {max_tasks}; rerun patient_full for remaining diseases.")
        elif args.mode == "patient_full":
            print("FULL PATIENT LIBRARY PASS COMPLETE — rerun once to confirm 'No eligible V3 content gap found.'")
        return 0

    except ValidationError as exc:
        print(f"SCHEMA VALIDATION FAILED: {exc.message}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"AUTO CURATOR FAILED: {exc}", file=sys.stderr)
        print("DeepSeek usage totals before failure: " + json.dumps(usage_snapshot(), ensure_ascii=False, sort_keys=True), file=sys.stderr)
        try:
            log_run(args.mode, None, "error", {"error": str(exc)[:1200]})
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
