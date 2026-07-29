"use client"

import { useEffect, useState } from "react"

export default function AnalyticsControlPage() {
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    setDisabled(
      window.localStorage.getItem("va-disable") === "true"
    )
  }, [])

  function disableAnalytics() {
    window.localStorage.setItem("va-disable", "true")
    setDisabled(true)
  }

  function enableAnalytics() {
    window.localStorage.removeItem("va-disable")
    setDisabled(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-medium text-cyan-300">
          OrthoFlow Analytics
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          访问统计控制
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          你可以关闭当前浏览器的 Vercel Analytics 统计。
          这个设置只影响当前设备和当前浏览器。
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">当前状态</p>

          <p className="mt-1 text-lg font-semibold">
            {disabled
              ? "当前浏览器不会被统计"
              : "当前浏览器会被统计"}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={disableAnalytics}
            className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            不统计这台设备
          </button>

          <button
            type="button"
            onClick={enableAnalytics}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10"
          >
            恢复统计
          </button>
        </div>

        <a
          href="/"
          className="mt-6 inline-block text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← 返回 OrthoFlow
        </a>
      </section>
    </main>
  )
}