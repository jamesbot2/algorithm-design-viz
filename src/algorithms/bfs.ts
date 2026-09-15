import type { EdgeRole, Step } from '../types/step'
import { undirectedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'bfs',
  title: '广度优先搜索 (BFS)',
  complexity: '时间 O(V+E)，空间 O(V)',
  description: '从源点层层扩展，使用队列保证先访问近邻。无向图邻接表实现。',
  code: `queue ← [s]; visited[s]=true
while queue not empty:
  u = dequeue()
  for v in adj[u]:
    if not visited[v]:
      visit; enqueue(v)`,
  defaultAdj: {
    0: [1, 2],
    1: [0, 3, 4],
    2: [0, 5],
    3: [1],
    4: [1, 5],
    5: [2, 4],
  } as Record<number, number[]>,
  defaultStart: 0,
  implName: 'bfsQueueAdj',
  implVersion: '1.1.0',
  timeComplexity: 'O(V+E)',
  spaceComplexity: 'O(V)',
  spaceNotes: 'visited + queue + order；邻接表另计。可视化树边累加保留。',
  inputAssumptions: '默认无向图；邻接表可含双向边。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(
  _arr: number[],
  adj = meta.defaultAdj,
  start = meta.defaultStart,
): Step[] {
  const nodesIdx = Object.keys(adj).map(Number).sort((a, b) => a - b)
  const n = nodesIdx.length
  const layout = layoutGraph(n)
  const nodePos = new Map(nodesIdx.map((id, i) => [id, layout[i]!]))

  const edges: { id: string; from: number; to: number }[] = []
  const seenE = new Set<string>()
  for (const u of nodesIdx) {
    for (const v of adj[u] || []) {
      const eid = undirectedEdgeId(u, v)
      if (!seenE.has(eid)) {
        seenE.add(eid)
        edges.push({ id: eid, from: u, to: v })
      }
    }
  }

  const visited: boolean[] = Array(Math.max(...nodesIdx, 0) + 1).fill(false)
  const order: number[] = []
  const queue: number[] = []
  const steps: Step[] = []
  let id = 0
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
    if (checking) roles[checking] = checking && treeEdges.has(checking) ? 'tree' : 'checking'
    steps.push({
      id: id++,
      message,
      arrays: {
        visited: nodesIdx.map((i) => (visited[i] ? 1 : 0)),
        queue: [...queue],
        order: [...order],
      },
      highlights: { visited: hn },
      vars,
      graph: {
        nodes: nodesIdx.map((nid) => ({
          id: nid,
          label: String(nid),
          x: nodePos.get(nid)?.x,
          y: nodePos.get(nid)?.y,
        })),
        edges,
        highlightNodes: hn,
        highlightEdgeIds,
        edgeRoles: roles,
      },
      result,
    })
  }

  queue.push(start)
  visited[start] = true
  snap(`入队起点 ${start}`, [start], undefined, { start, front: start })
  while (queue.length) {
    const u = queue.shift()!
    order.push(u)
    snap(`出队访问 ${u}`, [u], undefined, { u, queueSize: queue.length })
    for (const v of adj[u] || []) {
      const eid = undirectedEdgeId(u, v)
      snap(`检查边 ${u}-${v}`, [u, v], eid, { u, v, visited_v: visited[v] })
      if (!visited[v]) {
        visited[v] = true
        queue.push(v)
        treeEdges.add(eid)
        edgeRoles[eid] = 'tree'
        snap(`发现 ${v}，入队`, [v], eid, { u, v })
      } else {
        edgeRoles[eid] = edgeRoles[eid] ?? 'rejected'
      }
    }
  }
  snap(`BFS 完成，顺序: [${order.join(',')}]`, order, undefined, { order: order.join(',') }, {
    ok: true,
    order: [...order],
  })
  return steps
}
