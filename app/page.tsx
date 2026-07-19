"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

// 疾病数据类型
type DiseaseData = {
  id: string;
  name: string;
  englishName: string;
  hasClassification: boolean;
  classifications?: any[];
  commonImages?: any[];
  workflowSteps?: any[];
  quickActions?: any;
  surgeryTable?: any;
  rehabPlan?: any[];
};

export default function Home() {
  const [diseaseList, setDiseaseList] = useState<DiseaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisease, setSelectedDisease] = useState<DiseaseData | null>(null);
  const [mode, setMode] = useState<"work" | "study">("work");
  const [currentStep, setCurrentStep] = useState(0);

  // 从 Supabase 加载数据
  useEffect(() => {
    async function loadDiseases() {
      console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("ANON:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      console.log("supabase 客户端对象:", supabase)
      
      // 改动1：删除了 .limit(10)
      const { data, error } = await supabase
        .from("diseases")
        .select("*")

      console.log("查询结果 - data:", data)
      console.log("查询结果 - error:", error)

      if (error) {
        console.error("加载失败，详细错误:", error)
        console.error("错误信息:", error.message)
        console.error("错误详情:", JSON.stringify(error, null, 2))
        setLoading(false)
        return
      }

      // Supabase 返回的是 { id, data, created_at }，其中 data 字段里才是疾病内容
      const diseases = data.map((item: any) => item.data);
      setDiseaseList(diseases);
      setLoading(false);
    }

    loadDiseases();
  }, []);

  // 搜索过滤
  const filteredDiseases = diseaseList.filter((d) =>
    d.name.includes(searchTerm) ||
    d.englishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.includes(searchTerm)
  );

  // 如果还在加载
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    );
  }

  // 如果已选择某个疾病，显示详情页
  if (selectedDisease) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedDisease(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← 返回首页
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{selectedDisease.name}</h1>
                <p className="text-sm text-gray-500">{selectedDisease.englishName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("work")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  mode === "work"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                🏥 今天上班
              </button>
              <button
                onClick={() => setMode("study")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
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

        {/* 详情内容 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {mode === "work" ? (
            <WorkMode
              disease={selectedDisease}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
            />
          ) : (
            <StudyMode disease={selectedDisease} />
          )}
        </div>
      </div>
    );
  }

  // 首页：搜索 + 疾病列表
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-600">OrthoFlow</h1>
          <p className="text-gray-500 mt-2">骨科轮转规范化培训工具</p>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索疾病名称、英文简称、拼音..."
            className="w-full px-6 py-4 text-lg rounded-2xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          />
        </div>

        {/* 搜索匹配列表 */}
        {searchTerm && filteredDiseases.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {filteredDiseases.map((disease, index) => (
              <button
                key={disease.id}
                onClick={() => setSelectedDisease(disease)}
                className={`w-full text-left px-6 py-4 hover:bg-blue-50 transition flex items-center justify-between ${
                  index !== filteredDiseases.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div>
                  <span className="font-medium text-gray-800">{disease.name}</span>
                  <span className="text-sm text-gray-400 ml-3">{disease.englishName}</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            ))}
          </div>
        )}

        {searchTerm && filteredDiseases.length === 0 && (
          <div className="mt-4 text-center text-gray-400 py-8">
            未找到匹配的疾病
          </div>
        )}

        {/* 热门疾病 - 改动2：只显示最新添加的3个，并反转顺序 */}
        {!searchTerm && diseaseList.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-gray-400 mb-3">热门疾病</p>
            <div className="flex flex-wrap gap-2">
              {diseaseList.slice(-3).reverse().map((disease) => (
                <button
                  key={disease.id}
                  onClick={() => setSelectedDisease(disease)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm hover:border-blue-400 hover:text-blue-600 transition"
                >
                  {disease.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部统计 */}
        <div className="mt-12 text-center text-sm text-gray-400">
          当前收录 {diseaseList.length} 种骨科疾病
        </div>
      </div>
    </div>
  );
}

// ========== 工作模式组件 ==========
function WorkMode({ disease, currentStep, setCurrentStep }: any) {
  const steps = disease.workflowSteps || [];
  const currentTasks = steps[currentStep]?.tasks || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 左栏：步骤列表 */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">工作流程</h3>
        <div className="space-y-1">
          {steps.map((step: any, index: number) => (
            <button
              key={step.stepId}
              onClick={() => setCurrentStep(index)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                index === currentStep
                  ? "bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {index + 1}. {step.title}
            </button>
          ))}
        </div>
      </div>

      {/* 中栏：步骤详情 */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          第 {currentStep + 1} / {steps.length} 步
        </h3>
        <h4 className="text-xl font-bold text-gray-800 mb-4">
          {steps[currentStep]?.title || "未命名"}
        </h4>
        <div className="space-y-2">
          {currentTasks.map((task: string, i: number) => (
            <div key={i} className="flex items-start gap-3 text-gray-700">
              <span className="text-blue-500 font-bold text-sm">{i + 1}</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右栏：快速操作 */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">快速操作</h3>
        {disease.quickActions && (
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
        )}
      </div>
    </div>
  );
}

// ========== 快速操作卡片 ==========
function QuickActionCard({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("已复制到剪贴板");
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

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

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-between items-center"
      >
        {title}
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
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

// ========== 学习模式组件 ==========
function StudyMode({ disease }: any) {
  return (
    <div className="space-y-8">
      {/* 分型与影像 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">影像与分型</h3>
        {disease.hasClassification ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(disease.classifications || []).map((c: any) => (
              <div
                key={c.id}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => alert(`查看大图: ${c.imageUrl || "暂无图片"}`)}
              >
                <div className="aspect-video bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-400 text-sm">
                  {c.imageUrl ? "📷 点击查看" : "暂无影像"}
                </div>
                <h4 className="font-semibold text-gray-800">{c.type}</h4>
                <p className="text-sm text-gray-500">{c.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">该疾病暂无分型，请查看影像库</div>
        )}
      </section>

      {/* 手术方案 */}
      {disease.surgeryTable && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">手术方案</h3>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {(disease.surgeryTable.headers || []).map((h: string, i: number) => (
                    <th key={i} className="px-4 py-3 text-left text-gray-600 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(disease.surgeryTable.rows || []).map((row: any[], i: number) => (
                  <tr key={i} className="border-t border-gray-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-gray-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 康复方案 */}
      {disease.rehabPlan && disease.rehabPlan.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">康复方案</h3>
          <div className="space-y-3">
            {(disease.rehabPlan || []).map((item: any, i: number) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="font-medium text-blue-600 text-sm">{item.phase}</div>
                <div className="text-gray-700 text-sm mt-1">{item.content}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
