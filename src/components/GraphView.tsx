import { memo, useId, useMemo } from 'react'
import type { EdgeRole, GraphState, NodeRole } from '../types/step'
import { ensureNodeLayout } from '../utils/layoutGraph'

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
  // Infer settled if not highlighted but present in roles map keys as settled elsewhere — skip
  return 'node'
}

function GraphView({ graph }: { graph: GraphState }) {
  const uid = useId().replace(/:/g, '')
  const markerId = `arrow-${uid}`
  const markerAccepted = `arrow-acc-${uid}`
  const w = 520
  const h = 280

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

  const pairCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of graph.edges) {
      const a = String(e.from)
      const b = String(e.to)
      const key = a <= b ? `${a}|${b}` : `${b}|${a}`
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return m
  }, [graph.edges])

  const inferredRoles = useMemo(() => {
    if (graph.nodeRoles && Object.keys(graph.nodeRoles).length) return graph.nodeRoles
    // Light inference: highlight = current; endpoints of accepted/tree = settled
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

  return (
    <div className="graph-view">
      {showNegWarn && (
        <p className="graph-neg-warning" role="status">
          负环警告：当前距离不构成合法最短路（Bellman-Ford / Floyd 检测）。
        </p>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="graph-svg">
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="18" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10a37f" />
          </marker>
          <marker
            id={markerAccepted}
            markerWidth="8"
            markerHeight="8"
            refX="18"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-accepted, #22c55e)" />
          </marker>
        </defs>
        {graph.edges.map((e) => {
          const a = nodeMap.get(String(e.from))
          const b = nodeMap.get(String(e.to))
          if (!a || !b) return null
          const ax = a.x!
          const ay = a.y!
          const bx = b.x!
          const by = b.y!
          const eid = e.id
          const role = graph.edgeRoles?.[eid]
          const hot = hlEdgeIds.has(eid) || !!role
          const cls = role ? ROLE_CLASS[role] : hot ? 'edge hot' : 'edge'

          const pa = String(e.from)
          const pb = String(e.to)
          const pairKey = pa <= pb ? `${pa}|${pb}` : `${pb}|${pa}`
          const bidirectional = (pairCount.get(pairKey) ?? 0) >= 2 && pa !== pb

          let pathD: string
          let labelX: number
          let labelY: number
          if (bidirectional) {
            const dx = bx - ax
            const dy = by - ay
            const len = Math.hypot(dx, dy) || 1
            const nx = -dy / len
            const ny = dx / len
            const sign = pa < pb ? 1 : -1
            const curve = 18 * sign
            const cx = (ax + bx) / 2 + nx * curve
            const cy = (ay + by) / 2 + ny * curve
            pathD = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`
            labelX = cx
            labelY = cy - 4
          } else {
            pathD = `M ${ax} ${ay} L ${bx} ${by}`
            labelX = (ax + bx) / 2
            labelY = (ay + by) / 2 - 6
          }

          const marker =
            e.directed
              ? role === 'accepted' || role === 'tree'
                ? `url(#${markerAccepted})`
                : `url(#${markerId})`
              : undefined

          return (
            <g key={eid}>
              <path d={pathD} className={cls} fill="none" markerEnd={marker} />
              {e.weight !== undefined && (
                <text x={labelX} y={labelY} className="edge-label">
                  {e.weight}
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
              <circle cx={n.x} cy={n.y} r={16} className={cls} />
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
