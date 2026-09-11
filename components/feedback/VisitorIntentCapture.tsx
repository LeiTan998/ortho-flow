"use client"

import { useEffect, useState } from "react"
import { trackVisitorEvent } from "@/lib/visitorAnalytics"
import type { Audience } from "@/lib/visitorContext"

type UserRole =
  | "medical_student"
  | "resident"
  | "orthopedic_doctor"
  | "patient_family"

const CAPTURE_KEY = "orthoflow-visitor-intent-captured"

const OPTIONS: Array<{
  value: UserRole
  label: string
  audience: Audience
}> = [
  { value: "patient_family", label: "患者 / 家属", audience: "patient" },
  { value: "medical_student", label: "医学生", audience: "clinician" },
  { value: "resident", label: "规培生 / 住院医", audience: "clinician" },
  { value: "orthopedic_doctor", label: "骨科医生", audience: "clinician" },
]

function hasCapturedIntent() {
  if (typeof window === "undefined") return false

  try {
    return window.localStorage.getItem(CAPTURE_KEY) === "1"
  } catch {
    return false
  }
}

function markIntentCaptured() {
  try {
    window.localStorage.setItem(CAPTURE_KEY, "1")
  } catch {
    // 隐私模式下仍然允许当前页面完成选择。
  }
}

interface VisitorIntentCaptureProps {
  onAudienceChange: (audience: Audience) => void
}

export default function VisitorIntentCapture({
  onAudienceChange,
}: VisitorIntentCaptureProps) {
  const [isReady, setIsReady] = useState(false)
  const [isCaptured, setIsCaptured] = useState(false)

  useEffect(() => {
    setIsCaptured(hasCapturedIntent())
    setIsReady(true)
  }, [])

  if (!isReady || isCaptured) return null

  function selectOption(option: (typeof OPTIONS)[number]) {
    markIntentCaptured()
    setIsCaptured(true)
    onAudienceChange(option.audience)
    trackVisitorEvent("visitor_intent_selected", option.audience, {
      userRole: option.value,
    })
  }

  function skip() {
    markIntentCaptured()
    setIsCaptured(true)
    trackVisitorEvent("visitor_intent_skipped", "patient")
  }

  return (
    <section className="mt-5 max-w-2xl rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--of-text-strong)]">
            你主要是哪类使用者？
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--of-muted)]">
            点一下就好，帮助我把患者内容和临床学习内容分开改进。
          </p>
        </div>
        <button
          type="button"
          onClick={skip}
          className="self-start text-xs text-[var(--of-muted)] underline-offset-4 hover:text-[var(--of-text-strong)] hover:underline sm:self-auto"
        >
          以后再说
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => selectOption(option)}
            className="min-h-11 rounded-xl border border-[var(--of-border)] bg-[var(--of-surface)] px-3 py-2 text-left text-xs font-medium text-[var(--of-text-strong)] transition hover:border-[var(--of-accent-border)] hover:bg-[var(--of-accent-soft)]"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
