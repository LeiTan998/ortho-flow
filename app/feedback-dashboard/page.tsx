"use client"

import { useEffect, useMemo, useState } from "react"

type CountRow = { label: string; count: number }

type DashboardData = {
  generatedAt: string
  days: number
  totals: {
    feedback: number
    searchesWithNoResult: number
    solved: number
    partiallySolved: number
    unsolved: number
    highRisk: number
  }
  roleCounts: CountRow[]
  audienceCounts: CountRow[]
  issueCounts: CountRow[]
  diseaseCounts: CountRow[]
  noResultQueries: Array<{
    query: string
    count: number
    requestCount: number
    lastSeenAt: string
    audiences: CountRow[]
  }>
  recentUnresolved: Array<{
    createdAt: string
    diseaseName: string | null
    userRole: string
    taskType: string
    resultStatus: string
    feedbackType: string
    reason: string
    severity: string
    status: string
    comment: string
  }>
}

const TOKEN_KEY = "orthoflow:patient-review-token:v1"

const ROLE_LABELS: Record<string, string> = {
  unknown: "暂不说明",
  medical_student: "医学生",
  resident: "规培生 / 住院医",
  orthopedic_doctor: "骨科医生",
  other_clinician: "其他临床医生",
  teacher: "教师 / 带教医生",
  patient_family: "患者或家属",
  other: "其他",
}

const STATUS_LABELS: Record<string, string> = {
  solved: "有帮助",
  partially_solved: "还差一点",
  unsolved: "没帮助",
  no_result: "未选择",
}

