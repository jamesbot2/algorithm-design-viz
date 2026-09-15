import type { Step } from '../types/step'

export const meta = {
  id: 'prim',
  title: 'Prim 最小生成树',
  complexity: '时间 O(V²) 或 O(E log V)，空间 O(V)',
  description: '从起点生长：每次加入连接树内与树外的最小权边。',
  code: `key[s]=0; 其余=∞
while 有未加入顶点:
  u = key 最小未加入者
  加入 MST
  更新邻接未加入点的 key`,
  defaultEdges: [
    [0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8],
    [1, 4, 5], [2, 4, 7], [3, 4, 9],
  ] as [number, number, number][],
  defaultN: 5,
  defaultStart: 0,
}

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 100, y: 80 },
  1: { x: 260, y: 40 },
  2: { x: 400, y: 100 },
  3: { x: 140, y: 220 },
  4: { x: 320, y: 220 },
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const adj: { v: number; w: number }[][] = Array.from({ length: n }, () => [])
  for (const [u, v, w] of edgeList) {
    adj[u].push({ v, w })
    adj[v].push({ v: u, w })
  }
  const key = Array(n).fill(Infinity)
  const parent = Array(n).fill(-1)
  const inMST = Array(n).fill(false)
  key[start] = 0
  const steps: Step[] = []
  let id = 0
  const allEdges = edgeList.map(([u, v, w]) => ({ from: u, to: v, weight: w }))

  const snap = (message: string, hn: number[] = [], he: [number, number][] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    const mstEdges: [number, number][] = []
    for (let i = 0; i < n; i++) if (parent[i] >= 0 && inMST[i]) mstEdges.push([parent[i], i])
    steps.push({
      id: id++,
      message,
      arrays: {
        key: key.map((k) => (k === Infinity ? '∞' : k)),
        parent: parent.map((p) => (p < 0 ? '-' : p)),
        inMST: inMST.map((x) => (x ? 1 : 0)),
      },
      highlights: { key: hn },
      vars,
      graph: {
        nodes: Array.from({ length: n }, (_, i) => ({ id: i, label: String(i), ...POS[i] })),
        edges: allEdges,
        highlightNodes: hn,
        highlightEdges: he.length ? he : mstEdges,
      },
    })
  }

  snap(`从顶点 ${start} 开始`, [start], [], { start })
  for (let iter = 0; iter < n; iter++) {
    let u = -1, best = Infinity
    for (let i = 0; i < n; i++) if (!inMST[i] && key[i] < best) { best = key[i]; u = i }
    if (u < 0) break
    inMST[u] = true
    snap(`加入顶点 ${u}（key=${key[u]}）`, [u], parent[u] >= 0 ? [[parent[u], u]] : [], { u })
    for (const { v, w } of adj[u]) {
      snap(`检查边 ${u}-${v} (w=${w})`, [u, v], [[u, v]], { u, v, w, key_v: key[v] === Infinity ? '∞' : key[v] })
      if (!inMST[v] && w < key[v]) {
        key[v] = w
        parent[v] = u
        snap(`更新 key[${v}]=${w}, parent[${v}]=${u}`, [v], [[u, v]], { v, key: w })
      }
    }
  }
  snap('Prim 完成', [], [], {})
  return steps
}
