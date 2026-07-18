"use client"

import { useState } from "react"
import { FileText, ClipboardList, Scissors, BellRing, ChevronRight } from "lucide-react"
import type { QuickActions } from "@/lib/mock-disease-data"
import { CopyButton } from "@/components/copy-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 四个固定卡片：标题与图标由界面决定，内容全部来自数据源
const ACTION_CONFIG = [
  { key: "writeMedicalRecord", title: "写病历", desc: "常用病历模板", icon: FileText },
  { key: "prescribe", title: "开医嘱", desc: "术前 / 术后医嘱", icon: ClipboardList },
  { key: "sutureRemoval", title: "换药拆线", desc: "切口管理流程", icon: Scissors },
  { key: "emergencyHandling", title: "值班处理", desc: "夜班速查处理", icon: BellRing },
] as const

export function WorkQuickActions({ actions }: { actions: QuickActions }) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">快速操作</h3>
      <div className="flex flex-col gap-2">
        {ACTION_CONFIG.map(({ key, title, desc, icon: Icon }) => {
          const content = actions[key]
          return (
            <Dialog key={key} open={openKey === key} onOpenChange={(v) => setOpenKey(v ? key : null)}>
              <DialogTrigger className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{desc}</span>
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>{desc} · 复制后可直接粘贴使用</DialogDescription>
                </DialogHeader>
                <div className="rounded-xl border border-border bg-muted/40">
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                    <span className="text-sm font-semibold text-foreground">{title}模板</span>
                    <CopyButton text={content} />
                  </div>
                  <pre className="whitespace-pre-wrap px-3 py-3 font-sans text-sm leading-relaxed text-foreground/90">
                    {content}
                  </pre>
                </div>
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </section>
  )
}
