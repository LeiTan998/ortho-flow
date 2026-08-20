OrthoFlow UI v1.1 小修复包

这次只改 4 个文件，不动数据库、不动疾病数据：
1. app/globals.css
2. components/ortho/work-mode.tsx
3. components/ortho/study-mode.tsx
4. components/feedback/FeedbackHub.tsx

改动：
- “今天上班”卡片改用不透明背景，并移除相关 backdrop-blur，降低全页截图/浏览器合成时出现大块模糊遮挡的概率。
- 修复当前工作流步骤在浅色模式下文字对比度。
- 夜间模式的绿色/黄色/红色语义卡片改成暗色专用配色，不再出现亮白纸片感。
- 底部反馈区压缩为一行式反馈条，减少对正文的视觉抢占。

替换方法：
A. 解压本 ZIP。
B. 进入解压后的文件夹，Ctrl+A、Ctrl+C。
C. 在 GitHub Desktop 里点 Repository > Show in Explorer。
D. 进入你的 ortho-flow 仓库根目录，Ctrl+V。
E. Windows 提示同名文件时选“替换目标中的文件”。
F. 回 GitHub Desktop，确认只出现这 4 个文件被修改。
G. Summary 填：UI v1.1 cleanup
H. 点 Commit to main，再点 Push origin。
I. 等 Vercel 变成 Ready。

如果 Vercel 报错，把第一处 Error 发给 ChatGPT。
