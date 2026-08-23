"use client";

import { supabase } from "@/lib/supabase";
import type {
  DiseaseData,
  EvidenceClaim,
  ProcedureApproachGuide,
  ProcedureData,
  ProcedureFailureMode,
  ProcedureImagingView,
  ProcedureInstrumentGroup,
  ProcedureRef,
  ProcedureSurgicalStep,
} from "@/types/orthoflow";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ProcedureTab = "overview" | "approach" | "anatomy" | "steps" | "instruments" | "imaging";

const TAB_LABELS: Array<{ id: ProcedureTab; label: string; hint: string }> = [
  { id: "overview", label: "手术概览", hint: "先知道有哪些方案" },
  { id: "approach", label: "入路怎么选", hint: "骨块 → 暴露 → 入路" },
  { id: "anatomy", label: "解剖与危险区", hint: "一层层认结构" },
  { id: "steps", label: "手术怎么做", hint: "术前心智排练" },
  { id: "instruments", label: "器械与内固定", hint: "什么时候拿什么" },
  { id: "imaging", label: "术中 / 术后看片", hint: "做完怎么看" },
];

function statusLabel(status?: ProcedureRef["status"]) {
  if (status === "published") return "已发布";
  if (status === "updating") return "更新中";
  if (status === "preview") return "待细化";
  return "草稿";
}

function reviewLabel(status?: ProcedureData["reviewStatus"]) {
  if (status === "human_reviewed") return "人工复核";
  if (status === "evidence_checked") return "证据已核验";
  return "草稿";
}

function MiniList({ items, tone = "normal" }: { items?: string[]; tone?: "normal" | "danger" | "warning" }) {
  if (!items?.length) return null;
  const dot = tone === "danger" ? "bg-[var(--of-danger-text)]" : tone === "warning" ? "bg-[var(--of-warning-text)]" : "bg-[var(--of-accent)]";
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--of-muted)]">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children, tone = "normal" }: { title: string; children: ReactNode; tone?: "normal" | "danger" | "warning" | "accent" }) {
  const cls =
    tone === "danger"
      ? "border-[var(--of-danger-border)] bg-[var(--of-danger-bg)]"
      : tone === "warning"
        ? "border-[var(--of-warning-border)] bg-[var(--of-warning-bg)]"
        : tone === "accent"
          ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]"
          : "border-[var(--of-border)] bg-[var(--of-surface)]";
  return (
    <article className={`rounded-2xl border p-5 ${cls}`}>
      <h4 className="mb-3 font-semibold text-[var(--of-text-strong)]">{title}</h4>
      {children}
    </article>
  );
}

