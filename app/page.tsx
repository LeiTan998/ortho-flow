"use client";

import { supabase } from "@/lib/supabase";
import FeedbackHub from "@/components/feedback/FeedbackHub";
import { useEffect, useMemo, useRef, useState } from "react";

import WorkMode from "@/components/ortho/work-mode";
import StudyMode from "@/components/ortho/study-mode";
import ProcedureMode from "@/components/ortho/procedure-mode";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DiseaseData, DiseaseMode } from "@/types/orthoflow";
import { isSearchAnalyticsOptedOut, logSearchClick } from "@/lib/searchAnalytics";


export default function Home() {
  const [diseaseList, setDiseaseList] = useState<DiseaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisease, setSelectedDisease] = useState<DiseaseData | null>(null);
  const [mode, setMode] = useState<DiseaseMode>("work");
  const [currentStep, setCurrentStep] = useState(0);
  const homeBackgroundRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadDiseases() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase.from("diseases").select("*");

      if (error) {
        console.error("加载疾病失败:", error);
        setDiseaseList([]);
        setLoadError(error.message || "疾病数据加载失败");
        setLoading(false);
        return;
      }

      const diseases = (data || [])
        .filter((item: any) => item?.data && typeof item.data === "object")
        .map((item: any) => ({
          ...item.data,
          viewCount: Number(item.view_count || 0),
        }))
        .filter((item: any) => item.id && item.name && item.englishName);

      setDiseaseList(diseases);
      setLoading(false);
    }

    loadDiseases();
  }, []);

  const handleOpenDisease = async (
    disease: DiseaseData,
    countAsSearch: boolean
  ) => {
    // 必须先保存搜索词和结果数，再清空搜索框。
    const queryAtClick = searchTerm.trim();
    const resultCountAtClick = filteredDiseases.length;
    const analyticsOptedOut = isSearchAnalyticsOptedOut();

    setSelectedDisease(disease);
    setCurrentStep(0);
    setMode("work");
    setSearchTerm("");

    if (!countAsSearch) return;

    // 当前设备若被标记为内部测试设备：
    // 既不写 search_logs，也不增加 view_count，避免污染真实用户数据。
    if (analyticsOptedOut) return;

    // 将这次“搜索 → 点击疾病”写回 search_logs.clicked_disease_id。
    // 如果 1 秒自动搜索日志已经存在，API 会更新那一条；
    // 如果用户点击很快、自动日志还没写入，API 会直接补一条点击日志。
    void logSearchClick(queryAtClick, resultCountAtClick, disease.id);

    const { error } = await supabase.rpc("increment_disease_view", {
      p_disease_id: disease.id,
    });

    if (error) {
      console.error("记录疾病搜索热度失败:", error);
      return;
    }

    setDiseaseList((currentList) =>
      currentList.map((item) =>
        item.id === disease.id
          ? { ...item, viewCount: item.viewCount + 1 }
          : item
      )
    );
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredDiseases = diseaseList.filter((disease) => {
    const chineseName = disease.name || "";
    const englishName = disease.englishName || "";
    const id = disease.id || "";
    const keywords = disease.searchKeywords || "";

    return (
      chineseName.includes(searchTerm.trim()) ||
      englishName.toLowerCase().includes(normalizedSearchTerm) ||
      id.toLowerCase().includes(normalizedSearchTerm) ||
      keywords.toLowerCase().includes(normalizedSearchTerm)
    );
  });

  const popularDiseases = useMemo(
    () =>
      [...diseaseList]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 6),
    [diseaseList]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-700">疾病数据加载失败</h1>
          <p className="mt-3 break-words text-sm text-gray-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (selectedDisease) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--of-bg)] text-[var(--of-text)] transition-colors duration-300">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(62,117,122,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(62,117,122,.055) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,.95), rgba(0,0,0,.35) 74%, transparent)",
            }}
          />
          <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-400/[0.07] blur-3xl motion-safe:animate-[pulse_10s_ease-in-out_infinite]" />
          <div className="absolute right-[-8rem] top-1/3 h-96 w-96 rounded-full bg-sky-400/[0.055] blur-3xl motion-safe:animate-[pulse_13s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-12rem] left-1/3 h-96 w-96 rounded-full bg-teal-300/[0.05] blur-3xl motion-safe:animate-[pulse_16s_ease-in-out_infinite]" />
        </div>

        <header className="sticky top-0 z-40 border-b border-[var(--of-border)] bg-[var(--of-surface)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                onClick={() => setSelectedDisease(null)}
                className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--of-border)] bg-[var(--of-surface)] px-3 text-sm text-[var(--of-muted)] transition hover:border-[#A4D7DD] hover:bg-[var(--of-accent-soft)] hover:text-[var(--of-text)]"
              >
                <span className="transition group-hover:-translate-x-0.5">←</span>
                返回首页
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--of-text)] sm:text-2xl">
                    {selectedDisease.name}
                  </h1>
                  <span className="rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--of-accent)]">
                    Clinical Pathway
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-[var(--of-muted)]">
                  {selectedDisease.englishName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="flex w-full gap-2 rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-1.5 shadow-inner shadow-[#AFC6C2]/25 lg:w-auto">
                <button
                  onClick={() => setMode("work")}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-medium transition lg:flex-none ${
                    mode === "work"
                      ? "bg-gradient-to-r from-[#20A6B9] to-[#4B8EE8] text-white shadow-[0_8px_24px_rgba(32,166,185,.18)]"
                      : "text-[var(--of-muted)] hover:bg-[var(--of-surface)] hover:text-[var(--of-text)]"
                  }`}
                >
                  今天上班
                </button>
                <button
                  onClick={() => setMode("study")}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-medium transition lg:flex-none ${
                    mode === "study"
                      ? "bg-gradient-to-r from-[#20A6B9] to-[#4B8EE8] text-white shadow-[0_8px_24px_rgba(32,166,185,.18)]"
                      : "text-[var(--of-muted)] hover:bg-[var(--of-surface)] hover:text-[var(--of-text)]"
                  }`}
                >
                  我要学习
                </button>
                <button
                  onClick={() => setMode("procedure")}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-medium transition lg:flex-none ${
                    mode === "procedure"
                      ? "bg-gradient-to-r from-[#20A6B9] to-[#4B8EE8] text-white shadow-[0_8px_24px_rgba(32,166,185,.18)]"
                      : "text-[var(--of-muted)] hover:bg-[var(--of-surface)] hover:text-[var(--of-text)]"
                  }`}
                >
                  手术 Pro
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="mb-6 overflow-hidden rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_18px_60px_rgba(39,76,79,.08)] backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--of-accent)]/70">
                  OrthoFlow · {mode === "work" ? "Workflow Mode" : mode === "study" ? "Study Mode" : "Procedure Pro"}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--of-text-strong)] sm:text-3xl">
                  {mode === "work" ? "把临床任务拆成清晰步骤" : mode === "study" ? "把查体、影像与治疗决策连起来" : "把上台前最需要的手术主线放到一个页面"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--of-muted)]">
                  {mode === "work"
                    ? "沿着接诊、检查、诊断、治疗和随访逐步推进，减少遗漏，同时保留临床判断空间。"
                    : mode === "study"
                      ? "先看典型患者，再抓关键查体与影像，最后理解为什么选择某种治疗或手术。"
                      : "先看手术概览，再按入路、解剖、步骤、器械和术中/术后影像逐步建立 Procedure。"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
                {[
                  ["模式", mode === "work" ? "临床执行" : mode === "study" ? "系统学习" : "手术准备"],
                  ["主题", selectedDisease.name],
                  ["状态", "内容已载入"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--of-muted)]">{label}</div>
                    <div className="mt-1 truncate text-sm font-medium text-[var(--of-text-strong)]">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {mode === "work" ? (
            <WorkMode
              disease={selectedDisease}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
            />
          ) : mode === "study" ? (
            <StudyMode disease={selectedDisease} />
          ) : (
            <ProcedureMode disease={selectedDisease} />
          )}
        </main>

        <footer className="relative z-10 mx-auto max-w-[1500px] px-4 pb-8 pt-3 text-center text-[11px] leading-5 text-[var(--of-muted)] sm:px-6 lg:px-8">
          OrthoFlow用于临床学习与工作辅助，不能替代上级医师判断、患者个体化评估及本院诊疗规范。
        </footer>

        <FeedbackHub
          diseaseId={selectedDisease.id}
          diseaseName={selectedDisease.name}
          searchQuery=""
          searchResultCount={0}
        />
      </div>
    );
  }

  return (
    <div
      ref={homeBackgroundRef}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        event.currentTarget.style.setProperty("--mouse-x", `${x}%`);
        event.currentTarget.style.setProperty("--mouse-y", `${y}%`);
      }}
      className="relative min-h-screen overflow-hidden bg-[var(--of-bg)] text-[var(--of-text)] transition-colors duration-300"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(620px circle at var(--mouse-x, 50%) var(--mouse-y, 35%), rgba(32, 166, 185, 0.10), transparent 48%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(62,117,122,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(62,117,122,.055) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.15) 78%, transparent)",
          }}
        />
        <div className="hero-orb hero-orb-a absolute -left-28 top-10 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="hero-orb hero-orb-b absolute right-[-7rem] top-1/4 h-96 w-96 rounded-full bg-sky-400/[0.07] blur-3xl" />
        <div className="hero-orb hero-orb-c absolute bottom-[-10rem] left-1/3 h-80 w-80 rounded-full bg-teal-300/[0.06] blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      </div>

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--of-accent-border)] bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.16)] backdrop-blur-xl">
            <svg
              viewBox="0 0 32 32"
              className="h-6 w-6 text-[var(--of-accent)]"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 8.5c2.3 0 3.1 2.2 3.1 4.2v6.6c0 2-0.8 4.2-3.1 4.2S5.5 21.3 5.5 19s1.2-3.3 2.7-3.3H24"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M23 8.5c-2.3 0-3.1 2.2-3.1 4.2v6.6c0 2 0.8 4.2 3.1 4.2s3.5-2.2 3.5-4.5-1.2-3.3-2.7-3.3H8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[var(--of-text)]">OrthoFlow</div>
            <div className="text-xs text-[var(--of-muted)]">Orthopaedic Clinical Learning</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 rounded-full border border-[var(--of-border)] bg-[var(--of-surface)] px-4 py-2 text-xs text-[var(--of-muted)] backdrop-blur-xl sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          当前收录 {diseaseList.length} 个疾病主题
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-20 lg:pt-10">
        <section>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--of-accent)] backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            临床工作流 × 影像学习 × 手术决策
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--of-text)] sm:text-5xl lg:text-6xl">
            从查体和影像，
            <span className="bg-gradient-to-r from-[#118BA0] via-[#218EBC] to-[#4276C7] bg-clip-text text-transparent">
              到手术决策。
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--of-muted)] sm:text-lg">
            不只是帮你完成工作，更重要的是帮助你在繁重的临床任务中，真正学会骨科。
          </p>

          <div className="mt-8 rounded-[30px] border border-[#D2E1DE] bg-[var(--of-surface)] p-3 shadow-[0_22px_70px_rgba(39,76,79,.10)] backdrop-blur-2xl sm:p-4">
            <div className="relative flex items-center rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface-muted)] shadow-inner shadow-[#AFC6C2]/25 transition focus-within:border-[#8DCCD4] focus-within:ring-4 focus-within:ring-cyan-300/10">
              <svg
                viewBox="0 0 24 24"
                className="ml-5 h-5 w-5 shrink-0 text-[var(--of-accent)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    searchTerm.trim() &&
                    filteredDiseases.length > 0
                  ) {
                    handleOpenDisease(filteredDiseases[0], true);
                  }
                }}
                placeholder="搜索疾病、分型、查体、影像或手术方式..."
                className="h-16 min-w-0 flex-1 bg-transparent px-4 text-base text-[var(--of-text-strong)] outline-none placeholder:text-[var(--of-muted)] sm:text-lg"
                autoComplete="off"
                aria-label="搜索骨科疾病"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchTerm.trim() && filteredDiseases.length > 0) {
                    handleOpenDisease(filteredDiseases[0], true);
                  }
                }}
                disabled={!searchTerm.trim() || filteredDiseases.length === 0}
                className="mr-2 hidden h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#20A6B9] to-[#4B8EE8] px-5 text-sm font-semibold text-[var(--of-text-strong)] shadow-[0_10px_28px_rgba(32,166,185,.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 sm:flex"
              >
                开始检索
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            {searchTerm && filteredDiseases.length > 0 && (
              <div className="mt-3 max-h-80 overflow-y-auto rounded-[22px] border border-[var(--of-border)] bg-[var(--of-surface)] p-2 shadow-2xl backdrop-blur-2xl">
                {filteredDiseases.slice(0, 10).map((disease, index) => (
                  <button
                    key={disease.id}
                    onClick={() => handleOpenDisease(disease, true)}
                    className="group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-[#EEF6F4]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] text-xs font-semibold text-[var(--of-accent)]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--of-text-strong)]">
                          {disease.name}
                        </div>
                        <div className="truncate text-xs text-[var(--of-muted)]">
                          {disease.englishName}
                        </div>
                      </div>
                    </div>
                    <span className="ml-4 text-[var(--of-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--of-accent)]">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchTerm && filteredDiseases.length === 0 && (
              <div className="mt-3 rounded-[22px] border border-[var(--of-border)] bg-[#EFF5F3] px-5 py-6 text-center text-sm text-[var(--of-muted)]">
                暂未找到匹配疾病。可以尝试中文名、英文名、拼音或常用缩写。
              </div>
            )}
          </div>

          {!searchTerm && popularDiseases.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--of-muted)]">
                  Popular Topics
                </p>
                <span className="text-xs text-[var(--of-muted)]">点击直接进入</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {popularDiseases.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => handleOpenDisease(disease, false)}
                    className="group rounded-full border border-[var(--of-border)] bg-[var(--of-surface)] px-4 py-2 text-sm text-[var(--of-muted)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#A4D7DD] hover:bg-[var(--of-accent-soft)] hover:text-[var(--of-text)]"
                  >
                    {disease.name}
                    <span className="ml-2 text-[var(--of-muted)] transition group-hover:text-[var(--of-accent)]">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-9 grid max-w-2xl grid-cols-3 gap-3">
            {[
              [String(diseaseList.length), "疾病主题"],
              ["3", "工作 / 学习 / 手术"],
              ["1", "条临床决策链"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] px-3 py-3 backdrop-blur-xl sm:px-4"
              >
                <div className="text-xl font-semibold text-[var(--of-text)] sm:text-2xl">
                  {value}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--of-muted)] sm:text-xs">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative hidden min-h-[610px] lg:block" aria-hidden="true">
          <div className="absolute inset-6 rounded-[40px] border border-[var(--of-border)] bg-[var(--of-surface)] shadow-[0_24px_80px_rgba(39,76,79,.10)] backdrop-blur-2xl" />
          <div className="absolute inset-6 overflow-hidden rounded-[40px]">
            <div className="scan-line absolute left-0 right-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-300/10 to-transparent" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(125, 211, 252, 0.22) 1px, transparent 1.5px)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>

          <div className="absolute left-14 right-14 top-14 flex items-center justify-between text-xs text-[var(--of-muted)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
              Clinical Reasoning Map
            </div>
            <span>LIVE</span>
          </div>

          <div className="absolute left-1/2 top-[46%] h-72 w-72 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 rounded-full border border-cyan-200/10" />
            <div className="absolute inset-6 rounded-full border border-dashed border-cyan-200/20 motion-safe:animate-[spin_24s_linear_infinite]" />
            <div className="absolute inset-16 rounded-full border border-blue-300/15 motion-safe:animate-[spin_18s_linear_infinite_reverse]" />
            <div className="absolute inset-0 grid place-items-center">
              <svg
                viewBox="0 0 220 220"
                className="h-52 w-52 drop-shadow-[0_0_25px_rgba(34,211,238,0.18)]"
                fill="none"
              >
                <circle cx="110" cy="110" r="84" stroke="rgba(125,211,252,.12)" />
                <circle cx="110" cy="110" r="58" stroke="rgba(125,211,252,.18)" />
                <path
                  d="M76 57c24-17 58-9 72 16 12 22 4 50-18 63-21 13-49 7-63-14-15-23-10-51 9-65Z"
                  stroke="rgba(165,243,252,.75)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M91 82c12-9 30-5 37 8 7 12 2 28-10 35-12 7-28 4-36-8-8-12-5-28 9-35Z"
                  fill="rgba(34,211,238,.12)"
                  stroke="rgba(103,232,249,.75)"
                  strokeWidth="3"
                />
                <path
                  d="M137 132c18 7 28 22 31 43M75 132c-18 10-26 24-28 43"
                  stroke="rgba(147,197,253,.55)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M64 174h108"
                  stroke="rgba(125,211,252,.18)"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                />
              </svg>
            </div>
            <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(165,243,252,1)]" />
            <span className="absolute bottom-12 right-8 h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,1)]" />
          </div>

          <div className="absolute bottom-16 left-14 right-14 grid grid-cols-3 gap-3">
            {[
              ["01", "查体", "定位功能缺损"],
              ["02", "影像", "识别结构风险"],
              ["03", "决策", "连接适应证与术式"],
            ].map(([number, title, description], index) => (
              <div
                key={number}
                className="relative overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4 backdrop-blur-xl"
              >
                {index < 2 && (
                  <div className="path-pulse absolute -right-3 top-1/2 h-px w-6 bg-gradient-to-r from-cyan-300/70 to-transparent" />
                )}
                <div className="text-[10px] font-semibold tracking-[0.2em] text-[var(--of-accent)]/70">
                  {number}
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--of-text-strong)]">{title}</div>
                <div className="mt-1 text-[11px] leading-5 text-[var(--of-muted)]">
                  {description}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-32 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-3 text-xs text-[var(--of-accent)] shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--of-accent)]/60">
              Signal
            </div>
            <div className="mt-1 font-medium">影像与临床已对应</div>
          </div>

          <div className="absolute left-0 top-60 rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] px-4 py-3 text-xs text-[var(--of-text-strong)] shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--of-muted)]">
              Mode
            </div>
            <div className="mt-1 font-medium">今天上班 / 我要学习</div>
          </div>
        </section>
      </main>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 text-center text-[11px] leading-5 text-[var(--of-muted)] sm:px-6 lg:px-8">
        OrthoFlow用于临床学习与工作辅助，不能替代上级医师判断、患者个体化评估及本院诊疗规范。
      </div>

      <FeedbackHub
        diseaseId={null}
        diseaseName={null}
        searchQuery={searchTerm}
        searchResultCount={filteredDiseases.length}
      />

      <style jsx>{`
        .hero-orb {
          animation: orthoflow-float 15s ease-in-out infinite;
          will-change: transform;
        }

        .hero-orb-b {
          animation-delay: -5s;
          animation-duration: 18s;
        }

        .hero-orb-c {
          animation-delay: -9s;
          animation-duration: 21s;
        }

        .scan-line {
          animation: orthoflow-scan 6s ease-in-out infinite;
        }

        .path-pulse {
          animation: orthoflow-pulse-line 2.4s ease-in-out infinite;
        }

        @keyframes orthoflow-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          35% {
            transform: translate3d(28px, -22px, 0) scale(1.08);
          }
          70% {
            transform: translate3d(-18px, 24px, 0) scale(0.94);
          }
        }

        @keyframes orthoflow-scan {
          0%,
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          75% {
            opacity: 0.75;
          }
          90% {
            transform: translateY(610px);
            opacity: 0;
          }
        }

        @keyframes orthoflow-pulse-line {
          0%,
          100% {
            opacity: 0.25;
            transform: scaleX(0.6);
          }
          50% {
            opacity: 1;
            transform: scaleX(1.15);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-orb,
          .scan-line,
          .path-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

