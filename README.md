# 算法设计与分析 · 交互可视化

面向「算法设计与分析」课程的静态学习网站：中文理论章节 + 逐步算法可视化（数组 / 矩阵 / 图 / 搜索树与变量面板）。

**在线地址：** https://jamesbot2.github.io/algorithm-design-viz/  
> 注意：若本地 commits **尚未授权 push**，Pages 上可能仍是旧版。以本仓库本地 `main` 与 `docs/VERIFICATION.md` 为准。

## 本地运行

```bash
npm ci          # 推荐；或 npm install
npm run dev
```

测试 / 检查 / 构建：

```bash
npm run lint
npm run test:run
npm run build
npm run preview   # 预览 dist
```

## 技术栈

- Vite + React + TypeScript
- React Router（HashRouter，适配 GitHub Pages）
- Vitest + Testing Library（算法与解析单测）
- oxlint（`npm run lint`）
- 纯静态部署，`base: '/algorithm-design-viz/'`
- UI：深色 ChatGPT 风格侧栏布局

## 已实现功能（M0–M4，如实）

- 多章节理论 + 算法逐步可视化（排序 / 二分 / DP / 图 / KMP / N皇后 / Huffman / 矩阵链等）
- **运行流**：草稿 → 校验 →「运行」生成步骤；「恢复默认」「重置播放」
- **复杂度元数据**与实现一致（Dijkstra 分朴素 O(V²+E) 与堆优化两套）
- **二分**禁止静默排序；图 **edge id** / 角色高亮；矩阵 **0 可高亮**
- **Trace / registry**：typed validate+solve、freeze、∞ JSON、runner budget
- **双导航**（设计思想 / 问题类型）与诚实完成标记
- **教学**：`/#/teach/knapsack` 多策略对照
- **练习**：`/#/practice` 预测下一步 / 解释 / 反例（本地进度，非 LMS）
- **实验台**：`/#/experiment` 计数导出（非 DOM 计时证明）
- **场景分享**：URL hash / JSON；**讲义**：`/#/lab/core`
- **CI**：`.github/workflows/ci.yml`（lint + test + build）；**未 push 则远程未跑**

## 未完成 / 推迟

| 项 | 说明 |
|----|------|
| Playwright E2E | 推迟；手工清单见 `docs/VERIFICATION.md` |
| Pages 与 CI 串联 | 未做；`deploy-pages.yml` 仍独立于 push |
| 拓展算法 | Edmonds-Karp / Strassen / 最近点对（规划） |
| 根 LICENSE | 见 `docs/LICENSE_NOTES.md`（勿假设 MIT） |

详情：`docs/IMPLEMENTATION_STATUS.md`、`docs/COURSE_MAP.md`、`docs/FINAL_DELIVERY.md`。

## 内容结构（路由）

| 页面 | 路径 |
|------|------|
| 首页双导航 | `/#/` |
| 理论章节 | `/#/chapter/:id` |
| 算法可视化 | `/#/algo/:id` |
| 背包教学单元 | `/#/teach/knapsack` |
| 练习 | `/#/practice` |
| 实验台 | `/#/experiment` |
| 参考讲义 | `/#/lab/core` |

## GitHub Actions / Pages

- **CI**（`ci.yml`）：`pull_request` 与 `push`→`main` → `npm ci` → lint → `test:run` → build  
- **Pages**（`deploy-pages.yml`）：`push`→`main`（及手工）→ build → 部署；**不依赖** CI job  
- 仓库需启用 **Pages → GitHub Actions**  
- 贡献约定见 `docs/CONTRIBUTING.md`；新增算法见 `docs/TRACE_PROTOCOL.md`

## 许可

仅供学习交流使用。正式开源许可尚未落盘——见 `docs/LICENSE_NOTES.md`。
