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
]

export const templateById = (id: string | undefined) => TEMPLATES.find((t) => t.id === id)
