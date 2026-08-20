"use client";

import { supabase } from "@/lib/supabase";
import type {
  DiseaseData,
  EvidenceClaim,
  ProcedureData,
  ProcedureFailureMode,
  ProcedureRef,
} from "@/types/orthoflow";
import { useEffect, useMemo, useState } from "react";

function statusLabel(status?: ProcedureRef["status"]) {
  if (status === "published") return "已发布";
  if (status === "updating") return "更新中";
  return "Gold Example";
}

function reviewLabel(status?: ProcedureData["reviewStatus"]) {
  if (status === "human_reviewed") return "人工复核";
  if (status === "evidence_checked") return "证据已核验";
  return "草稿";
}

function BulletCard({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items?: string[];
  tone?: "neutral" | "action" | "warning" | "danger";
}) {
  if (!items?.length) return null;

  const toneClass =
    tone === "action"
      ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]"
      : tone === "warning"
        ? "border-[var(--of-warning-border)] bg-[var(--of-warning-bg)]"
        : tone === "danger"
          ? "border-[var(--of-danger-border)] bg-[var(--of-danger-bg)]"
          : "border-[var(--of-border)] bg-[var(--of-surface)]";

  return (
    <article className={`rounded-2xl border p-5 ${toneClass}`}>
      <h4 className="font-semibold text-[var(--of-text-strong)]">{title}</h4>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--of-muted)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--of-accent)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white">
        {number}
      </span>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--of-accent)]/75">Procedure Module</div>
        <h3 className="mt-0.5 text-lg font-semibold text-[var(--of-text-strong)]">{title}</h3>
        {subtitle && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">{subtitle}</p>}
      </div>
    </div>
  );
}

function FailureModeCard({ item, index }: { item: ProcedureFailureMode; index: number }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] text-xs font-semibold text-[var(--of-danger-text)]">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-[var(--of-text-strong)]">{item.problem}</h4>
          {item.whyItHappens && <p className="mt-2 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">为什么会发生：</span>{item.whyItHappens}</p>}
          {item.prevention && <p className="mt-2 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">预防：</span>{item.prevention}</p>}
          {item.bailout && <p className="mt-2 rounded-xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] px-3 py-2 text-sm leading-6 text-[var(--of-warning-text)]"><span className="font-semibold">Bailout：</span>{item.bailout}</p>}
        </div>
      </div>
    </article>
  );
}

function EvidenceCard({ claim }: { claim: EvidenceClaim }) {
  const status = claim.evidenceVerified === "true" ? "已核验" : claim.evidenceVerified === "partial" ? "部分核验" : "待核验";
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--of-accent)]">{status}</span>
        {claim.sourceType && <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--of-muted)]">{claim.sourceType}</span>}
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--of-text-strong)]">{claim.finalWording || claim.claim}</p>
      {claim.contextLimit && <p className="mt-2 text-xs leading-5 text-[var(--of-muted)]">适用边界：{claim.contextLimit}</p>}
      {claim.sourceTitle && (
        <p className="mt-2 text-xs leading-5 text-[var(--of-muted)]">
          来源：{claim.sourceUrl ? <a className="text-[var(--of-accent)] underline underline-offset-2" href={claim.sourceUrl} target="_blank" rel="noreferrer">{claim.sourceTitle}</a> : claim.sourceTitle}
          {claim.sourceIdentifier ? ` · ${claim.sourceIdentifier}` : ""}
        </p>
      )}
    </article>
  );
}

