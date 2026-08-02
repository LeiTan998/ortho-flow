import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const USER_ROLES = new Set([
  "unknown",
  "medical_student",
  "resident",
  "orthopedic_doctor",
  "other_clinician",
  "teacher",
  "patient_family",
  "other",
])

const TASK_TYPES = new Set([
  "search",
  "disease_learning",
  "imaging",
  "classification",
  "treatment",
  "medical_record",
  "rehab",
  "case_submission",
  "other",
])

const RESULT_STATUSES = new Set([
  "solved",
  "partially_solved",
  "unsolved",
])

const FEEDBACK_TYPES = new Set([
  "content",
  "medical_error",
  "privacy",
  "copyright",
  "feature",
  "usability",
  "search_request",
  "other",
])

const SEVERITIES = new Set(["low", "medium", "high", "critical"])

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.trim().replace(/\u0000/g, "")
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

function cleanMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  try {
    const serialized = JSON.stringify(value)
    if (serialized.length > 5000) return {}
    return JSON.parse(serialized) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (contentLength > 30_000) {
    return NextResponse.json({ error: "提交内容过大" }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 })
  }

  // 蜜罐字段：正常用户不会填写。机器人填写时返回成功，但不写数据库。
  if (cleanString(body.website, 200)) {
    return NextResponse.json({ ok: true })
  }

  const userRole = cleanString(body.userRole, 50) ?? "unknown"
  const taskType = cleanString(body.taskType, 50) ?? "other"
  const resultStatus = cleanString(body.resultStatus, 50)
  const feedbackType = cleanString(body.feedbackType, 50) ?? "content"
  const severity = cleanString(body.severity, 50) ?? "low"
  const contactPermission = body.contactPermission === true
  const comment = cleanString(body.comment, 1000)
  const contact = contactPermission ? cleanString(body.contact, 200) : null

  if (!USER_ROLES.has(userRole)) {
    return NextResponse.json({ error: "用户身份选项无效" }, { status: 400 })
  }

  if (!TASK_TYPES.has(taskType)) {
    return NextResponse.json({ error: "任务类型无效" }, { status: 400 })
  }

  if (resultStatus && !RESULT_STATUSES.has(resultStatus)) {
    return NextResponse.json({ error: "完成状态无效" }, { status: 400 })
  }

  if (!FEEDBACK_TYPES.has(feedbackType)) {
    return NextResponse.json({ error: "反馈类型无效" }, { status: 400 })
  }

  if (!SEVERITIES.has(severity)) {
    return NextResponse.json({ error: "严重程度无效" }, { status: 400 })
  }

  if (
    feedbackType !== "privacy" &&
    feedbackType !== "copyright" &&
    feedbackType !== "medical_error" &&
    !comment &&
    !cleanString(body.reason, 120) &&
    resultStatus !== "solved"
  ) {
    return NextResponse.json(
      { error: "请至少选择一个原因或填写具体说明" },
      { status: 400 },
    )
  }

  const { error } = await supabaseAdmin.from("feedback").insert({
    page_url: cleanString(body.pageUrl, 500),
    disease_id: cleanString(body.diseaseId, 120),
    disease_name: cleanString(body.diseaseName, 200),
    feature_name: cleanString(body.featureName, 120),
    user_role: userRole,
    task_type: taskType,
    result_status: resultStatus,
    feedback_type: feedbackType,
    reason: cleanString(body.reason, 120),
    severity,
    comment,
    contact_permission: contactPermission,
    contact,
    source: "web",
    metadata: cleanMetadata(body.metadata),
  })

  if (error) {
    console.error("feedback insert failed", error)
    const message =
      process.env.NODE_ENV === "development"
        ? `数据库写入失败：${error.code || "unknown"} ${error.message}`
        : "提交失败，请稍后重试"

    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
