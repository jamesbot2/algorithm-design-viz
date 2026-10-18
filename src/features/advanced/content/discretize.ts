import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页的"名次"是 0-based：最小的不同取值名次为 0。很多题解用 1-based（给树状数组用），只需整体 +1。',
    '教学版自己写了 lower_bound；竞赛版直接用 std::sort + std::unique + std::lower_bound，结果相同。',
    '离散化本身不改变相对大小，但不保留数值差：不能把名次当作坐标差去算距离。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['数值范围很大（如 10^9），但只关心相对大小，而且个数不多：把它们映射到 0..m−1，才能开数组、建树状数组、线段树。', '典型搭配：逆序对（离散化 + 树状数组）、区间计数、扫描线。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['① 复制并排序；② 去重得到 u（严格递增）；③ 每个元素的名次 = 它在 u 里的下标 = lower_bound(u, 元素)。', '对不在原数组里的查询值 x，lower_bound(u, x) 恰好是"比 x 小的不同取值个数"，这在区间计数里很常用。'],
    },
    { id: 'correct', title: '为什么正确', bullets: ['u 严格递增，所以每个取值在 u 中恰好出现一次，lower_bound 的位置就是它的下标。', '名次保序：a[i] < a[j] ⇔ rank[i] < rank[j]；相等的元素名次相同。'] },
    { id: 'complexity', title: '复杂度', bullets: ['排序 O(n log n)，去重 O(n)，每次名次查询 O(log n)；空间 O(n)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['忘了去重：重复值会得到不同名次（或名次出现空洞）。', 'lower_bound 与 upper_bound 混用：对已存在的值，upper_bound 给的是下标 + 1。', '先对原数组原地排序，再用它查原来的下标——原顺序丢了。', '把名次当成真实坐标差。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['逆序对计数、动态区间第 k 小的预处理、扫描线。这里只列方向，未做。'] },
  ],
}
export default content
