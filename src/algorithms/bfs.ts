import type { Step } from '../types/step'

export const meta = {
  id: 'bfs',
  title: '广度优先搜索 (BFS)',
  complexity: '时间 O(V+E)，空间 O(V)',
  description: '从源点层层扩展，使用队列保证先访问近邻。',
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
}

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 200, y: 40 },
  1: { x: 80, y: 120 },
  2: { x: 320, y: 120 },
  3: { x: 40, y: 220 },
  4: { x: 160, y: 220 },
  5: { x: 320, y: 220 },
}

export function generateSteps(
  _arr: number[],
  adj = meta.defaultAdj,
  start = meta.defaultStart,
): Step[] {
  const nodes = Object.keys(adj).map(Number)
  const edges: { from: number; to: number; directed?: boolean }[] = []
  const seenE = new Set<string>()
  for (const u of nodes) {
    for (const v of adj[u] || []) {
      const key = u < v ? `${u}-${v}` : `${v}-${u}`
      if (!seenE.has(key)) {
        seenE.add(key)
        edges.push({ from: u, to: v })
      }
    }
  }
  const visited: boolean[] = nodes.map(() => false)
  const order: number[] = []
  const queue: number[] = []
  const steps: Step[] = []
  let id = 0

  const graph = (hn: number[] = [], he: [number, number][] = []) => ({
    nodes: nodes.map((n) => ({ id: n, label: String(n), ...POS[n] })),
    edges,
    highlightNodes: hn,
    highlightEdges: he,
  })

  const snap = (message: string, hn: number[] = [], he: [number, number][] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    steps.push({
      id: id++,
      message,
      arrays: {
        visited: visited.map((v) => (v ? 1 : 0)),
        queue: [...queue],
        order: [...order],
      },
      highlights: { visited: hn, queue: queue.map((_, i) => i) },
      vars,
      graph: graph(hn, he),
    })
  }

  queue.push(start)
  visited[start] = true
  snap(`入队起点 ${start}`, [start], [], { start, front: start })
  while (queue.length) {
    const u = queue.shift()!
    order.push(u)
    snap(`出队访问 ${u}`, [u], [], { u, queueSize: queue.length })
    for (const v of adj[u] || []) {
      snap(`检查边 ${u}→${v}`, [u, v], [[u, v]], { u, v, visited_v: visited[v] })
      if (!visited[v]) {
        visited[v] = true
        queue.push(v)
        snap(`发现 ${v}，入队`, [v], [[u, v]], { u, v })
      }
    }
  }
  snap(`BFS 完成，顺序: [${order.join(',')}]`, order, [], { order: order.join(',') })
  return steps
}
