# 高阶算法覆盖表

每行一个主题/变体。"已交付"以代码为准（本表由 `scripts/advanced-coverage-doc.mjs` 从目录元数据与验证记录生成）。

## 已交付

| 主题 | 讲解 | 演示 | 模板（教学/竞赛） | 语言 | 语义锚点 | 编译/运行（教学版） | 编译/运行（竞赛核心） | 编译/运行（竞赛完整版） | 复用旧算法 |
|---|---|---|---|---|---|---|---|---|---|
| lower_bound / upper_bound (`stl-bounds`) | done | done | done | 仅 C++ | done | 1/1 通过 | 1/1 通过 | 1/1 通过 | `binarySearch`（链接，非复制） |
| priority_queue 优先队列 (`stl-priority-queue`) | done | done | done | 仅 C++ | done | 1/1 通过 | 1/1 通过 | 1/1 通过 | `dijkstraHeap`（链接，非复制） |
| 并查集 (`dsu`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | `kruskal`（链接，非复制） |
| 树状数组 (`fenwick`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | —（链接，非复制） |
| 线段树 (`segtree`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | `maxSubarrayDC`（链接，非复制） |
| 懒标记线段树 (`segtree-lazy`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | —（链接，非复制） |
| 前缀和与差分 (`prefix-diff`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | `kadane`（链接，非复制） |
| 离散化 (`discretize`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | `binarySearch`（链接，非复制） |
| 二分答案 (`bs-answer`) | done | done | done | 六语言 | done | 6/6 通过 | 1/1 通过 | 1/1 通过 | `binarySearch`（链接，非复制） |

测试：`tests/advanced/advanced.test.ts`（vitest）、`tests/e2e/adv-p1.spec.ts`（Playwright，真实鼠标键盘、0 次重试）、`scripts/advanced-validate.mjs`（真实工具链）。

## 未完成（路线图中，页面上不是可学习卡片）

| 主题 | 分组 | 状态 |
|---|---|---|
| vector / 迭代器实验 / vector & iterators | STL | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| queue / deque 实验 / queue / deque | STL | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| unique + erase 实验 / unique + erase | STL | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| set / multiset / map 实验 / set / map | STL | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| 单调栈 / Monotonic stack | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| 单调队列 / Monotonic queue | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| 拓扑排序 / Topological sort | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| LCA 倍增 / LCA (binary lifting) | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| LIS O(n log n) / LIS | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| 数论工具 / Number theory tools | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |
| 强连通分量 / SCC | 算法 | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |

旧课程中可复用的算法（未被改写）：`binarySearch`、`kruskal`、`dijkstraHeap` 等；其中 Kruskal 的并查集内核已抽到 `src/algorithms/advanced/dsuCore.ts`（见 ADVANCED_DELIVERY.md 的 Kruskal 一节）。

