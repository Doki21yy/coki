# coki — AI Builders Digest

AI Builders Digest 可视化版，由 Coki (Follow Builders skill) 自动生成并发布。

## 访问

- 最新 Digest: [https://coki-git.vercel.app](https://coki-git.vercel.app)
- 仓库: [https://github.com/Doki21yy/coki](https://github.com/Doki21yy/coki)

## 自动化流程

每天 09:30 (Asia/Shanghai)，Follow Builders skill 自动：
1. 抓取 X builders 最新推文
2. 生成中文 digest 摘要
3. 构建可视化 HTML
4. 推送到 GitHub
5. Vercel 自动部署更新

## 技术栈

- 纯 HTML/CSS/JS，无框架依赖
- Vercel 静态托管
- GitHub 作为数据源和触发器
