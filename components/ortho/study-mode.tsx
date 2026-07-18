"use client"

import { useState } from "react"
import Image from "next/image"
import { Layers, TableProperties, Activity, Images, ZoomIn } from "lucide-react"
import type { DiseaseData } from "@/lib/mock-disease-data"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface EnlargedImage {
  src: string
  title: string
  description?: string
}

export function StudyMode({ data }: { data: DiseaseData }) {
  const [enlarged, setEnlarged] = useState<EnlargedImage | null>(null)

  return (
    <div className="flex flex-col gap-6">
      {/* 板块一：影像与分型 */}
      <section id="imaging" className="scroll-mt-40 rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          {data.hasClassification ? (
            <Layers className="size-4 text-primary" aria-hidden />
          ) : (
            <Images className="size-4 text-primary" aria-hidden />
          )}
          <h2 className="text-base font-semibold text-foreground">
            {data.hasClassification ? "影像与分型" : "影像库"}
          </h2>
        </div>

        {data.hasClassification ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.classifications.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setEnlarged({ src: c.imageUrl, title: c.typeName, description: c.description })
                  }
                  aria-label={`放大查看 ${c.typeName} 影像`}
                  className="group overflow-hidden rounded-xl border border-border bg-background text-left transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="relative aspect-[3/2] w-full bg-muted">
                    <Image
                      src={c.imageUrl || "/placeholder.svg"}
                      alt={`${c.typeName} 影像示意`}
                      fill
                      sizes="(max-width: 640px) 100vw, 300px"
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      unoptimized
                    />
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      <ZoomIn className="size-3.5" aria-hidden />
                      放大
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="mb-1 font-semibold text-foreground">{c.typeName}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                  </div>
                </button>
              ))}
            </div>
            {data.classificationNote && (
              <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
                {data.classificationNote}
              </p>
            )}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.commonImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setEnlarged({ src: img.url, title: img.title })}
                aria-label={`放大查看 ${img.title}`}
                className="group overflow-hidden rounded-xl border border-border bg-background text-left transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="relative aspect-[3/2] w-full bg-muted">
                  <Image
                    src={img.url || "/placeholder.svg"}
                    alt={img.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    unoptimized
                  />
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <ZoomIn className="size-3.5" aria-hidden />
                    放大
                  </span>
                </div>
                <p className="p-3 text-sm text-foreground/90">{img.title}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 板块二：方案对照表 */}
      <section id="surgery" className="scroll-mt-40 rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <TableProperties className="size-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">方案对照表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {data.surgeryTable.headers.map((h) => (
                  <th key={h} className="py-2 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.surgeryTable.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/60 align-top last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={
                        ci === 0
                          ? "py-3 pr-3 font-semibold text-foreground"
                          : "py-3 pr-3 text-foreground/90"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 板块三：康复方案 */}
      <section id="rehab" className="scroll-mt-40 rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">康复方案</h2>
        </div>

        <ol className="relative flex flex-col">
          {data.rehabPlan.map((phase, i) => {
            const isLast = i === data.rehabPlan.length - 1
            return (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && <span aria-hidden className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />}
                <span
                  aria-hidden
                  className="z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background"
                >
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{phase.phase}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">{phase.content}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* 影像放大弹出层 */}
      <Dialog open={enlarged !== null} onOpenChange={(open) => !open && setEnlarged(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogTitle>{enlarged?.title ?? "影像"}</DialogTitle>
          {enlarged?.description && <DialogDescription>{enlarged.description}</DialogDescription>}
          {enlarged && (
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border">
              <Image
                src={enlarged.src || "/placeholder.svg"}
                alt={`${enlarged.title} 放大影像`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
