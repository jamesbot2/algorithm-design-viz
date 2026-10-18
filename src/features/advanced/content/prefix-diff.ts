import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页演示"离线"用法：先对静态数组建前缀和并回答区间和；再用差分数组一次性处理所有区间加，最后还原。两者合起来并不能支持"在线交替修改与查询"（那是树状数组 / 线段树的工作）。',
    '全部使用 0-based、半开区间 [l,r)。教学版用 Number（TypeScript）或 64 位整数（其余语言）。',
    '竞赛版把前缀和与差分拆成 Prefix / Diff 两个小结构，接口不同于教学版的纯函数，不显示执行箭头。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['数组不变、要回答很多"区间和"：前缀和，O(1) 每问。', '要做很多次"区间加"，且全部做完才读结果：差分，O(1) 每次修改，最后 O(n) 还原。', '二维前缀和 / 二维差分是同一想法的推广（本页未做）。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['前缀和 p[i] = a[0] + … + a[i−1]，所以 a[l..r) 的和 = p[r] − p[l]：两个前缀之差正好留下中间那一段。', '差分是前缀和的逆运算：d 的前缀和就是 a′。要给 a[l..r) 每个元素加 v，只需 d[l] += v（从 l 起所有后缀都加了 v），再 d[r] −= v（从 r 起把多加的减掉）。'],
    },
    { id: 'intervals', title: '半开区间与长度 n+1', paragraphs: ['p 与 d 都要开 n+1 个槽：p[n] 是全数组的和；d[r] 在 r = n 时要有位置存放。用闭区间 [l,r] 时 d[r+1] 才是"抵消点"，是最常见的 off-by-one。'] },
    { id: 'correct', title: '为什么正确', bullets: ['p[r] − p[l] = Σ_{i<r} a[i] − Σ_{i<l} a[i] = Σ_{l≤i<r} a[i]。', '还原时 run_i = Σ_{j≤i} d[j]：位置 i 被每个满足 l ≤ i < r 的更新贡献一次 v（d[l] 的 +v 在 j=l 起生效，d[r] 的 −v 在 j=r 起抵消）。'] },
    { id: 'complexity', title: '复杂度', bullets: ['前缀和：建立 O(n)，查询 O(1)。差分：每次修改 O(1)，还原 O(n)。空间 O(n)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['p 只开 n 个槽，把 p[0] 当成 a[0] 的前缀（下标整体错一位）。', '差分的抵消点写成 d[r+1]（半开区间应是 d[r]），或忘了开 n+1。', '在"更新、查询交替"的场景硬用前缀和，每次更新都重建 O(n)。', '和超过 32 位。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['区间覆盖次数、扫描线计数、等差数列区间加（二阶差分）、子数组和等于 k（前缀和 + 哈希）。这里只列方向，未做。'] },
  ],
}
export default content
