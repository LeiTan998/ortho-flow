OrthoFlow Procedure Pro 骨架 v1

本次只做“纵向切片”的前两步：
1. 前端支持第三模式：手术 Pro（只有 procedureRefs 非空的疾病才显示）
2. 给胫骨平台提供一条可选 SQL，用于写入 tibial_plateau_orif 引用

没有做：
- 付费登录
- 真实 Procedure 全文
- procedures 独立数据表
- Approach Atlas 全文

为什么这样做：
先验证 Disease → Procedure 的产品入口与 UI，再填第一个 Gold Procedure，避免一次性重构过多。

修改/新增文件：
- app/page.tsx
- types/orthoflow.ts
- components/ortho/procedure-mode.tsx
- supabase/03_tibial_plateau_procedure_ref_preview.sql

部署建议：
A. 先提交前端三个文件到 GitHub，确认 Vercel Ready。
B. 再到 Supabase SQL Editor 执行 03_tibial_plateau_procedure_ref_preview.sql。
C. 刷新网站，进入“胫骨平台骨折”，顶部应出现“手术 Pro”。
