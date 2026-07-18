"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowRailProps {
  steps: string[]
  current: number
  onSelect: (index: number) => void
  orientation?: "vertical" | "horizontal"
}

export function WorkflowRail({ steps, current, onSelect, orientation = "vertical" }: WorkflowRailProps) {
  if (orientation === "horizontal") {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && !active && "border-success/40 bg-success/10 text-success-foreground",
                !active && !done && "border-border bg-card text-muted-foreground",
              )}
            >
              {done && <Check className="size-3.5" aria-hidden />}
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <ol className="relative flex flex-col">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        const isLast = i === steps.length - 1
        return (
          <li key={label} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5",
                  done ? "bg-success/50" : "bg-border",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(i)}
              className="flex items-center gap-3 text-left"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
                  done && "border-success bg-success text-success-foreground",
                  !active && !done && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