function SurgeryStrategyTable({ table }: { table?: { headers?: string[]; rows?: any[][] } }) {
  const headers = Array.isArray(table?.headers) ? table?.headers || [] : [];
  const rows = Array.isArray(table?.rows) ? table?.rows || [] : [];
  if (!headers.length && !rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)]">
      <table className="min-w-full text-sm">
        {!!headers.length && (
          <thead className="bg-[var(--of-surface-muted)]">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-[var(--of-text-strong)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-[var(--of-border)]">
              {(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => (
                <td key={cellIndex} className="min-w-40 px-4 py-3 align-top leading-6 text-[var(--of-muted)]">
                  {typeof cell === "string" || typeof cell === "number" ? String(cell) : JSON.stringify(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApproachDecisionCard({ approach }: { approach: ProcedureApproachGuide }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-lg font-semibold text-[var(--of-text-strong)]">{approach.name}</h4>
        {approach.englishName && <span className="text-xs text-[var(--of-muted)]">{approach.englishName}</span>}
        {approach.humanReviewRequired && (
          <span className="rounded-full border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--of-warning-text)]">需术者复核</span>
        )}
      </div>
      {approach.keyPoint && <p className="mt-3 rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-3 py-2 text-sm leading-6 text-[var(--of-text-strong)]">{approach.keyPoint}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--of-accent)]">最适合解决</div>
          <MiniList items={approach.bestFor} />
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--of-accent)]">能直接看见 / 控制</div>
          <MiniList items={approach.exposes} />
        </div>
      </div>
      {!!approach.limitations?.length && (
        <div className="mt-4 rounded-xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] p-3">
          <div className="mb-2 text-xs font-semibold text-[var(--of-warning-text)]">不要指望它解决</div>
          <MiniList items={approach.limitations} tone="warning" />
        </div>
      )}
    </article>
  );
}

function AnatomyCard({ approach }: { approach: ProcedureApproachGuide }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-[var(--of-text-strong)]">{approach.name}</h4>
          <p className="mt-1 text-xs text-[var(--of-muted)]">目标不是背解剖名词，而是知道“下一层应该看到什么”。</p>
        </div>
        {approach.humanReviewRequired && <span className="rounded-full border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--of-danger-text)]">高风险区域</span>}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--of-accent)]">从浅到深</div>
          <ol className="space-y-3">
            {(approach.anatomyLayers || []).map((layer, index) => (
              <li key={index} className="flex gap-3 text-sm leading-6 text-[var(--of-muted)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] text-[11px] font-semibold text-[var(--of-accent)]">{index + 1}</span>
                <span>{layer}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--of-danger-text)]">危险结构 / 停止点</div>
          <MiniList items={approach.dangerStructures} tone="danger" />
        </div>
      </div>
    </article>
  );
}

function StepCard({ step, index }: { step: ProcedureSurgicalStep; index: number }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-semibold text-[var(--of-text-strong)]">{step.title}</h4>
          {step.goal && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]"><span className="font-semibold text-[var(--of-text-strong)]">这一步的目标：</span>{step.goal}</p>}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {!!step.actions?.length && <Card title="脑子里怎么走"><MiniList items={step.actions} /></Card>}
            {!!step.instruments?.length && <Card title="常见会用到"><MiniList items={step.instruments} /></Card>}
            {!!step.watchFor?.length && <Card title="最怕什么" tone="danger"><MiniList items={step.watchFor} tone="danger" /></Card>}
            {!!step.checkpoint?.length && <Card title="做到什么算过关" tone="accent"><MiniList items={step.checkpoint} /></Card>}
          </div>
        </div>
      </div>
    </article>
  );
}

function InstrumentGroupCard({ group }: { group: ProcedureInstrumentGroup }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <h4 className="text-lg font-semibold text-[var(--of-text-strong)]">{group.group}</h4>
      <div className="mt-4 space-y-3">
        {(group.items || []).map((item, index) => (
          <div key={index} className="rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4">
            <div className="font-semibold text-[var(--of-text-strong)]">{item.name}</div>
            {item.role && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]"><span className="font-medium text-[var(--of-text-strong)]">干什么：</span>{item.role}</p>}
            {item.when && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]"><span className="font-medium text-[var(--of-text-strong)]">什么时候出现：</span>{item.when}</p>}
            {item.commonMistake && <p className="mt-2 text-sm leading-6 text-[var(--of-warning-text)]"><span className="font-medium">常见误区：</span>{item.commonMistake}</p>}
          </div>
        ))}
      </div>
    </article>
  );
}

function ImagingViewCard({ item }: { item: ProcedureImagingView }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
      <h4 className="text-lg font-semibold text-[var(--of-text-strong)]">{item.view}</h4>
      {item.purpose && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">{item.purpose}</p>}
      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--of-accent)]">重点看</div>
        <MiniList items={item.lookFor} />
      </div>
      {!!item.pitfalls?.length && (
        <div className="mt-4 rounded-xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] p-3">
          <div className="mb-2 text-xs font-semibold text-[var(--of-warning-text)]">容易看错</div>
          <MiniList items={item.pitfalls} tone="warning" />
        </div>
      )}
    </article>
  );
}

