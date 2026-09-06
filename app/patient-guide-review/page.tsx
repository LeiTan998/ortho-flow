"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewFlag = {
  field?: string;
  issue?: string;
  severity?: string;
};

type ReviewRow = {
  draft_id: string;
  disease_id: string;
  disease_name: string;
  created_at: string;
  auto_curator_version: string | null;
  summary: string | null;
  severity_answer: string | null;
  surgery_answer: string | null;
  recovery_answer: string | null;
  red_flag_count: number;
  review_flag_count: number;
  high_review_flag_count: number;
  review_flags: ReviewFlag[] | null;
  payload: any;
};

const TOKEN_KEY = "orthoflow:patient-review-token:v1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--of-text-strong)]">{title}</h3>
      <div className="mt-2 text-sm leading-7 text-[var(--of-text)]">{children}</div>
    </section>
  );
}

function List({ items }: { items?: unknown[] }) {
  if (!Array.isArray(items) || items.length === 0) return <span className="text-[var(--of-muted)]">—</span>;
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index} className="list-disc">{typeof item === "string" ? item : JSON.stringify(item)}</li>
      ))}
    </ul>
  );
}

export default function PatientGuideReviewPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high">("all");

  useEffect(() => {
    const saved = window.sessionStorage.getItem(TOKEN_KEY) || "";
    setToken(saved);
  }, []);

  async function loadQueue(inputToken = token) {
    if (!inputToken.trim()) {
      setError("请输入审核口令。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/patient-guide-review", {
        cache: "no-store",
        headers: { "x-orthoflow-review-token": inputToken.trim() },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      window.sessionStorage.setItem(TOKEN_KEY, inputToken.trim());
      setRows(data.rows || []);
      setSelectedId((current) => current && data.rows.some((r: ReviewRow) => r.draft_id === current) ? current : data.rows?.[0]?.draft_id || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function act(row: ReviewRow, action: "publish" | "reject") {
    const label = action === "publish" ? "发布" : "拒绝";
    const warning = action === "publish"
      ? `确认已人工审核「${row.disease_name}」，并发布到正式 diseases.data.patientGuide？`
      : `确认拒绝「${row.disease_name}」这条草稿？不会删除记录。`;
    if (!window.confirm(warning)) return;

    setBusyId(row.draft_id);
    setError("");
    try {
      const response = await fetch("/api/patient-guide-review/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orthoflow-review-token": token.trim(),
        },
        body: JSON.stringify({ draftId: row.draft_id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${label}失败`);
      const nextRows = rows.filter((item) => item.draft_id !== row.draft_id);
      setRows(nextRows);
      setSelectedId(nextRows[0]?.draft_id || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${label}失败`);
    } finally {
      setBusyId(null);
    }
  }

  const filteredRows = useMemo(
    () => rows.filter((row) => filter === "all" || row.high_review_flag_count > 0),
    [rows, filter],
  );
  const selected = rows.find((row) => row.draft_id === selectedId) || filteredRows[0] || null;
  const highCount = rows.filter((row) => row.high_review_flag_count > 0).length;

  return (
    <main className="min-h-screen bg-[var(--of-bg)] px-4 py-6 text-[var(--of-text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-[var(--of-accent)]">ORTHOFLOW INTERNAL</div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--of-text-strong)]">Patient Guide 审核台</h1>
            <p className="mt-1 text-sm text-[var(--of-muted)]">逐条人工审核。通过后才写入正式疾病数据；拒绝只保留历史，不删除。</p>
          </div>
          <div className="flex w-full max-w-xl gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadQueue(e.currentTarget.value)}
              placeholder="审核口令"
              className="min-w-0 flex-1 rounded-xl border border-[var(--of-border)] bg-[var(--of-bg)] px-3 py-2 text-sm outline-none"
            />
            <button onClick={() => loadQueue()} disabled={loading} className="rounded-xl bg-[var(--of-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {loading ? "加载中" : "进入审核"}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-3"><div className="text-2xl font-semibold">{rows.length}</div><div className="text-xs text-[var(--of-muted)]">待审核</div></div>
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-3"><div className="text-2xl font-semibold">{highCount}</div><div className="text-xs text-[var(--of-muted)]">含 High flag</div></div>
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-3"><div className="text-2xl font-semibold">{rows.length - highCount}</div><div className="text-xs text-[var(--of-muted)]">无 High flag</div></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
            <div className="mb-3 flex gap-2">
              <button onClick={() => setFilter("all")} className={`rounded-lg px-3 py-1.5 text-xs ${filter === "all" ? "bg-[var(--of-accent)] text-white" : "bg-[var(--of-surface-muted)]"}`}>全部</button>
              <button onClick={() => setFilter("high")} className={`rounded-lg px-3 py-1.5 text-xs ${filter === "high" ? "bg-[var(--of-accent)] text-white" : "bg-[var(--of-surface-muted)]"}`}>先看 High</button>
            </div>
            <div className="space-y-2">
              {filteredRows.map((row) => (
                <button
                  key={row.draft_id}
                  onClick={() => setSelectedId(row.draft_id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selected?.draft_id === row.draft_id ? "border-[var(--of-accent)] bg-[var(--of-accent-soft)]" : "border-[var(--of-border)] hover:bg-[var(--of-surface-muted)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--of-text-strong)]">{row.disease_name}</span>
                    {row.high_review_flag_count > 0 && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600">High × {row.high_review_flag_count}</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--of-muted)]">{row.summary}</div>
                </button>
              ))}
              {!loading && rows.length === 0 && <div className="p-4 text-center text-sm text-[var(--of-muted)]">输入口令加载队列；若已审核完，这里会显示 0。</div>}
            </div>
          </aside>

          <div className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-[var(--of-text-strong)]">{selected.disease_name}</h2>
                      <div className="mt-1 text-xs text-[var(--of-muted)]">{selected.auto_curator_version} · {selected.draft_id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={busyId === selected.draft_id} onClick={() => act(selected, "reject")} className="rounded-xl border border-red-300/50 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50">拒绝</button>
                      <button disabled={busyId === selected.draft_id} onClick={() => act(selected, "publish")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">审核通过并发布</button>
                    </div>
                  </div>
                </div>

                <Section title="首屏摘要">{selected.summary || "—"}</Section>
                <div className="grid gap-4 xl:grid-cols-3">
                  <Section title="我这个严重吗？">{selected.severity_answer || "—"}</Section>
                  <Section title="我需要手术吗？">{selected.surgery_answer || "—"}</Section>
                  <Section title="我怎么恢复？">{selected.recovery_answer || "—"}</Section>
                </div>

                <Section title={`Review Flags（${selected.review_flag_count}）`}>
                  {Array.isArray(selected.review_flags) && selected.review_flags.length ? (
                    <div className="space-y-3">
                      {selected.review_flags.map((flag, index) => (
                        <div key={index} className={`rounded-xl border p-3 ${flag.severity === "high" ? "border-red-300/50 bg-red-500/5" : "border-[var(--of-border)] bg-[var(--of-surface-muted)]"}`}>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${flag.severity === "high" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-700"}`}>{flag.severity || "review"}</span>
                            <span className="font-mono text-[var(--of-muted)]">{flag.field || "—"}</span>
                          </div>
                          <div className="mt-2 text-sm leading-6">{flag.issue || "—"}</div>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-[var(--of-muted)]">无 review flag</span>}
                </Section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Section title="严重程度 · 医生主要看什么"><List items={selected.payload?.severity?.doctorsLookAt} /></Section>
                  <Section title="不能只靠影像判断"><List items={selected.payload?.severity?.cannotTellFromImagingAlone} /></Section>
                  <Section title="更倾向保守的情况"><List items={selected.payload?.surgeryDecision?.oftenConservativeWhen} /></Section>
                  <Section title="更可能讨论手术的情况"><List items={selected.payload?.surgeryDecision?.surgeryMoreLikelyWhen} /></Section>
                </div>

                <Section title="恢复阶段">
                  <div className="space-y-4">
                    {(selected.payload?.recovery?.milestones || []).map((m: any, index: number) => (
                      <div key={index} className="rounded-xl bg-[var(--of-surface-muted)] p-4">
                        <div className="font-medium text-[var(--of-text-strong)]">{index + 1}. {m.activity}</div>
                        <div className="mt-2"><span className="text-xs font-semibold text-[var(--of-muted)]">进入下一阶段看：</span><List items={m.unlockWhen} /></div>
                        <p className="mt-2 text-sm leading-6">{m.whatUsuallyMatters}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Section title="红旗症状"><List items={selected.payload?.redFlags} /></Section>
                  <Section title="复诊前要问医生"><List items={selected.payload?.visitPrep} /></Section>
                </div>

                <div className="sticky bottom-3 flex justify-end gap-2 rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)]/95 p-3 shadow-lg backdrop-blur">
                  <button disabled={busyId === selected.draft_id} onClick={() => act(selected, "reject")} className="rounded-xl border border-red-300/50 px-5 py-2.5 text-sm font-medium text-red-600 disabled:opacity-50">拒绝</button>
                  <button disabled={busyId === selected.draft_id} onClick={() => act(selected, "publish")} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">审核通过并发布</button>
                </div>
              </>
            ) : (
              <div className="rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-10 text-center text-sm text-[var(--of-muted)]">暂无待审核内容。</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
