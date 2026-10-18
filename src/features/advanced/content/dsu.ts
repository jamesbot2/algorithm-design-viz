import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页演示的是"教学版"：parent 与 size 两个数组、迭代 find、两趟路径压缩。竞赛版用 p[x]<0 编码根与大小，控制流不同，因此不显示执行箭头。',
    '并查集只支持合并与查询，不支持拆分集合。',
    'α(n) 是反阿克曼函数，对任何实际 n 都 ≤ 4；"均摊"指一批操作的平均，不是单次最坏。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['动态连通性只增不减：两个点是否已连通、连通块个数。', 'Kruskal 最小生成树：用"两端是否同一集合"判断成环。', '等价类/分组合并：同义词、账户合并、棋盘连通区域。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['每个集合是一棵"父指针树"，根代表整个集合。find(x) 沿 parent 走到根；union(a,b) 把一棵树的根挂到另一棵树的根下。', '两个优化各自独立：按大小合并让树不会太高（深度 ≤ log2 n）；路径压缩让 find 走过的结点直接指向根，后续查询更快。两者合用均摊 O(α(n))。'],
    },
    {
      id: 'correct',
      title: '为什么正确',
      bullets: ['不变量：parent[x]==x 当且仅当 x 是根；每个结点沿 parent 必到达唯一的根。', 'union 只在两个不同的根之间连一条边，所以不会成环，集合数恰好减 1。', '路径压缩只把结点改指向它本来就能到达的根，不改变任何结点所在的集合。', '重复合并同一对元素：两个根相同，直接返回 false，集合数不变。'],
    },
    { id: 'tie', title: '并列规则（本页选定）', paragraphs: ['size 相等时，第二个参数的根挂到第一个参数的根下。换成相反的规则同样正确，只是画面不同；演示与六语言代码使用同一规则。'] },
    { id: 'complexity', title: '复杂度', bullets: ['时间：m 次操作均摊 O(m·α(n))；只用按大小合并是 O(log n)/次；只用路径压缩均摊 O(log n)/次。', '空间：O(n)（parent + size）。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['union 时直接 parent[a]=b 而不先 find（见模板页的反例）。', '忘记 size 只在根上有效：合并后非根结点的 size 是过期值。', '递归 find 在没有按大小合并时可能很深（栈溢出）。', '把 count 当成"最大集合大小"：count 是集合个数。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['Kruskal 最小生成树（课程中已有，可对照）；离线连通性查询；网格连通块计数。这里只列出方向，不复制任何 OJ 题面。'] },
  ],
}
export default content
