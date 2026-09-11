OrthoFlow 手术 Pro · 胫骨平台 ORIF V2 升级说明

这次做了什么
1. 手术 Pro 页面新增“术前 10 分钟简报”，可以逐项勾选，并跳转到对应模块。
2. 每个手术模块底部新增快速反馈：有用 / 还缺内容 / 没解决。
3. 胫骨平台 ORIF 数据从概览升级为完整样板：
   - 3 个入路卡：前外侧、后内侧、联合入路
   - 8 个手术步骤卡：从术前地图到最终检查
   - 4 组器械与内固定逻辑
   - 4 个术中透视 / 看片检查卡
   - 术后“五把锁”和 4 条康复活动解锁轨道

怎么发布
1. 用 GitHub Desktop 打开你的 ortho-flow 仓库。
2. 把压缩包里的文件复制到仓库同名位置，选择覆盖。
3. 在 GitHub Desktop 左下角 Summary 写：
   upgrade surgery pro tibial plateau orif
4. 点击 Commit to main。
5. 点击 Push origin。
6. 等 Vercel 自动部署完成。

数据库怎么更新
1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 打开仓库里的这个文件：
   supabase/04_tibial_plateau_orif_gold_v1.sql
4. 全选复制，粘贴到 Supabase SQL Editor。
5. 点 Run。

这条 SQL 可以重复运行。它会覆盖更新 tibial_plateau_orif 这一条 Procedure 数据，并重新确认“胫骨平台骨折”关联到这个手术 Pro。

上线后怎么检查
1. 打开 https://www.orthoflow.com.cn/
2. 搜索并进入“胫骨平台骨折”。
3. 点击顶部“手术 Pro”。
4. 应该能看到：
   - 手术概览：术前 10 分钟简报
   - 入路怎么选：3 个入路卡
   - 解剖与危险区：入路层次和危险结构
   - 手术怎么做：8 个步骤卡
   - 器械与内固定：4 组器械卡
   - 术中 / 术后看片：4 个透视检查卡
   - 术后管理：五把锁和康复活动

重要提醒
1. 这次没有加入任何 Supabase key、Vercel token、密码或患者隐私信息。
2. reviewStatus 仍然是 evidence_checked，不是 human_reviewed。
3. 手术内容用于学习、术前讨论和复盘，不替代上级医师现场带教、本院规范和患者个体化评估。
4. 如果你自己或上级医生发现某句话不符合本院习惯，下一步应该把它写进 localPracticeNote，和通用证据层分开显示。
