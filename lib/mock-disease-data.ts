// ============================================================================
// OrthoFlow · 通用疾病渲染数据源（模拟数据库中的一条疾病记录）
// ----------------------------------------------------------------------------
// 这是整个 UI 的唯一数据来源。所有界面组件均为“纯渲染器”，不含任何具体
// 疾病名称、分型、任务或影像链接。更换此对象即可渲染任意疾病，
// 组件代码无需改动。下方内容以「股骨颈骨折」作为演示数据填充。
// ============================================================================

export interface Classification {
  id: number
  typeName: string
  description: string
  imageUrl: string
}

export interface CommonImage {
  id: number
  title: string
  url: string
}

export interface WorkflowStep {
  stepId: string
  title: string
  tasks: string[]
}

/** 快速操作：四个固定卡片的内容均为可复制的整段文本 */
export interface QuickActions {
  writeMedicalRecord: string
  prescribe: string
  sutureRemoval: string
  emergencyHandling: string
}

export interface SurgeryTable {
  headers: string[]
  rows: string[][]
}

export interface RehabPhase {
  phase: string
  content: string
}

export interface FreeEntry {
  title: string
  subtitle: string
}

export interface MemberNote {
  title: string
  subtitle: string
  items: string[]
}

export interface DiseaseData {
  id: string
  name: string
  englishName: string
  /** 英文简称，用于搜索匹配（如 FNF） */
  abbr?: string
  /** 拼音全拼，用于搜索匹配（如 gugujingguzhe） */
  pinyin?: string
  hasClassification: boolean
  classificationNote: string
  classifications: Classification[]
  commonImages: CommonImage[]
  workflowSteps: WorkflowStep[]
  quickActions: QuickActions
  surgeryTable: SurgeryTable
  rehabPlan: RehabPhase[]
  freeEntries: FreeEntry[]
  memberNote: MemberNote
}

