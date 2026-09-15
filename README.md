# 算法设计与分析 · 交互可视化

面向「算法设计与分析」课程的静态学习网站：中文理论章节 + 逐步算法可视化（数组 / 矩阵 / 图状态与变量面板）。

**在线地址：** https://jamesbot2.github.io/algorithm-design-viz/

## 本地运行

```bash
npm install
npm run dev
```

构建与测试：

```bash
npm run build
npm run test:run
```

## 技术栈

- Vite + React + TypeScript
- React Router（HashRouter，适配 GitHub Pages）
- Vitest + Testing Library（算法与解析单测）
- 纯静态部署，`base: '/algorithm-design-viz/'`
- UI：深色 ChatGPT 风格侧栏布局

## 当前已实现（M0 + M1 起步）

- 多章节理论文案 + 算法页可视化（排序 / 二分 / DP / 图 / KMP 等）
- **运行流**：草稿输入 → 校验 →「运行」快照生成步骤；「恢复默认示例」「重置播放」
- **复杂度元数据**：`implName` / 时间空间 / 空间说明 / 计数含义（与真实实现一致；Dijkstra 为朴素 O(V²+E)）
- **二分**：禁止静默排序；可选「先排序再查找」；重复取最左
- **图**：稳定 edge id、边角色高亮、双向曲线、共享 `layoutGraph`
- **矩阵/数组**：`matrixTargets` / `arrayPointers`；0 值可高亮
- **边界语义**：负权/负环、MST 森林、Kadane 空数组、KMP 空模式等
- **M1 起步**：`src/core/trace/types.ts`、`src/algorithms/registry.ts`；knapsack01 / lcs / dijkstra 的 typed validate/solve（旧 `generateSteps` 仍可用）

## 尚未完成（M2–M4）

| 阶段 | 内容 |
|------|------|
| M1 余下 | 其余算法全面迁入 typed 模块；Visualizer 消费 Trace |
| M2 | 课程核心样板（背包等教学路径）、练习题 |
| M3 | 图编辑器、实验模式、分享链接 |
| M4 | CI 门禁、完整验收清单、文档收尾 |

详见 `docs/IMPLEMENTATION_STATUS.md`、`docs/VERIFICATION.md`。

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
