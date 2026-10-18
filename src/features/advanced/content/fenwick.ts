import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页演示的是"教学版"（while 分行、1-based 内部）。竞赛版把循环压成一行 for，控制流不同，因此不显示执行箭头。',
    '对外接口统一为 0-based 与半开区间 [l,r)；内部 1-based 只是实现细节，不改变课程中数组的索引含义。',
    'TypeScript 的 Number 只能精确表示 |x| ≤ 2^53−1，演示限制了数值范围；C++/Java/Rust/Go 版本用 64 位和。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['需要频繁"改一个位置"又"求前缀/区间和"，n、q 都较大。', '比线段树更短更快，但只适合可逆的聚合（和、异或）；最大值等需要线段树。'] },
    {
      id: 'idea',
      title: '核心想法：lowbit',
      paragraphs: ['lowbit(i) = i & −i，是 i 的二进制里最低的 1。内部结点 T[i]（1-based）管辖 (i−lowbit(i), i] 这一段，长度恰好 lowbit(i)。', '前缀和 prefix(r)：从 p=r 开始累加 T[p]，然后 p −= lowbit(p)，直到 0；最多 log2 n 步，因为每步清掉一个二进制 1。', '单点加 add(i,d)：从 p=i+1 开始，T[p]+=d，p += lowbit(p) 向上，直到 p>n；所有管辖到该位置的结点都被更新。'],
    },
    {
      id: 'interval',
      title: '索引与区间约定',
      table: {
        head: ['层次', '约定'],
        rows: [
          ['对外 API', '0-based 下标；prefix(r) = sum a[0..r)；range(l,r) = sum a[l..r)（半开）'],
          ['内部 tree', '1-based，tree[0] 不用；T[i] 管辖 (i−lowbit(i), i]'],
          ['转换', 'add(i,·) 用 p=i+1；prefix(r) 直接用 p=r（正好是 1-based 前缀长度）'],
        ],
      },
    },
    { id: 'correct', title: '为什么正确', bullets: ['每个位置 i 被且仅被"管辖区间包含它"的结点累计，这些结点正是 p=i+1 反复加 lowbit 经过的结点。', '前缀 [0,r) 能唯一拆成 p=r 反复减 lowbit 得到的若干段，段与段不重叠、并起来正好是 [0,r)。'] },
    { id: 'complexity', title: '复杂度', bullets: ['add / prefix / range：O(log n)。', '空间 O(n)。', '初始化全 0 是 O(n)；用线性建树可以在 O(n) 内由已有数组构造（本页不演示）。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['内部下标当 0-based：add(0) 会因为 lowbit(0)=0 而死循环（见模板页反例）。', '区间写成闭区间 [l,r] 却用 prefix(r)−prefix(l)：少算了 a[r]、多算了 a[l]。', '数值范围：和可能超过 int，要用 64 位。', '可视化里 T[i] 不是 a[i]：T 是"一段的和"。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['逆序对计数（配合离散化）、区间加单点查（差分）、动态排名。这里只列方向，不复制任何 OJ 题面。'] },
  ],
}
export default content
