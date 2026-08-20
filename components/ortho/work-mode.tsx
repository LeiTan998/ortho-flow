"use client";

import { useState } from "react";
import type { DiseaseData } from "@/types/orthoflow";

export function WorkMode({ disease, currentStep, setCurrentStep }: any) {
  const steps = disease.workflowSteps || [];
  const safeStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const currentTasks = steps[safeStep]?.tasks || [];
  const progress = steps.length > 0 ? ((safeStep + 1) / steps.length) * 100 : 0;

  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-solid)] p-6 text-[var(--of-muted)] shadow-xl">
        该疾病暂无工作流程。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="rounded-[24px] border border-[var(--of-border)] bg-[var(--of-surface-solid)] p-4 shadow-[0_16px_50px_rgba(39,76,79,.07)] xl:sticky xl:top-28 xl:self-start">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--of-accent)]/60">Workflow</div>
            <h3 className="mt-1 font-semibold text-[var(--of-text-strong)]">临床工作流</h3>
          </div>
          <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-xs text-[var(--of-muted)]">
            {safeStep + 1}/{steps.length}
          </span>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--of-surface-solid)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-1.5">
          {steps.map((step: any, index: number) => (
            <button
              key={step.stepId ?? index}
              onClick={() => setCurrentStep(index)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                index === safeStep
                  ? "border border-[#B6DEE2] bg-[var(--of-accent-soft)] text-[var(--of-text-strong)] shadow-[0_10px_30px_rgba(34,211,238,.08)]"
                  : "border border-transparent text-[var(--of-muted)] hover:border-[var(--of-border)] hover:bg-[var(--of-surface-muted)] hover:text-[var(--of-text-strong)]"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-semibold ${
                  index === safeStep
                    ? "bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-white"
                    : "border border-[var(--of-border)] bg-[var(--of-surface-muted)] text-[var(--of-muted)] group-hover:text-[var(--of-muted)]"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 truncate">{step.title || `步骤 ${index + 1}`}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface-solid)] p-5 shadow-[0_20px_70px_rgba(39,76,79,.08)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[var(--of-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/65">
              Current Step
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--of-text-strong)]">
              {steps[safeStep]?.title || "未命名步骤"}
            </h3>
          </div>
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--of-muted)]">Progress</div>
            <div className="mt-1 text-sm font-medium text-[var(--of-accent)]">第 {safeStep + 1} 步，共 {steps.length} 步</div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {currentTasks.map((task: string, index: number) => {
            const matched = task.match(/^([^：:]{2,18})[：:](.+)$/);
            return (
              <div
                key={index}
                className="group flex items-start gap-4 rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-solid)] p-4 transition hover:-translate-y-0.5 hover:border-[#B9DDE1] hover:bg-[var(--of-surface-solid)]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] text-xs font-semibold text-[var(--of-accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  {matched ? (
                    <>
                      <div className="text-sm font-semibold text-[var(--of-text-strong)] sm:text-[15px]">{matched[1]}</div>
                      <div className="mt-1 text-sm leading-6 text-[var(--of-muted)]">{matched[2].trim()}</div>
                    </>
                  ) : (
                    <div className="text-sm leading-6 text-[var(--of-muted)] sm:text-[15px]">{task}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--of-border)] pt-5">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(0, safeStep - 1))}
            disabled={safeStep === 0}
            className="rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-4 py-2.5 text-sm text-[var(--of-muted)] transition hover:border-[#B6DEE2] hover:text-[var(--of-text)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← 上一步
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, safeStep + 1))}
            disabled={safeStep === steps.length - 1}
            className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-400 px-4 py-2.5 text-sm font-semibold text-[var(--of-text-strong)] shadow-[0_10px_28px_rgba(32,166,185,.16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
          >
            下一步 →
          </button>
        </div>
      </section>

      <aside className="space-y-3 xl:sticky xl:top-28 xl:self-start">
        <div className="mb-1 flex items-center justify-between px-1">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--of-accent)]/60">Quick Tools</div>
            <h3 className="mt-1 font-semibold text-[var(--of-text-strong)]">快速操作</h3>
          </div>
        </div>
        {disease.quickActions ? (
          <>
            <QuickActionCard title="写病历" content={disease.quickActions.writeMedicalRecord || "暂无模板"} />
            <QuickActionCard title="开医嘱" content={disease.quickActions.prescribe || "暂无模板"} />
            <QuickActionCard title="拆线换药" content={disease.quickActions.sutureRemoval || "暂无模板"} />
            <QuickActionCard title="值班处理" content={disease.quickActions.emergencyHandling || "暂无模板"} />
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-solid)] p-4 text-sm text-[var(--of-muted)]">
            暂无快速操作模板。
          </div>
        )}
      </aside>
    </div>
  );
}

function QuickActionCard({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      alert("复制失败，请手动选择文本复制");
    }

    document.body.removeChild(textarea);
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-solid)] shadow-[0_14px_42px_rgba(39,76,79,.07)] transition hover:border-[var(--of-accent-border)]">
      <button
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-[var(--of-text-strong)] transition hover:bg-[var(--of-surface-solid)]"
      >
        <span className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.65)]" />
          {title}
        </span>
        <span className={`text-xs text-[var(--of-muted)] transition ${expanded ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--of-border)] px-4 pb-4 pt-3">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-3 text-xs leading-5 text-[var(--of-muted)]">
            {content}
          </pre>
          <button
            onClick={() => handleCopy(content)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-3 py-2 text-xs font-medium text-[var(--of-accent)] transition hover:bg-[var(--of-accent-soft)]"
          >
            {copied ? "已复制" : "复制内容"}
          </button>
        </div>
      )}
    </div>
  );
}


export default WorkMode
