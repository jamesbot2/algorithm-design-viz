import type { Step } from '../types/step'

export const meta = {
  id: 'bellmanFord',
  title: 'Bellman-Ford 最短路',
  complexity: '时间 O(VE)，空间 O(V)',
  description: '可处理负权边：对所有边松弛 |V|-1 轮，再检测负环。',
  code: `dist[s]=0
for i = 1..V-1:
  for each edge (u,v,w):
    dist[v] = min(dist[v], dist[u]+w)
再松弛一轮检测负环`,
  defaultEdges: [
    [0, 1, 6], [0, 2, 7], [1, 2, 8], [1, 3, 5],
    [1, 4, -4], [2, 3, -3], [2, 4, 9], [3, 1, -2], [4, 0, 2], [4, 3, 7],
  ] as [number, number, number][],
  defaultN: 5,
  defaultStart: 0,
}

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 100, y: 60 },
  1: { x: 300, y: 40 },
  2: { x: 100, y: 200 },
  3: { x: 300, y: 200 },
  4: { x: 420, y: 120 },
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const dist = Array(n).fill(Infinity)
  dist[start] = 0
  const edges = edgeList.map(([u, v, w]) => ({ from: u, to: v, weight: w, directed: true }))
  const steps: Step[] = []
  let id = 0

  const snap = (message: string, he: [number, number][] = [], hn: number[] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    steps.push({
      id: id++,
      message,
      arrays: { dist: dist.map((d) => (d === Infinity ? '∞' : d)) },
      highlights: { dist: hn },
      vars,
      graph: {
        nodes: Array.from({ length: n }, (_, i) => ({ id: i, label: String(i), ...POS[i] })),
        edges,
        highlightNodes: hn,
        highlightEdges: he,
      },
    })
  }

  snap(`初始化 dist[${start}]=0`, [], [start], { start })
  for (let i = 1; i <= n - 1; i++) {
    snap(`第 ${i} 轮松弛`, [], [], { round: i })
    for (const [u, v, w] of edgeList) {
      snap(`边 ${u}→${v} (w=${w})`, [[u, v]], [u, v], {
        u, v, w,
        dist_u: dist[u] === Infinity ? '∞' : dist[u],
        dist_v: dist[v] === Infinity ? '∞' : dist[v],
      })
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        snap(`更新 dist[${v}] = ${dist[v]}`, [[u, v]], [v], { v, newDist: dist[v] })
      }
    }
  }
  let neg = false
  for (const [u, v, w] of edgeList) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      neg = true
      snap(`检测到负环：边 ${u}→${v} 仍可松弛`, [[u, v]], [u, v], { negativeCycle: true })
      break
    }
  }
  if (!neg) snap('无负环，算法结束', [], [], { dist: dist.map((d) => (d === Infinity ? '∞' : d)).join(',') })
  return steps
}