function FailureModeCard({ item, index }: { item: ProcedureFailureMode; index: number }) {
  return (
    <article className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--of-danger-border)] bg-[var(--of-danger-bg)] text-xs font-semibold text-[var(--of-danger-text)]">{index + 1}</span>
        <div>
          <h4 className="font-semibold text-[var(--of-text-strong)]">{item.problem}</h4>
          {item.prevention && <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">{item.prevention}</p>}
        </div>
      </div>
    </article>
  );
}

function EvidenceCard({ claim }: { claim: EvidenceClaim }) {
  return (
    <article className="rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4">
      <div className="text-sm font-medium leading-6 text-[var(--of-text-strong)]">{claim.finalWording || claim.claim}</div>
      {claim.sourceTitle && <p className="mt-2 text-xs leading-5 text-[var(--of-muted)]">来源：{claim.sourceUrl ? <a className="text-[var(--of-accent)] underline underline-offset-2" href={claim.sourceUrl} target="_blank" rel="noreferrer">{claim.sourceTitle}</a> : claim.sourceTitle}</p>}
      {claim.contextLimit && <p className="mt-1 text-xs leading-5 text-[var(--of-muted)]">边界：{claim.contextLimit}</p>}
    </article>
  );
}

export default function ProcedureMode({ disease }: { disease: DiseaseData }) {
  const procedures = useMemo(() => (Array.isArray(disease.procedureRefs) ? disease.procedureRefs : []), [disease.procedureRefs]);
  const [selectedId, setSelectedId] = useState(procedures[0]?.id || "");
  const [procedureData, setProcedureData] = useState<ProcedureData | null>(null);
  const [activeTab, setActiveTab] = useState<ProcedureTab>("overview");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setSelectedId(procedures[0]?.id || "");
    setActiveTab("overview");
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
      const { data, error } = await supabase.from("procedures").select("data").eq("id", selected.id).maybeSingle();
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
    return () => { cancelled = true; };
  }, [selected?.id]);

  if (!selected) {
    const fallbackTable = disease.surgeryTable;
    const hasFallbackTable = Boolean(fallbackTable?.headers?.length || fallbackTable?.rows?.length);
    return (
      <section className="space-y-4">
        <header className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-6 shadow-[0_16px_50px_rgba(39,76,79,.07)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/75">Procedure Pro</div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--of-text-strong)]">{disease.name} · 手术 Pro</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--of-muted)]">每个疾病都预留手术区。当前数据库尚未建立该疾病的独立 Procedure 记录，先显示疾病模板里已有的手术策略；执行统一迁移 SQL 后会自动建立对应数据。</p>
        </header>
        {hasFallbackTable ? (
          <Card title="现有手术策略概览"><SurgeryStrategyTable table={fallbackTable} /></Card>
        ) : (
          <Card title="手术内容待补充" tone="warning"><p className="text-sm leading-7 text-[var(--of-warning-text)]">该疾病目前没有可安全自动迁移的手术内容。这里只建立入口，不自动编造入路、步骤、器械或影像要点；后续按病种逐一补充。</p></Card>
        )}
      </section>
    );
  }

  const approaches = procedureData?.approachGuide || [];
  const overviewTable = procedureData?.legacySurgeryTable || disease.surgeryTable;
  const availableTabs = TAB_LABELS.filter((tab) => {
    if (tab.id === "overview") return true;
    if (tab.id === "approach") return approaches.length > 0;
    if (tab.id === "anatomy") return approaches.some((item) => item.anatomyLayers?.length) || Boolean(procedureData?.dangerStructures?.length);
    if (tab.id === "steps") return Boolean(procedureData?.surgicalSteps?.length || procedureData?.failureModes?.length);
    if (tab.id === "instruments") return Boolean(procedureData?.instrumentGroups?.length);
    if (tab.id === "imaging") return Boolean(procedureData?.imagingChecklist);
    return false;
  });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
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
                <div className="font-semibold text-[var(--of-text-strong)]">{procedure.name}</div>
                {procedure.englishName && <div className="mt-1 text-xs text-[var(--of-muted)]">{procedure.englishName}</div>}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <header className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_20px_70px_rgba(39,76,79,.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--of-accent)]">Procedure Pro</span>
                <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-[10px] text-[var(--of-muted)]">{statusLabel(selected.status)}</span>
                {procedureData?.reviewStatus && <span className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-2.5 py-1 text-[10px] text-[var(--of-muted)]">{reviewLabel(procedureData.reviewStatus)}</span>}
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--of-text-strong)]">{procedureData?.name || selected.name}</h3>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--of-muted)]">{procedureData?.summary || selected.summary}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] p-4 text-sm leading-6 text-[var(--of-warning-text)]">
            这页用于术前学习、讨论和复盘。目标是让你知道“下一步应该看到什么、考虑什么”，不替代成熟术者现场带教或监督下操作。
          </div>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-2">
          <div className="flex min-w-max gap-2">
            {availableTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-xl border px-4 py-3 text-left transition ${active ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]" : "border-transparent hover:border-[var(--of-border)] hover:bg-[var(--of-surface-muted)]"}`}>
                  <div className={`text-sm font-semibold ${active ? "text-[var(--of-accent)]" : "text-[var(--of-text-strong)]"}`}>{tab.label}</div>
                  <div className="mt-0.5 text-[10px] text-[var(--of-muted)]">{tab.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {loading && <Card title="正在加载"><p className="text-sm text-[var(--of-muted)]">正在读取 Procedure 数据…</p></Card>}
        {loadError && <Card title="加载失败" tone="danger"><p className="text-sm text-[var(--of-danger-text)]">{loadError}</p></Card>}

        {procedureData && !loading && (
          <>
            {activeTab === "overview" && (
              <div className="space-y-4">
                {procedureData.contentStatus === "overview_seeded" && (
                  <Card title="这是统一迁移的手术概览" tone="warning">
                    <p className="text-sm leading-7 text-[var(--of-warning-text)]">这一页已经进入 Procedure 数据库，但目前主要承接原疾病模板里的手术策略。入路、解剖、具体步骤、器械和术中/术后看片只在人工整理后显示，避免批量自动生成不可靠的手术细节。</p>
                  </Card>
                )}
                {procedureData.scope && <Card title="这个手术区解决什么"><p className="text-sm leading-7 text-[var(--of-muted)]">{procedureData.scope}</p></Card>}
                {!!procedureData.goals?.length && <Card title="主要目标" tone="accent"><MiniList items={procedureData.goals} /></Card>}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {!!procedureData.indicationScenarios?.length && <Card title="常见进入手术讨论的场景"><MiniList items={procedureData.indicationScenarios} /></Card>}
                  {!!procedureData.notSuitableScenarios?.length && <Card title="先别急着按这个方案做" tone="warning"><MiniList items={procedureData.notSuitableScenarios} tone="warning" /></Card>}
                </div>
                {(overviewTable?.headers?.length || overviewTable?.rows?.length) ? (
                  <Card title="疾病模板里的手术策略"><SurgeryStrategyTable table={overviewTable} /></Card>
                ) : (
                  procedureData.contentStatus === "overview_seeded" && <Card title="下一步补什么"><p className="text-sm leading-7 text-[var(--of-muted)]">当前只完成了数据库占位。后续应按真实临床价值补：常见术式 → 入路 → 解剖危险区 → 手术步骤 → 器械/内固定 → 术中与术后影像。</p></Card>
                )}
              </div>
            )}

            {activeTab === "approach" && (
              <div className="space-y-4">
                <Card title="先记住这一句" tone="accent"><p className="text-sm leading-7 text-[var(--of-text-strong)]">不是 Schatzker 几型决定切口，而是 CT 上“哪块骨头需要被直接看见、复位和支撑”决定入路。</p></Card>
                {approaches.map((approach) => <ApproachDecisionCard key={approach.id} approach={approach} />)}
              </div>
            )}

            {activeTab === "anatomy" && (
              <div className="space-y-4">
                {approaches.filter((item) => item.anatomyLayers?.length).map((approach) => <AnatomyCard key={approach.id} approach={approach} />)}
                {!!procedureData.dangerStructures?.length && <Card title="跨入路都要记住的危险点" tone="danger"><MiniList items={procedureData.dangerStructures} tone="danger" /></Card>}
              </div>
            )}

            {activeTab === "steps" && (
              <div className="space-y-4">
                <Card title="手术主线" tone="accent"><p className="text-sm leading-7 text-[var(--of-text-strong)]">这是“脑中走一遍”的常见主线，不是所有骨折机械照做。复杂双髁、后柱和特殊软组织情况必须按真实 CT 形态调整顺序。</p></Card>
                {(procedureData.surgicalSteps || []).map((step, index) => <StepCard key={step.id} step={step} index={index} />)}
                {!!procedureData.failureModes?.length && (
                  <div>
                    <h4 className="mb-3 text-lg font-semibold text-[var(--of-text-strong)]">最常见的翻车点</h4>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {procedureData.failureModes.map((item, index) => <FailureModeCard key={index} item={item} index={index} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "instruments" && (
              <div className="space-y-4">
                <Card title="看器械时别先背品牌" tone="accent"><p className="text-sm leading-7 text-[var(--of-text-strong)]">先问这个器械在“暴露、牵开、复位、临时固定、最终固定”哪一步出现，它解决什么问题。</p></Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {(procedureData.instrumentGroups || []).map((group) => <InstrumentGroupCard key={group.group} group={group} />)}
                </div>
              </div>
            )}

            {activeTab === "imaging" && (
              <div className="space-y-4">
                <Card title="术中透视" tone="accent"><p className="text-sm leading-7 text-[var(--of-text-strong)]">不要满足于一句“正侧位满意”。每个视图都要回答它正在排除什么错误。</p></Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {(procedureData.imagingChecklist?.intraop || []).map((item) => <ImagingViewCard key={item.view} item={item} />)}
                </div>
                <Card title={`术后第一张片：${procedureData.imagingChecklist?.mnemonic || "建立基准片"}`}>
                  <MiniList items={procedureData.imagingChecklist?.postopBaseline} />
                </Card>
                <Card title="后续复查：永远和术后基准片比较">
                  <MiniList items={procedureData.imagingChecklist?.followUp} />
                </Card>
                {!!procedureData.imagingChecklist?.whenToEscalateImaging?.length && <Card title="什么时候不要只盯普通 X 线" tone="warning"><MiniList items={procedureData.imagingChecklist.whenToEscalateImaging} tone="warning" /></Card>}
              </div>
            )}

            {(procedureData.evidenceClaims?.length || procedureData.localPracticeNote) && (
              <details className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                <summary className="cursor-pointer font-semibold text-[var(--of-text-strong)]">来源与复核（后台层）</summary>
                <p className="mt-2 text-xs leading-5 text-[var(--of-muted)]">这部分只负责防错和更新，不作为手术学习主路径。</p>
                {!!procedureData.evidenceClaims?.length && (
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {procedureData.evidenceClaims.map((claim) => <EvidenceCard key={claim.id} claim={claim} />)}
                  </div>
                )}
                {procedureData.localPracticeNote && <div className="mt-4 rounded-xl border border-[var(--of-warning-border)] bg-[var(--of-warning-bg)] p-4 text-sm leading-6 text-[var(--of-warning-text)]"><span className="font-semibold">本院实践层：</span>{procedureData.localPracticeNote}</div>}
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}
