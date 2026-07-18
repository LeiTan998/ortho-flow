"use client"

import { useMemo, useState } from "react"
import { Bone, Search, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { diseaseList, searchDiseases, type DiseaseData } from "@/lib/mock-disease-data"
import { ThemeToggle } from "@/components/theme-toggle"

export function HomeView({ onSelect }: { onSelect: (disease: DiseaseData) => void }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchDiseases(query), [query])
  const hasQuery = query.trim().length > 0

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 顶部：Logo + 副标题 */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bone className="size-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-xl font-bold tracking-tight text-foreground">OrthoFlow</p>
              <p className="text-xs text-muted-foreground">骨科轮转规范化培训工具</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* 中部：搜索区 */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-12 pb-8 sm:pt-20">
        <div className="text-center">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            查一查，规范每一步临床操作
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
            搜索疾病，获取标准化工作流程与系统化学习要点
          </p>
        </div>

        {/* 大号搜索框 */}
        <div className="relative mx-auto mt-8 w-full max-w-2xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索疾病名称、英文简称、拼音..."
            aria-label="搜索疾病"
            autoFocus
            className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
          />

          {/* 实时匹配结果 */}
          {hasQuery && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
              {results.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto py-1.5">
                  {results.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(d)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Bone className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">{d.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {d.englishName}
                            {d.abbr ? ` · ${d.abbr}` : ""}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                  未找到匹配的疾病，试试其他关键词
                </p>
              )}
            </div>
          )}
        </div>

        {/* 快捷入口：热门疾病 */}
        <section className="mx-auto mt-14 w-full max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">热门疾病</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {diseaseList.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all",
                  "hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{d.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.englishName}</span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* 底部：收录统计 */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-5">
          <p className="text-center text-sm text-muted-foreground">
            当前收录 <span className="font-semibold text-foreground">{diseaseList.length}</span> 种骨科疾病
          </p>
        </div>
      </footer>
    </div>
  )
}
