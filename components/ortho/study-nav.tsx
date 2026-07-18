"use client"

import { Layers, TableProperties, Activity } from "lucide-react"

export function StudyNav({
  hasClassification = true,
  orientation = "vertical",
}: {
  hasClassification?: boolean
  orientation?: "vertical" | "horizontal"
}) {
  const SECTIONS = [
    { id: "imaging", label: hasClassification ? "影像与分型" : "影像库", icon: Layers },
    { id: "surgery", label: "方案对照表", icon: TableProperties },
    { id: "rehab", label: "康复方案", icon: Activity },
  ]

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (orientation === "horizontal") {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="size-3.5" aria-hidden />
              {s.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const Icon = s.icon
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => jump(s.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {s.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
