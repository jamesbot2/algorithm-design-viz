# 高阶算法 · 基线盘点（ADVANCED_BASELINE）

本文件只记录**实际核对到的**内容。测量时间 2026-10-18（Asia/Shanghai）。

## 1. HEAD / 工作区
- 基线：`34ad7d16413245679e5f7d7012308d434eb943b6`（V34 checkpoint S16）。`git ls-remote https://github.com/jamesbot2/algorithm-design-viz.git main` 返回同一 SHA（只读查询）。
- **差异**：用户仓库 `/workspace/algorithm-design-viz` 的本地 `main` 停在 `efa23a5`（陈旧），当前检出 `v32-sidebar-nav`；V34 提交仅在本地分支 `v34-merge-init-layout` 与远端 main。本次工作基于 `34ad7d1`，没有触碰用户工作区（约 308 个脏文件、`stash@{0}` 原样保留）。
- 工作分支：`feature/advanced-algorithms`，克隆于 `/workspace/adv/clone`。
- 环境：node v24.20.0；`npm ci` 成功；`g++` 不在系统内（见 `ADVANCED_TEMPLATE_VALIDATION.md` 的工具链一节）。

## 2. 项目约定
- Vite + React 19 + TS，`HashRouter`，`base: '/algorithm-design-viz/'`。
- 检查命令：`tsc -b`（0 错误）、`oxlint`（基线 **48 warnings**，本次重测一致）、`vitest run`（**121 文件 / 707 测试** 全过，本次重测）、`playwright test`（35 个 spec 文件，`workers:1`，`retries` 本地 0）。
- CI：`.github/workflows/{ci,e2e,deploy-pages}.yml`。
- 设计系统：`src/styles/*`（layout/nav/…）、Lab 主题（`lab-dark`/`lab-light`/`legacy`）。

## 3. 22 个算法（`src/algorithms/index.ts`）
bubbleSort、insertionSort、mergeSort、quickSort、binarySearch、kadane、maxSubarrayDC、knapsack01、lcs、editDistance、activitySelection、bfs、dijkstra、dijkstraHeap、kruskal、prim、bellmanFord、floyd、kmp、nQueens、matrixChain、huffman。
- 接口 `AlgoModule { meta, generateSteps(input:number[], ...any[]) , presentation? }`（历史接口）。`registry.ts` 在其上提供 typed `validate/solve` 适配（部分算法）。
- 网络流**未实现**（curriculum 中仅为规划项）。

## 4. 模板 / 代码目录
- `src/codeCatalog/<algo>/`：`index.ts` 手写 TypeScript 文档（`CodeDocument`+语义锚点）；`langs/*.{py,cpp,java,rs,go}` + `meta.json` 经 `scripts/gen-code-langs.mjs` 生成懒加载块 `langs.generated.ts`（28 个）。锚点以行尾 `@a:` 标记书写、显示时剥离。
- 步骤只带语义 `codeRefs{anchorId,role}`；`resolveStepInDocument` 在各语言文档里各自解析行号。`NUMERIC_LINE_FALLBACK` 仅 kadane 为 `forbidden`，其余 `legacy-unverified`。
- 语言：TypeScript、Python、C++、Java、Rust、Go；偏好存 `localStorage['adv.codeLanguage.v1']`，默认 TS。
- `scripts/check-code-langs.ts` 用 g++/javac/rustc/go 对 `scripts/lang-harness/<algo>` 做外部工具链核对，不在 CI。
- **竞赛模板库：不存在**（没有模板元数据、教学/竞赛两版、导出、验证状态）。

## 5. 输入协议
`AlgoPage.tsx`（1505 行）按 `id` 分支处理：数组文本、LCS/编辑距离/KMP 字符串、图草稿（`GraphDraft`）、N 皇后、背包、霍夫曼、矩阵链。typed `validate` 只覆盖一部分；其余是页面内解析 + `generateSteps(number[], ...any[])`。无 typed 的"操作序列/树/区间"输入。

## 6. 轨迹协议
`Step`（`src/types/step.ts`）：`arrays/matrices/vars/pointers/arrayPointers/graph/searchTree/arrayOps/elementIds/codeRefs/ranges/...`；`Trace`（`core/trace/types.ts`，`TRACE_PROTOCOL_VERSION=1`）；`freezeSteps` 深冻结。Worker `heavySolve.worker.ts` 仅注册 `nQueens` 与 `knapsackBrute`；`runHeavyPreferWorker` 取消时终止 Worker。
展示契约 `PresentationDescriptor.primaryKind ∈ array|matrix|graph|board|forest|search-tree`（`components/presentation/presentation.ts`）。**没有** 区间树/Fenwick/堆/DSU 森林（`forest` 为 Huffman 专用）的主场景类型。

## 7. 导航入口
- 图标轨道/展开导航/手机抽屉共用 `Layout.tsx` 的 `primaryNav`：全部算法、（轨道里）算法目录、练习台、实验台、实验讲义。
- 目录 `NavCatalog.tsx`：设计思想/问题类型/章节三种分组，搜索仅匹配中文标题。
- 首页 `Home.tsx`：算法库（搜索+分类卡片）、课程导航、章节、拓展规划。
- 路由（`App.tsx`）：`/`、`chapter/:id`、`algo/:id`、`teach/knapsack`、`practice`、`experiment`、`lab/core`，其余重定向 `/`。
- Layout 页面类型：`isAlgo = pathname.startsWith('/algo/')`（`data-lab-fill`、工作台高度链）；`isWide`= algo/teach/practice/experiment。
- 旧测试 `v32-sidebar-nav.spec.ts` 1b 固定了前 7 个 Tab 焦点的名字清单（"恰好七个"），需要在新增入口时改为"每项有名字、可操作、无隐藏焦点"。

## 8. 可复用组件
`WorkbenchLayout`、`usePlaybackController`（唯一播放器）、`PlaybackTransport`、`Visualizer`（主场景选择）、`CurrentStepData`、`CodeBrowser`（CodeMirror，语言切换用 `Compartment`，复制当前文档）、`ArrayView/MatrixView/GraphView/ForestView/SearchTreeView`、`FinalAnswerResult`、`runner`（`runAlgoAsync`、`runHeavyPreferWorker`）、`languages.ts` 懒加载+缓存。

## 9. 缺失能力（本任务补）
高阶路由与页面类型；元数据目录/搜索（含简称）；typed 输入（操作序列/区间/STL 命令）；DSU/Fenwick/堆/二分边界主场景；STL C++-only 代码展示；模板库（教学/竞赛、导出、哈希、验证状态）；真实工具链测试；Worker 注册。

## 10. 布局/运行回归状态（引用 V34 报告，**本次未重跑完整 E2E**）
V34 报告 S11–S16：tsc 0 错、oxlint 48、vitest 121/707、nav-keyboard+sidebar-nav 21/21、V30 motion 41/41、V31 mobile-budget 27/27、LCS/多语言 71/71、完整 E2E 397/0/0/0。其中 375×812 merge n=16 idx30：band≈117、main≈329、max bar≈181。本任务开始时只重测了 tsc/lint/vitest（见上）；完整 E2E 的重跑结果见 `ADVANCED_DELIVERY.md`。
