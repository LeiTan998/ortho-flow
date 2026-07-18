"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchDiseases, type DiseaseData } from "@/lib/mock-disease-data"

interface DiseaseSearchProps {
  activeId: string
  onSelect: (disease: DiseaseData) => void
}

export function DiseaseSearch({ activeId, onSelect }: DiseaseSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 按中文名 / 英文名 / 英文简称 / 拼音模糊匹配
  const results = useMemo(() => searchDiseases(query), [query])

  // 点击外部关闭结果面板
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleSelect(disease: DiseaseData) {
    onSelect(disease)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="搜索疾病..."
          aria-label="搜索疾病"
          className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setOpen(false)
            }}
            aria-label="清除搜索"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {results.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent",
                      d.id === activeId && "bg-accent/60",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{d.englishName}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-center text-sm text-muted-foreground">未找到匹配的疾病</p>
          )}
        </div>
      )}
    </div>
  )
}
