-- OrthoFlow Procedure Brain v1
-- Gold Example: Tibial Plateau ORIF
-- 作用：创建 procedures 表（若不存在），写入胫骨平台 ORIF，并把疾病引用状态升级为 published。
-- 建议在 Supabase SQL Editor 中整段执行。

CREATE TABLE IF NOT EXISTS public.procedures (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.procedures TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read published procedures" ON public.procedures;
CREATE POLICY "Public can read published procedures"
ON public.procedures
FOR SELECT
TO anon, authenticated
USING (is_published = true);

INSERT INTO public.procedures (id, data, is_published, updated_at)
VALUES (
  'tibial_plateau_orif',
  $procedure$
  {
    "id": "tibial_plateau_orif",
    "name": "胫骨平台切开复位内固定术",
    "englishName": "Tibial Plateau Open Reduction and Internal Fixation (ORIF)",
    "relatedDiseaseIds": ["tibial_plateau"],
    "contentStatus": "curated",
    "summary": "这不是一张“Schatzker 分型对应术式”的表，而是一条术前认知主线：先根据软组织和 CT 骨折形态建立手术地图，再选择能直接处理责任骨块的入路，恢复长度、力线和关节面，完成稳定支撑，并用透视、关节活动和神经血管检查确认结果。",
    "scope": "成人胫骨平台骨折中已进入 ORIF 评估的病例，重点覆盖常见外侧劈裂/塌陷、双髁及合并后内侧骨块的术前准备与复盘。开放骨折、血管损伤、活动性筋膜室综合征、严重骨缺损、复杂后外侧骨折和关节置换型重建需要单独路径。",
    "approachPrinciple": "入路不是按分型背出来的，而是由 CT 上真正需要直视复位和正确方向支撑的骨块决定。看不清目标骨块、不能安全支撑、或需要越过不熟悉危险区时，要停下来换通道或请更熟悉该入路的术者。",
    "procedureSequenceNote": "这条顺序用于上台前心智排练：先软组织和整体力线，再责任骨块、关节面、骨缺损、内固定、影像与活动测试。真实手术必须按骨折形态、软组织、体位和术者经验动态调整。",
    "instrumentPrinciple": "器械不是越多越 Pro。先准备能恢复长度/力线的牵开和临时固定工具，再准备关节面抬升、骨缺损填充、软骨下支撑和按柱支撑的钢板螺钉系统。",
    "imagingPrinciple": "术中看片不能只说“正侧位满意”。每一次关键透视都要回答四件事：关节面、平台宽度、冠状/矢状位力线、内植物位置与长度。",
    "goals": [
      "恢复关节面的可接受一致性，同时避免把追求毫米级“完美台阶”凌驾于软组织安全、力线和稳定性之上。",
      "恢复胫骨平台宽度、冠状位和矢状位力线，并重建干骺端—骨干关系。",
      "对真正承受剪切或轴向负荷的骨块给予相应方向的支撑；后内侧/后柱骨块不能只期待外侧钢板间接控制。",
      "获得足以支持早期膝关节活动的稳定固定，同时尽量保护骨折片血供和软组织。",
      "识别并处理会改变功能和康复轨道的半月板、韧带、神经血管及软组织问题。"
    ],
    "indicationScenarios": [
      "关节内骨折存在影响稳定性、力线或关节面重建的明显移位/塌陷/髁增宽，并且患者整体情况与软组织允许手术。",
      "双髁或多柱骨折，单纯支具难以维持长度、力线或膝关节稳定性。",
      "存在需要直接复位和支撑的后内侧、后柱或剪切型骨块。",
      "骨折形态允许通过内固定获得比非手术方案更可靠的关节面、稳定性和功能恢复。"
    ],
    "notSuitableScenarios": [
      "软组织仍处于明显肿胀、水疱或挫灭高风险阶段：优先临时稳定与软组织恢复，而不是为了时间表勉强切开。",
      "开放骨折、血管损伤或筋膜室综合征：先进入创伤急诊路径，ORIF 计划必须服从救肢和感染控制。",
      "骨折极度粉碎、骨质极差或既有严重关节病时，ORIF 不是唯一答案，需要评估外固定、分期重建或关节置换等替代策略。",
      "复杂后外侧、血管神经附近骨块或多入路重建超出当前团队经验时，应升级给更有经验的创伤术者。"
    ],
    "preopImaging": [
      "先看标准膝关节 X 线：平台宽度、内外翻、干骺端—骨干关系、腓骨头/Segond 等伴随损伤线索。",
      "CT 轴位、冠状位、矢状位逐层定位骨块；Schatzker 用于描述，但不能代替 CT 的柱/象限理解。",
      "明确是否存在后内侧冠状位剪切骨块、后柱/后外侧骨块、中央或外侧关节面塌陷；这些才真正改变入路和支撑方向。",
      "判断主要参考骨块：哪个骨块最完整、可用于恢复长度和力线；复杂双髁骨折常见内侧/后内侧骨块承担这个角色，但并非绝对。",
      "术前计划板位和螺钉走廊：不同柱的钢板不能互相阻挡，近关节面螺钉必须预留安全轨迹。",
      "记录软组织窗口：水疱、挫灭、既往切口、外固定针道与拟手术切口是否冲突。"
    ],
    "positioning": [
      "使用可透视手术床，并确保从切皮前就能获得无遮挡的正位、侧位及所需斜位。",
      "前外侧/多数双髁方案常以仰卧为基础；若需要直接后内侧或更后方暴露，体位可改为俯卧、侧卧或双体位，具体由骨折形态和入路决定。",
      "患肢应能自由屈伸并允许轴向牵引/股骨牵开器或跨膝外固定架辅助复位。",
      "止血带是否使用、何时充气由术者与软组织/出血情况决定，不作为所有病例固定步骤。"
    ],
    "cArm": [
      "术前先模拟 C 臂进入路径，避免铺单后才发现正位或侧位被手术床、对侧肢体或外固定架挡住。",
      "至少获得真正可判读的正位和侧位；根据后柱/后外侧或螺钉方向增加针对性斜位。",
      "最终透视不仅看关节面，还要看平台宽度、冠状/矢状位力线、钢板位置、近关节面螺钉是否过长或进入关节。",
      "单纯一张“看起来不错”的正位不能替代多平面核对。"
    ],
    "instruments": [
      "胫骨近端解剖钢板系统：外侧支撑/锁定板；根据骨折形态准备后内侧、内侧或小型支撑/抗滑钢板。",
      "K 线、尖头复位钳、球头/大复位钳、临时固定螺钉和可调节牵开/外固定工具。",
      "骨刀、骨膜剥离器、骨捣/关节面抬升工具；塌陷骨折准备骨缺损填充材料。",
      "近关节面 rafting 螺钉所需导向和测深工具；严重粉碎/骨质差时准备备用固定方案。",
      "半月板下关节显露和修复所需器械；如果计划关节镜辅助，提前准备相应设备。"
    ],
    "instrumentGroups": [
      {
        "group": "牵引与临时复位",
        "items": [
          {
            "name": "股骨牵开器 / 跨膝外固定辅助工具",
            "role": "恢复长度、打开关节间隙、帮助判断内外翻和平台宽度。",
            "when": "高能量双髁、明显短缩或单纯手法牵引不足时。",
            "commonMistake": "牵开后看着复位不错，最终固定前没有放松牵引复查，导致真实力线和稳定性被掩盖。"
          },
          {
            "name": "K 线、尖头复位钳、临时螺钉",
            "role": "把已复位的关键骨块先固定住，为最终钢板和 rafting 螺钉争取时间。",
            "when": "责任骨块复位后、最终钢板上板前。",
            "commonMistake": "临时固定挡住最终螺钉走廊，或者让后续钢板位置被迫迁就临时针。"
          }
        ]
      },
      {
        "group": "关节面抬升与骨缺损处理",
        "items": [
          {
            "name": "骨刀、骨膜剥离器、骨捣 / 抬升器",
            "role": "从骨折窗或干骺端窗口逐步抬升塌陷关节面。",
            "when": "外侧平台塌陷、中央塌陷或关节面需要由下向上复位时。",
            "commonMistake": "只抬一个影像上最明显的点，没有用周围完整关节面作为参照，留下局部倾斜或平台增宽。"
          },
          {
            "name": "骨移植 / 骨替代材料",
            "role": "在抬升后存在支撑性空腔时，补充干骺端支撑。",
            "when": "塌陷复位后出现明显骨缺损、骨质差或构型支撑压力较大时。",
            "commonMistake": "把填充材料当作固定强度本身，忽略软骨下螺钉和钢板支撑方向。"
          }
        ]
      },
      {
        "group": "内固定构型",
        "items": [
          {
            "name": "外侧近端胫骨支撑 / 锁定钢板",
            "role": "支撑外侧柱、控制外侧劈裂和平台宽度，配合软骨下 rafting 螺钉。",
            "when": "外侧劈裂塌陷、Schatzker II/VI 中外侧柱需要稳定时。",
            "commonMistake": "外侧板位置满意，但后内侧剪切骨块没有得到独立支撑。"
          },
          {
            "name": "后内侧 / 内侧支撑或抗滑钢板",
            "role": "沿剪切方向控制后内侧或内侧柱骨块，防止内翻和二次移位。",
            "when": "CT 显示独立后内侧骨块、内侧平台冠状位剪切或内侧柱承担主要参考作用时。",
            "commonMistake": "用横向螺钉或外侧钢板去代替真正的 buttress / antiglide。"
          },
          {
            "name": "近关节面 rafting 螺钉",
            "role": "在软骨下骨附近形成支撑排，降低塌陷关节面的再塌陷风险。",
            "when": "关节面抬升并临时稳定后、最终检查螺钉走廊时。",
            "commonMistake": "只在单一正位看螺钉，没有用侧位和斜位确认没有进入关节或过长。"
          }
        ]
      },
      {
        "group": "软组织与合并损伤",
        "items": [
          {
            "name": "半月板下显露与修复器械",
            "role": "帮助直视外侧关节面，尽量保留和修复可修复半月板。",
            "when": "外侧平台劈裂塌陷、怀疑半月板嵌顿或需要半月板下窗口时。",
            "commonMistake": "为了显露直接扩大切除，术后把机械症状和关节退变风险留给患者。"
          },
          {
            "name": "冲洗、引流和闭合备用材料",
            "role": "服务于软组织安全，而不是只服务于骨折复位。",
            "when": "高能量损伤、双切口、多入路或软组织张力临界时。",
            "commonMistake": "最终透视满意后忽略皮肤张力、皮桥、针道和切口闭合质量。"
          }
        ]
      }
    ],
    "approachRefs": [
      {
        "id": "anterolateral_tibial_plateau",
        "name": "前外侧入路",
        "englishName": "Anterolateral Approach",
        "when": "外侧劈裂/塌陷、外侧平台关节面需要直视抬升与外侧支撑时，是最常用入口之一。",
        "why": "可通过外侧平台和半月板下窗口观察关节面，便于处理劈裂、塌陷和外侧柱支撑。",
        "stopPoint": "不要试图从前外侧窗口强行解决明显后内侧剪切骨块；如果目标骨块无法直视或无法给予正确方向支撑，应增加或更换合适入路。"
      },
      {
        "id": "posteromedial_tibial_plateau",
        "name": "后内侧入路",
        "englishName": "Posteromedial Approach",
        "when": "CT 显示独立后内侧冠状位骨块、剪切不稳或需要后内侧直接支撑时考虑。",
        "why": "允许沿骨块受力方向完成直接复位和抗滑/支撑固定，避免仅靠外侧钢板间接控制后内侧骨块。",
        "stopPoint": "若解剖层次不清、神经血管结构定位不确定或需要更深后方暴露，应停止盲目延伸并升级给熟悉该入路的术者。"
      }
    ],
    "approachGuide": [
      {
        "id": "anterolateral_tibial_plateau",
        "name": "前外侧入路",
        "englishName": "Anterolateral Approach",
        "bestFor": [
          "外侧平台劈裂 / 塌陷，需要直视或半月板下窗口处理关节面。",
          "外侧柱支撑、平台宽度控制和外侧近端胫骨钢板放置。",
          "多数外侧为主的低能量或中等复杂病例。"
        ],
        "exposes": [
          "外侧平台皮质轮廓、Gerdy 结节附近区域和外侧关节面窗口。",
          "外侧半月板下方的关节面塌陷区。",
          "外侧支撑钢板与近关节面 rafting 螺钉走廊。"
        ],
        "anatomyLayers": [
          "皮肤和皮下组织：先确认拟切口与软组织挫伤、水疱和既往外固定针道关系。",
          "髂胫束 / 胫前肌筋膜间层面：暴露外侧平台时尽量保护软组织袖。",
          "Gerdy 结节和外侧平台骨面：建立可放置钢板和观察劈裂骨折的窗口。",
          "半月板下窗口：需要时打开关节囊并牵开半月板，直视塌陷关节面。"
        ],
        "dangerStructures": [
          "外侧半月板和冠状韧带：显露关节面时避免无计划切除。",
          "腓总神经：常规前外侧入路不是直接暴露目标，但外侧远端或后外侧扩展时必须保持警觉。",
          "前外侧皮肤软组织：高能量肿胀或水疱时不要为了早做 ORIF 勉强切开。"
        ],
        "limitations": [
          "不能可靠直视和支撑独立后内侧冠状位剪切骨块。",
          "后外侧深部骨块、腓骨头后方区域和腘血管附近问题不应从这个窗口盲目扩大。",
          "如果外侧窗口无法解释 CT 上的责任骨块，应重新规划入路。"
        ],
        "keyPoint": "前外侧入路解决外侧关节面和外侧柱，不负责替所有后方或内侧骨块兜底。",
        "humanReviewRequired": false
      },
      {
        "id": "posteromedial_tibial_plateau",
        "name": "后内侧入路",
        "englishName": "Posteromedial Approach",
        "bestFor": [
          "CT 显示独立后内侧骨块、内侧平台冠状位剪切或后内侧柱承担主要稳定作用。",
          "需要沿剪切方向直接复位，并用后内侧 / 内侧支撑或抗滑钢板控制的病例。",
          "复杂双髁骨折中，需要先建立内侧或后内侧参考骨块的病例。"
        ],
        "exposes": [
          "后内侧胫骨平台和内侧柱后方骨块。",
          "可放置 buttress / antiglide 钢板的后内侧骨面。",
          "内侧参考骨块的皮质复位线。"
        ],
        "anatomyLayers": [
          "后内侧皮肤与皮下组织：避开软组织挫伤区，确认切口和前外侧切口之间的皮桥。",
          "鹅足、腓肠肌内侧头、半膜肌附近层次：按术者熟悉的安全层面进入，不盲目深挖。",
          "后内侧骨块和骨折线：先确认责任骨块，再决定复位钳、临时固定和钢板方向。",
          "后方深部结构：需要更深暴露时必须重新确认解剖和术者经验边界。"
        ],
        "dangerStructures": [
          "腘血管神经束：任何向后方深部延伸都要明确安全边界。",
          "隐神经 / 隐静脉区域：内侧切口和牵开时注意保护。",
          "皮桥和软组织血供：双切口时比单一骨折线更容易决定成败。"
        ],
        "limitations": [
          "不能替代外侧关节面塌陷的直视处理。",
          "不熟悉后内侧层次时，不应为了“多放一块板”冒进。",
          "需要后外侧或腓骨头后方处理时，应使用专门策略。"
        ],
        "keyPoint": "后内侧入路的价值是把剪切骨块按受力方向支撑住；看不清神经血管边界时先停。",
        "humanReviewRequired": true
      },
      {
        "id": "combined_dual_approach",
        "name": "前外侧 + 后内侧 / 内侧联合入路",
        "englishName": "Combined Dual Approach",
        "bestFor": [
          "双髁、多柱或外侧塌陷合并后内侧剪切骨块。",
          "单一外侧钢板无法同时控制平台宽度、关节面和后内侧稳定性的病例。",
          "需要分别解决外侧关节面和内侧 / 后内侧支撑方向的病例。"
        ],
        "exposes": [
          "外侧平台劈裂塌陷区与外侧钢板通道。",
          "内侧或后内侧参考骨块与支撑钢板通道。",
          "允许分阶段确认整体力线和局部关节面。"
        ],
        "anatomyLayers": [
          "先规划两个切口和皮桥，避开水疱、挫伤、针道和张力最大区域。",
          "按责任骨块决定先内后外或先外后内，避免把顺序当成固定公式。",
          "每完成一个柱的临时或最终固定，都回到正侧位和整体力线复查。",
          "闭合前再次评估皮肤张力、软组织覆盖和远端血运神经状态。"
        ],
        "dangerStructures": [
          "皮桥坏死和伤口并发症：联合入路最先失败的常常不是骨头，而是软组织。",
          "不同钢板和螺钉互相占用走廊，导致最终固定被迫妥协。",
          "高能量损伤术后筋膜室和血运变化仍需动态观察。"
        ],
        "limitations": [
          "不适合软组织窗口尚未成熟的病例。",
          "复杂后外侧、血管损伤、严重开放伤或团队经验不足时需要升级策略。",
          "联合入路不是“更 Pro”的默认答案，只在责任骨块需要时使用。"
        ],
        "keyPoint": "联合入路的目的不是把切口做多，而是让每个需要支撑的骨块都有正确的工作通道。",
        "humanReviewRequired": true
      }
    ],
    "dangerStructures": [
      "腓总神经：尤其在腓骨头/颈附近操作、外侧或后外侧扩展时必须明确保护。",
      "腘动脉及其分支：高能量内侧/双髁损伤术前术后均需动态评估；任何血运变化优先于固定计划。",
      "半月板：外侧劈裂塌陷型常合并损伤；显露关节面时避免不必要切除，能修复时尽量保留。",
      "软组织皮桥与胫前皮肤：双切口、多入路或既往外固定针道时必须提前规划，避免把皮肤并发症变成可预见的失败。",
      "关节面下螺钉：过长或方向错误可进入关节，必须用多平面透视核对。"
    ],
    "reductionSequence": [
      "软组织和全身条件先过关；如果仍不适合确定性切开，维持长度/力线的临时稳定比按计划日期开刀更重要。",
      "重新读 CT 并在脑中标出内侧、外侧、后柱/象限；确定需要直视的骨块、支撑方向以及各钢板/螺钉走廊。",
      "先恢复整体长度、旋转和冠状/矢状位力线；可借助牵引、股骨牵开器或原有跨膝外固定架获得初步复位。",
      "复杂双髁骨折中，如果内侧/后内侧骨块较完整并承担主要参考作用，常先直接复位并临时/最终支撑该侧；但顺序必须随骨折形态调整。",
      "处理外侧劈裂时先恢复皮质轮廓和平台宽度，再在直视/半月板下窗口下处理塌陷关节面。",
      "从干骺端窗口或骨折窗将塌陷关节面逐步抬升，以周围完整关节面和影像作为参照；K 线临时固定后再次确认。",
      "对抬升后形成的骨缺损按大小、骨质和固定稳定性决定是否填充骨移植物/替代材料，不把“必须植骨”写成所有病例统一步骤。",
      "完成近关节面 subchondral rafting 支撑与相应柱的 buttress/antiglide 固定；需要多个柱时确保各固定构件相互协同而非互相阻挡。",
      "复查半月板及需要同期处理的合并损伤；最后用透视、直视和膝关节活动共同检查复位与固定。"
    ],
    "surgicalSteps": [
      {
        "id": "step_01_preop_map",
        "title": "切皮前确认：软组织窗口 + CT 手术地图",
        "goal": "决定今天能不能进入确定性 ORIF，以及这台手术真正要解决哪些骨块。",
        "actions": [
          "重新看皮肤：肿胀、水疱、挫灭、张力、外固定针道和拟切口关系。",
          "把 CT 分成内侧、外侧、后内侧、后外侧和中央塌陷区来读，而不是只停在 Schatzker 名称。",
          "标出责任骨块、参考骨块、支撑方向、预计钢板位置和近关节面螺钉走廊。"
        ],
        "instruments": [
          "术前影像工作站 / 打印图",
          "皮肤标记笔",
          "备用外固定、牵开和多柱钢板计划"
        ],
        "watchFor": [
          "软组织条件不允许却被手术排期推着走。",
          "后内侧或后柱骨块在 CT 上很明显，但入路计划仍只按外侧平台处理。",
          "拟切口与针道、水疱或挫伤区冲突。"
        ],
        "checkpoint": [
          "能说清楚：今天的目标骨块是谁，先复哪个，靠什么支撑。",
          "能说清楚：如果切开后发现软组织不安全，下一步怎么退。"
        ]
      },
      {
        "id": "step_02_position_carm",
        "title": "体位、C 臂和牵引通道先调好",
        "goal": "确保手术中能反复看到可判读的正位、侧位和必要斜位。",
        "actions": [
          "摆台后先模拟 C 臂进入路径，确认床、对侧肢体、牵引器和外固定不会挡住关键视图。",
          "让患膝可以屈伸，必要时预留股骨牵开器或跨膝牵引调整空间。",
          "确认止血带、消毒铺巾和备用入路不会互相打架。"
        ],
        "instruments": [
          "可透视手术床",
          "C 臂",
          "牵引 / 牵开装置",
          "备用体位垫和支撑"
        ],
        "watchFor": [
          "铺单后才发现侧位拍不了。",
          "牵开器或外固定架挡住最终螺钉方向。",
          "体位只适合外侧入路，但 CT 上责任骨块需要内侧或后内侧处理。"
        ],
        "checkpoint": [
          "切皮前已经拿到可保存的正位、侧位和至少一个针对性斜位。",
          "术者和助手都知道 C 臂最终检查要拍哪些角度。"
        ]
      },
      {
        "id": "step_03_restore_frame",
        "title": "先恢复整体框架：长度、旋转、内外翻和后倾",
        "goal": "先让胫骨近端的整体框架回到可工作的状态，再处理局部关节面。",
        "actions": [
          "用牵引、牵开或临时外固定帮助恢复长度和冠状 / 矢状位力线。",
          "先找可靠皮质参考，避免一开始就追着最碎的关节面小块跑。",
          "复杂双髁时，根据 CT 判断是否先复位较完整的内侧 / 后内侧参考骨块。"
        ],
        "instruments": [
          "股骨牵开器 / 外固定辅助",
          "复位钳",
          "K 线和临时螺钉"
        ],
        "watchFor": [
          "局部关节面看似抬平，但整个近端胫骨仍内翻、外翻或平台增宽。",
          "牵引造成假性复位，放松后构型不稳。",
          "参考骨块选错，后续所有钢板位置都被带偏。"
        ],
        "checkpoint": [
          "正位能解释冠状位力线和平台宽度。",
          "侧位能解释后倾和干骺端—骨干关系。",
          "临时固定没有阻挡后续钢板和螺钉走廊。"
        ]
      },
      {
        "id": "step_04_posteromedial_if_needed",
        "title": "需要时优先处理后内侧 / 内侧责任骨块",
        "goal": "让承担轴向负荷或剪切不稳的内侧、后内侧骨块获得直接支撑。",
        "actions": [
          "通过术前计划的安全层面暴露责任骨块，不为了多看而盲目向深后方延伸。",
          "用皮质复位线、透视和触觉确认骨块位置，再临时固定。",
          "根据剪切方向选择后内侧 / 内侧 buttress 或 antiglide 构型。"
        ],
        "instruments": [
          "复位钳",
          "K 线 / 临时螺钉",
          "后内侧或内侧支撑钢板",
          "测深与多平面透视"
        ],
        "watchFor": [
          "把后内侧骨块交给外侧钢板间接控制。",
          "后方深部解剖不清仍继续牵开。",
          "内侧固定影响后续外侧 rafting 螺钉走廊。"
        ],
        "checkpoint": [
          "内侧 / 后内侧参考骨块复位稳定，放松临时牵引后不丢失。",
          "钢板方向能解释它为什么能抗剪切或防内翻。",
          "远端血运、感觉运动和软组织张力重新确认。"
        ]
      },
      {
        "id": "step_05_lateral_window",
        "title": "处理外侧劈裂和半月板下关节面窗口",
        "goal": "恢复外侧平台宽度，并在需要时直视塌陷关节面和半月板情况。",
        "actions": [
          "打开外侧工作窗口，先恢复外侧皮质轮廓和平台宽度。",
          "需要时通过半月板下窗口观察关节面，识别半月板嵌顿或可修复损伤。",
          "在直视和透视共同参照下处理外侧平台塌陷。"
        ],
        "instruments": [
          "外侧复位钳",
          "半月板牵开 / 修复器械",
          "K 线临时固定",
          "关节面抬升工具"
        ],
        "watchFor": [
          "外侧平台仍增宽，却误以为关节面已经复位。",
          "为了显露关节面损伤或切除半月板。",
          "半月板下窗口看到的是局部，不能替代整体力线和宽度检查。"
        ],
        "checkpoint": [
          "外侧皮质轮廓、平台宽度和关节面参照点能对应上。",
          "半月板状态已记录，需要修复时已纳入后续康复限制。",
          "临时固定能维持外侧骨块，不挡最终钢板。"
        ]
      },
      {
        "id": "step_06_elevate_defect",
        "title": "抬升塌陷关节面并评估骨缺损支撑",
        "goal": "把塌陷区抬到可接受的关节面位置，并让软骨下骨获得持续支撑。",
        "actions": [
          "从骨折窗或干骺端窗口逐步抬升塌陷区，以周围完整关节面和多平面透视为参照。",
          "K 线临时托住抬升后的关节面，再评估骨缺损大小和骨质。",
          "按缺损、骨质和固定构型决定是否填充骨移植或替代材料。"
        ],
        "instruments": [
          "骨捣 / 抬升器",
          "K 线",
          "骨移植或骨替代材料",
          "C 臂"
        ],
        "watchFor": [
          "抬升过度或不足，造成局部台阶、倾斜或关节面不连续。",
          "填充材料挤入关节或影响后续螺钉走廊。",
          "只看正位，漏掉矢状位塌陷或后倾变化。"
        ],
        "checkpoint": [
          "直视和影像都能解释主要塌陷区已被支撑。",
          "抬升后空腔处理方案已明确。",
          "临时 K 线位置不会被误认为最终支撑。"
        ]
      },
      {
        "id": "step_07_definitive_fixation",
        "title": "最终固定：按柱支撑 + 软骨下 rafting",
        "goal": "让最终构型同时控制责任骨块、平台宽度、关节面和整体力线。",
        "actions": [
          "按计划放置外侧、内侧或后内侧钢板，必要时调整以避开彼此螺钉走廊。",
          "近关节面螺钉尽量贴近软骨下骨形成支撑排，但必须多平面确认不进关节。",
          "最终拧紧前后都复查力线、宽度和各骨块稳定性。"
        ],
        "instruments": [
          "外侧近端胫骨钢板",
          "后内侧 / 内侧支撑钢板",
          "锁定和非锁定螺钉",
          "测深器和导向器"
        ],
        "watchFor": [
          "钢板贴骨漂亮，但没有支撑真正受力的骨块。",
          "近关节面螺钉过长、进入关节或没有托住塌陷区。",
          "多块钢板互相抢走螺钉走廊，导致构型妥协。"
        ],
        "checkpoint": [
          "放松牵引或临时固定后，复位仍能维持。",
          "正位、侧位和必要斜位均未提示关节内螺钉。",
          "每块钢板都能说清楚它在支撑哪个骨块、抵抗哪个方向的力。"
        ]
      },
      {
        "id": "step_08_final_check",
        "title": "最终检查：影像、活动、软组织和神经血管",
        "goal": "在闭合前发现可当场纠正的问题，给术后康复留下清晰边界。",
        "actions": [
          "完成最终正位、侧位和必要斜位透视，保存能说明复位和内植物位置的图像。",
          "活动膝关节，观察固定是否维持、是否有机械冲突或明显不稳。",
          "复查半月板 / 韧带处理情况、切口张力、远端血运和感觉运动。"
        ],
        "instruments": [
          "C 臂",
          "冲洗与闭合器械",
          "必要时引流材料",
          "病历记录模板"
        ],
        "watchFor": [
          "只保存一张好看的正位，没有侧位或斜位支撑。",
          "闭合前不活动膝关节，术后才发现冲突或不稳。",
          "高能量病例术后筋膜室风险被忽略。"
        ],
        "checkpoint": [
          "术后医嘱能写清 ROM、负重和复查影像的依据。",
          "合并半月板 / 韧带 / 软组织处理已经影响康复轨道时，有明确记录。",
          "神经血管状态和切口软组织状态有术毕基准。"
        ]
      }
    ],
    "fixationStrategy": [
      "固定不是“Schatzker II 用外侧板、IV 用内侧板”的自动映射，而是让钢板位置与真正需要支撑的骨块方向一致。",
      "后内侧剪切骨块如果承担轴向负荷，通常需要独立的后内侧/内侧支撑或抗滑构型；单一外侧钢板往往不能提供理想的直接支撑。",
      "外侧塌陷区抬升后，近关节面 rafting 螺钉可用于支撑软骨下骨；2024 年临床队列提示保留 rafting wires 与更少的影像学再塌陷相关，但绝对差异较小，不能把某一种构型写成唯一标准。",
      "骨质疏松、严重粉碎或骨缺损增加构型负荷时，应考虑更强的支撑、锁定或多柱固定，而不是只增加单颗螺钉。",
      "在追求固定强度时尽量减少不必要的骨膜剥离，保留干骺端碎片血供。"
    ],
    "intraopChecks": [
      "关节面：直视/影像确认主要塌陷和劈裂已复位，没有明显不可接受的台阶或关节内游离骨块。",
      "平台宽度：外侧劈裂和双髁骨折不能只看关节面，要确认髁宽没有持续增宽。",
      "力线：正位确认内外翻，侧位确认后倾和干骺端—骨干关系；复杂骨折避免只盯局部骨块。",
      "内植物：所有近关节面螺钉用多平面透视检查长度和轨迹，避免关节内穿透或突出的内植物。",
      "固定稳定性：去除/放松临时牵引后再次检查构型是否维持；活动膝关节观察是否出现骨块移位或机械冲突。",
      "神经血管与筋膜室：术毕重新记录远端血运感觉运动；高能量损伤术后仍需继续动态观察。"
    ],
    "imagingChecklist": {
      "mnemonic": "面、宽、线、钉",
      "intraop": [
        {
          "view": "真正正位 AP",
          "purpose": "判断冠状位力线、平台宽度、内外侧平台高度和内植物整体位置。",
          "lookFor": [
            "内外翻是否可接受，干骺端—骨干关系是否连续。",
            "平台是否仍增宽，外侧劈裂是否真正合拢。",
            "近关节面螺钉是否过长或方向可疑。",
            "内侧 / 后内侧支撑是否解释得通。"
          ],
          "pitfalls": [
            "C 臂角度不正时，把假性关节面平整当成真实复位。",
            "只看局部塌陷，不看整个平台宽度和力线。"
          ]
        },
        {
          "view": "标准侧位 Lateral",
          "purpose": "判断胫骨平台后倾、前后方向复位和螺钉是否接近关节。",
          "lookFor": [
            "后倾是否被改变，干骺端是否前后移位。",
            "中央或后方塌陷是否仍存在。",
            "近关节面螺钉是否在侧位上进入关节或过近。",
            "钢板远端与骨干是否匹配。"
          ],
          "pitfalls": [
            "侧位不标准时，后倾和后方塌陷容易被低估。",
            "外侧平台复位满意但后内侧骨块仍向后或向下移位。"
          ]
        },
        {
          "view": "针对性斜位 / 平台切线位",
          "purpose": "补足正侧位看不清的后柱、后外侧或螺钉尖端区域。",
          "lookFor": [
            "后内侧或后外侧骨块是否被真正控制。",
            "疑似过长螺钉在斜位上是否进入关节或突出皮质。",
            "外侧平台后方塌陷是否仍被遗漏。"
          ],
          "pitfalls": [
            "把斜位当成固定角度模板，而不是根据责任骨块调整。",
            "没有记录为什么加拍这一张，术后复盘无法对应问题。"
          ]
        },
        {
          "view": "最终构型检查",
          "purpose": "在去除或放松牵引、临时固定后确认复位仍然维持。",
          "lookFor": [
            "去除临时牵引后，平台宽度和力线有没有变化。",
            "膝关节活动时有无骨块移位、内植物冲突或明显不稳。",
            "所有临时 K 线是否已按计划处理。"
          ],
          "pitfalls": [
            "在牵引状态下拍到好图，关闭后真实负荷环境下复位丢失。",
            "最终没有重新查神经血管和软组织张力。"
          ]
        }
      ],
      "postopBaseline": [
        "术后第一套正侧位片用于建立基准：关节面、平台宽度、冠状 / 矢状位力线、钢板位置和螺钉长度。",
        "把术后基准片与术中最终透视对应，而不是只写“内固定在位”。",
        "记录半月板、韧带或软组织处理是否改变康复计划。"
      ],
      "followUp": [
        "每次复查都和术后基准片比较：平台是否再塌陷、是否逐渐内翻、螺钉是否切出或松动。",
        "疼痛、肿胀或功能突然变差时，影像解释必须回到固定稳定性、关节面和软组织状态。",
        "负重升级前，影像只是一把锁，还要同时看疼痛、肿胀、步态控制和术者对固定强度的判断。"
      ],
      "whenToEscalateImaging": [
        "普通 X 线无法解释疼痛、弹响、卡顿或活动受限时。",
        "怀疑关节内螺钉、局部再塌陷、后柱骨块失控或平台宽度变化时。",
        "术后症状与 X 线表现不一致，或需要重新规划翻修 / 取出 / 康复分轨时。"
      ]
    },
    "failureModes": [
      {
        "problem": "软组织条件没成熟就做确定性 ORIF",
        "whyItHappens": "被固定手术日期或“尽早复位”驱动，忽略水疱、挫灭、肿胀和皮肤窗口。",
        "prevention": "把软组织状态作为进入确定性切开的门槛；必要时继续跨膝外固定/牵引维持长度与力线。",
        "bailout": "如果切皮前发现条件不安全，取消或缩小手术目标、维持临时稳定，待软组织恢复后再做确定性固定。"
      },
      {
        "problem": "只按 Schatzker 分型规划，漏掉后柱/后内侧骨块",
        "whyItHappens": "把 X 线分型当成完整三维手术地图。",
        "prevention": "术前逐层读 CT，明确每个需要独立支撑的柱/象限和骨块方向。",
        "bailout": "术中发现原计划无法控制后方骨块时，重新评估入路和固定策略；不要从错误窗口强行间接复位。"
      },
      {
        "problem": "关节面看起来平了，但平台仍增宽或力线错误",
        "whyItHappens": "过度关注局部台阶，忽略整体长度、宽度、冠状位和矢状位。",
        "prevention": "把长度/旋转/力线放在复位主线前端，关节面复位后再次回到整体影像检查。",
        "bailout": "最终固定前先解除造成假性复位的牵引或夹持，重新调整整体构型，再补局部固定。"
      },
      {
        "problem": "后内侧骨块缺乏正确方向支撑，出现内翻或二次塌陷风险",
        "whyItHappens": "期望外侧钢板或横向螺钉间接控制一个承受轴向剪切的后内侧骨块。",
        "prevention": "CT 识别后内侧剪切模式；需要时通过合适入路给予直接 buttress/antiglide。",
        "bailout": "若术中仍有后内侧不稳定，不要仅依赖增加外侧螺钉；重新评估独立支撑的必要性。"
      },
      {
        "problem": "近关节面螺钉进入关节或无法真正支撑塌陷区",
        "whyItHappens": "单一透视位、螺钉轨迹与关节面形态理解不足。",
        "prevention": "预先规划 rafting 轨迹并用多平面透视确认；固定前后都检查。",
        "bailout": "任何怀疑关节内穿透的螺钉应立即重新成像并调整，而不是期待术后再处理。"
      },
      {
        "problem": "术后把所有病例统一设成固定不负重周数",
        "whyItHappens": "把传统时间表当作固定规则，没有结合骨折复杂度、固定稳定性和影像。",
        "prevention": "把负重、ROM、力量拆开并按固定稳定性、症状和影像里程碑推进。",
        "bailout": "如果既定康复时间表与当前影像/固定情况不匹配，回到术者评估并重新分轨，而不是按日期自动升级。"
      }
    ],
    "postopFramework": {
      "monitoring": [
        "术后继续动态观察筋膜室、远端血运/感觉运动和切口软组织；高能量损伤不能因为“已经固定”就降低警惕。",
        "镇痛、抗菌药和静脉血栓栓塞症预防按患者风险与本院方案执行，不在 Procedure Brain 中写成统一处方。"
      ],
      "rom": [
        "固定与软组织允许时尽早启动踝泵、股四头肌等长训练和膝关节活动；目标是减少僵硬，而不是追求某一天必须达到固定角度。",
        "半月板修复、韧带重建、软组织修复或固定稳定性不足时，ROM 轨道需要相应更保守。"
      ],
      "weightBearing": [
        "不使用所有胫骨平台 ORIF 统一的“6 周/8 周/12 周自动进阶”规则。",
        "传统 AO 参考路径常根据关节面损伤程度延迟负重，但 2025 年 RCT 在选择后的 Schatzker I–IV ORIF 患者中显示即刻耐受性负重并未带来更差的影像学结果；该结果不能直接外推到复杂双髁、严重粉碎、骨质差或固定不稳定病例。",
        "实际进阶由骨折形态、固定构型、骨质、合并修复、疼痛/肿胀、步态控制和复查影像共同决定。"
      ],
      "followUp": [
        "早期复查重点是切口、软组织、神经血管和膝关节活动；随后影像用于确认关节面/力线维持与愈合趋势。",
        "复查频率按高能量程度、骨质、固定稳定性、并发症和康复进展分层，不机械复制统一时间点。"
      ]
    },
    "rehabContract": {
      "principle": "胫骨平台 ORIF 的恢复不是按日期自动升级，而是每次只解锁一个变量：活动度、力量、负重、日常活动和运动冲击必须分开判断。",
      "locks": [
        {
          "id": "fixation",
          "name": "固定锁",
          "question": "术者是否认为关节面、柱支撑和内植物构型足以承受下一阶段负荷？"
        },
        {
          "id": "soft_tissue",
          "name": "软组织锁",
          "question": "切口、肿胀、水疱、感染风险和疼痛是否允许继续推进？"
        },
        {
          "id": "imaging",
          "name": "影像锁",
          "question": "复查片与术后基准片相比，关节面、力线、平台宽度和内植物有没有恶化？"
        },
        {
          "id": "symptom",
          "name": "症状锁",
          "question": "疼痛、肿胀、夜间痛和活动后反应是否在可接受范围？"
        },
        {
          "id": "control",
          "name": "控制锁",
          "question": "股四头肌控制、膝关节活动度、步态和依从性是否能支持下一阶段？"
        }
      ],
      "globalRedFlags": [
        "疼痛或肿胀突然明显加重，尤其伴麻木、被动牵拉痛或远端血运变化。",
        "切口红肿渗液、发热、皮缘坏死或软组织张力继续恶化。",
        "复查片提示关节面再塌陷、逐渐内翻、螺钉松动 / 切出或钢板失败。",
        "负重后步态明显失控，或疼痛反应持续超过预期恢复窗口。"
      ],
      "activities": [
        {
          "id": "early_rom",
          "activity": "早期膝关节活动度训练",
          "category": "ROM",
          "impactLevel": "low",
          "typicalWindow": "固定和软组织允许时尽早开始；具体范围由术者和合并修复决定。",
          "unlockCriteria": [
            "切口和软组织允许活动。",
            "固定构型足以支持非负重下膝关节活动。",
            "半月板或韧带修复没有要求更保守限制。"
          ],
          "delayFactors": [
            "软组织张力大、切口风险高或疼痛 / 肿胀反应明显。",
            "固定稳定性不足或术者明确要求保护。",
            "合并半月板、韧带或软组织修复需要限制活动范围。"
          ],
          "specialNotes": [
            "ROM 和负重是两件事，可以早活动但不代表可以早负重。",
            "目标是减少僵硬，同时不牺牲关节面和内固定稳定。"
          ],
          "reviewTriggers": [
            "活动后疼痛和肿胀持续加重。",
            "出现卡顿、弹响、关节绞锁或机械性症状。"
          ]
        },
        {
          "id": "protected_weight_bearing",
          "activity": "保护性负重进阶",
          "category": "Weight bearing",
          "impactLevel": "moderate",
          "typicalWindow": "时间窗必须个体化；传统延迟负重和选择性早期耐受性负重都需要术者确认。",
          "unlockCriteria": [
            "复查影像相对术后基准片稳定。",
            "术者认为骨折形态、钢板螺钉构型和骨质允许下一阶段。",
            "疼痛、肿胀和步态控制能承受计划负荷。"
          ],
          "delayFactors": [
            "复杂双髁、后柱不稳、严重粉碎、骨质差或固定构型边缘。",
            "影像有再塌陷、内翻趋势或内植物应力改变。",
            "患者无法可靠控制部分负重或依从性不足。"
          ],
          "specialNotes": [
            "不要把“能下地”直接等同于“可以全负重”。",
            "每次增加负荷后都要观察 24 到 48 小时疼痛和肿胀反应。"
          ],
          "reviewTriggers": [
            "负重后疼痛明显上台阶，或肿胀持续不退。",
            "步态失控、膝关节反复打软或影像出现变化。"
          ]
        },
        {
          "id": "daily_activity",
          "activity": "日常生活与工作回归",
          "category": "ADL",
          "impactLevel": "daily",
          "typicalWindow": "由行走安全、上下楼、久站需求和工作负荷决定，不用单一术后周数判断。",
          "unlockCriteria": [
            "基础步态安全，辅助器使用清楚。",
            "疼痛和肿胀能被休息、冰敷、抬高和药物方案控制。",
            "复查影像没有提示固定或力线问题。"
          ],
          "delayFactors": [
            "需要长时间站立、搬重物、频繁上下楼或通勤距离长。",
            "切口未稳、肿胀明显或夜间痛加重。",
            "患者对保护性负重理解不足。"
          ],
          "specialNotes": [
            "办公室工作、站立工作和体力劳动应分开评估。",
            "复工建议最好写清允许活动、禁止动作和复查节点。"
          ],
          "reviewTriggers": [
            "工作后症状反跳明显。",
            "无法遵守负重限制或保护策略。"
          ]
        },
        {
          "id": "high_impact",
          "activity": "跑跳和高冲击运动",
          "category": "Sport",
          "impactLevel": "high",
          "typicalWindow": "只在骨折愈合、力线稳定、力量和控制恢复后再讨论。",
          "unlockCriteria": [
            "影像显示愈合趋势可靠，关节面和内固定未失效。",
            "股四头肌力量、单腿控制、平衡和步态接近可接受水平。",
            "没有持续关节积液、明显疼痛或机械症状。"
          ],
          "delayFactors": [
            "关节面损伤重、半月板 / 韧带合并损伤或创伤后关节炎风险高。",
            "仍存在肿胀、疼痛、活动受限或力量不足。",
            "患者运动目标超过当前结构承受能力。"
          ],
          "specialNotes": [
            "高冲击运动不是所有胫骨平台 ORIF 患者都应该追求的默认终点。",
            "需要把患者职业、年龄、骨质、关节面损伤和长期退变风险放在一起谈。"
          ],
          "reviewTriggers": [
            "运动中或运动后出现肿胀、卡顿、打软或疼痛反复。",
            "影像显示关节面、力线或内植物有变化。"
          ]
        }
      ]
    },
    "evidenceClaims": [
      {
        "id": "soft_tissue_first",
        "claim": "复杂胫骨平台 ORIF 的确定性手术时机应由软组织恢复决定，严重肿胀时可先临时跨膝稳定。",
        "evidenceVerified": "true",
        "sourceType": "AO Surgery Reference",
        "sourceTitle": "ORIF - Conventional plating for Complete articular fracture with fragmentary lateral plateau",
        "sourceUrl": "https://surgeryreference.aofoundation.org/orthopedic-trauma/adult-trauma/proximal-tibia/complete-articular-fracture-with-fragmentary-lateral-plateau/orif-conventional-plating",
        "contextLimit": "AO 页面主要针对复杂完全关节内骨折；具体等待天数不是所有胫骨平台的固定硬标准。",
        "finalWording": "复杂骨折应把软组织恢复作为确定性 ORIF 的主要门槛；必要时先临时稳定。"
      },
      {
        "id": "morphology_drives_approach",
        "claim": "入路和钢板位置由 CT 骨折形态及需要支撑的柱/象限决定，而不是单靠 Schatzker 分型。",
        "evidenceVerified": "true",
        "sourceType": "Current concepts review",
        "sourceTitle": "Current concepts in tibial plateau fracture management: a Spanish Orthopaedic Trauma Association review",
        "sourceUrl": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12045298/",
        "contextLimit": "不同中心对复杂后外侧骨折的入路仍存在明显差异。",
        "finalWording": "Schatzker 负责描述，CT 形态、柱/象限和支撑方向才真正进入手术规划。"
      },
      {
        "id": "reduction_sequence",
        "claim": "复杂双髁骨折常先处理较完整的内侧/后内侧参考骨块，再处理外侧关节面；顺序必须随形态调整。",
        "evidenceVerified": "true",
        "sourceType": "AO Surgery Reference",
        "sourceTitle": "ORIF - Conventional plating for Complete articular fracture with fragmentary lateral plateau",
        "sourceUrl": "https://surgeryreference.aofoundation.org/orthopedic-trauma/adult-trauma/proximal-tibia/complete-articular-fracture-with-fragmentary-lateral-plateau/orif-conventional-plating",
        "contextLimit": "适用于复杂完全关节内/双髁模式的常见顺序，不是所有胫骨平台 ORIF 的固定 sequence。",
        "finalWording": "复杂双髁模式中常先恢复承担参考作用的内侧/后内侧柱，再处理外侧；最终顺序服从骨折形态。"
      },
      {
        "id": "rafting_support",
        "claim": "塌陷关节面抬升后可采用近关节面 rafting 构型支撑软骨下骨。",
        "evidenceVerified": "partial",
        "sourceType": "Retrospective cohort",
        "sourceTitle": "Subchondral rafting wires reduce tibial plateau fracture subsidence",
        "sourceUrl": "https://link.springer.com/article/10.1007/s00590-024-03963-1",
        "sourceIdentifier": "DOI: 10.1007/s00590-024-03963-1",
        "contextLimit": "2024 队列研究显示影像学再塌陷减少，但绝对差异较小，不能证明某一种 rafting 构型对所有病例都更优。",
        "finalWording": "rafting 是支撑塌陷关节面的常用构型之一，具体螺钉/钢板方案按骨质和骨折形态选择。"
      },
      {
        "id": "early_rom",
        "claim": "稳定固定的目的之一是允许较早启动膝关节活动。",
        "evidenceVerified": "true",
        "sourceType": "AO Surgery Reference",
        "sourceTitle": "ORIF - Conventional plating for Complete articular fracture with fragmentary lateral plateau",
        "sourceUrl": "https://surgeryreference.aofoundation.org/orthopedic-trauma/adult-trauma/proximal-tibia/complete-articular-fracture-with-fragmentary-lateral-plateau/orif-conventional-plating",
        "contextLimit": "ROM 仍受伤口、软组织、半月板/韧带修复及固定稳定性限制。",
        "finalWording": "在固定和软组织允许的前提下，早期 ROM 应优先于长期无必要制动。"
      },
      {
        "id": "weight_bearing_individualized",
        "claim": "胫骨平台 ORIF 术后负重不应机械套统一周数。",
        "evidenceVerified": "partial",
        "sourceType": "Randomized clinical trial",
        "sourceTitle": "Immediate weight-bearing after tibial plateau fractures internal fixation results in better clinical outcomes with similar radiological outcomes",
        "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/39964437/",
        "sourceIdentifier": "PMID: 39964437; DOI: 10.1007/s00264-025-06443-1",
        "contextLimit": "RCT 主要覆盖选择后的 Schatzker I–IV 患者；不能直接外推至严重双髁、复杂后柱、骨质差或固定不稳定病例。",
        "finalWording": "负重进阶应个体化；在选择合适且固定稳定的部分患者中，更早负重可能是可行的，但复杂病例仍需更保守评估。"
      }
    ],
    "localPracticeNote": "待你补充本院实践：常用体位、钢板系统、是否常规使用股骨牵开器/关节镜、后内侧骨块的主任偏好、术后负重习惯。这里会与文献层分开显示，不把本院习惯包装成普适标准。",
    "evidenceUpdatedAt": "2026-09-12",
    "reviewStatus": "evidence_checked"
  }
  $procedure$::jsonb,
  true,
  now()
)
ON CONFLICT (id) DO UPDATE
SET data = EXCLUDED.data,
    is_published = EXCLUDED.is_published,
    updated_at = now();

-- Disease -> Procedure 引用：存在就升级为 published；没有则写入。
UPDATE public.diseases
SET data = jsonb_set(
  data,
  '{procedureRefs}',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'tibial_plateau_orif',
      'name', '胫骨平台切开复位内固定术',
      'englishName', 'Tibial Plateau ORIF',
      'summary', 'Gold Procedure：术前看片、体位、C臂、入路、复位顺序、固定、术中检查、失败模式与术后轨道。',
      'pro', true,
      'status', 'published'
    )
  ),
  true
)
WHERE data->>'id' = 'tibial_plateau';

-- 验证
SELECT id, is_published, data->>'name' AS procedure_name, data->>'reviewStatus' AS review_status
FROM public.procedures
WHERE id = 'tibial_plateau_orif';

SELECT data->>'id' AS disease_id, data->'procedureRefs' AS procedure_refs
FROM public.diseases
WHERE data->>'id' = 'tibial_plateau';
