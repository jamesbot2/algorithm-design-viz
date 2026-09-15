export interface Section {
  id: string
  title: string
  content: string
}

export interface Chapter {
  id: string
  title: string
  subtitle: string
  sections: Section[]
  algos: string[]
}

export const chapters: Chapter[] = [
  {
    id: 'intro',
    title: '绪论与复杂度',
    subtitle: '算法分析的基本工具',
    algos: ['bubbleSort', 'insertionSort', 'binarySearch'],
    sections: [
      {
        id: 'what',
        title: '什么是算法',
        content: `算法是解决特定问题的**有限、确定、可终止**的计算步骤序列。评价算法通常关注：
- **正确性**：是否对所有合法输入得到正确输出
- **效率**：时间与空间资源消耗
- **可读性与可维护性**

本课程重点在于**设计思想**（分治、动态规划、贪心、图算法等）与**复杂度分析**。`,
      },
      {
        id: 'asym',
        title: '渐近记号：O / Ω / Θ',
        content: `设 f(n)、g(n) 为非负函数：

- **大 O**：f(n)=O(g(n)) 表示存在常数 c>0、n₀，对所有 n≥n₀ 有 f(n) ≤ c·g(n)。描述**上界**。
- **Ω**：f(n)=Ω(g(n)) 表示 f(n) ≥ c·g(n)，描述**下界**。
- **Θ**：同时是 O 与 Ω，即**紧确界**。

例：2n²+3n = Θ(n²)；冒泡最坏 O(n²)，最好 Ω(n)（若加提前退出）。

常用阶：O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)。`,
      },
      {
        id: 'master',
        title: '主定理（Master Theorem）',
        content: `对形如 T(n) = a T(n/b) + f(n)（a≥1, b>1）的分治递推：

令 c_crit = log_b a。比较 f(n) 与 n^{c_crit}：

1. 若 f(n) = O(n^{c_crit-ε})（ε>0），则 T(n) = Θ(n^{c_crit})
2. 若 f(n) = Θ(n^{c_crit} log^k n)，则 T(n) = Θ(n^{c_crit} log^{k+1} n)（常见 k=0 → Θ(n^{c_crit} log n)）
3. 若 f(n) = Ω(n^{c_crit+ε}) 且满足正则条件，则 T(n) = Θ(f(n))

例：归并 T(n)=2T(n/2)+O(n) → Θ(n log n)；二分 T(n)=T(n/2)+O(1) → Θ(log n)。`,
      },
      {
        id: 'invariant',
        title: '循环不变量',
        content: `证明循环正确性的标准框架（类似归纳法）：

1. **初始化**：进入循环前不变量成立
2. **保持**：若某次迭代前成立，则迭代后仍成立
3. **终止**：循环结束时，不变量 + 退出条件 ⇒ 得到正确结果

例：插入排序——「a[0..i-1] 已排序」是不变量。`,
      },
      {
        id: 'amortized',
        title: '摊还分析简介',
        content: `摊还分析研究**一系列操作**的平均代价，而非单次最坏。

常用方法：
- **聚合分析**：求 n 次操作总代价再除以 n
- **核算法**：给便宜操作「存款」，昂贵操作用存款支付
- **势能法**：定义数据结构势能 Φ，摊还代价 = 实际代价 + ΔΦ

经典例子：动态数组扩容均摊 O(1)；二元计数器从 0 加到 n 均摊 O(1)。`,
      },
    ],
  },
  {
    id: 'divide',
    title: '分治',
    subtitle: '分解 · 解决 · 合并',
    algos: ['mergeSort', 'quickSort', 'maxSubarrayDC', 'kadane', 'binarySearch'],
    sections: [
      {
        id: 'idea',
        title: '分治范式',
        content: `**分治（Divide and Conquer）**：
1. **分解**问题为若干规模更小的子问题
2. **递归求解**子问题
3. **合并**子问题解得到原问题解

适用条件：子问题相互独立（与动态规划的重叠子问题相对）。复杂度常用主定理分析。`,
      },
      {
        id: 'sorts',
        title: '归并与快排',
        content: `- **归并排序**：稳定，最坏 Θ(n log n)，需 O(n) 辅助空间；合并两有序表是关键。
- **快速排序**：原地、平均 Θ(n log n)，最坏 Θ(n²)（已排序 + 劣枢轴）；工程上常用随机/三数取中。
- **选择问题**（第 k 小）：可用类快排划分，期望 O(n)；最坏线性有 BFPRT。`,
      },
      {
        id: 'maxsub',
        title: '最大子数组',
        content: `分治解法：最大子数组或在左半、或在右半、或跨越中点。跨越部分可 O(n) 求出，总 T(n)=2T(n/2)+O(n)=Θ(n log n)。

**Kadane 算法**可将之优化到 O(n)（更偏 DP 视角）：维护以当前位置结尾的最大和。`,
      },
      {
        id: 'closest',
        title: '最近点对与 Strassen',
        content: `- **平面最近点对**：预排序 + 分治，合并时只检查宽度 2δ 的条带内有限候选点，O(n log n)。
- **Strassen 矩阵乘法**：把 8 次乘法降为 7 次，复杂度约 O(n^{log₂7})≈O(n^{2.807})，有常数因子与数值稳定性代价，教学意义大于日常使用。`,
      },
    ],
  },
  {
    id: 'dp',
    title: '动态规划',
    subtitle: '最优子结构 · 重叠子问题',
    algos: ['kadane', 'knapsack01', 'lcs', 'editDistance', 'matrixChain'],
    sections: [
      {
        id: 'idea',
        title: 'DP 基本思想',
        content: `动态规划适用于具有：
- **最优子结构**：最优解包含子问题最优解
- **重叠子问题**：子问题被反复计算

两种实现：**自顶向下记忆化**、**自底向上填表**。关键步骤：定义状态 → 写出转移 → 确定边界与计算顺序。`,
      },
      {
        id: 'classic',
        title: '经典问题',
        content: `- **0-1 背包**：dp[i][w]，每件物品选或不选
- **LCS / LIS**：序列 DP；LIS 可用 O(n log n) 的耐心排序优化
- **编辑距离**：插入/删除/替换三类转移
- **矩阵链乘**：区间 DP，枚举分裂点
- **状压 DP**：用比特掩码表示子集状态（如旅行商）
- **树形 DP**：在树上做背包或染色类转移`,
      },
      {
        id: 'tips',
        title: '设计技巧',
        content: `1. 先想暴力递归，再找重叠与可记忆化的状态
2. 状态尽量包含「决策所需的全部信息」
3. 注意维度压缩（背包一维滚动）与初始化陷阱
4. 输出方案时常需记录前驱或另行回溯`,
      },
    ],
  },
  {
    id: 'greedy',
    title: '贪心',
    subtitle: '局部最优 → 全局最优？',
    algos: ['activitySelection', 'huffman'],
    sections: [
      {
        id: 'idea',
        title: '贪心策略',
        content: `每步做出**当前看起来最优**的选择，不回溯。正确性通常需证明：
- **贪心选择性质**：存在最优解包含该局部选择
- **最优子结构**

常用证明：交换论证、剪贴（cut-and-paste）。`,
      },
      {
        id: 'examples',
        title: '经典例子',
        content: `- **活动选择**：按结束时间排序贪心
- **Huffman 编码**：反复合并频率最小的两棵树
- **分数背包**：按价值密度排序（注意：0-1 背包贪心不正确）`,
      },
      {
        id: 'counter',
        title: '反例意识',
        content: `并非所有问题都能贪心。例如：
- 0-1 背包按密度贪心可能得不到最优
- 零钱问题在某些币值系统下贪心失败

**先怀疑，再证明**；证不了就找反例或改用 DP。`,
      },
    ],
  },
  {
    id: 'graph',
    title: '图算法',
    subtitle: '遍历 · 最短路 · 最小生成树',
    algos: ['bfs', 'dijkstra', 'bellmanFord', 'floyd', 'kruskal', 'prim'],
    sections: [
      {
        id: 'traverse',
        title: 'BFS / DFS / 拓扑 / SCC',
        content: `- **BFS**：最短（无权）路径、层次遍历，队列实现
- **DFS**：时间戳、环检测、拓扑排序、连通性
- **拓扑排序**：DAG 上按依赖序输出（Kahn 或 DFS 后序逆序）
- **强连通分量（SCC）**：Kosaraju / Tarjan`,
      },
      {
        id: 'sp',
        title: '最短路径',
        content: `- **Dijkstra**：非负权单源最短路。本站演示为**朴素 O(V²+E)**（每轮扫描选最小 dist）；堆优化可达 O((V+E) log V)
- **Bellman-Ford**：可负权，检测负环，O(VE)
- **Floyd-Warshall**：全源，O(n³)，基于中转点 DP
- **差分约束**：可建模为 Bellman-Ford`,
      },
      {
        id: 'mst',
        title: '最小生成树',
        content: `- **Kruskal**：排序边 + 并查集，适合稀疏图
- **Prim**：类似 Dijkstra 的切分生长，适合稠密图（邻接矩阵 O(V²)）

切分性质：跨切分的最小权边一定属于某棵 MST。`,
      },
    ],
  },
  {
    id: 'flow',
    title: '网络流',
    subtitle: '最大流 · 最小割 · 匹配',
    algos: ['bfs'],
    sections: [
      {
        id: 'maxflow',
        title: '最大流最小割',
        content: `流网络 G=(V,E)，源 s、汇 t，容量 c(e)。**可行流**满足容量约束与守恒。

**最大流最小割定理**：最大流值 = 最小 s-t 割容量。

增广路方法：在残量网络找 s→t 路径并增广，直至不存在增广路。`,
      },
      {
        id: 'ek',
        title: 'Edmonds-Karp',
        content: `用 **BFS** 在残量网络找增广路（最短边数），复杂度 O(VE²)。本站将 BFS 标为最大流**先修**；Edmonds-Karp 完整可视化属拓展规划，**勿当作已完成模块**。`,
      },
      {
        id: 'matching',
        title: '二分图匹配',
        content: `二分图最大匹配可通过建模为网络流（每条边容量 1），或匈牙利算法 / Hopcroft-Karp。

**König 定理**：二分图中最大匹配 = 最小点覆盖。`,
      },
    ],
  },
  {
    id: 'string',
    title: '字符串',
    subtitle: '模式匹配',
    algos: ['kmp'],
    sections: [
      {
        id: 'kmp',
        title: 'KMP',
        content: `朴素匹配最坏 O(nm)。KMP 预处理模式串的 **next/π 数组**（π[i] = p[0..i] 最长真前后缀长度），匹配失配时模式串右移到 next 指引位置，总时间 O(n+m)。本站索引为 JS 字符串码元下标；空模式约定匹配位置 0。`,
      },
      {
        id: 'rk',
        title: 'Rabin-Karp',
        content: `滚动哈希比较窗口：期望接近线性，最坏仍可能退化。常用于多模式或指纹去重。注意模数与进制碰撞处理。`,
      },
    ],
  },
  {
    id: 'complexity',
    title: '复杂度理论',
    subtitle: 'P / NP / 近似与回溯',
    algos: ['nQueens'],
    sections: [
      {
        id: 'pnp',
        title: 'P、NP 与 NPC',
        content: `- **P**：确定性图灵机多项式时间可解
- **NP**：多项式时间可**验证**（或非确定性多项式可解）
- **NP 完全（NPC）**：NP 中「最难」的一批——所有 NP 问题可多项式归约到它
- **NP 困难**：至少与 NPC 一样难（未必在 NP）

经典 NPC：SAT、顶点覆盖、哈密顿回路、旅行商判定版、子集和等。`,
      },
      {
        id: 'approx',
        title: '近似与回溯简介',
        content: `- **近似算法**：对 NP 难优化问题给可证近似比（如顶点覆盖 2-近似）
- **回溯 / 分支限界**：系统搜索，剪枝加速（如 N 皇后、背包、TSP）
- **启发式**：遗传、模拟退火等，无最坏保证但实用

面对 NPC：限制规模、特殊图类、参数化、近似或启发式。`,
      },
    ],
  },
]

export function getChapter(id: string) {
  return chapters.find((c) => c.id === id)
}
