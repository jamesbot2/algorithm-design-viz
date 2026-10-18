import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页的例题是"把正整数数组分成至多 k 段连续子数组，使最大段和最小"。其他"二分答案"题（如最小化最大值、最大化最小值、浮点二分）要换判定函数，浮点二分未做。',
    '要求所有元素 > 0（保证"cap 越大越容易"的单调性，以及下界 max(a) 有意义）。',
    '搜索的是"最小的可行整数"：区间 [lo,hi]，可行则 hi = mid，不可行则 lo = mid + 1。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['答案本身不好直接构造，但"给定一个值 x，能不能做到"很好判断，并且可行性对 x 单调：x 可行则更大的 x 也可行（或相反）。', '典型：最小化最大值、最大化最小值、满足条件的最小时间 / 最小容量。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['把"求最优解"变成"判定 + 二分"。判定函数 segmentsNeeded(cap) 用贪心：能放进当前段就放，放不下就开新段。段数 ≤ k 则 cap 可行。', '因为 cap 越大段数越少，可行性单调，所以最小可行 cap 可以对 [max(a), sum(a)] 二分得到。'],
    },
    { id: 'invariant', title: '二分的不变量', paragraphs: ['区间 [lo,hi] 始终包含答案；hi 始终可行。可行时 hi = mid（mid 本身可能就是答案，不能丢），不可行时 lo = mid + 1（mid 已被证明不行）。lo == hi 时就是最小可行值。'] },
    { id: 'correct', title: '为什么贪心判定正确', bullets: ['给定 cap，尽可能晚地结束当前段不会让后面的段数变多（交换论证）：任何可行分法都可以把每段向右"推"到贪心的边界。', '所以贪心得到的段数是 cap 下的最少段数，与"至多 k 段"的可行性一一对应。'] },
    { id: 'complexity', title: '复杂度', bullets: ['每次判定 O(n)，二分 O(log(sum(a)))，总计 O(n log sum)。空间 O(1)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['下界写成 0 或 1：cap < max(a) 时某个元素放不进任何一段，贪心的段数没有意义。', '可行时写成 hi = mid − 1，会丢掉可能就是答案的 mid。', 'mid 的取整方向与 lo/hi 的更新方式不匹配，造成死循环（本页 mid 向下取整，对应 hi = mid / lo = mid + 1）。', '判定函数不单调就不能二分。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['最小化最大值（分段、运输）、最大化最小值（放置距离）、最少完成时间。这里只列方向，浮点二分与更多判定函数未做。'] },
  ],
}
export default content
