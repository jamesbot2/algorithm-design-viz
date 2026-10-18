import type { RoadmapItem } from './types'

/** NOT delivered. Rendered only as a plain list in the roadmap section — never as a learnable card, never linked. */
export const ROADMAP: RoadmapItem[] = [
  { id: 'stl-vector', section: 'stl', titleZh: 'vector / 迭代器实验', titleEn: 'vector & iterators', aliases: ['vector', '迭代器失效', 'capacity'], note: 'size/capacity、reserve 与 resize、迭代器失效' },
  { id: 'stl-deque', section: 'stl', titleZh: 'queue / deque 实验', titleEn: 'queue / deque', aliases: ['queue', 'deque', '双端队列'], note: '固定槽位的队首/队尾操作' },
  { id: 'stl-unique', section: 'stl', titleZh: 'unique + erase 实验', titleEn: 'unique + erase', aliases: ['unique', 'erase'], note: '逻辑新终点与容器 size' },
  { id: 'stl-set-map', section: 'stl', titleZh: 'set / multiset / map 实验', titleEn: 'set / map', aliases: ['set', 'map', 'multiset'], note: '有序键、重复次数、map[] 插入副作用' },
  { id: 'number-theory', section: 'algorithms', titleZh: '数论工具', titleEn: 'Number theory tools', aliases: ['gcd', 'exgcd', '快速幂', '逆元', '筛法'], note: 'gcd/exgcd、快速幂、模逆元、筛法' },
  { id: 'scc', section: 'algorithms', titleZh: '强连通分量', titleEn: 'SCC', aliases: ['SCC', 'Tarjan', 'Kosaraju', '强连通'], note: '第二批：访问栈、low-link' },
]
