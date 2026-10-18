import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页做的是"严格"上升（相邻元素必须 <）。非严格（允许相等）只需把二分改成"第一个 > x"，这里作为对比点讲，不单独做演示。',
    '最长上升子序列不唯一：本页还原的是其中一个（由二分规则确定），与别的合法答案长度相同但元素可能不同。',
    '这里做 O(n log n) 的 tails 方法；O(n²) 的 dp 作为验证基线放在测试里，不单独做页面。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['求最长上升（或下降、非降）子序列的长度，n 到 10^5 级别。', '许多"最少需要删/改几个元素才能有序"的问题可以化成它。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['维护 tails：tails[k] = 长度为 k+1 的严格上升子序列里，最小的可能结尾。tails 一定严格递增，所以可以二分。', '处理 a[i]：找 tails 中第一个 ≥ a[i] 的位置 lo。若 lo 等于当前长度，a[i] 接在最长的后面，长度加一；否则用更小的 a[i] 替换 tails[lo]——结尾越小，后面越容易接上。'],
    },
    { id: 'recover', title: '怎么还原序列', paragraphs: ['tails 里的值本身不一定是合法的子序列（它们来自不同时刻）。所以在放置 a[i] 时同时记 prev[i] = tails[lo−1] 对应的下标，最后从最长长度的结尾沿 prev 回溯，再翻转。'] },
    { id: 'correct', title: '为什么正确', bullets: ['不变量：tails[k] 恰是长度 k+1 的严格上升子序列的最小结尾；tails 严格递增。', '用第一个 ≥ a[i] 的位置：位置 lo 之前的结尾都 < a[i]，所以 a[i] 能接在长度 lo 的序列后构成长度 lo+1；tails[lo] ≥ a[i]，替换不会变差。', '严格性来自"≥ 就替换"：相等元素替换而不是追加。'] },
    { id: 'complexity', title: '复杂度', bullets: ['每个元素一次二分 O(log n)：总 O(n log n)；空间 O(n)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['严格上升却用 upper_bound（会把相等元素也算进去）。', '把 tails 直接当作答案输出。', 'prev 记成"上一个元素的下标 i−1"而不是 tails[lo−1] 的下标。', '把 tails 存成值后，还原时找不到下标。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['最长不降/下降子序列、俄罗斯套娃信封、最少拦截系统数（Dilworth）。这里只列方向，未做。'] },
  ],
}
export default content
