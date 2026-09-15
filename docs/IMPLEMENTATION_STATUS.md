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

## M3–M4 / 拓展（本轮不做，仅记状态）
| 项 | 状态 | 备注 |
|----|------|------|
| M3 图编辑 / 练习平台 / 分享 | 未开始 | 练习仅为 stub |
| M4 CI | 未开始 | |
| Edmonds-Karp / Strassen / 最近点对 | 拓展规划 | 见 curriculum `EXTENDED_PLANNED` |

## 缺口 / 已知限制
- 多数算法 AlgoPage 仍用内置示例输入（图/背包等），完整可编辑图编辑器属 M3
- 练习平台未建（practice 标志均为 false）
- 背包教学页策略可视化粒度不一（dp2d 步多，brute/greedy 为摘要步）
- markdown-it 内容渲染未引入（讲义仍为 chapters.ts 字符串；教学页为 TSX）
- ChatGPT UI / HashRouter / vite `base: '/algorithm-design-viz/'` 保持不变

## 验证记录
- `npm run test:run` → 6 files / 44 tests passed
- `npm run build` → tsc + vite build OK
- **未执行 `git push`**
