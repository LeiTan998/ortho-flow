"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切换到日间模式" : "切换到夜间模式"}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}
