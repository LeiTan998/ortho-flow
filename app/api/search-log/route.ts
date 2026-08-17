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

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.trim().replace(/\u0000/g, "")
  if (!cleaned) return null
  return cleaned.slice(0, maxLength)
}

function normalizeQuery(query: string): string {
  return query.toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim()
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0")
  if (contentLength > 15_000) {
    return NextResponse.json({ error: "提交内容过大" }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 })
  }

  const query = cleanString(body.query, 120)
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "搜索词过短" }, { status: 400 })
  }

  const normalizedQuery = normalizeQuery(query)
  const resultCountRaw = Number(body.resultCount)
  const resultCount = Number.isFinite(resultCountRaw)
    ? Math.max(0, Math.min(Math.floor(resultCountRaw), 100_000))
    : 0

  const userRole = cleanString(body.userRole, 50) ?? "unknown"
  if (!USER_ROLES.has(userRole)) {
    return NextResponse.json({ error: "用户身份选项无效" }, { status: 400 })
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {}

  const sessionId = cleanString(body.sessionId, 120)
  const clickedDiseaseId = cleanString(body.clickedDiseaseId, 120)
  const action = cleanString(body.action, 20) ?? "search"

  // 点击搜索结果时，优先更新当前 session 中最近一条同搜索词记录，
  // 避免“搜索一次 + 点击一次”产生两条重复日志。
  if (action === "click" && clickedDiseaseId) {
    if (sessionId) {
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("search_logs")
        .select("id")
        .eq("session_id", sessionId)
        .eq("normalized_query", normalizedQuery)
        .is("clicked_disease_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lookupError) {
        console.error("search log lookup failed", lookupError)
      }

      if (existing?.id) {
        const { error: updateError } = await supabaseAdmin
          .from("search_logs")
          .update({
            clicked_disease_id: clickedDiseaseId,
            result_count: resultCount,
          })
          .eq("id", existing.id)

        if (updateError) {
          console.error("search log click update failed", updateError)
          return NextResponse.json({ error: "记录点击失败" }, { status: 500 })
        }

        return NextResponse.json({ ok: true, mode: "updated" }, { status: 200 })
      }
    }

    // 用户点击得很快，1秒自动搜索日志可能还没有来得及写入。
    // 此时直接插入一条带 clicked_disease_id 的完整日志。
    const { error: insertClickError } = await supabaseAdmin.from("search_logs").insert({
      query,
      normalized_query: normalizedQuery,
      result_count: resultCount,
      clicked_disease_id: clickedDiseaseId,
      submitted_request: false,
      user_role: userRole,
      page_url: cleanString(body.pageUrl, 500),
      session_id: sessionId,
      metadata: { ...metadata, event: "search_click" },
    })

    if (insertClickError) {
      console.error("search click insert failed", insertClickError)
      return NextResponse.json({ error: "记录点击失败" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: "inserted_click" }, { status: 201 })
  }

  // 普通搜索：写入一条搜索日志。
  const { error } = await supabaseAdmin.from("search_logs").insert({
    query,
    normalized_query: normalizedQuery,
    result_count: resultCount,
    clicked_disease_id: clickedDiseaseId,
    submitted_request: body.submittedRequest === true,
    user_role: userRole,
    page_url: cleanString(body.pageUrl, 500),
    session_id: sessionId,
    metadata,
  })

  if (error) {
    console.error("search log insert failed", error)
    const message =
      process.env.NODE_ENV === "development"
        ? `搜索日志写入失败：${error.code || "unknown"} ${error.message}`
        : "记录失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, mode: "inserted_search" }, { status: 201 })
}
