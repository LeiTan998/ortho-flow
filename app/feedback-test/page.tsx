import FeedbackHub from "@/components/feedback/FeedbackHub"

export default function FeedbackTestPage() {
  return (
    <main className="min-h-screen bg-[#061220] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            OrthoFlow Test
          </p>

          <h1 className="mt-3 text-3xl font-semibold">
            反馈系统测试页
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            这个页面只用于测试反馈提交、搜索日志、医学纠错和页面解决度。
            原来的主页没有被修改。
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            当前模拟搜索词：
            <span className="ml-2 font-semibold text-white">
              测试病种不存在
            </span>
          </div>

          <FeedbackHub
            diseaseId="feedback_test"
            diseaseName="反馈系统测试病例"
            searchQuery="测试病种不存在"
            searchResultCount={0}
            className="mt-6"
          />
        </div>
      </div>
    </main>
  )
}
