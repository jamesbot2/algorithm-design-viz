# 算法设计与分析 · 交互可视化

面向「算法设计与分析」课程的静态学习网站：中文理论章节 + 逐步算法可视化（数组 / 矩阵 / 图状态与变量面板）。

**在线地址：** https://jamesbot2.github.io/algorithm-design-viz/

## 本地运行

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 技术栈

- Vite + React + TypeScript
- React Router（HashRouter，适配 GitHub Pages）
- 纯静态部署，`base: '/algorithm-design-viz/'`

## 内容结构

| 章节 | 路径 |
|------|------|
| 绪论与复杂度 | `/#/chapter/intro` |
| 分治 | `/#/chapter/divide` |
| 动态规划 | `/#/chapter/dp` |
| 贪心 | `/#/chapter/greedy` |
| 图算法 | `/#/chapter/graph` |
| 网络流 | `/#/chapter/flow` |
| 字符串 | `/#/chapter/string` |
| 复杂度理论 | `/#/chapter/complexity` |

算法可视化路径形如 `/#/algo/bubbleSort`。

## GitHub Pages

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会自动构建并部署。

仓库设置中启用 **Pages → GitHub Actions**。

## 许可

仅供学习交流使用。
