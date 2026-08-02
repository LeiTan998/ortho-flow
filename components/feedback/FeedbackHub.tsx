"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

type UserRole =
  | "unknown"
  | "medical_student"
  | "resident"
  | "orthopedic_doctor"
  | "other_clinician"
  | "teacher"
  | "patient_family"
  | "other"

type ResultStatus = "solved" | "partially_solved" | "unsolved"

type FeedbackType =
  | "content"
  | "medical_error"
  | "privacy"
  | "copyright"
  | "feature"
  | "usability"
  | "search_request"
  | "other"

type TaskType =
  | "search"
  | "disease_learning"
  | "imaging"
  | "classification"
  | "treatment"
  | "medical_record"
  | "rehab"
  | "case_submission"
  | "other"

type Severity = "low" | "medium" | "high" | "critical"

interface FeedbackHubProps {
  diseaseId?: string | null
  diseaseName?: string | null
  searchQuery?: string
  searchResultCount?: number
  className?: string
}

interface FeedbackDraft {
  userRole: UserRole
  taskType: TaskType
  resultStatus: ResultStatus | ""
  feedbackType: FeedbackType
  reason: string
  severity: Severity
  comment: string
  contactPermission: boolean
  contact: string
  website: string
}

const INITIAL_DRAFT: FeedbackDraft = {
  userRole: "unknown",
  taskType: "disease_learning",
  resultStatus: "",
  feedbackType: "content",
  reason: "",
  severity: "low",
  comment: "",
  contactPermission: false,
  contact: "",
  website: "",
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "unknown", label: "暂不说明" },
  { value: "medical_student", label: "医学生" },
  { value: "resident", label: "规培生 / 住院医" },
  { value: "orthopedic_doctor", label: "骨科医生" },
  { value: "other_clinician", label: "其他临床医生" },
  { value: "teacher", label: "教师 / 带教医生" },
  { value: "patient_family", label: "患者或家属" },
  { value: "other", label: "其他" },
]

const TASK_OPTIONS: Array<{ value: TaskType; label: string }> = [
  { value: "search", label: "查找内容" },
  { value: "disease_learning", label: "学习疾病" },
  { value: "imaging", label: "查看影像" },
  { value: "classification", label: "学习分型" },
  { value: "treatment", label: "理解治疗路径" },
  { value: "medical_record", label: "病历与汇报" },
  { value: "rehab", label: "康复方案" },
  { value: "case_submission", label: "病例投稿" },
  { value: "other", label: "其他" },
]

const FEEDBACK_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "search_request", label: "缺少疾病或内容" },
  { value: "content", label: "内容缺失或不清楚" },
  { value: "feature", label: "功能建议" },
  { value: "usability", label: "页面操作问题" },
  { value: "medical_error", label: "医学内容可能错误" },
  { value: "privacy", label: "患者隐私问题" },
  { value: "copyright", label: "图片或文字版权问题" },
]

const REASON_OPTIONS = [
  "找不到需要的内容",
  "影像图片不足",
  "分型解释不清楚",
  "治疗流程不清楚",
  "手术内容不足",
  "康复方案不足",
  "内容太复杂",
  "内容可能有错误",
  "页面操作困难",
  "其他",
]

function getPageUrl(): string {
  return typeof window === "undefined" ? "" : window.location.href
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  const key = "orthoflow-feedback-session-id"
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(key, created)
  return created
}

