"use client";

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

  return (
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
                  </div>
                ))}
              </div>
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
      </section>
    </div>
  );
}