function formatDate(value: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function roleLabel(value: string) {
  return ROLE_LABELS[value] || value
}

function BarList({ rows, empty = "暂无数据" }: { rows: CountRow[]; empty?: string }) {
  const max = Math.max(...rows.map((row) => row.count), 1)
  if (!rows.length) return <p className="text-sm text-[var(--of-muted)]">{empty}</p>

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-[var(--of-text-strong)]">{roleLabel(row.label)}</span>
            <span className="shrink-0 font-semibold text-[var(--of-muted)]">{row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--of-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--of-accent)]"
              style={{ width: `${Math.max((row.count / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function severityClass(severity: string) {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-800"
  if (severity === "high") return "border-orange-300 bg-orange-50 text-orange-800"
  return "border-[var(--of-border)] bg-[var(--of-surface-muted)] text-[var(--of-muted)]"
}

export default function FeedbackDashboardPage() {
  const [token, setToken] = useState("")
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setToken(window.sessionStorage.getItem(TOKEN_KEY) || "")
  }, [])

  async function loadDashboard(inputToken = token, inputDays = days) {
    if (!inputToken.trim()) {
      setError("请输入审核口令。")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/feedback-dashboard?days=${inputDays}`, {
        cache: "no-store",
        headers: { "x-orthoflow-review-token": inputToken.trim() },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
      window.sessionStorage.setItem(TOKEN_KEY, inputToken.trim())
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }

  const completionRate = useMemo(() => {
    if (!data) return 0
    const answered = data.totals.solved + data.totals.partiallySolved + data.totals.unsolved
    return answered ? Math.round((data.totals.solved / answered) * 100) : 0
  }, [data])

  return (
    <main className="min-h-screen bg-[var(--of-bg)] px-4 py-6 text-[var(--of-text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-col gap-4 rounded-[24px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-[var(--of-accent)]">ORTHOFLOW INTERNAL</div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--of-text-strong)]">反馈与用户分析</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">
              用真实使用行为决定下一步改什么，不靠猜。
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void loadDashboard()}
              placeholder="审核口令"
              className="min-w-0 flex-1 rounded-xl border border-[var(--of-border)] bg-[var(--of-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--of-accent)]"
            />
            <select
              value={days}
              onChange={(event) => {
                const nextDays = Number(event.target.value) as 7 | 30 | 90
                setDays(nextDays)
                if (data) void loadDashboard(token, nextDays)
              }}
              className="rounded-xl border border-[var(--of-border)] bg-[var(--of-bg)] px-3 py-2 text-sm outline-none"
              aria-label="统计时间范围"
            >
              <option value={7}>最近 7 天</option>
              <option value={30}>最近 30 天</option>
              <option value={90}>最近 90 天</option>
            </select>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl bg-[var(--of-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "加载中" : "查看数据"}
            </button>
          </div>
        </header>

        {error && <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {!data ? (
          <div className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-10 text-center text-sm leading-7 text-[var(--of-muted)]">
            输入审核口令后查看统计。这里不会显示联系方式。
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["反馈", data.totals.feedback],
                ["无结果搜索", data.totals.searchesWithNoResult],
                ["有帮助", data.totals.solved],
                ["还差一点", data.totals.partiallySolved],
                ["没帮助", data.totals.unsolved],
                ["高风险", data.totals.highRisk],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-3">
                  <div className="text-2xl font-semibold text-[var(--of-text-strong)]">{value}</div>
                  <div className="mt-1 text-xs text-[var(--of-muted)]">{label}</div>
                </div>
              ))}
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <section className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">反馈身份</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">当前收到的反馈来自谁</p>
                <div className="mt-4"><BarList rows={data.roleCounts} /></div>
              </section>
              <section className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">患者 / 临床入口</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">来自页面模式选择或反馈上下文</p>
                <div className="mt-4"><BarList rows={data.audienceCounts} /></div>
              </section>
              <section className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">反馈结果</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">“有帮助”占已回答反馈的 {completionRate}%</p>
                <div className="mt-4"><BarList rows={[
                  { label: "有帮助", count: data.totals.solved },
                  { label: "还差一点", count: data.totals.partiallySolved },
                  { label: "没帮助", count: data.totals.unsolved },
                ]} /></div>
              </section>
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">最常见卡点</h2>
                    <p className="mt-1 text-xs text-[var(--of-muted)]">优先改这里</p>
                  </div>
                </div>
                <div className="mt-4"><BarList rows={data.issueCounts} /></div>
              </section>
              <section className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">反馈最多的疾病</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">不等于最需要改，结合未解决反馈判断</p>
                <div className="mt-4"><BarList rows={data.diseaseCounts} /></div>
              </section>
            </div>

            <section className="mb-4 overflow-hidden rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)]">
              <div className="border-b border-[var(--of-border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">搜索不到的内容</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">这些词出现多次，就值得补疾病、别名或入口。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--of-surface-muted)] text-left text-xs text-[var(--of-muted)]">
                    <tr>
                      <th className="px-5 py-3 font-medium">关键词</th>
                      <th className="px-5 py-3 font-medium">次数</th>
                      <th className="px-5 py-3 font-medium">提交需求</th>
                      <th className="px-5 py-3 font-medium">最近出现</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.noResultQueries.map((row) => (
                      <tr key={row.query} className="border-t border-[var(--of-border)]">
                        <td className="px-5 py-3 font-medium text-[var(--of-text-strong)]">{row.query}</td>
                        <td className="px-5 py-3 text-[var(--of-muted)]">{row.count}</td>
                        <td className="px-5 py-3 text-[var(--of-muted)]">{row.requestCount}</td>
                        <td className="px-5 py-3 text-[var(--of-muted)]">{formatDate(row.lastSeenAt)}</td>
                      </tr>
                    ))}
                    {!data.noResultQueries.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--of-muted)]">暂无无结果搜索</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)]">
              <div className="border-b border-[var(--of-border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--of-text-strong)]">最近需要处理的反馈</h2>
                <p className="mt-1 text-xs text-[var(--of-muted)]">先处理高风险和“没帮助”，医疗内容仍需人工判断。</p>
              </div>
              <div className="divide-y divide-[var(--of-border)]">
                {data.recentUnresolved.map((row, index) => (
                  <article key={`${row.createdAt}-${index}`} className="p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full border px-2 py-1 font-semibold ${severityClass(row.severity)}`}>{row.severity}</span>
                        <span className="rounded-full bg-[var(--of-surface-muted)] px-2 py-1 text-[var(--of-muted)]">{STATUS_LABELS[row.resultStatus] || row.resultStatus}</span>
                        <span className="text-[var(--of-muted)]">{roleLabel(row.userRole)} · {formatDate(row.createdAt)}</span>
                      </div>
                      <span className="text-xs text-[var(--of-muted)]">{row.diseaseName || "首页"} · {row.reason}</span>
                    </div>
                    {row.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--of-text)]">{row.comment}</p>}
                  </article>
                ))}
                {!data.recentUnresolved.length && <div className="p-8 text-center text-sm text-[var(--of-muted)]">暂无未解决反馈</div>}
              </div>
            </section>

            <p className="mt-4 text-center text-[11px] leading-5 text-[var(--of-muted)]">
              数据范围：最近 {data.days} 天。页面不显示联系方式；仍请勿在反馈中填写患者姓名、住院号或检查号。
            </p>
          </>
        )}
      </div>
    </main>
  )
}
