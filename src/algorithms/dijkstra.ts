import type { Step } from '../types/step'

export const meta = {
  id: 'dijkstra',
  title: 'Dijkstra 最短路',
  complexity: '时间 O((V+E) log V)，空间 O(V)',
  description: '非负权图单源最短路：每次取出当前距离最小的未确定顶点。',
  code: `dist[s]=0; others=∞
while 有未确定顶点:
  u = 未确定中 dist 最小者
  标记 u 已确定
  松弛 u 的出边`,
  defaultEdges: [
    [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5],
    [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3],
  ] as [number, number, number][],
  defaultN: 6,
  defaultStart: 0,
}

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 60, y: 130 },
  1: { x: 180, y: 50 },
  2: { x: 180, y: 210 },
  3: { x: 320, y: 50 },
  4: { x: 320, y: 210 },
  5: { x: 440, y: 130 },
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const adj: { v: number; w: number }[][] = Array.from({ length: n }, () => [])
  const edges = edgeList.map(([u, v, w]) => ({ from: u, to: v, weight: w, directed: true }))
  for (const [u, v, w] of edgeList) adj[u].push({ v, w })

  const dist = Array(n).fill(Infinity)
  const done = Array(n).fill(false)
  dist[start] = 0
  const steps: Step[] = []
  let id = 0

  const snap = (message: string, hn: number[] = [], he: [number, number][] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    steps.push({
      id: id++,
      message,
      arrays: {
        dist: dist.map((d) => (d === Infinity ? '∞' : d)),
        done: done.map((d) => (d ? 1 : 0)),
      },
      highlights: { dist: hn },
      vars,
      graph: {
        nodes: Array.from({ length: n }, (_, i) => ({ id: i, label: `${i}`, ...POS[i] })),
        edges,
        highlightNodes: hn,
        highlightEdges: he,
      },
    })
  }

  snap(`初始化：dist[${start}]=0，其余 ∞`, [start], [], { start })
  for (let iter = 0; iter < n; iter++) {
    let u = -1, best = Infinity
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i]
        u = i
      }
    }
    if (u < 0) break
    done[u] = true
    snap(`选定顶点 ${u}（dist=${dist[u]}）`, [u], [], { u, dist_u: dist[u] })
    for (const { v, w } of adj[u]) {
      snap(`松弛边 ${u}→${v} (w=${w})`, [u, v], [[u, v]], { u, v, w, dist_u: dist[u], dist_v: dist[v] === Infinity ? '∞' : dist[v] })
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        snap(`更新 dist[${v}] = ${dist[v]}`, [v], [[u, v]], { u, v, newDist: dist[v] })
      }
    }
  }
  snap('Dijkstra 完成', [], [], { dist: dist.map((d) => (d === Infinity ? '∞' : d)).join(',') })
  return steps
}
