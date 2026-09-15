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
| T0 | Vitest 基础测试 | 已验证 | `npm run test:run` 25 tests green；见 VERIFICATION.md |

## M1–M4
| 阶段 | 状态 | 备注 |
|------|------|------|
| M1 类型化模块与轨迹 | 进行中 | `core/trace/types.ts` + `registry.ts`；knapsack01/lcs/dijkstra 已迁 typed validate/solve；旧 generateSteps 适配保留 |
| M2 课程核心（背包样板等） | 未开始 | |
| M3 图编辑/练习/实验/分享 | 未开始 | |
| M4 CI/文档/验收 | 未开始 | |

## 验证记录
- `npm run test:run` → 4 files / 25 tests passed
- `npm run build` → tsc + vite build OK
- 未执行 `git push`