export const diseaseData: DiseaseData = {
  // ---------- 基础信息 ----------
  id: "fnf",
  name: "股骨颈骨折",
  englishName: "Femoral Neck Fracture",
  abbr: "FNF",
  pinyin: "gugujingguzhe",

  // ---------- 影像与分型逻辑（决定学习模式 UI 形态） ----------
  hasClassification: true, // true = 分型卡片网格；false = 普通影像库
  classificationNote: "I/II 稳定可保守，III/IV 移位需手术",
  classifications: [
    {
      id: 1,
      typeName: "Garden I型",
      description: "不完全骨折或外展嵌插，稳定。",
      imageUrl: "https://picsum.photos/600/400?random=1",
    },
    {
      id: 2,
      typeName: "Garden II型",
      description: "完全骨折无移位，相对稳定。",
      imageUrl: "https://picsum.photos/600/400?random=2",
    },
    {
      id: 3,
      typeName: "Garden III型",
      description: "完全骨折部分移位。",
      imageUrl: "https://picsum.photos/600/400?random=3",
    },
    {
      id: 4,
      typeName: "Garden IV型",
      description: "完全骨折完全移位，最不稳定。",
      imageUrl: "https://picsum.photos/600/400?random=4",
    },
  ],
  commonImages: [
    { id: 1, title: "影像图注 1", url: "https://picsum.photos/600/400?random=5" },
    { id: 2, title: "影像图注 2", url: "https://picsum.photos/600/400?random=6" },
  ],

  // ---------- 工作流程（8 个固定步骤及任务清单） ----------
  workflowSteps: [
    {
      stepId: "step-1",
      title: "接诊",
      tasks: [
        "评估生命体征与一般情况",
        "完成髋部 X 线正侧位（必要时 CT）",
        "确定 Garden 分型（I / II / III / IV）",
      ],
    },
    {
      stepId: "step-2",
      title: "查体",
      tasks: [
        "视诊：下肢外旋短缩畸形",
        "触诊：腹股沟区压痛、大转子叩击痛",
        "轴向叩击痛试验",
        "下肢长度测量及足背动脉搏动检查",
      ],
    },
    {
      stepId: "step-3",
      title: "检查",
      tasks: [
        "血常规、凝血四项、D-二聚体",
        "心电图、心脏彩超（评估手术耐受力）",
        "双下肢静脉彩超（排除血栓）",
        "感染四项、肝肾功能、血糖",
      ],
    },
    {
      stepId: "step-4",
      title: "诊断",
      tasks: ["明确股骨颈骨折诊断", "依据 Garden 分型判断稳定性", "评估 ASA 分级及手术风险"],
    },
    {
      stepId: "step-5",
      title: "医嘱",
      tasks: [
        "术前：禁食水、备皮、抗生素皮试",
        "术后：心电监护、吸氧、抗凝（利伐沙班 / 低分子肝素）、镇痛",
      ],
    },
    {
      stepId: "step-6",
      title: "手术",
      tasks: [
        "I / II 型稳定者：闭合复位空心钉内固定",
        "III / IV 型移位者 / 高龄：人工全髋或半髋关节置换术",
      ],
    },
    {
      stepId: "step-7",
      title: "术后",
      tasks: [
        "切口换药（术后第 2 天），拆线（术后约 14 天）",
        "指导踝泵运动预防 DVT",
        "复查 X 线评估位置",
      ],
    },
    {
      stepId: "step-8",
      title: "出院",
      tasks: [
        "出院带药（抗凝药疗程 35 天）",
        "交代门诊复查时间（术后 6 周、3 个月、1 年）",
        "指导功能锻炼（避免盘腿、跷二郎腿）",
      ],
    },
  ],

  // ---------- 快速操作（右栏，四个固定卡片，内容可复制） ----------
  quickActions: {
    writeMedicalRecord:
      "【入院记录模板】\n主诉：____ 侧髋部疼痛伴活动受限 ____ 天。\n现病史：患者 ____ 前因 ____ 致伤，伤后 ____ 侧髋部疼痛、不能站立行走，无 ____，就诊我院。\n既往史：____。\n专科查体：患肢外旋短缩畸形，腹股沟区压痛，大转子叩击痛（+），轴向叩击痛（+）。\n初步诊断：____ 侧股骨颈骨折（Garden ____ 型）。",
    prescribe:
      "【术前医嘱】\n禁食水（术前 8 小时）\n术区备皮\n抗生素皮试\n完善术前检查\n预防性抗凝（遵上级意见）\n\n【术后医嘱】\n心电监护、吸氧\n抗凝：利伐沙班 / 低分子肝素\n镇痛：多模式镇痛\n预防 DVT：踝泵运动\n切口护理、观察渗出",
    sutureRemoval:
      "【换药流程】\n术后第 2 天首次换药，观察切口有无渗出、红肿\n之后每隔 2-3 天换药一次，保持清洁干燥\n记录切口愈合与引流情况\n\n【拆线时间】\n术后约 14 天拆线\n张力较大或愈合欠佳者可适当延迟",
    emergencyHandling:
      "【术后发热】\n评估热型与伴随症状，查血常规、CRP，排查切口 / 肺部 / 泌尿系感染，必要时血培养\n\n【急性疼痛】\n评估疼痛评分与性质，多模式镇痛，警惕骨筋膜室综合征\n\n【DVT 预防】\n鼓励踝泵运动、抗凝达标，突发患肢肿胀 / 胸闷气促时警惕血栓，及时汇报上级",
  },

  // ---------- 分型与手术方案对照表 ----------
  surgeryTable: {
    headers: ["Garden 分型", "适用人群", "推荐手术方式", "关键要点"],
    rows: [
      ["I / II 型", "年轻 / 稳定型", "闭合复位空心钉内固定", "避免早期负重"],
      ["III / IV 型", "高龄 / 移位型", "人工关节置换术", "术后早期下地"],
    ],
  },

  // ---------- 术后康复方案 ----------
  rehabPlan: [
    { phase: "术后 0-3 天", content: "床上踝泵、股四头肌等长收缩，CPM 机被动活动。" },
    { phase: "术后 1 周", content: "坐床边垂腿，扶助行器站立（依据假体类型）。" },
    { phase: "术后 2 周", content: "拆线，扶双拐不负重行走。" },
    { phase: "术后 6 周-3 个月", content: "逐渐过渡至完全负重（内固定者需延长）。" },
    { phase: "术后 1 年", content: "复查 X 线，评估关节功能。" },
  ],

  // ---------- 免费速查入口 ----------
  freeEntries: [
    { title: "股骨颈骨折", subtitle: "Femoral Neck Fracture" },
    { title: "老年髋部骨折（FNF）", subtitle: "Geriatric Hip Fracture" },
  ],

  // ---------- 会员专区（占位，去商业化） ----------
  memberNote: {
    title: "会员专享内容（即将上线）",
    subtitle: "更多进阶内容开发中，免费版核心内容不受影响",
    items: ["影像精读标注开发中", "手术步骤 3D 图解开发中"],
  },
}

// ============================================================================
// 疾病数据库（可搜索列表）
// ----------------------------------------------------------------------------
// 顶部搜索框对接的疾病列表。目前仅内置「股骨颈骨折」一条完整记录，
// 后续接入更多疾病时，只需向此数组追加对应的 DiseaseData 对象即可。
// ============================================================================
export const diseaseList: DiseaseData[] = [diseaseData]

/**
 * 模糊搜索疾病：匹配中文名、英文名、英文简称、拼音。
 * 空查询返回空数组；完整名称可精确命中，部分关键词（如「股骨」）亦可匹配。
 */
export function searchDiseases(query: string): DiseaseData[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return diseaseList.filter((d) =>
    [d.name, d.englishName, d.abbr ?? "", d.pinyin ?? ""].some((field) =>
      field.toLowerCase().includes(q),
    ),
  )
}
