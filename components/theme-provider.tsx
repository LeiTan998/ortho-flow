"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
})

const STORAGE_KEY = "orthoflow-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  // 同步初始状态（脚本已在 <head> 中应用了 class）
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "light"
    setTheme(stored)
    document.documentElement.classList.toggle("dark", stored === "dark")
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      document.documentElement.classList.toggle("dark", next === "dark")
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // 忽略存储异常
      }
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
