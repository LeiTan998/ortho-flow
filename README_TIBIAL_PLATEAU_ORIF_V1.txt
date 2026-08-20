OrthoFlow · Tibial Plateau ORIF Gold Example v1

这版完成：
1. procedures 独立表（JSONB）
2. tibial_plateau_orif Gold Procedure 数据
3. ProcedureMode 从 Supabase procedures 表按 id 读取
4. 页面模块：适用边界、术前看片、术前10分钟、Approach、Reduction sequence、Intra-op checks、Failure modes、术后轨道、Evidence layer
5. procedureRefs 只负责 Disease -> Procedure 引用，不把手术全文塞回 disease JSON

使用顺序：
A. 先把 types/orthoflow.ts 与 components/ortho/procedure-mode.tsx 覆盖到当前仓库。
B. Commit + Push，等 Vercel Ready。
C. Supabase SQL Editor 运行 supabase/04_tibial_plateau_orif_gold_v1.sql。
D. 刷新网站 -> 胫骨平台骨折 -> 手术 Pro。

注意：
- 当前 reviewStatus = evidence_checked，不等于 human_reviewed。
- 后内侧/前外侧入路目前只放“选择逻辑和停止点”，下一轮再做独立 Approach Atlas。
- 本院实践字段故意留为待补充，避免把科室习惯写成普适指南。
