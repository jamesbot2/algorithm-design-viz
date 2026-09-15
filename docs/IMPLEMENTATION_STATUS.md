# 实施状态（algorithm-design-viz）

基准 HEAD：`35709de7559ef9678bbb66ca59ffc33bf0780516`（与评审线索一致）  
更新约定：未开始 / 进行中 / 已实现待验证 / 已验证 / 受阻  
本轮默认：**不 push、不改远程设置**（需明确授权）。

## M0 基线与可信性
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| P0-01 | 复杂度对应实现 | 已验证 | AlgoMeta 扩展；Dijkstra→朴素 O(V²+E)；Prim/Kruskal/BFS/quickSort 标注对齐实现；chapters 最短路文案已改 |
| P0-02 | 二分禁止静默排序 | 已验证 | requireSorted 默认；sortThenSearch 可选；重复取最左；测试覆盖 [3,1,2] 等 |
| P0-03 | 图边 ID/方向 | 已验证 | edge.id + highlightEdgeIds/edgeRoles；双向曲线；useId 箭头；layoutGraph；各图算法累加边高亮 |
| P0-04 | 矩阵/数组高亮语义 | 已验证 | matrixTargets / arrayPointers；MatrixView 行列标签且不 truthy 判 0；knapsack/lcs/kmp 已发目标 |
| P0-05 | 输入编辑与执行分离 | 已验证 | draft + 运行/恢复默认/重置播放；`1,abc,3` 报错不静默丢弃；DEMO_LIMITS |
| P0-06 | 结果语义与边界 | 已验证 | Dijkstra 拒负权；BF/Floyd 负环；Prim/Kruskal 森林；Kadane 空/全负；KMP π/空模式 |
| T0 | Vitest 基础测试 | 已验证 | 见 VERIFICATION.md |

## M1 类型化模块与轨迹
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M1-01 | 剩余算法 typed 适配 | 已验证 | registry validate+solve：kadane/binarySearch/kmp/editDistance/kruskal/prim/bellmanFord/floyd/bfs/sorts/activitySelection + 原有 knapsack01/lcs/dijkstra；另含 nQueens/matrixChain/huffman/maxSubarrayDC |
| M1-02 | Trace 演进 | 已验证 | Visualizer 接受 `steps?: Step[]` 或 `trace?: Trace`；AlgoPage 有 registry.solve 时写入 Trace |
| M1-03 | Runner | 已验证 | `src/core/runner/`：`runAlgo` + size budget + cancel flag + `RunOutcome` |
| M1-04 | Snapshot 不可变 | 已验证 | `freezeSteps` / `copyStepArrays` / `deepFreeze` |
| M1-05 | Infinity JSON | 已验证 | `{$inf:1\|-1}` 与 `'∞'/'-∞'`；`encodeInfInTree`/`decodeInfInTree` |
| M1-T | 测试 | 已验证 | registry + runner + immutability + infinity |

## M2 课程核心
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M2-nav | 双导航 | 已验证 | Layout/Home：「按设计思想」「按问题类型」← `src/data/curriculum.ts` / `src/content/nav.ts`；完成标记 theory/demo/practice 诚实；流章节 BFS 为最大流先修（planned） |
| M2-knapsack | 背包多策略样板 | 已验证 | `/teach/knapsack`：暴力/DP2D+回溯选中集/DP1D+正向反例/回溯树/B&B 分数上界/贪心密度反例 160vs220；O(nW) 文档；策略一致性测试 |
| M2-nqueens | N 皇后 | 已验证 | 棋盘+搜索树；one/all；1→1,2/3→0,4→2；n=8=92（高预算）；截断不宣称完整 |
| M2-matrix | 矩阵链乘 | 已验证 | [10,30,5,60]→4500；k 枚举 + 加括号恢复 |
| M2-huffman | Huffman | 已验证 | 正频率；并列字典序；WPL；空/单符号约定 |
| M2-maxsub | 分治最大子数组 | 已验证 | 与 kadane/O(n²) 对照；例→6 |
| M2-lcs-edit | LCS/编辑距离重建 | 已验证 | 一条 LCS 串 / 编辑 ops；matrixTargets path |
| M2-mergesort | 归并递归树 | 已验证 | searchTree + callStack 变量 |
| M2-teach | 教学页结构 | 已实现待验证 | 背包单元含 problem/state/idea/viz/correctness/complexity/edges/code/practice stub；新算法走 AlgoPage meta |
| M2-T | 测试 | 已验证 | knapsack 一致、nqueens、matrixChain、huffman、maxsub、LCS |

