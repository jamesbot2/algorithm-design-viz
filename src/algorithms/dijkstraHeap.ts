import type { EdgeRole, Step } from '../types/step'
import { directedEdgeId } from '../utils/edgeId'
import { layoutGraph } from '../utils/layoutGraph'

export const meta = {
  id: 'dijkstraHeap',
  title: '堆优化 Dijkstra',
  complexity: '时间 O((V+E) log V)，空间 O(V+E)',
  description:
    '二叉堆（懒删除）实现：入堆后不 decrease-key，弹出时若 dist≠堆中记录则丢弃陈旧项。负权边拒绝。可与朴素 Dijkstra 对照。',
  code: `dist[s]=0; heap.push({s,0})
while heap:
  (u,d) = pop_min()
  if d != dist[u]: continue  // 过滤陈旧
  for (v,w) in adj[u]:
    if dist[u]+w < dist[v]:
      dist[v]=dist[u]+w; parent[v]=u
      heap.push({v, dist[v]})`,
  defaultEdges: [
    [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5],
    [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3],
  ] as [number, number, number][],
  defaultN: 6,
  defaultStart: 0,
  implName: 'binaryHeapLazyDijkstra',
  implVersion: '1.0.0',
  timeComplexity: 'O((V+E) log V)（懒删除二叉堆）',
  spaceComplexity: 'O(V + E)',
  spaceNotes: 'dist/parent；堆可含陈旧项 O(E)。',
  inputAssumptions: '边权须 ≥ 0；有向边；不可达 dist=∞。',
  statDefinitions: 'stats.comparisons≈堆弹出比较；writes=松弛次数。',
}

type HeapItem = { u: number; d: number }

function heapPush(h: HeapItem[], item: HeapItem) {
  h.push(item)
  let i = h.length - 1
  while (i > 0) {
    const p = (i - 1) >> 1
    if (h[p]!.d <= h[i]!.d) break
    ;[h[p], h[i]] = [h[i]!, h[p]!]
    i = p
  }
}

function heapPop(h: HeapItem[]): HeapItem | undefined {
  if (!h.length) return undefined
  const top = h[0]!
  const last = h.pop()!
  if (!h.length) return top
  h[0] = last
  let i = 0
  for (;;) {
    const l = i * 2 + 1
    const r = l + 1
    let best = i
    if (l < h.length && h[l]!.d < h[best]!.d) best = l
    if (r < h.length && h[r]!.d < h[best]!.d) best = r
    if (best === i) break
    ;[h[i], h[best]] = [h[best]!, h[i]!]
    i = best
  }
  return top
}

/** Pure solve without steps (for experiments / compare). */
export function solveDijkstraHeap(
  edgeList: [number, number, number][],
  n: number,
  start: number,
): {
  ok: boolean
  error?: string
  dist: (number | null)[]
  parent: number[]
  relaxes: number
  pops: number
  staleSkips: number
} {
  const neg = edgeList.find(([, , w]) => w < 0)
  if (neg) {
    return {
      ok: false,
      error: 'negative_weight',
      dist: [],
      parent: [],
      relaxes: 0,
      pops: 0,
      staleSkips: 0,
    }
  }
  const adj: { v: number; w: number }[][] = Array.from({ length: n }, () => [])
  for (const [u, v, w] of edgeList) adj[u]!.push({ v, w })
  const dist = Array(n).fill(Infinity)
  const parent = Array(n).fill(-1)
  dist[start] = 0
  const heap: HeapItem[] = []
  heapPush(heap, { u: start, d: 0 })
  let relaxes = 0
  let pops = 0
  let staleSkips = 0
  while (heap.length) {
    const cur = heapPop(heap)!
    pops++
    if (cur.d !== dist[cur.u]) {
      staleSkips++
      continue
    }
    for (const { v, w } of adj[cur.u]!) {
      if (dist[cur.u]! + w < dist[v]!) {
        dist[v] = dist[cur.u]! + w
        parent[v] = cur.u
        relaxes++
        heapPush(heap, { u: v, d: dist[v]! })
      }
    }
  }
  return {
    ok: true,
    dist: dist.map((d) => (d === Infinity ? null : d)),
    parent,
    relaxes,
    pops,
    staleSkips,
  }
}

export function reconstructPath(parent: number[], target: number): number[] {
  if (target < 0 || target >= parent.length) return []
  const path: number[] = []
  let cur = target
  const guard = parent.length + 2
  let steps = 0
  while (cur !== -1 && steps++ < guard) {
    path.push(cur)
    if (parent[cur] === -1) break
    cur = parent[cur]!
  }
  path.reverse()
  return path
}

