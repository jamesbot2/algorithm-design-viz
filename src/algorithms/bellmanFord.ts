import type { EdgeRole, Step } from '../types/step'
import { directedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'bellmanFord',
  title: 'Bellman-Ford 最短路',
  complexity: '时间 O(VE)，空间 O(V)',
  description: '可处理负权边：对所有边松弛 |V|-1 轮，再检测从源可达的负环。',
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
  implName: 'bellmanFordClassic',
  implVersion: '1.1.0',
  timeComplexity: 'O(VE)',
  spaceComplexity: 'O(V)',
  spaceNotes: 'dist[V]；边表 O(E)。',
  inputAssumptions: '有向边可负权；仅报告从源可达负环；负环时 dist 不可当作有效最短路。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const dist = Array(n).fill(Infinity)
  const parent = Array(n).fill(-1)
  dist[start] = 0
  const edges = edgeList.map(([u, v, w]) => ({
    id: directedEdgeId(u, v),
    from: u,
    to: v,
    weight: w,
    directed: true as const,
  }))
  const nodes = layoutGraph(n)
  const steps: Step[] = []
  let id = 0
  const edgeRoles: Record<string, EdgeRole> = {}

  const snap = (
    message: string,
    checking?: string,
    hn: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    opts?: { warning?: string; nodeRoles?: Record<string, 'current' | 'frontier' | 'settled' | 'source' | 'target' | 'neg-cycle'> },
  ) => {
    const roles = { ...edgeRoles }
    const highlightEdgeIds = checking ? [checking] : []
    if (checking) roles[checking] = 'checking'
    steps.push({
      id: id++,
      message,
      arrays: { dist: dist.map((d) => (d === Infinity ? '∞' : d)) },
      highlights: { dist: hn },
      vars,
      graph: {
        nodes,
        edges,
        highlightNodes: hn,
        highlightEdgeIds,
        edgeRoles: roles,
        warning: opts?.warning,
        nodeRoles: opts?.nodeRoles,
      },
      result,
    })
  }

  snap(`初始化 dist[${start}]=0`, undefined, [start], { start })
  for (let i = 1; i <= n - 1; i++) {
    snap(`第 ${i} 轮松弛`, undefined, [], { round: i })
    for (const [u, v, w] of edgeList) {
      const eid = directedEdgeId(u, v)
      snap(`边 ${u}→${v} (w=${w})`, eid, [u, v], {
        u,
        v,
        w,
        dist_u: dist[u] === Infinity ? '∞' : dist[u],
        dist_v: dist[v] === Infinity ? '∞' : dist[v],
      })
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        parent[v] = u
        edgeRoles[eid] = 'relaxing'
        snap(`更新 dist[${v}] = ${dist[v]}`, eid, [v], { v, newDist: dist[v] })
      }
    }
  }

  let negEdge: [number, number, number] | null = null
  for (const [u, v, w] of edgeList) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      negEdge = [u, v, w]
      break
    }
  }

  if (negEdge) {
    const [u, v, w] = negEdge
    const eid = directedEdgeId(u, v)
    edgeRoles[eid] = 'rejected'
    snap(
      `检测到从源可达负环：边 ${u}→${v} (w=${w}) 在第 V 轮仍可松弛。距离数组已不可信，不作为有效最短路输出。`,
      eid,
      [u, v],
      { negativeCycle: true, u, v, w },
      {
        ok: false,
        error: 'negative_cycle_reachable',
        edge: negEdge,
        distCorrupted: true,
        note: '勿将当前 dist 当作最短路',
      },
      {
        warning: 'negative_cycle',
        nodeRoles: { [String(u)]: 'neg-cycle', [String(v)]: 'neg-cycle' },
      },
    )
  } else {
    snap(
      '无可达负环，算法结束',
      undefined,
      [],
      { dist: dist.map((d) => (d === Infinity ? '∞' : d)).join(',') },
      {
        ok: true,
        dist: dist.map((d) => (d === Infinity ? null : d)),
        parent: [...parent],
        start,
        negativeCycle: false,
      },
    )
  }
  return steps
}