## M3 图编辑 / 练习 / 实验 / 分享
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M3-graph | 自定义图编辑器 | 已验证 | `GraphInput`：n/边表/有向/源点/预设；`validateGraphDraft` 校验端点、方向、权与算法约定；`layoutGraph`；AlgoPage 接入 bfs/dijkstra/dijkstraHeap/kruskal/prim/bellmanFord/floyd |
| M3-result | 结果 UX | 已验证 | 最短路：目标点 → 路径+代价（parent）；MST：选中边、总权、连通？；BF/BFS 补 parent/dist |
| M3-heap | 堆 Dijkstra | 已验证 | `dijkstraHeap` 懒删除二叉堆；过滤陈旧项；与朴素对照页+实验台；共享图 dist 一致测试 |
| M3-views | 视图抛光 | 已验证 | ArrayView 有符号柱+稳定 scale；非适合默认单元格；MatrixView 滚动+sticky 标签；图例仅当前轨迹用到的 role；`phase` 阶段跳转 |
| M3-practice | 练习三判定 | 已验证 | `/practice`：预测下一步 / 解释选择 / 构造反例；覆盖背包、LCS、Dijkstra、N皇后、贪心vsDP；多解裁判（LCS/等长最短路/交替MST/等值背包集）；seed 可复现；localStorage 进度+导出/确认清空 |
| M3-modes | 教学 vs 实验 | 已验证 | AlgoPage 模式切换；`/experiment`：最大子数组 / 背包策略 / 朴素vs堆 Dijkstra；计数器导出 CSV/JSON；指数规模封顶；声明非 DOM 计时证明 |
| M3-scene | 场景分享+本地学习 | 已验证 | Scene：algoId/version/input/params/seed/stepIndex；短 URL hash；JSON 导入导出；版本不符警告；localStorage 进度/错题/书签；标明非 LMS |
| M3-ref | 参考代码+讲义 | 已验证 | 伪代码+C++：背包 DP2D / 朴素 Dijkstra / N皇后；`/lab/core`；C++ 标注 CI 不执行 |
| M3-T | 测试 | 已验证 | graph validate、heap vs naive、practice judges、scene roundtrip、experiment export；既有测试保持绿 |

## M4 / 拓展（本轮不做，仅记状态）
| 项 | 状态 | 备注 |
|----|------|------|
| M4 CI | 未开始 | |
| Playwright E2E | 记入 M4 | 本轮未加，避免拖慢 CI；可选轻量 |
| Edmonds-Karp / Strassen / 最近点对 | 拓展规划 | 见 curriculum `EXTENDED_PLANNED` |

## 缺口 / 已知限制
- 教学页（非 AlgoPage）部分算法仍用内置示例参数编辑器较简（nQueens/matrixChain/huffman/背包 AlgoPage）
- Floyd 结果面板未做 i→j 点选路径重建（矩阵视图为主）
- 练习题库为静态+种子抽样，题量有限；可继续扩充
- markdown-it 讲义渲染未引入（讲义仍为 chapters.ts / lab TSX）
- ChatGPT UI / HashRouter / vite `base: '/algorithm-design-viz/'` 保持不变
- **未执行 `git push`**

## 验证记录
- `npm run test:run` → 8 files / 64 tests passed
- `npm run build` → tsc + vite build OK
