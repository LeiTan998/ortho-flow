"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type LearningSummary = {
  typicalPatients?: string;
  typicalSymptoms?: string[];
  keyPoint?: string;
  differentialDiagnosis?: string[];
};

type PhysicalExam = {
  name?: string;
  target?: string;
  method?: string;
  positiveFinding?: string;
  meaning?: string;
  imageUrl?: string;
};

type ImagingGuide = {
  preferredTests?: string[];
  readingPoints?: string[];
  commonPitfalls?: string[];
};

type DecisionStep = {
  id?: string | number;
  question?: string;
  yes?: string;
  no?: string;
  note?: string;
};

type DecisionFlow = {
  title?: string;
  disclaimer?: string;
  steps?: DecisionStep[];
};

type DiseaseData = {
  id: string;
  name: string;
  englishName: string;
  searchKeywords?: string;
  viewCount: number;
  hasClassification?: boolean;
  classifications?: any[];
  commonImages?: any[];
  workflowSteps?: any[];
  quickActions?: any;
  surgeryTable?: any;
  rehabPlan?: any[];
  learningSummary?: LearningSummary;
  physicalExams?: PhysicalExam[];
  imagingGuide?: ImagingGuide;
  decisionFlow?: DecisionFlow;
};

const isUsableImageUrl = (url?: string) =>
  Boolean(
    url &&
      /^https?:\/\//i.test(url) &&
      !url.includes("your-cdn.com") &&
      !url.includes("example.com")
  );

