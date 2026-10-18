import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页演示"教学版"：递归线段树 + 懒标记，结点堆式编号（根 1，孩子 2k、2k+1），数组开 4n。竞赛版把 apply/push 合并成短函数，不显示执行箭头。',
    '只做"区间加 + 区间和"。区间赋值、区间乘加混合（标记的合并顺序更复杂）未交付。',
    '对外接口 0-based、半开区间 [l,r)。TypeScript 版用 Number（|和| ≤ 2^53−1）；其余语言用 64 位整数。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['需要"给一段区间每个元素加同一个数"和"求一段区间和"交替进行。', '如果只有单点修改，用上一页的线段树或树状数组更简单。'] },
    {
      id: 'idea',
      title: '核心想法：欠账式标记',
      paragraphs: [
        '如果区间加要逐个改叶子，复杂度是 O(n)。懒标记的做法是：当一个结点的区间被完全覆盖时，只改它自己的 total，并在 lazy 里记下"孩子还欠 v"，然后立刻返回。',
        '后来某次操作必须下探到孩子时，先 push：把本结点的 lazy 交给两个孩子（各自 apply：total += v × 区间长度，lazy += v），再清零本结点的 lazy。',
      ],
    },
    {
      id: 'order',
      title: '顺序：先 push，再递归，最后 pull',
      paragraphs: ['add 与 sum 的"部分重叠"分支都必须：① push（把欠账还给孩子）→ ② 递归左右孩子 → ③ （仅 add）pull：用孩子的 total 重算本结点。', '如果颠倒——例如先递归再 push——孩子拿到的是旧值，或者标记在新值上被重复累加，结果就错了。模板验证里的"反转 push 顺序"负例会被朴素基线抓到。'],
    },
    { id: 'correct', title: '为什么正确', bullets: ['不变量：total[node] 等于该区间的真实和减去"祖先上尚未 push 的标记之和 × 区间长度"。push 之后祖先上的欠账归零，total[node] 就是真实和。', 'apply 对 total 与 lazy 的修改是同一个增量，所以 push 前后"孩子的真实和"不变。', '完全覆盖的结点只打标记不下探，每层最多两个部分重叠结点，所以 add / sum 都是 O(log n)。'] },
    { id: 'complexity', title: '复杂度', bullets: ['建树 O(n)；add / sum：O(log n)；空间 O(4n)（两个数组 total、lazy）。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['忘了在 sum 的部分重叠分支里 push：读到孩子的旧值。', 'apply 只改 lazy 不改 total（或相反）。', '标记乘以区间长度时用了 mid−lo 之类的错误长度。', 'int 溢出：和与 v × 长度要用 64 位。', '区间加的标记被误当作"赋值标记"覆盖而不是累加。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['区间加 + 区间最值、区间赋值、扫描线面积并（标记语义不同）。本页只实现区间加 + 区间和；其余未做。'] },
  ],
}
export default content
