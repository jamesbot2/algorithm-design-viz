import { memo, useId, useMemo } from 'react'
import type { EdgeRole, GraphState, NodeRole } from '../types/step'
import { ensureNodeLayout } from '../utils/layoutGraph'
import {
  curveControl,
  expandFit,
  fitViewBox,
  insetEndpoints,
  parallelChannelOffset,
  selfLoopPath,
  undirectedKey,
  type FitBox,
} from '../utils/graphEdgeGeometry'

const ROLE_CLASS: Record<EdgeRole, string> = {
  checking: 'edge checking',
  accepted: 'edge accepted',
  rejected: 'edge rejected',
  tree: 'edge tree',
  path: 'edge path',
  relaxing: 'edge relaxing',
}

function nodeClass(id: string, hlN: Set<string>, roles?: Record<string, NodeRole>): string {
  const role = roles?.[id]
  if (role) return `node role-${role}`
  if (hlN.has(id)) return 'node hot'
  return 'node'
}

const NODE_R = 16
const ARROW_PAD = 20
const LABEL_PAD = 10

function GraphView({ graph }: { graph: GraphState }) {
  const uid = useId().replace(/:/g, '')
  const markerId = `arrow-${uid}`
  const markerAccepted = `arrow-acc-${uid}`

  const nodes = useMemo(() => ensureNodeLayout(graph.nodes), [graph.nodes])
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [String(n.id), n])), [nodes])
  const hlN = useMemo(() => new Set((graph.highlightNodes ?? []).map(String)), [graph.highlightNodes])

  const hlEdgeIds = useMemo(() => {
    const set = new Set<string>(graph.highlightEdgeIds ?? [])
    for (const [a, b] of graph.highlightEdges ?? []) {
      set.add(`${a}->${b}`)
      set.add(`${a}-${b}`)
      const sa = String(a)
      const sb = String(b)
      set.add(sa <= sb ? `${sa}-${sb}` : `${sb}-${sa}`)
    }
    return set
  }, [graph.highlightEdgeIds, graph.highlightEdges])

  const siblingsByPair = useMemo(() => {
    const m = new Map<string, { id: string; from: string; to: string }[]>()
    for (const e of graph.edges) {
      const a = String(e.from)
      const b = String(e.to)
      if (a === b) continue
      const key = undirectedKey(a, b)
      const list = m.get(key) ?? []
      list.push({ id: e.id, from: a, to: b })
      m.set(key, list)
    }
    return m
  }, [graph.edges])

  const inferredRoles = useMemo(() => {
    if (graph.nodeRoles && Object.keys(graph.nodeRoles).length) return graph.nodeRoles
    const roles: Record<string, NodeRole> = {}
    for (const e of graph.edges) {
      const role = graph.edgeRoles?.[e.id]
      if (role === 'accepted' || role === 'tree') {
        const a = String(e.from)
        const b = String(e.to)
        if (!hlN.has(a)) roles[a] = roles[a] ?? 'settled'
        if (!hlN.has(b)) roles[b] = roles[b] ?? 'settled'
      }
    }
    for (const id of hlN) roles[id] = 'current'
    return roles
  }, [graph.nodeRoles, graph.edges, graph.edgeRoles, hlN])

  const showNegWarn =
    graph.warning === 'negative_cycle' ||
    Object.values(inferredRoles).some((r) => r === 'neg-cycle')

  const edgeRender = useMemo(() => {
    return graph.edges.map((e) => {
      const a = nodeMap.get(String(e.from))
      const b = nodeMap.get(String(e.to))
      if (!a || !b) return null
      const pa = String(e.from)
      const pb = String(e.to)
      const eid = e.id
      const role = graph.edgeRoles?.[eid]
      const hot = hlEdgeIds.has(eid) || !!role
      const cls = role ? ROLE_CLASS[role] : hot ? 'edge hot' : 'edge'

      if (pa === pb) {
        // Self-loops: support with explicit loop geometry (not silently dropped)
        const loop = selfLoopPath(a.x!, a.y!, NODE_R, 30)
        return {
          eid,
          cls,
          pathD: loop.d,
          labelX: loop.labelX,
          labelY: loop.labelY,
          weight: e.weight,
          directed: e.directed,
          role,
          selfLoop: true,
        }
      }

      const siblings = siblingsByPair.get(undirectedKey(pa, pb)) ?? []
      const offset = parallelChannelOffset(eid, pa, pb, siblings, 18)
      const inset = insetEndpoints(a.x!, a.y!, b.x!, b.y!, NODE_R, ARROW_PAD)
      let pathD: string
      let labelX: number
      let labelY: number
      if (Math.abs(offset) > 0.5 || siblings.length > 1) {
        const c = curveControl(inset.ax, inset.ay, inset.bx, inset.by, offset)
        pathD = `M ${inset.ax} ${inset.ay} Q ${c.x} ${c.y} ${inset.bx} ${inset.by}`
        // Offset label along independent channel so reverse weights do not overlap
        labelX = c.x
        labelY = c.y - 4
      } else {
        pathD = `M ${inset.ax} ${inset.ay} L ${inset.bx} ${inset.by}`
        labelX = (inset.ax + inset.bx) / 2
        labelY = (inset.ay + inset.by) / 2 - 6
      }

      return {
        eid,
        cls,
        pathD,
        labelX,
        labelY,
        weight: e.weight,
        directed: e.directed,
        role,
        selfLoop: false,
      }
    })
  }, [graph.edges, graph.edgeRoles, hlEdgeIds, nodeMap, siblingsByPair])

  const viewBox = useMemo(() => {
    let box: FitBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    for (const n of nodes) {
      box = expandFit(box, n.x!, n.y!, NODE_R + 8)
    }
    for (const er of edgeRender) {
      if (!er) continue
      box = expandFit(box, er.labelX, er.labelY, LABEL_PAD)
    }
    return fitViewBox(box, 520, 280, 32)
  }, [nodes, edgeRender])

  return (
    <div className="graph-view" data-testid="graph-view">
      {showNegWarn && (
        <p className="graph-neg-warning" role="status">
          负环警告：当前距离不构成合法最短路（Bellman-Ford / Floyd 检测）。
        </p>
      )}
      <svg viewBox={viewBox} className="graph-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10a37f" />
          </marker>
          <marker
            id={markerAccepted}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-accepted, #22c55e)" />
          </marker>
        </defs>
        {edgeRender.map((er) => {
          if (!er) return null
          const marker =
            er.directed
              ? er.role === 'accepted' || er.role === 'tree'
                ? `url(#${markerAccepted})`
                : `url(#${markerId})`
              : undefined
          return (
            <g key={er.eid} data-edge-id={er.eid} data-self-loop={er.selfLoop ? '1' : '0'}>
              <path d={er.pathD} className={er.cls} fill="none" markerEnd={marker} />
              {er.weight !== undefined && (
                <text x={er.labelX} y={er.labelY} className="edge-label" data-edge-label={er.eid}>
                  {er.weight}
                </text>
              )}
            </g>
          )
        })}
        {nodes.map((n) => {
          const id = String(n.id)
          const cls = nodeClass(id, hlN, inferredRoles)
          const scale = cls.includes('role-current') || cls.includes('hot') ? 1.12 : 1
          return (
            <g key={id} style={{ transform: `scale(${scale})`, transformOrigin: `${n.x}px ${n.y}px` }}>
              <circle cx={n.x} cy={n.y} r={NODE_R} className={cls} />
              <text x={n.x} y={(n.y ?? 0) + 4} textAnchor="middle" className="node-label">
                {n.label ?? n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default memo(GraphView)
