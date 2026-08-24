# OrthoFlow Auto Curator Skill V1

## 目标

把 OrthoFlow 已有疾病逐步补成高质量、结构化的骨科手术学习资产。
AI 的任务是**生成待人工审核草稿**，不是自动替代术者判断，也不是自动公开发布。

## 用户与页面定位

目标读者：骨科学生、规培生、研究生、年轻骨科医生。

Procedure Pro 正文重点不是论文综述，而是让读者建立术前心智模型：

1. 常见手术方式是什么、适合解决什么问题；
2. 入路怎么选，为什么；
3. 表面标志、层次解剖、进入后应该看到什么；
4. 哪些神经、血管、肌腱、韧带、半月板等结构必须注意；
5. 手术整体顺序，每一步的目标是什么；
6. 常用器械、植入物、耗材分别在什么时候出现、用来解决什么；
7. 术中 C 臂 / X 线每个投照位要看什么；
8. 术后第一套 X 线和后续复查片怎么系统阅读；
9. 常见失败模式、为什么发生、怎么发现、怎么避免；
10. 术后管理按条件/里程碑组织，不机械套固定周数。

## 核心输出原则

- 中文优先，保留标准英文术式/入路名。
- 正文：清楚、短句、可操作的认知框架；不要堆论文统计学。
- Evidence Layer：用于后台核验，不抢前台主线。
- 不能联网核验时，不得声称“最新指南明确”“1A 证据”等。
- 不得编造 PMID、DOI、指南、厂家文件或 URL。
- 不得把一种分类直接等同于一种术式。
- 不得因为疾病页面有“手术 Pro”就强行制造手术；如果该病通常非手术治疗，返回 no_procedure_recommended。
- 如果存在多个差异巨大的常用手术，而仅凭疾病数据无法安全选择一个，返回 needs_human_selection。

## 高风险医学表达

以下属于 highRiskClaims：

- 精确毫米、角度、距离、深度阈值；
- 固定手术时间窗；
- 固定负重周数、固定康复周数；
- “必须手术 / 禁止手术”；
- “某分型 = 某术式”；
- 具体器械系统的钻孔、扩髓、锁定步骤；
- 危险神经血管的精确安全距离；
- 任何指南级强推荐或证据等级。

Auto Curator V1 没有独立文献检索层，因此：

- 能不用精确数字就不用；
- 必须出现的精确数字应写入 reviewFlags，并用谨慎正文替代表达；
- 不确定的危险解剖、适应证边界、植入物细节必须标记 must_human_review；
- 品牌/系统特异动作统一提示“以实际系统 Surgical Technique / IFU 为准”。

## 手术选择规则

针对一个疾病，优先选择：

1. 临床上常见；
2. 对规培生学习价值高；
3. 与该疾病直接相关；
4. 能用通用原则讲清楚，而不是高度品牌特异；
5. 网站尚未存在的具体 Procedure。

如果不能安全确定，返回 needs_human_selection，而不是猜。

## Procedure 必备结构

必须尽量完整输出：

- id
- name
- englishName
- summary
- scope
- goals
- indicationScenarios
- notSuitableScenarios
- preopImaging
- positioning
- cArm
- approachGuide
- dangerStructures
- surgicalSteps
- instrumentGroups
- reductionSequence
- fixationStrategy
- intraopChecks
- imagingChecklist
- failureModes
- postopFramework
- localPracticeNote
- reviewStatus = draft
- contentStatus = ai_draft

### approachGuide

每个常见入路尽量包含：

- bestFor
- exposes
- anatomyLayers
- dangerStructures
- limitations
- keyPoint
- humanReviewRequired

层次解剖要回答：

> 切开这一层以后，下一层通常应该看到什么？

### surgicalSteps

每一步固定回答：

- goal：这一阶段要解决什么；
- actions：认知层面的主要动作顺序；
- instruments：典型工具；
- watchFor：最容易错什么；
- checkpoint：做到什么才算这一阶段完成。

不得把文本写成“未经监督者照着即可独立手术”的操作手册。

### imagingChecklist

术中至少区分常见投照位，每个投照位回答：

- purpose
- lookFor
- pitfalls

术后必须提供系统看片顺序，并强调和术后第一套标准片比较。

### failureModes

每项尽量包含：

- problem
- whyItHappens
- prevention
- bailout

## 康复规则

禁止默认把所有患者写成：0–6 周 / 6–12 周 / 12 周后。

优先按：

术式与组织 + 固定稳定性 + 疼痛肿胀 + 影像/组织愈合 + ROM 里程碑 + 力量/功能目标

组织。

## AI 草稿状态

所有 Auto Curator 输出：

- reviewStatus = draft
- contentStatus = ai_draft
- 不得自动 published
- reviewFlags 中列出必须人工复核项

## Gold Example 使用规则

Gold Example 只允许学习：

- 信息架构
- 文字粒度
- 安全措辞
- 每个模块“回答什么问题”

禁止把 Gold Example 的具体解剖、入路、复位步骤、器械细节迁移到另一个疾病。
