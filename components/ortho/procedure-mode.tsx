"use client";

<<<<<<< HEAD
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
=======
import React, { useState } from "react";
import { DiseaseData, ProcedureData } from "@/types/orthoflow";

interface ProcedureModeProps {
  disease: DiseaseData;
  procedureData?: ProcedureData | null;
}

const DEFAULT_PLATEAU_ORIF: ProcedureData = {
  id: "tibial_plateau_orif",
  title: "胫骨平台切开复位内固定术 (ORIF)",
  englishTitle: "Open Reduction and Internal Fixation of Tibial Plateau Fracture",
  targetDiseaseId: "tibial_plateau",
  summary:
    "以恢复下肢机械力线与关节面平整为核心。根据骨折涉及柱（外侧/内侧/后柱）决定入路，塌陷区顶起植骨支撑，坚强固定骨块并允许早期不负重关节活动。",
  quickPrep: {
    position: "仰卧位，患肢常规垫高约 15°，大腿近端可使用止血带；对侧下肢平放或略下垂，便于 C 臂进出透视。",
    cArm: "C 臂从对侧进入，球管垂直于膝关节。术中需快速切换标准膝关节正位（尾倾 10°-15° 切线位）与标准侧位。",
    draping: "消毒范围自大腿中上段至足趾，下肢保持完全可屈伸活动状态，便于术中牵引复位与关节线显露。",
    instruments: [
      { name: "骨撬 / 顶棒", purpose: "自干骺端开窗，从下向上均匀顶起塌陷的关节面骨块。" },
      { name: "2.0mm 克氏针", purpose: "复位骨块后的临时交叉固定，以及软骨下“排钉 (Rafting)”临时定位。" },
      { name: "大号骨复位钳", purpose: "夹持外侧/内侧骨块纠正髁增宽，恢复平台内外侧解剖宽度。" },
      { name: "胫骨近端解剖锁定钢板", purpose: "外侧解剖型支撑/锁定钢板，或内侧/后内侧 3.5mm 支撑钢板。" },
      { name: "同种异体骨 / 人工骨", purpose: "关节面复位顶起后充填干骺端松质骨缺损区，防止继发塌陷。" }
    ]
  },
  approaches: [
    {
      id: "anterolateral",
      name: "前外侧入路 (Anterolateral Approach)",
      indications: "适用于 Schatzker I、II、III 型及累及外侧柱的单纯劈裂或塌陷骨折。",
      landmarks: "胫骨前肌外侧缘、Gerdy 结节、腓骨头前缘。",
      incision: "自 Gerdy 结节近端 2-3cm 沿胫骨外侧缘弧形向远端延伸，长约 8-12cm。",
      layers: "切开皮肤皮下 → 沿走行切开髂胫束 → 钝性剥离外侧副韧带前缘下方 → 横行切开冠状韧带显露外侧半月板下缘并悬吊保护 → 暴露外侧平台关节线与骨折窗。",
      dangerStructures: [
        { name: "外侧半月板前角及体部", detail: "切开冠状韧带时紧贴平台边缘切，勿横断半月板体部；复位完毕后严密缝合。" },
        { name: "腓总神经", detail: "走行于腓骨颈外后方，向远端暴露或骨膜剥离时禁止越过外侧后缘。" }
      ]
    },
    {
      id: "posteromedial",
      name: "后内侧入路 (Posteromedial Approach)",
      indications: "适用于 Schatzker IV 型内侧平台骨折，或累及后内侧冠状位剪切骨块（三柱分型后内柱受累）。",
      landmarks: "鹅足肌腱后缘、胫骨内侧皮质后缘、内侧关节线。",
      incision: "沿内侧副韧带后缘向远端延伸，平内侧平台下方沿胫骨内后嵴切开约 8-10cm。",
      layers: "切开皮肤皮下 → 向前牵开鹅足肌腱（或将其部分剥离） → 显露并向后牵开内侧腓肠肌与半膜肌间隙 → 骨膜下剥离腘肌附着点暴露后内侧骨块。",
      dangerStructures: [
        { name: "隐神经及大隐静脉", detail: "走行于切口前方浅层，切开皮下时注意识别并钝性向前牵开保护。" },
        { name: "腘窝血管神经鞘", detail: "走行于内侧深层后方，拉钩放置必须紧贴骨面，严禁盲目向深部后方暴力拉拽。" }
      ]
    }
  ],
  steps: [
    {
      stepNumber: 1,
      title: "暴露与探查关节",
      details: "完成切口入路后，切开关节囊及冠状韧带，直视下探查关节腔与外侧半月板。用生理盐水冲洗清除积血与碎骨屑，明确关节面塌陷区域及边缘劈裂骨块范围。",
      instrumentsUsed: "吸引器、深部拉钩、半月板拉钩",
      dangerAlert: "切勿过度用力牵拉皮瓣边缘，胫前皮肤菲薄，拉钩需轻柔以防术后皮瓣坏死。"
    },
    {
      stepNumber: 2,
      title: "干骺端开窗与抬升关节面",
      details: "在外侧劈裂骨块处打开骨折门，或在干骺端前下方开骨窗。使用平头顶棒由下向上轻柔顶起塌陷骨块，使软骨面恢复平整，以股骨髁作为解剖模板对齐。",
      instrumentsUsed: "骨撬 / 顶棒、平头敲击器",
      dangerAlert: "避免尖锐器械单点暴力撬拨，防止穿破关节软骨形成新的医源性软骨粉碎。"
    },
    {
      stepNumber: 3,
      title: "松质骨植骨充填",
      details: "关节面顶平后，干骺端遗留明显松质骨空洞缺损。使用同种异体松质骨颗粒或人工骨替代物紧密充填空洞，提供抗轴向负荷的力学支撑垫。",
      instrumentsUsed: "植骨漏斗、骨压实棒",
      dangerAlert: "植骨需填塞紧实，但避免因过度加压造成刚复位的关节面再度隆起变形。"
    },
    {
      stepNumber: 4,
      title: "临时固定与软骨下排钉 (Subchondral Rafting)",
      details: "使用 2.0mm 克氏针由外向内贴近软骨下 5-10mm 平行穿入，临时维持关节面高度；使用大复位钳夹持外侧劈裂骨块，纠正髁增宽。",
      instrumentsUsed: "2.0mm 克氏针、大号骨复位钳",
      dangerAlert: "克氏针禁止穿透进入关节腔内，术中透视确认针尖位于软骨下骨质层中。"
    },
    {
      stepNumber: 5,
      title: "放置解剖支撑钢板与最终固定",
      details: "将胫骨近端外侧锁定解剖钢板贴附于骨面，近端置入 3-4 枚软骨下平行锁定螺钉（排钉构型），远端骨干置入双皮质螺钉连接干骺端与骨干。",
      instrumentsUsed: "锁定钻套、测深尺、锁定/皮质螺钉",
      dangerAlert: "若合并后内侧骨块，外侧钢板螺钉无法可靠把持后内侧，必须加用后内侧抗滑支撑小钢板。"
    },
    {
      stepNumber: 6,
      title: "半月板修复与分层缝合",
      details: "检查外侧半月板，若有周边附着撕裂行全内或由内向外缝合修复；大量生理盐水冲洗，严密缝合冠状韧带、髂胫束与深筋膜，逐层关闭切口并留置引流管。",
      instrumentsUsed: "半月板缝合针 / PDS 缝线、切口缝线",
      dangerAlert: "缝合皮下组织张力过大时需皮下减张，胫前切口严禁强行拉拢缝合，必要时延期闭合。"
    }
  ],
  intraOpChecks: [
    {
      view: "膝关节标准正位透视 (尾倾 10°-15°)",
      criteria: "内、外侧平台关节面无台阶 (塌陷 < 2mm)，外侧平台无明显向外侧增宽移位，下肢机械力线居中。"
    },
    {
      view: "膝关节标准侧位透视",
      criteria: "后倾角维持在正常 7°-10° 范围，后柱皮质无移位或反折台阶，螺钉未突入髁间窝或关节腔。"
    }
  ],
  failureAndBailout: [
    {
      pitfall: "术后内翻畸形与关节面再塌陷",
      cause: "漏诊后内侧骨块，仅打了单一外侧钢板；或干骺端植骨不足，排钉未能提供足够下托力。",
      bailout: "术中如发现后内侧冠状面骨块移位，果断增加后内侧切口并放置 3.5mm T型/重建抗滑钢板。"
    },
    {
      pitfall: "切口边缘坏死与浅深部感染",
      cause: "在高度水肿、张力性水疱高峰期盲目切开；或内/外侧双切口皮桥过窄 (< 7cm)。",
      bailout: "术前严格等待皮肤皱褶征；双切口确保足够皮桥宽度；一旦皮缘发黑，早期换药清创，严禁张力缝合。"
    }
  ],
  rehabMilestones: [
    {
      phase: "阶段 1：消肿与活动度启动 (术后 0-2 周)",
      goals: "严格不负重。抬高患肢消肿，踝泵训练防血栓。切口条件允许下启动膝关节无痛被动伸屈 (目标 2 周达 90°)。"
    },
    {
      phase: "阶段 2：活动度巩固与肌力唤醒 (术后 2-6 周)",
      goals: "维持严格不负重。争取完全伸膝与屈曲 > 110°。强化股四头肌等长收缩与直腿抬高训练。"
    },
    {
      phase: "阶段 3：条件性部分负重启动 (术后 6-12 周)",
      goals: "复查 X 线确认关节面平整无塌陷且骨折线模糊后，在术者指导下由 20%-30% 体重渐进部分负重，严禁盲目踩地。"
    },
    {
      phase: "阶段 4：完全负重与步态恢复 (术后 12 周以上)",
      goals: "影像确认临床愈合后过渡至完全负重行走，纠正防痛跛行步态，逐步恢复中低强度日常活动。"
    }
  ]
};

