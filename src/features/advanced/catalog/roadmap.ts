import type { RoadmapItem } from './types'

/** NOT delivered. Rendered only as a plain list in the roadmap section — never as a learnable card, never linked. */
export const ROADMAP: RoadmapItem[] = [
  { id: 'stl-vector', section: 'stl', titleZh: 'vector / 迭代器实验', titleEn: 'vector & iterators', aliases: ['vector', '迭代器失效', 'capacity'], note: 'size/capacity、reserve 与 resize、迭代器失效' },
  { id: 'stl-deque', section: 'stl', titleZh: 'queue / deque 实验', titleEn: 'queue / deque', aliases: ['queue', 'deque', '双端队列'], note: '固定槽位的队首/队尾操作' },
  { id: 'stl-unique', section: 'stl', titleZh: 'unique + erase 实验', titleEn: 'unique + erase', aliases: ['unique', 'erase'], note: '逻辑新终点与容器 size' },
  { id: 'stl-set-map', section: 'stl', titleZh: 'set / multiset / map 实验', titleEn: 'set / map', aliases: ['set', 'map', 'multiset'], note: '有序键、重复次数、map[] 插入副作用' },
  { id: 'mono-stack', section: 'algorithms', titleZh: '单调栈', titleEn: 'Monotonic stack', aliases: ['next greater'], note: '下一个严格更大元素' },
  { id: 'mono-queue', section: 'algorithms', titleZh: '单调队列', titleEn: 'Monotonic queue', aliases: ['sliding window maximum', '滑动窗口最大值'], note: '固定窗口最大值' },
  { id: 'topo', section: 'algorithms', titleZh: '拓扑排序', titleEn: 'Topological sort', aliases: ['Kahn', '判环'], note: 'Kahn 算法与判环' },
  { id: 'lca', section: 'algorithms', titleZh: 'LCA 倍增', titleEn: 'LCA (binary lifting)', aliases: ['最近公共祖先'], note: '深度对齐与同步跳跃' },
  { id: 'lis', section: 'algorithms', titleZh: 'LIS O(n log n)', titleEn: 'LIS', aliases: ['最长上升子序列'], note: 'tails 数组与恢复链' },
  { id: 'number-theory', section: 'algorithms', titleZh: '数论工具', titleEn: 'Number theory tools', aliases: ['gcd', 'exgcd', '快速幂', '逆元', '筛法'], note: 'gcd/exgcd、快速幂、模逆元、筛法' },
  { id: 'scc', section: 'algorithms', titleZh: '强连通分量', titleEn: 'SCC', aliases: ['SCC', 'Tarjan', 'Kosaraju', '强连通'], note: '第二批：访问栈、low-link' },
]
