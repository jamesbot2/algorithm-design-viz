import type { EdgeRole, Step } from '../types/step'
import { undirectedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'kruskal',
  title: 'Kruskal 最小生成树',
  complexity: '时间 O(E log E)，空间 O(V)',
  description: '按边权升序，用并查集跳过成环边。若图不连通则得到最小生成森林（非单棵 MST）。',
  code: `按权排序边
for e in edges:
  if find(u)!=find(v):
    union; 加入 MST`,
  defaultEdges: [
    [0, 1, 4], [0, 2, 3], [1, 2, 1], [1, 3, 2],
    [2, 3, 4], [2, 4, 5], [3, 4, 7],
  ] as [number, number, number][],
  defaultN: 5,
  implName: 'kruskalUnionFind',
  implVersion: '1.1.0',
  timeComplexity: 'O(E log E)（排序主导；并查集近乎 O(E α(V))）',
  spaceComplexity: 'O(V)',
  spaceNotes: 'parent[V]；边表排序可用原地或副本。',
  inputAssumptions: '无向加权图；不连通时报告森林而非「MST 成功」。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
): Step[] {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  const edgesSorted = [...edgeList].sort((a, b) => a[2] - b[2])
  const mst: [number, number, number][] = []
  const steps: Step[] = []
  const DOC = 'kruskal.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const nodes = layoutGraph(n)
  const allEdges = edgeList.map(([u, v, w]) => ({
    id: undirectedEdgeId(u, v),
    from: u,
    to: v,
    weight: w,
  }))
  const accepted = new Set<string>()
  const rejected = new Set<string>()
  const edgeRoles: Record<string, EdgeRole> = {}

  const snap = (
    message: string,
    checking?: string,
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    const roles = { ...edgeRoles }
    for (const e of accepted) roles[e] = 'accepted'
    for (const e of rejected) roles[e] = 'rejected'
    const highlightEdgeIds = [
      ...Array.from(accepted),
      ...(checking ? [checking] : []),
    ]
    if (checking) roles[checking] = accepted.has(checking)
      ? 'accepted'
      : rejected.has(checking)
        ? 'rejected'
        : 'checking'
    steps.push({
      id: id++,
      message,
      arrays: {
        parent: [...parent],
        mst: mst.map(([u, v, w]) => `${u}-${v}(${w})`),
      },
      vars,
      graph: {
        nodes,
        edges: allEdges,
        highlightNodes: [],
        highlightEdgeIds,
        edgeRoles: roles,
      },
      result,
      codeRefs: codeRefs ?? ref('sort'),
    })
  }

  snap('边按权升序排序', undefined, {
    edges: edgesSorted.map(([u, v, w]) => `${u}-${v}:${w}`).join(', '),
  })
  for (const [u, v, w] of edgesSorted) {
    const eid = undirectedEdgeId(u, v)
    const pu = find(u)
    const pv = find(v)
    snap(`考察边 ${u}-${v} (w=${w})，根 ${pu} vs ${pv}`, eid, { u, v, w, pu, pv })
    if (pu !== pv) {
      parent[pu] = pv
      mst.push([u, v, w])
      accepted.add(eid)
      edgeRoles[eid] = 'accepted'
      snap(`加入树/森林，union(${pu},${pv})`, eid, {
        mstSize: mst.length,
        cost: mst.reduce((s, e) => s + e[2], 0),
      })
    } else {
      rejected.add(eid)
      edgeRoles[eid] = 'rejected'
      snap(`成环，跳过`, eid, { skipped: `${u}-${v}` })
    }
  }
  const cost = mst.reduce((s, e) => s + e[2], 0)
  const isTree = mst.length === n - 1
  if (isTree) {
    snap(`完成：最小生成树，总权 = ${cost}`, undefined, { answer: cost, spanning: true }, {
      ok: true,
      kind: 'mst',
      edges: mst,
      mst,
      cost,
      totalWeight: cost,
      connected: true,
      isTree: true,
    })
  } else {
    snap(
      `图不连通：得到最小生成森林（${mst.length} 条边，期望 MST 为 ${n - 1} 条）。总权 = ${cost}。并非单棵生成树。`,
      undefined,
      { answer: cost, spanning: false, forestEdges: mst.length },
      {
        ok: true,
        kind: 'forest',
        edges: mst,
        mst,
        cost,
        totalWeight: cost,
        expectedTreeEdges: n - 1,
        connected: false,
        isTree: false,
      },
    )
  }
  return steps
}
