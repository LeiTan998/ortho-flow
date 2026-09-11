import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return timingSafeEqual(aa, bb)
}

function authorized(request: NextRequest) {
  const expected = (process.env.ORTHOFLOW_REVIEW_TOKEN || "").trim()
  const supplied = (request.headers.get("x-orthoflow-review-token") || "").trim()
  return Boolean(expected && supplied && safeEqual(expected, supplied))
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function label(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount)
}

function sortedCounts(map: Map<string, number>) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rawDays = Number(request.nextUrl.searchParams.get("days") || "30")
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [feedbackResult, searchResult] = await Promise.all([
      supabaseAdmin
        .from("feedback")
        .select(
          "created_at,disease_name,user_role,task_type,result_status,feedback_type,reason,severity,status,comment,metadata",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from("search_logs")
        .select("created_at,normalized_query,submitted_request,result_count,user_role,metadata")
        .gte("created_at", since)
        .eq("result_count", 0)
        .order("created_at", { ascending: false })
        .limit(2000),
    ])

    if (feedbackResult.error) throw feedbackResult.error
    if (searchResult.error) throw searchResult.error

    const feedback = Array.isArray(feedbackResult.data) ? feedbackResult.data : []
    const searches = Array.isArray(searchResult.data) ? searchResult.data : []

    const roleCounts = new Map<string, number>()
    const audienceCounts = new Map<string, number>()
    const statusCounts = new Map<string, number>()
    const issueCounts = new Map<string, number>()
    const diseaseCounts = new Map<string, number>()
    const queryMap = new Map<
      string,
      { query: string; count: number; requestCount: number; lastSeenAt: string; audiences: Map<string, number> }
    >()

    for (const row of feedback) {
      increment(roleCounts, label(row.user_role))
      increment(statusCounts, label(row.result_status, "no_result"))
      increment(issueCounts, label(row.reason, "未填写"))
      if (row.disease_name) increment(diseaseCounts, label(row.disease_name))

      const metadata = asRecord(row.metadata)
      increment(audienceCounts, label(metadata.audience))
    }

    for (const row of searches) {
      const query = label(row.normalized_query, "未命名搜索")
      const current = queryMap.get(query) || {
        query,
        count: 0,
        requestCount: 0,
        lastSeenAt: String(row.created_at || ""),
        audiences: new Map<string, number>(),
      }
      current.count += 1
      if (row.submitted_request === true) current.requestCount += 1
      if (String(row.created_at || "") > current.lastSeenAt) {
        current.lastSeenAt = String(row.created_at || "")
      }
      const metadata = asRecord(row.metadata)
      increment(current.audiences, label(metadata.audience))
      queryMap.set(query, current)
    }

    const noResultQueries = [...queryMap.values()]
      .map((item) => ({
        query: item.query,
        count: item.count,
        requestCount: item.requestCount,
        lastSeenAt: item.lastSeenAt,
        audiences: sortedCounts(item.audiences),
      }))
      .sort((a, b) => b.count - a.count || b.requestCount - a.requestCount)
      .slice(0, 20)

    const recentUnresolved = feedback
      .filter((row) => row.result_status !== "solved" || ["new", "reviewing"].includes(row.status))
      .slice(0, 30)
      .map((row) => ({
        createdAt: row.created_at,
        diseaseName: row.disease_name,
        userRole: row.user_role || "unknown",
        taskType: row.task_type || "other",
        resultStatus: row.result_status || "no_result",
        feedbackType: row.feedback_type || "content",
        reason: row.reason || "未填写",
        severity: row.severity || "low",
        status: row.status || "new",
        comment: row.comment || "",
      }))

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      days,
      since,
      totals: {
        feedback: feedback.length,
        searchesWithNoResult: searches.length,
        solved: statusCounts.get("solved") || 0,
        partiallySolved: statusCounts.get("partially_solved") || 0,
        unsolved: statusCounts.get("unsolved") || 0,
        highRisk: feedback.filter((row) => ["high", "critical"].includes(row.severity)).length,
      },
      roleCounts: sortedCounts(roleCounts),
      audienceCounts: sortedCounts(audienceCounts),
      issueCounts: sortedCounts(issueCounts).slice(0, 12),
      diseaseCounts: sortedCounts(diseaseCounts).slice(0, 12),
      noResultQueries,
      recentUnresolved,
    })
  } catch (error) {
    console.error("feedback dashboard GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dashboard load failed" },
      { status: 500 },
    )
  }
}