export default function Home() {
  const [diseaseList, setDiseaseList] = useState<DiseaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisease, setSelectedDisease] = useState<DiseaseData | null>(null);
  const [mode, setMode] = useState<"work" | "study">("work");
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
    setSelectedDisease(disease);
    setCurrentStep(0);
    setMode("work");
    setSearchTerm("");

    if (!countAsSearch) return;

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
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 border-b bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedDisease(null)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                ← 返回首页
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {selectedDisease.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedDisease.englishName}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMode("work")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "work"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                🏥 今天上班
              </button>
              <button
                onClick={() => setMode("study")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  mode === "study"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                📖 我要学习
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {mode === "work" ? (
            <WorkMode
              disease={selectedDisease}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
            />
          ) : (
            <StudyMode disease={selectedDisease} />
          )}
        </main>
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
      className="relative min-h-screen overflow-hidden bg-[#061222] text-white"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(620px circle at var(--mouse-x, 50%) var(--mouse-y, 35%), rgba(56, 189, 248, 0.22), transparent 46%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.16) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.15) 78%, transparent)",
          }}
        />
        <div className="hero-orb hero-orb-a absolute -left-28 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="hero-orb hero-orb-b absolute right-[-7rem] top-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="hero-orb hero-orb-c absolute bottom-[-10rem] left-1/3 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      </div>

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.16)] backdrop-blur-xl">
            <svg
              viewBox="0 0 32 32"
              className="h-6 w-6 text-cyan-200"
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
            <div className="text-lg font-semibold tracking-tight">OrthoFlow</div>
            <div className="text-xs text-slate-400">Orthopaedic Clinical Learning</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-slate-300 backdrop-blur-xl sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          当前收录 {diseaseList.length} 个疾病主题
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-20 lg:pt-10">
        <section>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            临床工作流 × 影像学习 × 手术决策
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            从查体和影像，
            <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-300 bg-clip-text text-transparent">
              到手术决策。
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            不只是帮你完成工作，更重要的是帮助你在繁重的临床任务中，真正学会骨科。
          </p>

          <div className="mt-8 rounded-[30px] border border-white/12 bg-white/[0.08] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-4">
            <div className="relative flex items-center rounded-[22px] border border-white/10 bg-slate-950/45 shadow-inner shadow-black/20 transition focus-within:border-cyan-300/40 focus-within:ring-4 focus-within:ring-cyan-300/10">
              <svg
                viewBox="0 0 24 24"
                className="ml-5 h-5 w-5 shrink-0 text-cyan-200"
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
                className="h-16 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none placeholder:text-slate-500 sm:text-lg"
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
                className="mr-2 hidden h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 sm:flex"
              >
                开始检索
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            {searchTerm && filteredDiseases.length > 0 && (
              <div className="mt-3 max-h-80 overflow-y-auto rounded-[22px] border border-white/10 bg-slate-950/70 p-2 shadow-2xl backdrop-blur-2xl">
                {filteredDiseases.slice(0, 10).map((disease, index) => (
                  <button
                    key={disease.id}
                    onClick={() => handleOpenDisease(disease, true)}
                    className="group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.08] text-xs font-semibold text-cyan-100">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {disease.name}
                        </div>
                        <div className="truncate text-xs text-slate-400">
                          {disease.englishName}
                        </div>
                      </div>
                    </div>
                    <span className="ml-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchTerm && filteredDiseases.length === 0 && (
              <div className="mt-3 rounded-[22px] border border-white/10 bg-slate-950/55 px-5 py-6 text-center text-sm text-slate-400">
                暂未找到匹配疾病。可以尝试中文名、英文名、拼音或常用缩写。
              </div>
            )}
          </div>

          {!searchTerm && popularDiseases.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Popular Topics
                </p>
                <span className="text-xs text-slate-500">点击直接进入</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {popularDiseases.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => handleOpenDisease(disease, false)}
                    className="group rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-cyan-300/[0.1] hover:text-white"
                  >
                    {disease.name}
                    <span className="ml-2 text-slate-600 transition group-hover:text-cyan-200">
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
              ["2", "工作与学习模式"],
              ["1", "条临床决策链"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 backdrop-blur-xl sm:px-4"
              >
                <div className="text-xl font-semibold text-white sm:text-2xl">
                  {value}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative hidden min-h-[610px] lg:block" aria-hidden="true">
          <div className="absolute inset-6 rounded-[40px] border border-white/10 bg-white/[0.045] shadow-[0_35px_120px_rgba(0,0,0,0.38)] backdrop-blur-2xl" />
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

          <div className="absolute left-14 right-14 top-14 flex items-center justify-between text-xs text-slate-400">
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
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-xl"
              >
                {index < 2 && (
                  <div className="path-pulse absolute -right-3 top-1/2 h-px w-6 bg-gradient-to-r from-cyan-300/70 to-transparent" />
                )}
                <div className="text-[10px] font-semibold tracking-[0.2em] text-cyan-300/70">
                  {number}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-[11px] leading-5 text-slate-500">
                  {description}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute right-0 top-32 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-3 text-xs text-cyan-100 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/60">
              Signal
            </div>
            <div className="mt-1 font-medium">影像与临床已对应</div>
          </div>

          <div className="absolute left-0 top-60 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs text-slate-200 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Mode
            </div>
            <div className="mt-1 font-medium">今天上班 / 我要学习</div>
          </div>
        </section>
      </main>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 text-center text-[11px] leading-5 text-slate-600 sm:px-6 lg:px-8">
        OrthoFlow用于临床学习与工作辅助，不能替代上级医师判断、患者个体化评估及本院诊疗规范。
      </div>

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

function WorkMode({ disease, currentStep, setCurrentStep }: any) {
  const steps = disease.workflowSteps || [];
  const safeStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const currentTasks = steps[safeStep]?.tasks || [];

  if (steps.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 text-gray-500 shadow-sm">
        该疾病暂无工作流程。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">工作流程</h3>
        <div className="space-y-1">
          {steps.map((step: any, index: number) => (
            <button
              key={step.stepId ?? index}
              onClick={() => setCurrentStep(index)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                index === safeStep
                  ? "border-l-4 border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {index + 1}. {step.title}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-3 font-semibold text-gray-800">
          第 {safeStep + 1} / {steps.length} 步
        </h3>
        <h4 className="mb-4 text-xl font-bold text-gray-800">
          {steps[safeStep]?.title || "未命名"}
        </h4>
        <div className="space-y-2">
          {currentTasks.map((task: string, index: number) => (
            <div key={index} className="flex items-start gap-3 text-gray-700">
              <span className="text-sm font-bold text-blue-500">{index + 1}</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 lg:col-span-1">
        <h3 className="text-sm font-semibold text-gray-700">快速操作</h3>
        {disease.quickActions ? (
          <>
            <QuickActionCard
              title="写病历"
              content={disease.quickActions.writeMedicalRecord || "暂无模板"}
            />
            <QuickActionCard
              title="开医嘱"
              content={disease.quickActions.prescribe || "暂无模板"}
            />
            <QuickActionCard
              title="拆线换药"
              content={disease.quickActions.sutureRemoval || "暂无模板"}
            />
            <QuickActionCard
              title="值班处理"
              content={disease.quickActions.emergencyHandling || "暂无模板"}
            />
          </>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-500 shadow-sm">
            暂无快速操作模板。
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionCard({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false);

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
      alert("已复制到剪贴板");
    } catch {
      alert("复制失败，请手动选择文本复制");
    }

    document.body.removeChild(textarea);
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("已复制到剪贴板"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {title}
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            {content}
          </pre>
          <button
            onClick={() => handleCopy(content)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            📋 复制
          </button>
        </div>
      )}
    </div>
  );
}


type GalleryImage = {
  imageUrl: string;
  title?: string;
  description?: string;
  alt?: string;
};

function normalizeGalleryImages(source: any): GalleryImage[] {
  const rawImages: any[] = [];

  if (Array.isArray(source?.images)) rawImages.push(...source.images);
  if (Array.isArray(source?.imageUrls)) rawImages.push(...source.imageUrls);

  [
    source?.imageUrl,
    source?.imageUrl2,
    source?.imageUrl3,
    source?.imageUrl4,
  ].forEach((imageUrl) => {
    if (imageUrl) rawImages.push(imageUrl);
  });

  const normalized = rawImages
    .map((image, index): GalleryImage | null => {
      if (typeof image === "string") {
        return isUsableImageUrl(image)
          ? { imageUrl: image, title: `影像 ${index + 1}` }
          : null;
      }

      const imageUrl = image?.imageUrl || image?.url || image?.src;
      if (!isUsableImageUrl(imageUrl)) return null;

      return {
        imageUrl,
        title: image?.title,
        description: image?.description,
        alt: image?.alt,
      };
    })
    .filter((image): image is GalleryImage => Boolean(image));

  return normalized.filter(
    (image, index, array) =>
      array.findIndex((candidate) => candidate.imageUrl === image.imageUrl) ===
      index
  );
}

function ClassificationImageCarousel({
  classification,
  onPreview,
}: {
  classification: any;
  onPreview: (imageUrl: string) => void;
}) {
  const images = useMemo(
    () => normalizeGalleryImages(classification),
    [classification]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const lastWheelAt = useRef(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [classification?.id]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center bg-gray-100 text-sm text-gray-400">
        暂无真实影像
      </div>
    );
  }

  const activeImage = images[Math.min(activeIndex, images.length - 1)];

  const move = (direction: 1 | -1) => {
    setActiveIndex((current) =>
      (current + direction + images.length) % images.length
    );
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;

    const wheelAmount =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(wheelAmount) < 8) return;

    event.preventDefault();

    const now = Date.now();
    if (now - lastWheelAt.current < 320) return;
    lastWheelAt.current = now;

    move(wheelAmount > 0 ? 1 : -1);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || images.length <= 1) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    move(distance < 0 ? 1 : -1);
  };

  return (
    <div
      className="group relative aspect-video overflow-hidden bg-gray-100"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      onKeyDown={(event) => {
        if (images.length <= 1) return;
        if (event.key === "ArrowRight") move(1);
        if (event.key === "ArrowLeft") move(-1);
      }}
      aria-label={`${classification?.type || "疾病分型"}影像轮播，共${images.length}张`}
    >
      <button
        type="button"
        onClick={() => onPreview(activeImage.imageUrl)}
        className="block h-full w-full"
        aria-label={`放大查看${activeImage.title || classification?.type || "影像"}`}
      >
        <img
          src={activeImage.imageUrl}
          alt={
            activeImage.alt ||
            activeImage.title ||
            classification?.type ||
            "疾病分型影像"
          }
          className="h-full w-full object-contain"
        />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1.5 text-lg leading-none text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100 focus:opacity-100"
            aria-label="上一张影像"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2.5 py-1.5 text-lg leading-none text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100 focus:opacity-100"
            aria-label="下一张影像"
          >
            ›
          </button>

          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            {activeIndex + 1} / {images.length}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2 pt-8 text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {activeImage.title && (
                  <div className="truncate text-sm font-medium">
                    {activeImage.title}
                  </div>
                )}
                <div className="text-[11px] text-white/80">
                  鼠标滚轮、左右键或滑动切换
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {images.map((image, index) => (
                  <button
                    key={image.imageUrl}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveIndex(index);
                    }}
                    className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/55 hover:bg-white/80"
                    }`}
                    aria-label={`查看第${index + 1}张影像`}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StudyMode({ disease }: { disease: DiseaseData }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const summary = disease.learningSummary || {};
  const symptoms = Array.isArray(summary.typicalSymptoms)
    ? summary.typicalSymptoms
    : [];
  const differentials = Array.isArray(summary.differentialDiagnosis)
    ? summary.differentialDiagnosis
    : [];
  const physicalExams = Array.isArray(disease.physicalExams)
    ? disease.physicalExams
    : [];
  const imagingGuide = disease.imagingGuide || {};
  const preferredTests = Array.isArray(imagingGuide.preferredTests)
    ? imagingGuide.preferredTests
    : [];
  const readingPoints = Array.isArray(imagingGuide.readingPoints)
    ? imagingGuide.readingPoints
    : [];
  const commonPitfalls = Array.isArray(imagingGuide.commonPitfalls)
    ? imagingGuide.commonPitfalls
    : [];
  const decisionSteps = Array.isArray(disease.decisionFlow?.steps)
    ? disease.decisionFlow?.steps || []
    : [];
  const classifications = Array.isArray(disease.classifications)
    ? disease.classifications
    : [];
  const commonImages = Array.isArray(disease.commonImages)
    ? disease.commonImages
    : [];

  const hasSummary = Boolean(
    summary.typicalPatients ||
      symptoms.length ||
      summary.keyPoint ||
      differentials.length
  );
  const hasImagingGuide = Boolean(
    preferredTests.length || readingPoints.length || commonPitfalls.length
  );
  const hasClassifications = classifications.length > 0;
  const hasCommonImages = commonImages.length > 0;

  return (
    <div className="space-y-8">
      {hasSummary && (
        <StudySection number="1" title="临床一眼看懂">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {summary.typicalPatients && (
              <InfoCard title="典型人群">
                <p>{summary.typicalPatients}</p>
              </InfoCard>
            )}

            {symptoms.length > 0 && (
              <InfoCard title="典型表现">
                <BulletList items={symptoms} />
              </InfoCard>
            )}

            {summary.keyPoint && (
              <InfoCard title="核心理解" className="md:col-span-2">
                <p className="font-medium text-blue-800">{summary.keyPoint}</p>
              </InfoCard>
            )}

            {differentials.length > 0 && (
              <InfoCard title="常见鉴别" className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {differentials.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </StudySection>
      )}

      {physicalExams.length > 0 && (
        <StudySection number="2" title="关键查体">
          <div className="space-y-3">
            {physicalExams.map((exam, index) => (
              <details
                key={`${exam.name || "exam"}-${index}`}
                className="group rounded-xl border bg-white shadow-sm"
              >
                <summary className="cursor-pointer list-none px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {index + 1}. {exam.name || "未命名查体"}
                      </h4>
                      {exam.target && (
                        <p className="mt-1 text-sm text-gray-500">
                          检查目标：{exam.target}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-blue-600 group-open:hidden">
                      展开
                    </span>
                    <span className="hidden text-sm text-blue-600 group-open:inline">
                      收起
                    </span>
                  </div>
                </summary>

                <div className="border-t px-5 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {exam.method && (
                      <MiniInfo title="怎么做" text={exam.method} />
                    )}
                    {exam.positiveFinding && (
                      <MiniInfo title="阳性表现" text={exam.positiveFinding} />
                    )}
                    {exam.meaning && (
                      <MiniInfo title="提示什么" text={exam.meaning} />
                    )}
                  </div>

                  {isUsableImageUrl(exam.imageUrl) && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(exam.imageUrl || null)}
                      className="mt-4 block overflow-hidden rounded-lg border"
                    >
                      <img
                        src={exam.imageUrl}
                        alt={exam.name || "查体示意图"}
                        className="max-h-72 w-full object-contain"
                      />
                    </button>
                  )}
                </div>
              </details>
            ))}
          </div>
        </StudySection>
      )}

      {hasImagingGuide && (
        <StudySection number="3" title="影像检查与看片要点">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {preferredTests.length > 0 && (
              <InfoCard title="推荐检查">
                <BulletList items={preferredTests} />
              </InfoCard>
            )}
            {readingPoints.length > 0 && (
              <InfoCard title="看片顺序与重点">
                <BulletList items={readingPoints} />
              </InfoCard>
            )}
            {commonPitfalls.length > 0 && (
              <InfoCard title="常见误区">
                <BulletList items={commonPitfalls} />
              </InfoCard>
            )}
          </div>
        </StudySection>
      )}

      {(hasClassifications || hasCommonImages) && (
        <StudySection number="4" title="影像与分型">
          {hasClassifications && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {classifications.map((classification: any, index: number) => {
                return (
                  <article
                    key={classification?.id ?? index}
                    className="overflow-hidden rounded-xl border bg-white shadow-sm"
                  >
                    <ClassificationImageCarousel
                      classification={classification}
                      onPreview={setPreviewImage}
                    />

                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800">
                        {classification?.type || `分型 ${index + 1}`}
                      </h4>
                      {classification?.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {classification.description}
                        </p>
                      )}
                      {classification?.imageKeyPoints && (
                        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                          <span className="font-medium">看片要点：</span>
                          {classification.imageKeyPoints}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {hasCommonImages && (
            <div className={hasClassifications ? "mt-6" : ""}>
              <h4 className="mb-3 font-semibold text-gray-700">常见影像</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {commonImages.map((image: any, index: number) => {
                  const normalized =
                    typeof image === "string"
                      ? { imageUrl: image, title: `影像 ${index + 1}` }
                      : image || {};
                  const imageUrl = normalized.imageUrl || normalized.url;
                  const canPreview = isUsableImageUrl(imageUrl);

                  if (!canPreview) return null;

                  return (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setPreviewImage(imageUrl)}
                      className="overflow-hidden rounded-xl border bg-white text-left shadow-sm"
                    >
                      <img
                        src={imageUrl}
                        alt={normalized.title || `常见影像 ${index + 1}`}
                        className="aspect-video w-full object-contain bg-gray-100"
                      />
                      <div className="p-3">
                        <div className="font-medium text-gray-800">
                          {normalized.title || `影像 ${index + 1}`}
                        </div>
                        {normalized.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {normalized.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </StudySection>
      )}

      {decisionSteps.length > 0 && (
        <StudySection number="5" title="学习型治疗决策">
          {disease.decisionFlow?.title && (
            <h4 className="mb-4 text-lg font-semibold text-gray-800">
              {disease.decisionFlow.title}
            </h4>
          )}

          <div className="space-y-4">
            {decisionSteps.map((step, index) => (
              <div
                key={step.id ?? index}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="font-semibold text-gray-800">
                      {step.question || "未填写判断问题"}
                    </h5>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {step.yes && (
                        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
                          <span className="font-semibold">是 → </span>
                          {step.yes}
                        </div>
                      )}
                      {step.no && (
                        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
                          <span className="font-semibold">否 → </span>
                          {step.no}
                        </div>
                      )}
                    </div>
                    {step.note && (
                      <p className="mt-3 text-sm text-gray-500">
                        为什么：{step.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {disease.decisionFlow?.disclaimer && (
            <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
              {disease.decisionFlow.disclaimer}
            </p>
          )}
        </StudySection>
      )}

      {disease.surgeryTable && (
        <StudySection number="6" title="手术方案">
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {(disease.surgeryTable.headers || []).map(
                    (header: string, index: number) => (
                      <th
                        key={index}
                        className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {(disease.surgeryTable.rows || []).map(
                  (row: any[], rowIndex: number) => (
                    <tr key={rowIndex} className="border-t border-gray-100">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="min-w-40 px-4 py-3 align-top text-gray-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </StudySection>
      )}

      {Array.isArray(disease.rehabPlan) && disease.rehabPlan.length > 0 && (
        <StudySection number="7" title="康复方案">
          <div className="space-y-3">
            {disease.rehabPlan.map((item: any, index: number) => (
              <div
                key={index}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-medium text-blue-600">
                  {item.phase}
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {item.content}
                </div>
              </div>
            ))}
          </div>
        </StudySection>
      )}

      {!hasSummary &&
        physicalExams.length === 0 &&
        !hasImagingGuide &&
        !hasClassifications &&
        !hasCommonImages &&
        decisionSteps.length === 0 &&
        !disease.surgeryTable &&
        (!Array.isArray(disease.rehabPlan) || disease.rehabPlan.length === 0) && (
          <div className="rounded-xl border bg-white p-6 text-gray-500 shadow-sm">
            该疾病暂无学习内容。
          </div>
        )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700"
          >
            关闭
          </button>
          <img
            src={previewImage}
            alt="放大影像"
            className="max-h-[90vh] max-w-[95vw] rounded-lg bg-white object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function StudySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {number}
        </span>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${className}`}>
      <h4 className="mb-3 font-semibold text-gray-800">{title}</h4>
      <div className="text-sm leading-6 text-gray-700">{children}</div>
    </div>
  );
}

function MiniInfo({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="mb-1 text-sm font-semibold text-gray-700">{title}</div>
      <p className="text-sm leading-6 text-gray-600">{text}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
