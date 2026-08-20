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
    "summary": "这不是一张“Schatzker 分型对应术式”的表，而是一条术前认知主线：先根据软组织和 CT 骨折形态建立手术地图，再选择能直接处理责任骨块的入路，恢复长度、力线和关节面，完成稳定支撑，并用透视、关节活动和神经血管检查确认结果。",
    "scope": "成人胫骨平台骨折中已进入 ORIF 评估的病例，重点覆盖常见外侧劈裂/塌陷、双髁及合并后内侧骨块的术前准备与复盘。开放骨折、血管损伤、活动性筋膜室综合征、严重骨缺损、复杂后外侧骨折和关节置换型重建需要单独路径。",
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
    "evidenceUpdatedAt": "2026-08-20",
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