async function postJson(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const result = (await response.json().catch(() => ({}))) as {
    error?: string
  }

  if (!response.ok) {
    throw new Error(result.error || `提交失败（HTTP ${response.status}）`)
  }
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"

export default function FeedbackHub({
  diseaseId,
  diseaseName,
  searchQuery = "",
  searchResultCount,
  className = "",
}: FeedbackHubProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draft, setDraft] = useState<FeedbackDraft>(INITIAL_DRAFT)
  const lastSearchSignature = useRef("")

  const hasNoSearchResult =
    searchQuery.trim().length >= 2 && searchResultCount === 0

  const searchSignature = useMemo(
    () => `${searchQuery.trim()}::${searchResultCount ?? "unknown"}`,
    [searchQuery, searchResultCount],
  )

  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2 || typeof searchResultCount !== "number") return
    if (lastSearchSignature.current === searchSignature) return

    const timer = window.setTimeout(() => {
      lastSearchSignature.current = searchSignature
      void postJson("/api/search-log", {
        query,
        resultCount: searchResultCount,
        pageUrl: getPageUrl(),
        sessionId: getSessionId(),
      }).catch(() => undefined)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [searchQuery, searchResultCount, searchSignature])

  function openForm(patch: Partial<FeedbackDraft> = {}) {
    setDraft({ ...INITIAL_DRAFT, ...patch })
    setIsOpen(true)
  }

  async function submitSolved() {
    try {
      await postJson("/api/feedback", {
        pageUrl: getPageUrl(),
        diseaseId,
        diseaseName,
        featureName: "feedback_v1_1",
        userRole: "unknown",
        taskType: "disease_learning",
        resultStatus: "solved",
        feedbackType: "content",
        severity: "low",
        metadata: { entry: "page_resolution" },
      })
      toast.success("已记录，谢谢")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败")
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await postJson("/api/feedback", {
        pageUrl: getPageUrl(),
        diseaseId,
        diseaseName,
        featureName: "feedback_v1_1",
        ...draft,
        resultStatus: draft.resultStatus || null,
        metadata: {
          entry:
            draft.feedbackType === "search_request"
              ? "search_no_result"
              : draft.feedbackType === "medical_error" ||
                  draft.feedbackType === "privacy" ||
                  draft.feedbackType === "copyright"
                ? "safety_report"
                : "general_feedback",
          searchQuery: searchQuery.trim() || null,
          searchResultCount:
            typeof searchResultCount === "number" ? searchResultCount : null,
        },
      })

      if (draft.feedbackType === "search_request" && searchQuery.trim()) {
        await postJson("/api/search-log", {
          query: searchQuery.trim(),
          resultCount: searchResultCount ?? 0,
          submittedRequest: true,
          userRole: draft.userRole,
          pageUrl: getPageUrl(),
          sessionId: getSessionId(),
        }).catch(() => undefined)
      }

      toast.success("反馈已提交")
      setIsOpen(false)
      setDraft(INITIAL_DRAFT)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSafetyReport =
    draft.feedbackType === "medical_error" ||
    draft.feedbackType === "privacy" ||
    draft.feedbackType === "copyright"

  return (
    <div className={className}>
      {hasNoSearchResult && (
        <section className="mb-6 rounded-2xl border border-amber-400/35 bg-amber-400/[0.08] p-5 text-slate-100">
          <p className="text-sm font-semibold">没有找到相关内容</p>
          <p className="mt-1 text-sm text-slate-300">
            你刚才搜索的是：
            <span className="ml-1 font-medium text-white">{searchQuery.trim()}</span>
          </p>
          <button
            type="button"
            onClick={() =>
              openForm({
                taskType: "search",
                feedbackType: "search_request",
                reason: "找不到需要的内容",
                comment: `希望增加：${searchQuery.trim()}`,
              })
            }
            className="mt-4 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/20"
          >
            提交这个需求
          </button>
        </section>
      )}

      {diseaseId && (
        <section className="mt-8 rounded-2xl border border-white/15 bg-slate-900/75 p-5 text-slate-100">
          <p className="font-semibold">这页是否解决了你刚才的问题？</p>
          <p className="mt-1 text-sm text-slate-400">
            反馈只需几秒，用于决定下一步优先改什么。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submitSolved()}
              className="rounded-xl border border-emerald-400/50 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/10"
            >
              解决了
            </button>
            <button
              type="button"
              onClick={() =>
                openForm({
                  resultStatus: "partially_solved",
                  feedbackType: "content",
                })
              }
              className="rounded-xl border border-slate-500 px-4 py-2 text-sm transition hover:bg-slate-800"
            >
              部分解决
            </button>
            <button
              type="button"
              onClick={() =>
                openForm({ resultStatus: "unsolved", feedbackType: "content" })
              }
              className="rounded-xl border border-rose-400/50 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/10"
            >
              没有解决
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              openForm({
                feedbackType: "medical_error",
                severity: "high",
                taskType: "disease_learning",
              })
            }
            className="mt-4 text-sm font-medium text-rose-300 underline-offset-4 hover:underline"
          >
            医学纠错 / 隐私与版权举报
          </button>
        </section>
      )}

      <button
        type="button"
        onClick={() => openForm()}
        className="fixed bottom-5 right-5 z-[80] rounded-full border border-cyan-300/35 bg-[#071423] px-4 py-3 text-sm font-semibold text-cyan-100 shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#0b2035]"
        aria-label="打开反馈表"
      >
        反馈
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="OrthoFlow反馈表"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsOpen(false)
          }}
        >
          <form
            onSubmit={submitForm}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6"
            style={{ colorScheme: "light" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">反馈 OrthoFlow</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  请勿填写患者姓名、住院号、检查号或其他身份信息。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                关闭
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-800">你的身份</span>
                <select
                  value={draft.userRole}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      userRole: event.target.value as UserRole,
                    }))
                  }
                  className={inputClass}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-800">你刚才想完成什么</span>
                <select
                  value={draft.taskType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      taskType: event.target.value as TaskType,
                    }))
                  }
                  className={inputClass}
                >
                  {TASK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-slate-800">反馈类型</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {FEEDBACK_OPTIONS.map((option) => {
                  const checked = draft.feedbackType === option.value
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                        checked
                          ? "border-cyan-600 bg-cyan-50 font-medium text-cyan-950"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedbackType"
                        value={option.value}
                        checked={checked}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            feedbackType: option.value,
                            severity:
                              option.value === "privacy" ||
                              option.value === "copyright"
                                ? "critical"
                                : option.value === "medical_error"
                                  ? "high"
                                  : "low",
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {!isSafetyReport && (
              <label className="mt-5 grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-800">主要卡在哪里</span>
                <select
                  value={draft.reason}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, reason: event.target.value }))
                  }
                  className={inputClass}
                >
                  <option value="">请选择</option>
                  {REASON_OPTIONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isSafetyReport && (
              <label className="mt-5 grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-800">严重程度</span>
                <select
                  value={draft.severity}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      severity: event.target.value as Severity,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="medium">普通问题</option>
                  <option value="high">可能影响医学理解</option>
                  <option value="critical">严重错误、隐私或版权风险</option>
                </select>
              </label>
            )}

            <label className="mt-5 grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-800">
                具体说明 {isSafetyReport ? "（必填）" : "（选填）"}
              </span>
              <textarea
                value={draft.comment}
                required={isSafetyReport}
                maxLength={1000}
                rows={5}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, comment: event.target.value }))
                }
                placeholder="请描述具体页面、内容或当时想完成的任务。请勿填写患者身份信息。"
                className={`${inputClass} resize-y`}
              />
              <span className="text-right text-xs text-slate-500">
                {draft.comment.length}/1000
              </span>
            </label>

            <label className="mt-5 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.contactPermission}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contactPermission: event.target.checked,
                    contact: event.target.checked ? current.contact : "",
                  }))
                }
                className="mt-1"
              />
              <span>愿意参加一次10分钟产品访谈</span>
            </label>

            {draft.contactPermission && (
              <label className="mt-3 grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-800">联系方式</span>
                <input
                  value={draft.contact}
                  required
                  maxLength={200}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, contact: event.target.value }))
                  }
                  placeholder="邮箱、微信号或其他联系方式"
                  className={inputClass}
                />
              </label>
            )}

            <label className="sr-only" aria-hidden="true">
              网站
              <input
                tabIndex={-1}
                autoComplete="off"
                value={draft.website}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, website: event.target.value }))
                }
              />
            </label>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "提交中…" : "提交反馈"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
