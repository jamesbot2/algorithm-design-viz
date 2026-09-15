import type { Step } from '../types/step'

export const meta = {
  id: 'kruskal',
  title: 'Kruskal 最小生成树',
  complexity: '时间 O(E log E)，空间 O(V)',
  description: '按边权升序，用并查集跳过成环边，加入不连通的边。',
  code: `按权排序边
for e in edges:
  if find(u)!=find(v):
    union; 加入 MST`,
  defaultEdges: [
    [0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 2],
    [2, 3, 4], [2, 4, 5], [3, 4, 7],
  ] as [number, number, number][],
  defaultN: 5,
}

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 80, y: 80 },
  1: { x: 280, y: 40 },
  2: { x: 200, y: 160 },
  3: { x: 360, y: 140 },
  4: { x: 120, y: 240 },
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
): Step[] {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  const edges = [...edgeList].sort((a, b) => a[2] - b[2])
  const mst: [number, number, number][] = []
  const steps: Step[] = []
  let id = 0
  const allEdges = edgeList.map(([u, v, w]) => ({ from: u, to: v, weight: w }))

  const snap = (message: string, he: [number, number][] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    steps.push({
      id: id++,
      message,
      arrays: {
        parent: [...parent],
        mst: mst.map(([u, v, w]) => `${u}-${v}(${w})`),
      },
      vars,
      graph: {
        nodes: Array.from({ length: n }, (_, i) => ({ id: i, label: String(i), ...POS[i] })),
        edges: allEdges,
        highlightNodes: [],
        highlightEdges: he.length ? he : mst.map(([u, v]) => [u, v] as [number, number]),
      },
    })
  }

  snap('边按权升序排序', [], { edges: edges.map(([u, v, w]) => `${u}-${v}:${w}`).join(', ') })
  for (const [u, v, w] of edges) {
    const pu = find(u), pv = find(v)
    snap(`考察边 ${u}-${v} (w=${w})，根 ${pu} vs ${pv}`, [[u, v]], { u, v, w, pu, pv })
    if (pu !== pv) {
      parent[pu] = pv
      mst.push([u, v, w])
      snap(`加入 MST，union(${pu},${pv})`, [[u, v]], { mstSize: mst.length, cost: mst.reduce((s, e) => s + e[2], 0) })
    } else {
      snap(`成环，跳过`, [[u, v]], { skipped: `${u}-${v}` })
    }
  }
  snap(`完成，总权 = ${mst.reduce((s, e) => s + e[2], 0)}`, mst.map(([u, v]) => [u, v]), { answer: mst.reduce((s, e) => s + e[2], 0) })
  return steps
}
