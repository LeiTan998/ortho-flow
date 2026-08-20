"use client";

import type { DiseaseData, ProcedureRef } from "@/types/orthoflow";
import { useMemo, useState } from "react";

function statusLabel(status?: ProcedureRef["status"]) {
  if (status === "published") return "已发布";
  if (status === "updating") return "更新中";
  return "Gold Example";
}

export default function ProcedureMode({ disease }: { disease: DiseaseData }) {
  const procedures = useMemo(
    () => (Array.isArray(disease.procedureRefs) ? disease.procedureRefs : []),
    [disease.procedureRefs]
  );
  const [selectedId, setSelectedId] = useState(procedures[0]?.id || "");

  const selected =
    procedures.find((item) => item.id === selectedId) || procedures[0];

  if (!selected) {
    return (
      <section className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-6 shadow-[0_16px_50px_rgba(39,76,79,.07)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/75">
          Procedure Pro
        </div>
        <h3 className="mt-2 text-xl font-semibold text-[var(--of-text-strong)]">
          该疾病的手术模块正在建设
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--of-muted)]">
          基础疾病知识继续在“今天上班 / 我要学习”中开放；Procedure Pro 只承载术前准备、入路、复位顺序、术中检查与失败模式等专业效率内容。
        </p>
      </section>
    );
  }

  const proModules = [
    ["术前 10 分钟", "体位、C臂、器械与内植物准备"],
    ["Approach", "表面标志、层次、危险结构与暴露边界"],
    ["Reduction sequence", "复位顺序、临时固定与最终固定逻辑"],
    ["Intra-op checks", "关键透视位与术中判断点"],
    ["Failure modes", "常见失败方式、预防与 bailout"],
    ["术后轨道", "影像、伤口、ROM、负重与功能里程碑"],
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-[24px] border border-[var(--of-border)] bg-[var(--of-surface)] p-4 shadow-[0_16px_50px_rgba(39,76,79,.07)] xl:sticky xl:top-28 xl:self-start">
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/70">
            Procedure Library
          </div>
          <h3 className="mt-1 font-semibold text-[var(--of-text-strong)]">
            相关手术
          </h3>
        </div>

        <div className="space-y-2">
          {procedures.map((procedure) => {
            const active = procedure.id === selected.id;
            return (
              <button
                key={procedure.id}
                type="button"
                onClick={() => setSelectedId(procedure.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]"
                    : "border-[var(--of-border)] bg-[var(--of-surface-muted)] hover:border-[var(--of-accent-border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--of-text-strong)]">
                      {procedure.name}
                    </div>
                    {procedure.englishName && (
                      <div className="mt-1 text-xs text-[var(--of-muted)]">
                        {procedure.englishName}
                      </div>
                    )}
                  </div>
                  {procedure.pro && (
                    <span className="shrink-0 rounded-full border border-[var(--of-accent-border)] bg-[var(--of-surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--of-accent)]">
                      Pro
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_20px_70px_rgba(39,76,79,.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--of-accent)]">
                  Procedure Pro
                </span>
                <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--of-muted)]">
                  {statusLabel(selected.status)}
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--of-text-strong)]">
                {selected.name}
              </h3>
              {selected.englishName && (
                <p className="mt-1 text-sm text-[var(--of-muted)]">
                  {selected.englishName}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-4 py-3 text-sm text-[var(--of-muted)]">
              当前：结构预览
            </div>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-[var(--of-muted)]">
            {selected.summary ||
              "这个模块不是术式百科，而是上台前的认知准备与复盘工具。正式内容将把术前看片、体位、C臂、入路、复位顺序、固定策略、术中检查和失败模式串成一条可执行的手术主线。"}
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] p-4">
            <div className="text-sm font-semibold text-[var(--of-text-strong)]">
              免费层与 Pro 层的边界
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">
              疾病页继续开放急症识别、基础影像、治疗原则与安全信息；Pro 聚焦专业效率，不把基础医学安全信息放进付费墙。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proModules.map(([title, description], index) => (
            <article
              key={title}
              className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_12px_36px_rgba(39,76,79,.05)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] text-xs font-semibold text-[var(--of-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--of-muted)]">
                  待填充
                </span>
              </div>
              <h4 className="mt-4 font-semibold text-[var(--of-text-strong)]">
                {title}
              </h4>
              <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-[#E7D6AC] bg-[var(--of-warning-bg)] p-4 text-sm leading-6 text-[var(--of-warning-text)]">
          手术与入路内容用于术前学习、讨论与复盘，不替代成熟术者现场指导。复杂手术应按“术前计划 → 上级讨论 → 观摩/助手 → 监督下执行 → 术后复盘”的路径学习。
        </div>
      </section>
    </div>
  );
}
