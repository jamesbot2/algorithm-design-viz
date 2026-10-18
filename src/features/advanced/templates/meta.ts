import type { CodeLanguage } from '../../../codeCatalog/types'

export interface SampleIO {
  input: string
  output: string
  note: string
}
export interface Counterexample {
  title: string
  /** what goes wrong and why (checked by tests where it is computable) */
  explanation: string
  input: string
  wrong: string
  correct: string
}
export interface TemplateHeader {
  standard: string
  headers: string[]
  depends: string[]
  indexing: string
  interval: string
  limits: string
  timeComplexity: string
  spaceComplexity: string
}
export interface TemplateMeta {
  id: string
  topicId: string
  title: string
  category: string
  difficulty: string
  prereqs: string[]
  header: TemplateHeader
  teachLanguages: CodeLanguage[]
  /** contest variant is C++ only; reason it is reference-only (no executing arrow) */
  contestNote: string
  /** sample for the contest "含 stdin/stdout 示例" variant */
  sample: SampleIO
  counterexample: Counterexample
  /** provenance + license */
  source: string
  license: string
  /** protocol of the example main (what it reads/writes) */
  ioProtocol: string
}

const ORIGINAL = '本项目原创实现与讲解；接口约定参考 AtCoder Library（CC0）的 dsu / fenwick_tree / Library Checker 的输入格式，未复制其源码。'
const LICENSE = '仓库尚无顶层 LICENSE（见 docs/LICENSE_NOTES.md）：代码为原创、许可证待项目所有者确定，不得视为已授权的第三方开源代码。'

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'stl-bounds',
    topicId: 'stl-bounds',
    title: 'lower_bound / upper_bound',
    category: 'STL',
    difficulty: '竞赛基础',
    prereqs: ['有序序列', '闭开区间 [first,last)'],
    header: {
      standard: 'C++17',
      headers: ['<algorithm>', '<vector>'],
      depends: [],
      indexing: '0-based 下标；返回值 == v.size() 表示 end()（没有这样的元素）',
      interval: '闭开区间 [first, last)；序列必须按 < 非降序排列',
      limits: 'int 元素；v.size() ≤ 2^31−1 时 first_ge 返回 int 安全',
      timeComplexity: '随机访问迭代器：O(log n) 次比较；非随机访问迭代器迭代器移动是 O(n)',
      spaceComplexity: 'O(1)',
    },
    teachLanguages: ['cpp'],
    contestNote: '竞赛版直接使用标准库，与教学模型控制流不同构：只作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '8\n1 2 2 2 5 8 8 13\n4\n2\n3\n13\n14\n', output: '1 4 3\n4 4 0\n7 8 1\n8 8 0\n', note: 'x=2：第一个 ≥2 在下标 1，第一个 >2 在下标 4，共 3 个；x=14 越过末尾，两者都返回 8(=end)。' },
    counterexample: {
      title: '未排序序列上调用 lower_bound',
      explanation: '前提被破坏时，二分的"左边都小、右边都不小"不成立，结果没有意义（标准要求区间已按比较关系划分，否则行为未定义/结果不可信）。',
      input: 'v = [1, 5, 3, 4], x = 3',
      wrong: '教学模型在该输入上返回下标 1（v[1]=5，并不等于 3）',
      correct: '3 实际在下标 2；应先 sort。本站实验对这种输入直接拒绝运行',
    },
    ioProtocol: '第 1 行 n；第 2 行 n 个已排序整数；第 3 行 q；随后 q 个查询值 x。对每个 x 输出一行 "first_ge first_gt count_equal"。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'stl-priority-queue',
    topicId: 'stl-priority-queue',
    title: 'priority_queue',
    category: 'STL',
    difficulty: '竞赛基础',
    prereqs: ['完全二叉树的数组表示'],
    header: {
      standard: 'C++17',
      headers: ['<queue>', '<vector>', '<functional>（小根堆需要 greater）'],
      depends: [],
      indexing: '堆数组 0-based：i 的孩子是 2i+1、2i+2；父是 (i−1)/2',
      interval: '无区间；top()/pop() 要求非空',
      limits: 'int 元素；容器元素个数受内存限制',
      timeComplexity: 'push / pop O(log n)，top O(1)，由 n 个元素构造 O(n)',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['cpp'],
    contestNote: '竞赛版使用 std::priority_queue（实现细节由库决定，交换序列不保证与教学模型一致）：作为参考模板阅读，不显示执行箭头。',
    sample: { input: '6\n5 9 3 9 12 7\n', output: '12 9 9 7 5 3\n', note: '重复值 9 保留两份；输出按非增顺序。' },
    counterexample: {
      title: '把堆数组当成有序数组',
      explanation: 'push 5,9,3 后数组是 [9,5,3]；再 push 7 得 [9,7,3,5]。这是合法的堆，但数组并不是降序（3 排在 5 前面）：堆序只保证父 ≥ 子，兄弟之间、叶子之间没有顺序。',
      input: 'push(5); push(9); push(3); push(7)',
      wrong: '读成 [9,7,3,5] 就是从大到小',
      correct: '只有反复 pop 才得到 9,7,5,3；[9,7,3,5] 里 3 在 5 前面',
    },
    ioProtocol: '第 1 行 n；第 2 行 n 个整数。输出它们按非增顺序排列（用 priority_queue 反复 pop）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'dsu',
    topicId: 'dsu',
    title: '并查集 DSU',
    category: '数据结构',
    difficulty: '竞赛基础',
    prereqs: ['森林 / 树的父指针表示'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<utility>', '<vector>'],
      depends: [],
      indexing: '元素 0..n−1',
      interval: '无区间',
      limits: 'n ≤ 2^31−1（int）；find 递归深度 ≤ log2(n)（按大小合并保证）',
      timeComplexity: '均摊 O(α(n)) / 操作',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版用 p[x]<0 编码"根与集合大小"，控制流与教学版（parent/size 两个数组 + 迭代 find）不同构：作为参考模板阅读，不显示执行箭头。',
    sample: { input: '4 7\n0 0 1\n0 2 3\n1 0 1\n1 0 2\n0 1 2\n1 0 3\n1 1 2\n', output: '1\n0\n1\n1\n', note: 'Library Checker "Union Find" 的输入格式：t=0 合并，t=1 查询是否同一集合。' },
    counterexample: {
      title: 'union 时直接连两个元素而不是它们的根',
      explanation: '错误写法 parent[a]=b（不先 find）：union(0,1) 后 parent[0]=1；再 union(2,3) 后 parent[2]=3；union(0,2) 把 0 挂到 2 上而 1 仍指向 1，导致 same(1,3) 判成 false。',
      input: 'union 0 1; union 2 3; union 0 2; same 1 3',
      wrong: 'false（错误：1 与 3 其实已连通）',
      correct: 'true',
    },
    ioProtocol: '第 1 行 N Q；随后 Q 行 "t u v"：t=0 合并 u,v；t=1 输出 u,v 是否在同一集合（1/0）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'fenwick',
    topicId: 'fenwick',
    title: '树状数组 Fenwick',
    category: '数据结构',
    difficulty: '竞赛基础',
    prereqs: ['前缀和', '二进制与 lowbit'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<vector>'],
      depends: [],
      indexing: '对外 0-based；内部 tree 1-based（tree[0] 不用）',
      interval: '半开区间 [l, r)：prefix(r) = sum a[0..r)，sum(l,r) = prefix(r) − prefix(l)',
      limits: 'C++/Java/Rust/Go 用 64 位和；TypeScript 为 Number，|和| ≤ 2^53−1；Python 任意精度',
      timeComplexity: 'add / prefix / range 均 O(log n)',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把更新与前缀循环压成一行 for，控制流与教学版（while + 分行）不同构：作为参考模板阅读，不显示执行箭头。',
    sample: { input: '5 4\n1 2 3 4 5\n1 0 5\n0 2 10\n1 1 4\n1 2 3\n', output: '15\n19\n13\n', note: 'Library Checker "Point Add Range Sum" 的输入格式：0 p x 为 a[p]+=x，1 l r 求 [l,r) 的和。' },
    counterexample: {
      title: '对外下标当作内部下标：add(0, d) 死循环',
      explanation: '树状数组内部必须 1-based：lowbit(0)=0，若直接用 p=0 开始 p += p & −p，p 永远不增加，循环不会结束。因此 add 要先做 p = i + 1。',
      input: 'add(0, 1)（错误实现：p = i）',
      wrong: '无限循环（p 恒为 0）',
      correct: 'p = i + 1 = 1 → 2 → 4 → 8 …，在 O(log n) 步内结束',
    },
    ioProtocol: '第 1 行 N Q；第 2 行 a_0..a_{N−1}；随后 Q 行：0 p x（a[p]+=x）；1 l r（输出 a[l..r) 的和）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'segtree',
    topicId: 'segtree',
    title: '线段树（单点赋值 + 区间和）',
    category: '数据结构',
    difficulty: '进阶',
    prereqs: ['递归与分治', '半开区间 [l, r)'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<vector>'],
      depends: [],
      indexing: '对外 0-based；教学版结点堆式编号（根 = 1，孩子 2k、2k+1），竞赛版叶子在 [n, 2n)',
      interval: '半开区间 [l, r)；结点区间 [lo, hi)，mid = lo + (hi − lo) / 2',
      limits: 'C++/Java/Rust/Go 用 64 位和；TypeScript 为 Number，|和| ≤ 2^53−1；Python 任意精度',
      timeComplexity: '建树 O(n)；set / sum O(log n)',
      spaceComplexity: '教学版 O(4n)（递归堆式编号）；竞赛版 O(2n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版是自底向上的迭代写法（叶子在 [n,2n)），控制流与教学版（递归、堆式编号）不同构：作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '5 4\n1 2 3 4 5\n1 0 5\n0 2 10\n1 1 4\n1 2 3\n', output: '15\n16\n10\n', note: '输入格式参考 Library Checker "Point Add Range Sum"，但操作 0 是赋值 a[p]=x：[0,5) = 15；赋值 a[2]=10 后 [1,4) = 2+10+4 = 16；[2,3) = 10。' },
    counterexample: {
      title: '递归线段树只开 2n 个槽位',
      explanation: '堆式编号的递归线段树，当 n 不是 2 的幂时最大结点编号会超过 2n。例如 n=5：结点 7 管辖 [3,5)，它的孩子是 14 和 15，而 2n=10，数组下标 14、15 越界。因此递归写法要开 4n（或按 2^⌈log2 n⌉ 取整后开 2 倍）。',
      input: 'n = 5，tree 大小 = 2n = 10',
      wrong: '访问 tree[14]、tree[15]：越界（未定义行为 / 数组越界异常）',
      correct: '开 4n = 20 个槽位：最大使用的编号是 15',
    },
    ioProtocol: '第 1 行 N Q；第 2 行 a_0..a_{N−1}；随后 Q 行：0 p x（a[p] = x）；1 l r（输出 a[l..r) 的和）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'segtree-lazy',
    topicId: 'segtree-lazy',
    title: '懒标记线段树（区间加 + 区间和）',
    category: '数据结构',
    difficulty: '进阶',
    prereqs: ['线段树（单点赋值 + 区间和）', '半开区间 [l, r)'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<vector>'],
      depends: [],
      indexing: '对外 0-based；结点堆式编号（根 = 1，孩子 2k、2k+1）',
      interval: '半开区间 [l, r)；结点区间 [lo, hi)，mid = lo + (hi − lo) / 2',
      limits: 'C++/Java/Rust/Go 用 64 位和；TypeScript 为 Number，|和| ≤ 2^53−1；Python 任意精度',
      timeComplexity: '建树 O(n)；add / sum O(log n)',
      spaceComplexity: 'O(4n)（total 与 lazy 两个数组）',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把 apply / push 压成单行函数，控制流与教学版的分行写法不同构：作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '5 5\n1 2 3 4 5\n1 0 5\n0 1 4 10\n1 0 2\n1 2 5\n0 0 5 -1\n', output: '15\n13\n32\n', note: '操作 0 l r x：a[l..r) += x；操作 1 l r：输出 a[l..r) 的和。a=[1,2,3,4,5]：sum[0,5)=15；给 a[1..4) 加 10 得 [1,12,13,14,5]；sum[0,2)=13；sum[2,5)=13+14+5=32；最后的 add 不输出。' },
    counterexample: {
      title: '在 sum 的部分重叠分支漏掉 push',
      explanation: 'a = [1,2,3,4]。add(0,4,10) 把根结点完全覆盖：只改 total[1] 与 lazy[1]，孩子仍是旧值。随后 sum(0,2)：根部分重叠，必须先 push 把标记交给孩子；漏掉 push 就直接读到孩子 [0,2) 的旧 total = 3，而正确答案是 (1+10)+(2+10) = 23。',
      input: 'a=[1,2,3,4]；add(0,4,10)；sum(0,2)',
      wrong: '3（读到孩子的旧值）',
      correct: '23',
    },
    ioProtocol: '第 1 行 N Q；第 2 行 a_0..a_{N−1}；随后 Q 行：0 l r x（a[l..r) += x）；1 l r（输出 a[l..r) 的和）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'prefix-diff',
    topicId: 'prefix-diff',
    title: '前缀和与差分数组',
    category: '数组',
    difficulty: '竞赛基础',
    prereqs: ['半开区间 [l, r)'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<vector>'],
      depends: [],
      indexing: '对外 0-based；p 与 d 均开 n+1 个槽',
      interval: '半开区间 [l, r)：sum = p[r] − p[l]；区间加 d[l] += v, d[r] −= v',
      limits: 'C++/Java/Rust/Go 用 64 位；TypeScript 为 Number（|和| ≤ 2^53−1）；Python 任意精度',
      timeComplexity: '前缀和 O(n) 建、O(1) 查；差分 O(1) 改、O(n) 还原',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把前缀和与差分拆成 Prefix / Diff 两个结构体，接口与教学版的纯函数不同：作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '5 2 3\n1 2 3 4 5\n0 3 10\n2 5 -1\n0 5\n1 4\n3 3\n', output: '42\n27\n0\n', note: '先对 a=[1,2,3,4,5] 做两次区间加（[0,3)+10，[2,5)−1）得 [11,12,12,3,4]；再回答 [0,5)=42、[1,4)=27、[3,3)=0（空区间）。' },
    counterexample: {
      title: '差分的抵消点写成 d[r+1]',
      explanation: '对半开区间 [l,r) 加 v，抵消点是 d[r]。写成 d[r+1] 会让 a[r] 也被多加一次 v。例：a=[0,0,0]，add(0,2,5) 应得 [5,5,0]，错误写法得 [5,5,5]。',
      input: 'a = [0,0,0]；add(0, 2, 5)',
      wrong: '[5, 5, 5]（d[3] 抵消，a[2] 被多加）',
      correct: '[5, 5, 0]（d[2] −= 5）',
    },
    ioProtocol: '第 1 行 N U Q；第 2 行 a_0..a_{N−1}；随后 U 行 l r x（a[l..r) += x）；再 Q 行 l r（输出全部更新后 a[l..r) 的和）。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'discretize',
    topicId: 'discretize',
    title: '离散化（排序 + 去重 + lower_bound）',
    category: '数组',
    difficulty: '竞赛基础',
    prereqs: ['排序', 'lower_bound'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<algorithm>', '<vector>'],
      depends: [],
      indexing: '名次 0-based：最小的不同取值名次为 0（树状数组要 1-based 时整体 +1）',
      interval: '无区间参数；id(x) = 比 x 小的不同取值个数',
      limits: 'C++/Java/Rust/Go 用 64 位值；TypeScript 为 Number（|值| ≤ 2^53−1）；Python 任意精度',
      timeComplexity: '构造 O(n log n)；id O(log n)',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版直接用 std::sort / std::unique / std::lower_bound，教学版手写二分：结果相同、控制流不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '6 3\n90 15 90 -7 15 1000\n15 16 2000\n', output: '2 1 2 0 1 3\n1 2 4\n', note: '去重后 u = [-7, 15, 90, 1000]：各元素名次 2 1 2 0 1 3；查询 15 → 1（只有 −7 更小），16 → 2，2000 → 4。' },
    counterexample: {
      title: '忘了去重',
      explanation: '若只排序不去重，lower_bound 对重复值仍返回第一次出现的位置，名次会出现空洞：a=[5,5,7] 排序后 [5,5,7]，7 的 lower_bound 是 2 而不是 1，名次 {0,0,2} 不再是 0..m−1 的紧凑编号，用它开的数组会浪费空间，用它建树状数组会多出空位。',
      input: 'a = [5, 5, 7]',
      wrong: '名次 [0, 0, 2]（出现空洞）',
      correct: '名次 [0, 0, 1]',
    },
    ioProtocol: '第 1 行 N Q；第 2 行 a_0..a_{N−1}；第 3 行 q_1..q_Q。输出：第 1 行每个 a_i 的名次；第 2 行每个 q 的"比 q 小的不同取值个数"。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'bs-answer',
    topicId: 'bs-answer',
    title: '二分答案（最小化最大段和）',
    category: '二分与判定',
    difficulty: '竞赛基础',
    prereqs: ['二分查找', '贪心'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<algorithm>', '<numeric>', '<vector>'],
      depends: [],
      indexing: '数组 0-based；答案区间 [lo, hi] 为闭区间（求最小可行整数）',
      interval: '搜索区间闭区间 [lo, hi]；hi 始终可行；可行 → hi = mid，不可行 → lo = mid + 1',
      limits: '元素须 > 0；C++/Java/Rust/Go 用 64 位；TypeScript 为 Number（sum ≤ 2^53−1）',
      timeComplexity: 'O(n log sum(a))',
      spaceComplexity: 'O(1)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版抽出通用的 first_true(lo, hi, ok) 并用 lambda 写判定，教学版是显式循环：控制流不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '5 2\n7 2 5 10 8\n', output: '18\n', note: '经典例题：[7,2,5,10,8] 分成 2 段，最优是 [7,2,5] 与 [10,8]，最大段和 18。' },
    counterexample: {
      title: '下界写成 0 而不是 max(a)',
      explanation: '下界必须是 max(a)：cap 小于最大元素时，贪心会让这个元素独占一段，"段数"不再对应真实分法。例：a=[10,1]，k=3。cap=0 时贪心得到 3 段 ≤ k，被误判可行，二分一路收缩到 0 并返回 0；真正最小的最大段和是 10（元素 10 无论如何要在某一段里）。',
      input: 'a = [10, 1]，k = 3，lo 取 0',
      wrong: '返回 0（cap 远小于最大元素）',
      correct: '下界取 max(a) = 10，返回 10',
    },
    ioProtocol: '第 1 行 N K；第 2 行 a_1..a_N（均 > 0）。输出最小的"最大段和"。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'mono-stack',
    topicId: 'mono-stack',
    title: '单调栈（下一个更大 + 最大矩形）',
    category: '数组',
    difficulty: '竞赛基础',
    prereqs: ['栈'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<algorithm>', '<vector>'],
      depends: [],
      indexing: '0-based 下标；结果 −1 表示没有更大元素',
      interval: '最大矩形：弹出时的窗口为半开区间 [left, i)，宽度 = i − left',
      limits: '下一个更大：严格大于；柱高须 ≥ 0；面积用 64 位（TypeScript 为 Number，≤ 2^53−1）',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把弹栈循环压成单行并用 vector<int> 作栈，控制流与教学版（分行 + 显式栈操作）不同构：作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '8\n2 1 5 6 2 3 6 6\n', output: '2 2 3 -1 5 6 -1 -1\n12\n', note: 'a = [2,1,5,6,2,3,6,6]：下标 3 的 6 右边没有严格更大的元素（−1），两个末尾的 6 同理；把 a 当柱状图，最大矩形是高 2、宽 6（下标 2..7）= 12。' },
    counterexample: {
      title: '最大矩形忘了末尾哨兵 0',
      explanation: '如果循环只跑到 n−1，不追加高度 0 的哨兵，栈里剩下的递增柱子永远不会被结算。例：h=[2,3,4]，正确答案 6（高 2 宽 3 或高 3 宽 2 … 取最大 6）。不加哨兵时没有任何柱子被弹出，面积保持 0。',
      input: 'h = [2, 3, 4]（循环到 i < n，没有哨兵）',
      wrong: '0（没有任何柱子被结算）',
      correct: '6（哨兵 0 依次弹出 4、3、2，面积 4、6、6）',
    },
    ioProtocol: '第 1 行 N；第 2 行 a_0..a_{N−1}（非负）。输出：第 1 行每个元素的下一个严格更大元素下标（没有为 −1）；第 2 行以 a 为柱高的最大矩形面积。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'mono-queue',
    topicId: 'mono-queue',
    title: '单调队列（滑动窗口最大 / 最小）',
    category: '数组',
    difficulty: '竞赛基础',
    prereqs: ['双端队列', '单调栈'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<deque>', '<functional>', '<vector>'],
      depends: [],
      indexing: '0-based 下标；窗口 = [i − k + 1, i]；过期判定 front ≤ i − k',
      interval: '窗口长度 k 满足 1 ≤ k ≤ n；输出 n − k + 1 个值',
      limits: 'C++/Java/Rust/Go 用 64 位；TypeScript 为 Number（|值| ≤ 2^53−1）',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(k)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版用比较器参数化（>= 求最大、<= 求最小），教学版通过取负复用同一份最大值代码：控制流不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '8 3\n1 3 -1 -3 5 3 6 7\n', output: '3 3 5 5 6 7\n-1 -3 -3 -3 3 3\n', note: '经典例题 [1,3,-1,-3,5,3,6,7]，k=3：窗口最大值 3 3 5 5 6 7；最小值 -1 -3 -3 -3 3 3。' },
    counterexample: {
      title: '过期判定差一位（front < i − k）',
      explanation: '窗口是 [i−k+1, i]，所以下标 i−k 已经过期。若写成 front < i − k，则下标 i−k 在队首多留一步，窗口最大值可能取到窗口外的元素。例：a=[5,1,1]，k=2：i=2 时窗口 [1,2]，下标 0（值 5）已过期；差一的写法仍输出 5。',
      input: 'a = [5, 1, 1]，k = 2',
      wrong: '[5, 5]（第二个窗口 [1,1] 却输出 5）',
      correct: '[5, 1]',
    },
    ioProtocol: '第 1 行 N K；第 2 行 a_0..a_{N−1}。输出：第 1 行每个长度为 K 的窗口的最大值；第 2 行最小值。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'topo',
    topicId: 'topo',
    title: '拓扑排序（Kahn + 判环）',
    category: '图',
    difficulty: '竞赛基础',
    prereqs: ['队列', '图的邻接表'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<utility>', '<vector>'],
      depends: [],
      indexing: '结点 0..n−1；边 u→v 表示"先 u 后 v"',
      interval: '无区间参数；返回的 order.size() == n 当且仅当无环',
      limits: '重边、自环允许（自环必判为有环）；顺序由 FIFO + 输入顺序唯一确定',
      timeComplexity: 'O(n + m)',
      spaceComplexity: 'O(n + m)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把建图、入度、扫描压成几行并用 vector 当队列，返回已处理的结点序列（size < n 即有环）；教学版返回 [status, ...order]：控制流与接口不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1\n', output: '1\n4 5 2 0 3 1\n', note: '经典 DAG：Kahn（零入度按编号、出边按输入顺序）得到 4 5 2 0 3 1；任何合法顺序都满足每条边 u 在 v 之前。' },
    counterexample: {
      title: '有环却把部分顺序当答案',
      explanation: '图 0→1→2→1（1 与 2 成环）。Kahn 只能处理结点 0，之后 1、2 互相等待。若不检查"已处理数 == n"，会把 [0] 当成完整拓扑序。正确做法是发现 1 < 3 并报告有环。',
      input: 'n = 3，边 0→1、1→2、2→1',
      wrong: '输出顺序 [0]（只有 1 个结点，却当作完整排序）',
      correct: 'status = 0（有环）；已处理 [0]，卡住的结点 {1, 2}',
    },
    ioProtocol: '第 1 行 N M；随后 M 行 u v（有向边 u→v，结点 0..N−1）。输出：第 1 行 1（无环）或 0（有环）；第 2 行已处理结点的顺序。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'lca',
    topicId: 'lca',
    title: '最近公共祖先（倍增）',
    category: '树',
    difficulty: '竞赛基础',
    prereqs: ['树的父结点表示', '二进制拆分'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<utility>', '<vector>'],
      depends: [],
      indexing: '结点 0..n−1，0 为根；par[v] < v（v ≥ 1），par[0] = 0',
      interval: '询问 (u, v) 两点都在 0..n−1；lca(u, u) = u',
      limits: 'n 约 10^5 ~ 10^6 时内存 n·log n 个 int；父编号必须小于子编号，否则先 DFS 求 depth',
      timeComplexity: '预处理 O(n log n)，询问 O(log n)',
      spaceComplexity: 'O(n log n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版是一个 LCA 结构体（构造即预处理，query 回答询问）；教学版是 lcaAll(par, queries) 批量接口：控制流同源但接口不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '8 4\n0 0 1 1 2 2 4\n3 6\n5 7\n3 4\n7 7\n', output: '0\n0\n1\n7\n', note: '树：0 为根，1、2 是它的孩子，3、4 挂在 1 下，5、6 挂在 2 下，7 挂在 4 下。lca(3,4)=1；lca(7,7)=7（自己）。' },
    counterexample: {
      title: '抬升后忘了判 u == v',
      explanation: '链 0→1→2，询问 (2, 1)：抬升后 u = 1 = v。若直接进入"一起跳"并最后取父结点，会得到 0，而正确答案是 1（结点是自己的祖先）。',
      input: 'par = [0, 1]，询问 (2, 1)',
      wrong: '输出 0（多走了一层）',
      correct: '输出 1',
    },
    ioProtocol: '第 1 行 N Q；第 2 行 N−1 个整数 par[1..N−1]（par[v] < v）；随后 Q 行 u v。输出 Q 行：每对的 LCA。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'lis',
    topicId: 'lis',
    title: '最长上升子序列（严格，O(n log n) + 还原）',
    category: '动态规划',
    difficulty: '竞赛基础',
    prereqs: ['二分查找', '动态规划基础'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<algorithm>', '<vector>'],
      depends: [],
      indexing: '0-indexed 下标；序列元素为 long long',
      interval: '无区间参数',
      limits: 'n 可到 10^5~10^6；严格上升（相邻必须 <）；还原的序列不唯一',
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版用 lower_bound 在 tails 值数组上二分，返回序列本身；教学版手写二分并返回 [长度, ...序列]：控制流同源但写法与接口不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '8\n10 9 2 5 3 7 101 18\n', output: '4\n2 3 7 18\n', note: '长度 4。最长不唯一（例如 2 5 7 101 也合法），本模板的二分规则还原出 2 3 7 18。' },
    counterexample: {
      title: '把 tails 当作答案',
      explanation: '序列 [2, 5, 3, 1]：处理完后 tails = [1, 3]（长度 2 的最小结尾 3，长度 1 的最小结尾 1）。长度 2 是对的，但 "1 3" 不是子序列（1 在 3 之后）。必须用 prev 回溯，得到 [2, 5] 或 [2, 3] 这类真正的子序列。',
      input: 'a = [2, 5, 3, 1]',
      wrong: '输出 tails = [1, 3]（不是原序列的子序列）',
      correct: '长度 2，序列例如 [2, 3]',
    },
    ioProtocol: '第 1 行 N；第 2 行 N 个整数。输出：第 1 行 LIS 长度；第 2 行一个最长严格上升子序列。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    id: 'number-theory',
    topicId: 'number-theory',
    title: '数论工具箱（gcd / exgcd / 快速幂 / 逆元 / 筛法）',
    category: '数学',
    difficulty: '竞赛基础',
    prereqs: ['取模运算', '二进制'],
    header: {
      standard: 'C++17（教学版另有 Python / TypeScript / Java / Rust / Go）',
      headers: ['<vector>'],
      depends: [],
      indexing: '无下标约定；sieve(n) 返回 n 以内按升序的素数',
      interval: 'gcd/exgcd：a, b ≥ 0；pow_mod：base, power ≥ 0 且 m ≥ 1；inv_mod：m ≥ 1',
      limits: '64 位整数下 m ≤ 3·10^9（乘积不溢出）；sieve 需要 O(n) 内存；inv_mod 在 gcd(a, m) ≠ 1 时返回 −1',
      timeComplexity: 'gcd/exgcd O(log)；pow_mod O(log power)；sieve O(n log log n)',
      spaceComplexity: 'O(1)；sieve O(n)',
    },
    teachLanguages: ['typescript', 'python', 'cpp', 'java', 'rust', 'go'],
    contestNote: '竞赛版把五个工具压成短函数（ex_gcd 用引用返回系数，sieve 返回 int 向量）；教学版统一返回数组并逐步展开。接口与写法不同构，作为参考模板阅读，不显示"正在执行"箭头。',
    sample: { input: '7 40 13 1000 30\n', output: '1\n1 -17 3\n407\n23\n2 3 5 7 11 13 17 19 23 29\n', note: 'gcd(7,40)=1；exgcd 给出 7·(−17) + 40·3 = 1；7^13 mod 1000 = 407；7 在模 40 下的逆元是 23（7·23 = 161 = 4·40 + 1）；30 以内共 10 个素数。' },
    counterexample: {
      title: '不检查逆元是否存在',
      explanation: '求 6 在模 9 下的逆元：gcd(6, 9) = 3 ≠ 1，不存在 x 使 6x ≡ 1 (mod 9)。若直接取 exgcd 的系数 x = −1 并规约，得到 8，但 6·8 = 48 ≡ 3 (mod 9)，并不是 1。正确做法是先检查 g == 1，否则返回"无逆元"。',
      input: 'inv_mod(6, 9)',
      wrong: '返回 8（6·8 mod 9 = 3 ≠ 1）',
      correct: '返回 −1（逆元不存在）',
    },
    ioProtocol: '一行：a b power m n。输出 5 行：gcd(a,b)；g x y；a^power mod m；a 模 b 的逆元（或 −1）；n 以内的素数。',
    source: ORIGINAL,
    license: LICENSE,
  },
  {
    prereqs: [
      "数组",
      "指针/迭代器的概念"
    ],
    header: {
      standard: "C++17",
      headers: [
        "<cstddef>",
        "<vector>"
      ],
      depends: [],
      indexing: "0-based 下标；begin() + i 是第 i 个元素的迭代器",
      interval: "insert 位置 i ∈ [0, size]；erase 位置 i ∈ [0, size)",
      limits: "capacity 的增长倍数由实现决定（libstdc++ 翻倍）；重新分配后所有迭代器 / 指针 / 引用失效",
      timeComplexity: "push_back 摊还 O(1)；insert / erase O(n)；reserve / resize 重新分配时 O(n)",
      spaceComplexity: "O(capacity)"
    },
    contestNote: "竞赛版直接调用标准库的同一组函数，没有额外控制流；教学版只是把每个调用单独成函数以便逐行对应。两者在每一步产生同样的容器状态（已用真实 g++ 逐条对拍）。作为参考模板阅读，不显示\"正在执行\"箭头。",
    sample: {
      input: "3 1 2 3\n6\npush 4\npush 5\nreserve 10\nresize 6\nerase 0\nshrink\n",
      output: "size=4 cap=6 re=1 [1 2 3 4]\nsize=5 cap=6 re=0 [1 2 3 4 5]\nsize=5 cap=10 re=1 [1 2 3 4 5]\nsize=6 cap=10 re=0 [1 2 3 4 5 0]\nsize=5 cap=10 re=0 [2 3 4 5 0]\nsize=5 cap=5 re=1 [2 3 4 5 0]\n",
      note: "初始 3 个元素、capacity 3。push 4 时满了，翻倍成 6（re=1：缓冲区搬家）；reserve 10 再次搬家；resize 6 创建了一个新的 0；erase 不改 capacity；shrink_to_fit 把 capacity 收到 5。"
    },
    counterexample: {
      title: "拿着迭代器 push_back",
      explanation: "vector 满时 push_back 会重新分配缓冲区，旧迭代器指向已释放的内存。解引用它是未定义行为：可能\"碰巧还能用\"，也可能崩溃或读到垃圾。本站实验在执行这种解引用之前停止，而不是画一个编造的值。",
      input: "v = {1,2,3}（capacity 3）；auto it = v.begin() + 1; v.push_back(4); *it",
      wrong: "认为 *it 仍然是 2（旧缓冲区可能已被释放）",
      correct: "push_back 之后重新获取迭代器，或先 reserve 足够空间再取迭代器"
    },
    ioProtocol: "第 1 行 k 与 k 个初始整数；第 2 行操作数 m；随后 m 行 \"push x | reserve n | resize n | insert i x | erase i | shrink | it i | use\"。每个操作输出一行 \"size=.. cap=.. re=.. [内容]\"，re=1 表示缓冲区搬家。",
    id: "stl-vector",
    topicId: "stl-vector",
    title: "vector 与迭代器实验",
    category: "STL",
    difficulty: "竞赛基础",
    teachLanguages: [
      "cpp"
    ],
    source: ORIGINAL,
    license: LICENSE
  },
]

export const templateById = (id: string | undefined) => TEMPLATES.find((t) => t.id === id)
