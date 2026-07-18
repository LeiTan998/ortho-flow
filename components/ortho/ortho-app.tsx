"use client"

import { useState } from "react"
import { Bone, Stethoscope, GraduationCap, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { type DiseaseData } from "@/lib/mock-disease-data"
import { ThemeToggle } from "@/components/theme-toggle"
import { HomeView } from "@/components/ortho/home-view"
import { DiseaseSearch } from "@/components/ortho/disease-search"
import { WorkflowRail } from "@/components/ortho/workflow-rail"
import { WorkMode } from "@/components/ortho/work-mode"
import { WorkQuickActions } from "@/components/ortho/work-quick-actions"
import { StudyMode } from "@/components/ortho/study-mode"
import { StudyNav } from "@/components/ortho/study-nav"

export type Mode = "work" | "study"
type View = "home" | "detail"

export function OrthoApp() {
  const [view, setView] = useState<View>("home")
  const [data, setData] = useState<DiseaseData | null>(null)
  const [mode, setMode] = useState<Mode>("work")
  const [step, setStep] = useState(0)

  function openDisease(disease: DiseaseData) {
    setData(disease)
    setMode("work")
    setStep(Math.min(3, disease.workflowSteps.length - 1))
    setView("detail")
  }

  function goHome() {
    setView("home")
  }

  if (view === "home" || !data) {
    return <HomeView onSelect={openDisease} />
  }

  const stepTitles = data.workflowSteps.map((s) => s.title)
  const currentStep = data.workflowSteps[step] ?? data.workflowSteps[0]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="返回首页"
            className="flex shrink-0 items-center gap-2 rounded-xl transition-opacity hover:opacity-80"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bone className="size-5" aria-hidden />
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-lg font-bold tracking-tight text-foreground">OrthoFlow</p>
              <p className="text-[11px] text-muted-foreground">骨科轮转助手</p>
            </div>
          </button>
          <div className="flex min-w-0 flex-1 justify-center">
            <DiseaseSearch activeId={data.id} onSelect={openDisease} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={goHome}
              aria-label="返回首页"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="size-5" aria-hidden />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* 当前疾病 */}
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h1 className="text-base font-semibold text-foreground">{data.name}</h1>
            <span className="text-xs text-muted-foreground">{data.englishName}</span>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/50 p-1">
            <ModeButton active={mode === "work"} onClick={() => setMode("work")} icon={Stethoscope} label="今天上班" />
            <ModeButton active={mode === "study"} onClick={() => setMode("study")} icon={GraduationCap} label="我要学习" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        {/* 移动端：左栏内容折叠为横向条 */}
        <div className="mb-4 lg:hidden">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {mode === "work" ? "工作流程" : "学习板块"}
          </p>
          {mode === "work" ? (
            <WorkflowRail steps={stepTitles} current={step} onSelect={setStep} orientation="horizontal" />
          ) : (
            <StudyNav hasClassification={data.hasClassification} orientation="horizontal" />
          )}
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            mode === "work"
              ? "lg:grid-cols-[220px_minmax(0,1fr)_300px]"
              : "lg:grid-cols-[220px_minmax(0,1fr)]",
          )}
        >
          {/* 左栏：工作流程 / 学习板块（桌面端） */}
          <aside className="hidden lg:block">
            <div className="sticky top-44 rounded-2xl border border-border bg-card p-4">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {mode === "work" ? "工作流程" : "学习板块"}
              </p>
              {mode === "work" ? (
                <WorkflowRail steps={stepTitles} current={step} onSelect={setStep} />
              ) : (
                <StudyNav hasClassification={data.hasClassification} />
              )}
            </div>
          </aside>

          {/* 中栏：主内容 */}
          <section className="min-w-0">
            {mode === "work" ? (
              <WorkMode step={currentStep} index={step} total={data.workflowSteps.length} />
            ) : (
              <StudyMode data={data} />
            )}
          </section>

          {/* 右栏：快速操作（仅工作模式） */}
          {mode === "work" && (
            <aside>
              <div className="lg:sticky lg:top-44">
                <WorkQuickActions actions={data.quickActions} />
              </div>
            </aside>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            OrthoFlow 内容仅供骨科轮转学习参考，不作为临床诊疗依据。
          </p>
        </div>
      </footer>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Stethoscope
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  )
}
