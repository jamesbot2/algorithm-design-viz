# 课程地图（core vs extension）

数据源：`src/data/curriculum.ts`（完成标记与导航一致，只标已实现能力）。

## 核心（已实现演示）

### 按设计思想

| 模块 | 算法 / 页 | 理论 | 演示 | 练习 | 先修 / 备注 |
|------|-----------|------|------|------|-------------|
| 绪论与复杂度 | bubbleSort, insertionSort, binarySearch | ✓ | ✓ | — | |
| 分治 | mergeSort, quickSort, maxSubarrayDC, binarySearch | ✓ | ✓ | — | 拓展：Strassen、最近点对 |
| 动态规划 | kadane, knapsack01, lcs, editDistance, matrixChain | ✓ | ✓ | ✓ | 背包另见 `/teach/knapsack` |
| 贪心 | activitySelection, huffman | ✓ | ✓ | — | 练习中有贪心 vs DP 反例题 |
| 回溯与分支限界 | nQueens, knapsack01 | ✓ | ✓ | ✓ | |
| 图算法 | bfs, dijkstra, dijkstraHeap*, bellmanFord, floyd, kruskal, prim | ✓ | ✓ | ✓ | *堆 Dijkstra 在 AlgoPage / 实验台 |
| 网络流 | （仅 BFS 先修） | ✓ | — | — | **planned**：Edmonds-Karp |
| 字符串 | kmp | ✓ | ✓ | — | |

### 按问题类型

| 模块 | 项 | 理论/演示/练习 |
|------|----|----------------|
| 排序 | bubble / insertion / merge / quick | 理论+演示 |
| 查找 | binarySearch | 理论+演示 |
| 最大子数组 | kadane, maxSubarrayDC | 理论+演示（实验台对照） |
| 背包问题族 | knapsack01 + `/teach/knapsack` | 理论+演示+练习 |
| 序列对齐 | lcs, editDistance | 理论+演示+练习 |
| MST | kruskal, prim | 理论+演示+练习 |
| 最短路 | dijkstra(+heap), BF, floyd | 理论+演示+练习 |
| 模式匹配 | kmp | 理论+演示 |
| 组合搜索 | nQueens | 理论+演示+练习 |
| 编码与压缩 | huffman | 理论+演示 |
| 矩阵链优化 | matrixChain | 理论+演示 |

### 站点级学习路径（建议）

1. `/` 双导航选模块 → `/chapter/:id` 读理论  
2. `/algo/:id` 改草稿 → **运行** → 逐步播放；图算法可用图编辑器  
3. `/teach/knapsack` 对照多策略  
4. `/practice` 三判定练习（本地进度）  
5. `/experiment` 导出计数 CSV/JSON（非 DOM 计时证明）  
6. `/lab/core` 参考伪代码 / C++（CI **不**编译运行 C++）

## 拓展（未实现）

见 `EXTENDED_PLANNED`：

- Edmonds-Karp 最大流  
- Strassen 矩阵乘法  
- 平面最近点对  

网络流章节目前仅理论 + BFS 先修说明，**不要**把最大流标成已完成。
