"use client";

import type { OrthoTheme } from "@/types/orthoflow";

export default function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: OrthoTheme;
  onToggle: () => void;
}) {
  const isNight = theme === "night";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isNight ? "切换到白天模式" : "切换到夜间模式"}
      title={isNight ? "切换到白天模式" : "切换到夜间模式"}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--of-border)] bg-[var(--of-surface)] px-3 text-sm font-medium text-[var(--of-muted)] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[var(--of-text-strong)]"
    >
      <span aria-hidden="true" className="text-base">{isNight ? "☀" : "☾"}</span>
      <span className="hidden sm:inline">{isNight ? "白天" : "夜间"}</span>
    </button>
  );
}