export default function ProcedureMode({ disease, procedureData }: ProcedureModeProps) {
  const data = procedureData || DEFAULT_PLATEAU_ORIF;
  const [selectedApproachIndex, setSelectedApproachIndex] = useState(0);
>>>>>>> c964989edd7f275a2fa64ecee9a2863fec7ecf35

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
<<<<<<< HEAD
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
=======
    <div className="space-y-8 animate-fadeIn">
      {/* 顶部手术总览 */}
      <section className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-[0_16px_50px_rgba(39,76,79,.06)] dark:border-[#22393D] dark:bg-[#132326]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C3E4E7] bg-[#EAF7F8] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#15798A] dark:border-[#1E454B] dark:bg-[#163338] dark:text-[#52D3E5]">
              <span className="h-2 w-2 rounded-full bg-[#168FA3] dark:bg-[#52D3E5]" />
              Visual Surgical Protocol · 手术实战
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#172A2E] dark:text-[#EAF4F4] sm:text-3xl">
              {data.title}
            </h2>
            <p className="text-sm text-[#7A9094] dark:text-[#88A2A6]">{data.englishTitle}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E5E2] bg-[#F4F8F7] px-4 py-3 text-sm text-[#4D6569] dark:border-[#264246] dark:bg-[#162A2E] dark:text-[#9FB7BA]">
            <span className="font-semibold text-[#168FA3] dark:text-[#52D3E5]">核心原则：</span>
            力线优先 ＞ 稳定性 ＞ 关节面台阶平整
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-[#435B5F] dark:text-[#A4BDC0]">{data.summary}</p>
      </section>

      {/* 模块 1：术前 10 分钟准备 */}
      <section className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-sm">
            01
          </span>
          <h3 className="text-xl font-bold text-[#172A2E] dark:text-[#EAF4F4]">术前 10 分钟摆台与准备</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#D8E5E2] bg-[#F8FBFA] p-5 dark:border-[#233F43] dark:bg-[#172C30]">
            <div className="text-base font-bold text-[#168FA3] dark:text-[#52D3E5]">🛏️ 患者体位</div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#4A6468] dark:text-[#9AB4B7]">
              {data.quickPrep.position}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E5E2] bg-[#F8FBFA] p-5 dark:border-[#233F43] dark:bg-[#172C30]">
            <div className="text-base font-bold text-[#168FA3] dark:text-[#52D3E5]">📡 C 臂与透视位</div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#4A6468] dark:text-[#9AB4B7]">{data.quickPrep.cArm}</p>
          </div>
          <div className="rounded-2xl border border-[#D8E5E2] bg-[#F8FBFA] p-5 dark:border-[#233F43] dark:bg-[#172C30]">
            <div className="text-base font-bold text-[#168FA3] dark:text-[#52D3E5]">🧼 消毒铺单范围</div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#4A6468] dark:text-[#9AB4B7]">
              {data.quickPrep.draping}
            </p>
          </div>
        </div>

        {/* 器械耗材清单 */}
        <div className="mt-6 border-t border-[#E2ECE9] pt-5 dark:border-[#1E373B]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#738B8E] dark:text-[#8AA4A7]">
            重点器械与植入物耗材清单 (What & Why)
          </h4>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.quickPrep.instruments.map((inst, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-[#DDE7E5] bg-white p-4 shadow-sm dark:border-[#26454A] dark:bg-[#14282C]"
              >
                <div className="text-sm font-bold text-[#1D3539] dark:text-[#E2EEEE]">{inst.name}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-[#5C777B] dark:text-[#95AFB2]">{inst.purpose}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 模块 2：入路选择与解剖层次 */}
      <section className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-sm">
              02
            </span>
            <h3 className="text-xl font-bold text-[#172A2E] dark:text-[#EAF4F4]">手术入路与危险解剖</h3>
          </div>
          {/* 入路切换 Tab */}
          <div className="flex rounded-xl border border-[#D8E5E2] bg-[#F2F7F5] p-1 dark:border-[#243F43] dark:bg-[#172D31]">
            {data.approaches.map((app, idx) => (
              <button
                key={app.id}
                onClick={() => setSelectedApproachIndex(idx)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  selectedApproachIndex === idx
                    ? "bg-[#15798A] text-white shadow-sm dark:bg-[#20A6B9]"
                    : "text-[#5B7377] hover:text-[#172A2E] dark:text-[#8AA4A7] dark:hover:text-white"
                }`}
              >
                {app.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 当前选中入路详情 */}
        {data.approaches[selectedApproachIndex] && (
          <div className="space-y-4 rounded-2xl border border-[#D0E2E0] bg-[#F8FBFA] p-5 sm:p-6 dark:border-[#244246] dark:bg-[#162C30]">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-lg font-bold text-[#19383C] dark:text-[#E8F3F4]">
                {data.approaches[selectedApproachIndex].name}
              </h4>
              <span className="text-xs font-medium text-[#6F888B] dark:text-[#8EA8AB]">
                适应指征：{data.approaches[selectedApproachIndex].indications}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="rounded-xl border border-[#DDE7E5] bg-white p-4 leading-relaxed dark:border-[#28494E] dark:bg-[#14282C]">
                <div className="text-sm font-bold text-[#168FA3] dark:text-[#52D3E5]">📍 表面解剖标志</div>
                <p className="mt-1.5 text-sm text-[#486367] dark:text-[#9BB5B8]">
                  {data.approaches[selectedApproachIndex].landmarks}
                </p>
              </div>
              <div className="rounded-xl border border-[#DDE7E5] bg-white p-4 leading-relaxed dark:border-[#28494E] dark:bg-[#14282C]">
                <div className="text-sm font-bold text-[#168FA3] dark:text-[#52D3E5]">✂️ 切口设计与走行</div>
                <p className="mt-1.5 text-sm text-[#486367] dark:text-[#9BB5B8]">
                  {data.approaches[selectedApproachIndex].incision}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#DDE7E5] bg-white p-4 leading-relaxed dark:border-[#28494E] dark:bg-[#14282C]">
              <div className="text-sm font-bold text-[#168FA3] dark:text-[#52D3E5]">🔍 逐层显露过程 (Layers)</div>
              <p className="mt-1.5 text-sm text-[#486367] dark:text-[#9BB5B8]">
                {data.approaches[selectedApproachIndex].layers}
              </p>
            </div>

            {/* 标红危险结构 */}
            <div className="rounded-xl border border-[#F3C8C8] bg-[#FFF5F5] p-4 dark:border-[#4D2424] dark:bg-[#2A1515]">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#A82828] dark:text-[#F37B7B]">
                <span>⚠️ 必须保护的高危结构 (Danger Structures)</span>
              </div>
              <div className="mt-2.5 space-y-2">
                {data.approaches[selectedApproachIndex].dangerStructures.map((danger, dIdx) => (
                  <div key={dIdx} className="text-sm leading-relaxed text-[#842A2A] dark:text-[#EFA0A0]">
                    <span className="font-bold">• {danger.name}：</span>
                    {danger.detail}
>>>>>>> c964989edd7f275a2fa64ecee9a2863fec7ecf35
                  </div>
                )}
              </div>
<<<<<<< HEAD
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
=======
            </div>
          </div>
        )}
      </section>

      {/* 模块 3：核心手术步骤序列 (Step-by-step) */}
      <section className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-sm">
            03
          </span>
          <h3 className="text-xl font-bold text-[#172A2E] dark:text-[#EAF4F4]">手术核心操作步骤流</h3>
        </div>

        <div className="space-y-4">
          {data.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="group rounded-2xl border border-[#D9E6E3] bg-[#FAFDFD] p-5 transition hover:border-[#96D2D9] dark:border-[#244044] dark:bg-[#152B2F] dark:hover:border-[#387B84]"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#15798A] text-sm font-bold text-white shadow-sm dark:bg-[#20A6B9]">
                  {step.stepNumber}
                </span>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-base font-bold text-[#1A373B] dark:text-[#E5F1F2]">{step.title}</h4>
                    {step.instrumentsUsed && (
                      <span className="text-xs font-semibold text-[#168FA3] dark:text-[#52D3E5]">
                        🛠️ {step.instrumentsUsed}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-[#4A6569] dark:text-[#9BB4B7]">{step.details}</p>
                  {step.dangerAlert && (
                    <div className="rounded-xl border border-[#F1D6A7] bg-[#FFFBF3] px-3.5 py-2 text-xs leading-relaxed text-[#8C6013] dark:border-[#4B3B1B] dark:bg-[#2A2312] dark:text-[#DFB971]">
                      <span className="font-bold">⚠️ 避坑要点：</span>
                      {step.dangerAlert}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 模块 4：术中透视与失误挽救 (Bailout) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 术中透视 */}
        <div className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#15798A] text-xs font-bold text-white">
              04
            </span>
            <h3 className="text-lg font-bold text-[#172A2E] dark:text-[#EAF4F4]">术中 C 臂透视核对标准</h3>
          </div>
          <div className="space-y-3.5">
            {data.intraOpChecks.map((check, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#D9E6E4] bg-[#F8FBFA] p-4 text-sm dark:border-[#233F43] dark:bg-[#172C30]"
              >
                <div className="font-bold text-[#168FA3] dark:text-[#52D3E5]">📸 {check.view}</div>
                <div className="mt-1.5 leading-relaxed text-[#4A6468] dark:text-[#9BB4B7]">{check.criteria}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 常见失败模式与 Bailout */}
        <div className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#A82828] text-xs font-bold text-white">
              05
            </span>
            <h3 className="text-lg font-bold text-[#172A2E] dark:text-[#EAF4F4]">常见失误与术中挽救 (Bailout)</h3>
          </div>
          <div className="space-y-3.5">
            {data.failureAndBailout.map((fail, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#F2D1D1] bg-[#FFF8F8] p-4 text-sm dark:border-[#4B2222] dark:bg-[#281414]"
              >
                <div className="font-bold text-[#A82828] dark:text-[#F37B7B]">❌ 经典失误：{fail.pitfall}</div>
                <div className="mt-1.5 leading-relaxed text-[#5C3939] dark:text-[#C59B9B]">{fail.cause}</div>
                <div className="mt-2 border-t border-[#F7E1E1] pt-2 font-medium text-[#1E7348] dark:border-[#3D1E1E] dark:text-[#6BD59C]">
                  💡 挽救方案：{fail.bailout}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 模块 5：条件进阶康复轨道 */}
      <section className="rounded-[28px] border border-[#D8E5E2] bg-white/90 p-6 shadow-sm dark:border-[#22393D] dark:bg-[#132326]/90">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-sm">
            06
          </span>
          <h3 className="text-xl font-bold text-[#172A2E] dark:text-[#EAF4F4]">术后康复与负重轨道 (条件进阶)</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.rehabMilestones.map((m, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-[#DDE7E5] bg-[#FAFDFD] p-4 dark:border-[#264449] dark:bg-[#152B2F]"
            >
              <div className="text-sm font-bold text-[#168FA3] dark:text-[#52D3E5]">{m.phase}</div>
              <div className="mt-2.5 text-xs leading-relaxed text-[#4A6468] dark:text-[#9BB4B7]">{m.goals}</div>
            </div>
          ))}
        </div>
>>>>>>> c964989edd7f275a2fa64ecee9a2863fec7ecf35
      </section>
    </div>
  );
}
