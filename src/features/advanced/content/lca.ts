import type { TopicContent } from './types'

const content: TopicContent = {
  boundary: [
    '本页的输入保证"父编号小于子编号"（par[v] < v），这样深度可以一趟算出；对一般的有根树，需要先用 DFS/BFS 求深度和父结点，之后的倍增部分相同。',
    '本页是倍增法；Euler 序 + RMQ、树链剖分、Tarjan 离线 LCA 是另外的方法，未做。',
    '一个结点是它自己的祖先：lca(u, u) = u，lca(祖先, 后代) = 祖先。',
  ],
  sections: [
    { id: 'when', title: '什么时候用', bullets: ['需要多次询问树上两点的最近公共祖先，n、q 较大，朴素逐步向上走会退化成 O(n) 每次。', '树上两点距离 = depth[u] + depth[v] − 2·depth[lca]。'] },
    {
      id: 'idea',
      title: '核心想法',
      paragraphs: ['预处理 up[j][v] = v 的 2^j 级祖先，用 up[j][v] = up[j−1][up[j−1][v]] 一层层推出。询问时分两步：', '① 抬升：把更深的点按深度差的二进制位向上走，使两点同深。若此时相同，答案就是它。', '② 一起跳：从高位到低位，若两点的 2^j 级祖先不同就一起跳。结束时两点是 LCA 的两个孩子，答案是它们的父结点。'],
    },
    { id: 'why', title: '为什么"不同才跳"', paragraphs: ['若 2^j 级祖先相同，说明跳 2^j 步会到达或越过 LCA，所以不跳；若不同，说明跳完仍在 LCA 之下，可以放心跳。从高位到低位逐位决定，就像二进制逼近"刚好在 LCA 下面一层"的位置。'] },
    { id: 'correct', title: '为什么正确', bullets: ['抬升后两点同深，所以到 LCA 的步数相同，可以同步向上。', '"不同才跳"保持不变量：两点始终在 LCA 的严格下方；每个二进制位只决定一次，总步数 = 到 LCA 的距离 − 1，恰好被二进制表示覆盖。', '根的 up 取自己，向上越过根时停在根，不会越界。'] },
    { id: 'complexity', title: '复杂度', bullets: ['预处理 O(n log n) 时间与空间；每次询问 O(log n)。'] },
    { id: 'mistakes', title: '常见错误', bullets: ['先判 u == v 再抬升，或抬升后忘了判 u == v 就继续跳，会多走一层。', '"一起跳"写成不同就停（应是相同就停）。', 'LOG 取小了：必须满足 2^LOG ≥ n。', '没有让根的 up 指向自己，导致越界。', '循环 j 的方向写反：跳跃必须从高位到低位。'] },
    { id: 'apps', title: '应用方向', paragraphs: ['树上距离、路径查询、树上差分、虚树。这里只列方向，未做。'] },
  ],
}
export default content