export function generateSteps(
  _arr: number[],
  edgeList = meta.defaultEdges,
  n = meta.defaultN,
  start = meta.defaultStart,
  opts?: { heavyTrace?: boolean },
): Step[] {
  const heavy = opts?.heavyTrace !== false
  const steps: Step[] = []
  const DOC = 'dijkstraHeap.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const PHASE_ANCHOR: Record<string, string> = { init: "init", extract: "extract", stale: "stale", relax: "relax", done: "done", error: "init" }
  let id = 0

  const neg = edgeList.find(([, , w]) => w < 0)
  if (neg) {
    steps.push({
      id: id++,
      message: `拒绝执行：边 ${neg[0]}→${neg[1]} 权 ${neg[2]} < 0。`,
      vars: { error: 'negative_weight' },
      phase: 'error',
      result: { ok: false, error: 'negative_weight', edge: neg },
    })
    return steps
  }

  const adj: { v: number; w: number; id: string }[][] = Array.from({ length: n }, () => [])
  const edges = edgeList.map(([u, v, w]) => {
    const eid = directedEdgeId(u, v)
    adj[u]!.push({ v, w, id: eid })
    return { id: eid, from: u, to: v, weight: w, directed: true as const }
  })
  const nodes = layoutGraph(n)
  const dist = Array(n).fill(Infinity)
  const parent = Array(n).fill(-1)
  dist[start] = 0
  const heap: HeapItem[] = []
  heapPush(heap, { u: start, d: 0 })
  const accepted = new Set<string>()
  const edgeRoles: Record<string, EdgeRole> = {}
  let comparisons = 0
  let writes = 0
  let staleSkips = 0

  const snap = (
    message: string,
    hn: number[] = [],
    checking?: string,
    vars: Record<string, string | number | boolean | null> = {},
    phase?: string,
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    if (!heavy && !result && phase !== 'init' && phase !== 'done' && phase !== 'error') return
    const roles: Record<string, EdgeRole> = { ...edgeRoles }
    for (const eid of accepted) roles[eid] = roles[eid] ?? 'accepted'
    const highlightEdgeIds = [...Array.from(accepted), ...(checking ? [checking] : [])]
    if (checking) roles[checking] = 'checking'
    steps.push({
      id: id++,
      message,
      phase,
      arrays: {
        dist: dist.map((d) => (d === Infinity ? '∞' : d)),
        parent: parent.map((p) => (p < 0 ? '-' : p)),
      },
      highlights: { dist: hn },
      vars: { ...vars, heapSize: heap.length, staleSkips },
      stats: { comparisons, writes },
      graph: {
        nodes,
        edges,
        highlightNodes: hn,
        highlightEdgeIds,
        edgeRoles: roles,
      },
      result,
      codeRefs: codeRefs ?? (phase && PHASE_ANCHOR[phase] ? ref(PHASE_ANCHOR[phase]) : undefined),
    })
  }

  snap(`初始化：dist[${start}]=0，堆含源点`, [start], undefined, { start }, 'init')
  while (heap.length) {
    const cur = heapPop(heap)!
    comparisons++
    if (cur.d !== dist[cur.u]) {
      staleSkips++
      if (heavy) {
        snap(`丢弃陈旧堆项 (${cur.u}, d=${cur.d})；真实 dist=${dist[cur.u] === Infinity ? '∞' : dist[cur.u]}`, [cur.u], undefined, {
          u: cur.u,
          stale: true,
        }, 'stale')
      }
      continue
    }
    snap(`弹出确定顶点 ${cur.u}（dist=${cur.d}）`, [cur.u], undefined, { u: cur.u, dist_u: cur.d }, 'extract')
    for (const { v, w, id: eid } of adj[cur.u]!) {
      if (heavy) {
        snap(`检查边 ${cur.u}→${v} (w=${w})`, [cur.u, v], eid, {
          u: cur.u,
          v,
          w,
        }, 'relax')
      }
      if (dist[cur.u]! + w < dist[v]!) {
        dist[v] = dist[cur.u]! + w
        parent[v] = cur.u
        writes++
        accepted.add(eid)
        edgeRoles[eid] = 'accepted'
        heapPush(heap, { u: v, d: dist[v]! })
        if (heavy) {
          snap(`松弛：dist[${v}]=${dist[v]}，入堆`, [v], eid, { v, newDist: dist[v]! }, 'relax')
        }
      }
    }
  }

  const distOut = dist.map((d) => (d === Infinity ? null : d))
  snap(
    '堆优化 Dijkstra 完成',
    [],
    undefined,
    {
      dist: dist.map((d) => (d === Infinity ? '∞' : d)).join(','),
      staleSkips,
    },
    'done',
    {
      ok: true,
      dist: distOut,
      parent: [...parent],
      impl: 'binaryHeapLazyDijkstra',
      staleSkips,
      start,
    },
  )
  return steps
}
