"use client"

import { ListChecks } from "lucide-react"
import type { WorkflowStep } from "@/lib/mock-disease-data"

export function WorkMode({ step, index, total }: { step: WorkflowStep; index: number; total: number }) {
  return (
    <div className="flex flex-col gap-5">
      {/* 步骤标题卡 */}
      <div className="rounded-2xl border border-primary/20 bg-accent/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-accent-foreground">
              第 {index + 1} / {total} 步
            </p>
            <h2 className="text-lg font-semibold text-foreground">{step.title}</h2>
          </div>
        </div>
      </div>

      {/* 该步骤的具体任务清单（只读） */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className="size-4 text-primary" aria-hidden />
          <h3 className="text-base font-semibold text-foreground">操作清单</h3>
        </div>

        <ol className="flex flex-col gap-2.5">
          {step.tasks.map((task, i) => (
            <li key={task} className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm leading-relaxed text-foreground/90">{task}</span>
            </li>
          ))}
        </ol>

        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          以上为标准化操作清单，仅供学习参考；具体诊疗以上级医师意见与患者实际情况为准。
        </p>
      </div>
    </div>
  )
}