export default function ProcedureMode({ disease }: { disease: DiseaseData }) {
  const procedures = useMemo(
    () => (Array.isArray(disease.procedureRefs) ? disease.procedureRefs : []),
    [disease.procedureRefs]
  );
  const [selectedId, setSelectedId] = useState(procedures[0]?.id || "");
  const [procedureData, setProcedureData] = useState<ProcedureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setSelectedId(procedures[0]?.id || "");
  }, [disease.id, procedures]);

  const selected = procedures.find((item) => item.id === selectedId) || procedures[0];

  useEffect(() => {
    let cancelled = false;

    async function loadProcedure() {
      if (!selected?.id) {
        setProcedureData(null);
        return;
      }

      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("procedures")
        .select("data")
        .eq("id", selected.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setProcedureData(null);
        setLoadError(error.message || "手术内容加载失败");
      } else {
        setProcedureData((data?.data || null) as ProcedureData | null);
      }
      setLoading(false);
    }

    loadProcedure();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  if (!selected) {
    return (
      <section className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-6 shadow-[0_16px_50px_rgba(39,76,79,.07)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/75">Procedure Pro</div>
        <h3 className="mt-2 text-xl font-semibold text-[var(--of-text-strong)]">该疾病的手术模块正在建设</h3>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-[24px] border border-[var(--of-border)] bg-[var(--of-surface)] p-4 shadow-[0_16px_50px_rgba(39,76,79,.07)] xl:sticky xl:top-28 xl:self-start">
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/70">Procedure Library</div>
          <h3 className="mt-1 font-semibold text-[var(--of-text-strong)]">相关手术</h3>
        </div>
        <div className="space-y-2">
          {procedures.map((procedure) => {
            const active = procedure.id === selected.id;
            return (
              <button key={procedure.id} type="button" onClick={() => setSelectedId(procedure.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]" : "border-[var(--of-border)] bg-[var(--of-surface-muted)] hover:border-[var(--of-accent-border)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--of-text-strong)]">{procedure.name}</div>
                    {procedure.englishName && <div className="mt-1 text-xs text-[var(--of-muted)]">{procedure.englishName}</div>}
                  </div>
                  {procedure.pro && <span className="shrink-0 rounded-full border border-[var(--of-accent-border)] bg-[var(--of-surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--of-accent)]">Pro</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_20px_70px_rgba(39,76,79,.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--of-accent)]">Procedure Pro</span>
                <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--of-muted)]">{statusLabel(selected.status)}</span>
                {procedureData?.reviewStatus && <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--of-muted)]">{reviewLabel(procedureData.reviewStatus)}</span>}
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--of-text-strong)]">{procedureData?.name || selected.name}</h3>
              {(procedureData?.englishName || selected.englishName) && <p className="mt-1 text-sm text-[var(--of-muted)]">{procedureData?.englishName || selected.englishName}</p>}
            </div>
            {procedureData?.evidenceUpdatedAt && <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-4 py-3 text-xs text-[var(--of-muted)]">证据更新：{procedureData.evidenceUpdatedAt}</div>}
          </div>

          {loading ? (
            <p className="mt-5 text-sm text-[var(--of-muted)]">正在加载 Procedure Brain…</p>
          ) : loadError ? (
            <div className="mt-5 rounded-2xl border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] p-4 text-sm text-[var(--of-danger-text)]">手术内容暂未载入：{loadError}</div>
          ) : (
            <>
              <p className="mt-5 max-w-4xl text-sm leading-7 text-[var(--of-muted)]">{procedureData?.summary || selected.summary}</p>
              {procedureData?.scope && <div className="mt-4 rounded-2xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] p-4 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">本页范围：</span>{procedureData.scope}</div>}
            </>
          )}
        </div>

        {procedureData && (
          <>
            <section>
              <SectionTitle number="01" title="手术目标与适用边界" subtitle="先确认为什么做、这页适用于谁，不把 ORIF 变成按分型自动选择。" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <BulletCard title="复位与固定目标" items={procedureData.goals} tone="action" />
                <BulletCard title="常见进入 ORIF 评估的场景" items={procedureData.indicationScenarios} />
                <BulletCard title="不适合直接套本页路径" items={procedureData.notSuitableScenarios} tone="warning" />
              </div>
            </section>

            <section>
              <SectionTitle number="02" title="术前看片：先把骨折变成手术地图" subtitle="Schatzker 只是描述之一；真正决定入路和固定的是 CT 形态、柱/象限、力线与软组织。" />
              <BulletCard title="术前必须确认" items={procedureData.preopImaging} />
            </section>

            <section>
              <SectionTitle number="03" title="术前 10 分钟准备" subtitle="体位、透视通道和备用器械在切皮前先想清楚。" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <BulletCard title="体位与摆台" items={procedureData.positioning} />
                <BulletCard title="C 臂 / 透视" items={procedureData.cArm} />
                <BulletCard title="器械与内植物" items={procedureData.instruments} />
              </div>
            </section>

            <section>
              <SectionTitle number="04" title="Approach 选择" subtitle="入路由骨块位置和需要直视/支撑的方向决定；下一版会把每个入路拆成独立 Approach Atlas。" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {(procedureData.approachRefs || []).map((approach) => (
                  <article key={approach.id} className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-[var(--of-text-strong)]">{approach.name}</h4>
                      {approach.englishName && <span className="text-xs text-[var(--of-muted)]">{approach.englishName}</span>}
                    </div>
                    {approach.when && <p className="mt-3 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">什么时候考虑：</span>{approach.when}</p>}
                    {approach.why && <p className="mt-2 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">为什么：</span>{approach.why}</p>}
                    {approach.stopPoint && <p className="mt-3 rounded-xl border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] px-3 py-2 text-sm leading-6 text-[var(--of-danger-text)]"><span className="font-semibold">停止点：</span>{approach.stopPoint}</p>}
                  </article>
                ))}
              </div>
              <div className="mt-4"><BulletCard title="Danger structures / 高风险结构" items={procedureData.dangerStructures} tone="danger" /></div>
            </section>

            <section>
              <SectionTitle number="05" title="Reduction sequence" subtitle="这里给的是常见复杂骨折的心智顺序，不是任何胫骨平台都机械照做。" />
              <div className="space-y-3">
                {(procedureData.reductionSequence || []).map((item, index) => (
                  <div key={index} className="flex items-start gap-4 rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] text-xs font-semibold text-[var(--of-accent)]">{index + 1}</span>
                    <p className="pt-0.5 text-sm leading-6 text-[var(--of-muted)]">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4"><BulletCard title="固定策略" items={procedureData.fixationStrategy} /></div>
            </section>

            <section>
              <SectionTitle number="06" title="Intra-op checks" subtitle="做完不是看钢板漂亮，而是确认关节面、力线、螺钉与稳定性。" />
              <BulletCard title="结束前逐项检查" items={procedureData.intraopChecks} tone="action" />
            </section>

            <section>
              <SectionTitle number="07" title="Failure modes & bailout" subtitle="把最常见的失败原因提前写进术前计划。" />
              <div className="space-y-3">
                {(procedureData.failureModes || []).map((item, index) => <FailureModeCard key={index} item={item} index={index} />)}
              </div>
            </section>

            <section>
              <SectionTitle number="08" title="术后轨道" subtitle="按固定稳定性、软组织、影像与功能里程碑推进，不用统一周数自动升级。" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <BulletCard title="监测" items={procedureData.postopFramework?.monitoring} />
                <BulletCard title="ROM / 功能" items={procedureData.postopFramework?.rom} />
                <BulletCard title="负重" items={procedureData.postopFramework?.weightBearing} tone="warning" />
                <BulletCard title="随访" items={procedureData.postopFramework?.followUp} />
              </div>
            </section>

            <section>
              <SectionTitle number="09" title="Evidence layer" subtitle="精确时机、固定顺序和负重策略必须保留适用边界。" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(procedureData.evidenceClaims || []).map((claim) => <EvidenceCard key={claim.id} claim={claim} />)}
              </div>
              {procedureData.localPracticeNote && <div className="mt-4 rounded-2xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] p-4 text-sm leading-6 text-[var(--of-warning-text)]"><span className="font-semibold">本院实践层：</span>{procedureData.localPracticeNote}</div>}
            </section>
          </>
        )}

        <div className="rounded-2xl border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] p-4 text-sm leading-6 text-[var(--of-danger-text)]">
          手术与入路内容用于术前学习、讨论与复盘，不替代成熟术者现场指导。复杂骨折如解剖不清、血管神经风险、软组织条件不允许或固定策略超出当前能力，应停止推进并升级给有经验术者。
        </div>
      </section>
    </div>
  );
}
