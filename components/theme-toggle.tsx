"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "切换到白天模式" : "切换到夜间模式"}
      title={isDark ? "切换到白天模式" : "切换到夜间模式"}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--of-border)] bg-[var(--of-surface)] px-3 text-sm font-medium text-[var(--of-muted)] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[var(--of-text-strong)]"
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{isDark ? "白天" : "夜间"}</span>
    </button>
  )
}

export default ThemeToggle
