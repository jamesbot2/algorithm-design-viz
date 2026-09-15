import type { GraphAlgoId, GraphDraft, GraphPreset } from './types'
import * as dijkstra from '../../algorithms/dijkstra'
import * as kruskal from '../../algorithms/kruskal'
import * as prim from '../../algorithms/prim'
import * as bellmanFord from '../../algorithms/bellmanFord'
import * as floyd from '../../algorithms/floyd'
import * as bfs from '../../algorithms/bfs'
import { floydMatrixToEdges } from './validate'

function bfsEdgesFromAdj(adj: Record<number, number[]>): GraphDraft {
  const ids = Object.keys(adj).map(Number).sort((a, b) => a - b)
  const n = Math.max(...ids, 0) + 1
  const edges: [number, number, number][] = []
  const seen = new Set<string>()
  for (const u of ids) {
    for (const v of adj[u] ?? []) {
      const a = Math.min(u, v)
      const b = Math.max(u, v)
      const key = `${a}-${b}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([a, b, 1])
      }
    }
  }
  return { n, edges, directed: false, start: bfs.meta.defaultStart }
}

export const GRAPH_PRESETS: Record<GraphAlgoId, GraphPreset[]> = {
  bfs: [
    { id: 'bfs-default', label: '默认无向图', draft: bfsEdgesFromAdj(bfs.meta.defaultAdj) },
    {
      id: 'bfs-path',
      label: '路径图',
      draft: {
        n: 5,
        edges: [
          [0, 1, 1],
          [1, 2, 1],
          [2, 3, 1],
          [3, 4, 1],
        ],
        directed: false,
        start: 0,
      },
    },
  ],
  dijkstra: [
    {
      id: 'dij-default',
      label: '默认非负有向',
      draft: {
        n: dijkstra.meta.defaultN,
        edges: [...dijkstra.meta.defaultEdges],
        directed: true,
        start: dijkstra.meta.defaultStart,
      },
    },
    {
      id: 'dij-small',
      label: '小图对照',
      draft: {
        n: 4,
        edges: [
          [0, 1, 1],
          [0, 2, 4],
          [1, 2, 2],
          [1, 3, 6],
          [2, 3, 3],
        ],
        directed: true,
        start: 0,
      },
    },
  ],
  dijkstraHeap: [
    {
      id: 'dijh-default',
      label: '默认非负有向',
      draft: {
        n: dijkstra.meta.defaultN,
        edges: [...dijkstra.meta.defaultEdges],
        directed: true,
        start: dijkstra.meta.defaultStart,
      },
    },
    {
      id: 'dijh-small',
      label: '小图对照',
      draft: {
        n: 4,
        edges: [
          [0, 1, 1],
          [0, 2, 4],
          [1, 2, 2],
          [1, 3, 6],
          [2, 3, 3],
        ],
        directed: true,
        start: 0,
      },
    },
  ],
  kruskal: [
    {
      id: 'kruskal-default',
      label: '默认 MST',
      draft: {
        n: kruskal.meta.defaultN,
        edges: [...kruskal.meta.defaultEdges],
        directed: false,
        start: 0,
      },
    },
    {
      id: 'kruskal-forest',
      label: '不连通（森林）',
      draft: {
        n: 4,
        edges: [
          [0, 1, 1],
          [2, 3, 2],
        ],
        directed: false,
        start: 0,
      },
    },
  ],
  prim: [
    {
      id: 'prim-default',
      label: '默认 Prim',
      draft: {
        n: prim.meta.defaultN,
        edges: [...prim.meta.defaultEdges],
        directed: false,
        start: prim.meta.defaultStart,
      },
    },
  ],
  bellmanFord: [
    {
      id: 'bf-default',
      label: '默认含负权',
      draft: {
        n: bellmanFord.meta.defaultN,
        edges: [...bellmanFord.meta.defaultEdges],
        directed: true,
        start: bellmanFord.meta.defaultStart,
      },
    },
  ],
  floyd: [
    (() => {
      const converted = floydMatrixToEdges(floyd.meta.defaultMatrix)
      return {
        id: 'floyd-default',
        label: '默认全源',
        draft: { ...converted, start: 0 },
      }
    })(),
  ],
}

export function defaultDraftFor(algoId: GraphAlgoId): GraphDraft {
  const list = GRAPH_PRESETS[algoId]
  return structuredClone(list[0]!.draft)
}
