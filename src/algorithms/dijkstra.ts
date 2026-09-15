import type { EdgeRole, Step } from '../types/step'
import { directedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'dijkstra',
  title: '朴素 Dijkstra',
  complexity: '时间 O(V² + E)，空间 O(V + E)',
  description:
    '非负权图单源最短路（邻接表 + 每轮扫描选最小 dist，非堆优化）。负权边会被拒绝。',
  code: `dist[s]=0; others=∞
while 有未确定顶点:
  u = 未确定中 dist 最小者   // O(V) 扫描
  标记 u 已确定
  松弛 u 的出边`,
  defaultEdges: [
    [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5],
    [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3],
  ] as [number, number, number][],
  defaultN: 6,
  defaultStart: 0,
  implName: 'naiveDijkstraScan',
  implVersion: '1.2.0',
  timeComplexity: 'O(V² + E)',
  spaceComplexity: 'O(V + E)',
  spaceNotes:
    '算法：dist[V]、done[V]、邻接表 O(V+E)。可视化另存图快照，不计入算法空间。',
  inputAssumptions: '边权须 ≥ 0；有向边；不可达顶点 dist 保持 ∞。',
  statDefinitions: '本实现不累计 comparisons/swaps。',
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const steps: Step[] = []
  let id = 0

  const neg = edgeList.find(([, , w]) => w < 0)
  if (neg) {
    steps.push({
      id: id++,
      message: `拒绝执行：边 ${neg[0]}→${neg[1]} 权 ${neg[2]} < 0。Dijkstra 要求非负权，请改用 Bellman-Ford。`,
      vars: { error: 'negative_weight', u: neg[0], v: neg[1], w: neg[2] },
      phase: 'error',
      result: { ok: false, error: 'negative_weight', edge: neg },
    })
    return steps
  }

  const adj: { v: number; w: number; id: string }[][] = Array.from({ length: n }, () => [])
  const edges = edgeList.map(([u, v, w]) => {
    const eid = directedEdgeId(u, v)
    adj[u].push({ v, w, id: eid })
    return { id: eid, from: u, to: v, weight: w, directed: true as const }
  })
  const nodes = layoutGraph(n)

  const dist = Array(n).fill(Infinity)
  const done = Array(n).fill(false)
  const parent = Array(n).fill(-1)
  dist[start] = 0
  const accepted = new Set<string>()
  const edgeRoles: Record<string, EdgeRole> = {}

  const DOC = 'dijkstra.naive.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]

  const snap = (
    message: string,
    hn: number[] = [],
    checking?: string,
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    phase?: string,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    const roles: Record<string, EdgeRole> = { ...edgeRoles }
    for (const eid of accepted) roles[eid] = roles[eid] ?? 'accepted'
    const highlightEdgeIds = [
      ...Array.from(accepted),
      ...(checking ? [checking] : []),
    ]
    if (checking) roles[checking] = 'checking'
    const nodeRoles: Record<string, import('../types/step').NodeRole> = {}
    for (let i = 0; i < n; i++) {
      if (done[i]) nodeRoles[String(i)] = 'settled'
    }
    if (hn.length) {
      for (const x of hn) nodeRoles[String(x)] = nodeRoles[String(x)] ?? 'current'
    }
    nodeRoles[String(start)] = nodeRoles[String(start)] ?? 'source'
    steps.push({
      id: id++,
      message,
      phase,
      codeRefs,
      arrays: {
        dist: dist.map((d) => (d === Infinity ? '∞' : d)),
        done: done.map((d) => (d ? 1 : 0)),
        parent: parent.map((p) => (p < 0 ? '-' : p)),
      },
      highlights: { dist: hn },
      vars,
      graph: {
        nodes,
        edges,
        highlightNodes: hn,
        highlightEdgeIds,
        edgeRoles: roles,
        nodeRoles,
      },
      result,
    })
  }

  snap(`初始化：dist[${start}]=0，其余 ∞`, [start], undefined, { start }, undefined, 'init', ref('init'))
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = Infinity
    for (let i = 0; i < n; i++) {
      if (!done[i] && dist[i] < best) {
        best = dist[i]
        u = i
      }
    }
    if (u < 0 || best === Infinity) break
    done[u] = true
    snap(`选定顶点 ${u}（dist=${dist[u]}）`, [u], undefined, { u, dist_u: dist[u] }, undefined, 'extract', ref('selectMin'))
    for (const { v, w, id: eid } of adj[u]) {
      snap(`松弛边 ${u}→${v} (w=${w})`, [u, v], eid, {
        u,
        v,
        w,
        dist_u: dist[u],
        dist_v: dist[v] === Infinity ? '∞' : dist[v],
      }, undefined, 'relax', ref('relax.condition'))
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        parent[v] = u
        accepted.add(eid)
        edgeRoles[eid] = 'accepted'
        snap(`更新 dist[${v}] = ${dist[v]}`, [v], eid, { u, v, newDist: dist[v] }, undefined, 'relax', ref('relax.update'))
      }
    }
  }
  const distOut = dist.map((d) => (d === Infinity ? null : d))
  snap(
    '朴素 Dijkstra 完成',
    [],
    undefined,
    { dist: dist.map((d) => (d === Infinity ? '∞' : d)).join(',') },
    { ok: true, dist: distOut, parent: [...parent], impl: 'naiveDijkstraScan', start },
    'done',
  )
  return steps
}

/** Pure naive Dijkstra for experiments / heap compare. */
export function solveDijkstraNaive(
  edgeList: [number, number, number][],
  n: number,
  start: number,
): { ok: boolean; error?: string; dist: (number | null)[]; parent: number[]; scans: number } {
  const neg = edgeList.find(([, , w]) => w < 0)
  if (neg) return { ok: false, error: 'negative_weight', dist: [], parent: [], scans: 0 }
  const adj: { v: number; w: number }[][] = Array.from({ length: n }, () => [])
  for (const [u, v, w] of edgeList) adj[u]!.push({ v, w })
  const dist = Array(n).fill(Infinity)
  const done = Array(n).fill(false)
  const parent = Array(n).fill(-1)
  dist[start] = 0
  let scans = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = Infinity
    for (let i = 0; i < n; i++) {
      scans++
      if (!done[i] && dist[i] < best) {
        best = dist[i]
        u = i
      }
    }
    if (u < 0 || best === Infinity) break
    done[u] = true
    for (const { v, w } of adj[u]!) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        parent[v] = u
      }
    }
  }
  return {
    ok: true,
    dist: dist.map((d) => (d === Infinity ? null : d)),
    parent,
    scans,
  }
}

export function reconstructPath(parent: number[], target: number): number[] {
  if (target < 0 || target >= parent.length) return []
  const path: number[] = []
  let cur = target
  let guard = 0
  while (cur !== -1 && guard++ < parent.length + 2) {
    path.push(cur)
    if (parent[cur] === -1) break
    cur = parent[cur]!
  }
  path.reverse()
  return path
}
