import type { EdgeRole, Step } from '../types/step'
import { undirectedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'prim',
  title: 'Prim 最小生成树',
  complexity: '时间 O(V²)，空间 O(V+E)',
  description:
    '从起点生长：每轮 O(V) 选 key 最小未加入顶点（稠密图朴素实现，非二叉堆）。不连通则仅覆盖可达分量。',
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
  implName: 'primDenseScan',
  implVersion: '1.1.0',
  timeComplexity: 'O(V² + E)（每轮扫 V 选点 + 邻接更新）',
  spaceComplexity: 'O(V + E)',
  spaceNotes: 'key/parent/inMST；邻接表。非堆优化版。',
  inputAssumptions: '无向非负权；若从 start 不可达全部顶点，报告部分树/森林而非 MST 成功。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
): Step[] {
  const adj: { v: number; w: number; id: string }[][] = Array.from({ length: n }, () => [])
  for (const [u, v, w] of edgeList) {
    const eid = undirectedEdgeId(u, v)
    adj[u].push({ v, w, id: eid })
    adj[v].push({ v: u, w, id: eid })
  }
  const key = Array(n).fill(Infinity)
  const parent = Array(n).fill(-1)
  const inMST = Array(n).fill(false)
  key[start] = 0
  const steps: Step[] = []
  let id = 0
  const nodes = layoutGraph(n)
  const allEdges = edgeList.map(([u, v, w]) => ({
    id: undirectedEdgeId(u, v),
    from: u,
    to: v,
    weight: w,
  }))
  const treeEdges = new Set<string>()
  const edgeRoles: Record<string, EdgeRole> = {}

  const snap = (
    message: string,
    hn: number[] = [],
    checking?: string,
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
  ) => {
    const roles = { ...edgeRoles }
    for (const e of treeEdges) roles[e] = 'tree'
    const highlightEdgeIds = [...Array.from(treeEdges), ...(checking ? [checking] : [])]
    if (checking) roles[checking] = treeEdges.has(checking) ? 'tree' : 'checking'
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
        nodes,
        edges: allEdges,
        highlightNodes: hn,
        highlightEdgeIds,
        edgeRoles: roles,
      },
      result,
    })
  }

  snap(`从顶点 ${start} 开始`, [start], undefined, { start })
  let added = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = Infinity
    for (let i = 0; i < n; i++) {
      if (!inMST[i] && key[i] < best) {
        best = key[i]
        u = i
      }
    }
    if (u < 0 || best === Infinity) break
    inMST[u] = true
    added++
    const treeEid = parent[u] >= 0 ? undirectedEdgeId(parent[u], u) : undefined
    if (treeEid) {
      treeEdges.add(treeEid)
      edgeRoles[treeEid] = 'tree'
    }
    snap(`加入顶点 ${u}（key=${key[u]}）`, [u], treeEid, { u })
    for (const { v, w, id: eid } of adj[u]) {
      snap(`检查边 ${u}-${v} (w=${w})`, [u, v], eid, {
        u,
        v,
        w,
        key_v: key[v] === Infinity ? '∞' : key[v],
      })
      if (!inMST[v] && w < key[v]) {
        key[v] = w
        parent[v] = u
        snap(`更新 key[${v}]=${w}, parent[${v}]=${u}`, [v], eid, { v, key: w })
      }
    }
  }
  const connected = added === n
  if (connected) {
    snap('Prim 完成：得到生成树', [], undefined, { spanning: true }, {
      ok: true,
      kind: 'mst',
      vertices: added,
    })
  } else {
    snap(
      `图从 ${start} 不连通：仅覆盖 ${added}/${n} 个顶点，无生成树（得到部分树/森林分量）。`,
      [],
      undefined,
      { spanning: false, covered: added },
      { ok: true, kind: 'partial', covered: added, n },
    )
  }
  return steps
}
