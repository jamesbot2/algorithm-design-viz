import { useId, useMemo } from 'react'
import type { EdgeRole, GraphState } from '../types/step'
import { ensureNodeLayout } from '../utils/layoutGraph'

const ROLE_CLASS: Record<EdgeRole, string> = {
  checking: 'edge checking',
  accepted: 'edge accepted',
  rejected: 'edge rejected',
  tree: 'edge tree',
  path: 'edge path',
  relaxing: 'edge relaxing',
}

export default function GraphView({ graph }: { graph: GraphState }) {
  const uid = useId().replace(/:/g, '')
  const markerId = `arrow-${uid}`
  const w = 520
  const h = 280

  const nodes = useMemo(() => ensureNodeLayout(graph.nodes), [graph.nodes])
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [String(n.id), n])), [nodes])
  const hlN = useMemo(() => new Set((graph.highlightNodes ?? []).map(String)), [graph.highlightNodes])

  const hlEdgeIds = useMemo(() => {
    const set = new Set<string>(graph.highlightEdgeIds ?? [])
    // legacy pair highlights → match directed or undirected id forms
    for (const [a, b] of graph.highlightEdges ?? []) {
      set.add(`${a}->${b}`)
      set.add(`${a}-${b}`)
      const sa = String(a)
      const sb = String(b)
      set.add(sa <= sb ? `${sa}-${sb}` : `${sb}-${sa}`)
    }
    return set
  }, [graph.highlightEdgeIds, graph.highlightEdges])

  // Detect bidirectional pairs for curved offsets
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

  return (
    <div className="graph-view">
      <svg viewBox={`0 0 ${w} ${h}`} className="graph-svg">
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="18" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10a37f" />
          </marker>
        </defs>
        {graph.edges.map((e) => {
          const a = nodeMap.get(String(e.from))
          const b = nodeMap.get(String(e.to))
          if (!a || !b) return null
          const ax = a.x
          const ay = a.y
          const bx = b.x
          const by = b.y
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
            // Offset direction depends on from→to lexicographic to separate opposites
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

          return (
            <g key={eid}>
              <path
                d={pathD}
                className={cls}
                fill="none"
                markerEnd={e.directed ? `url(#${markerId})` : undefined}
              />
              {e.weight !== undefined && (
                <text x={labelX} y={labelY} className="edge-label">
                  {e.weight}
                </text>
              )}
            </g>
          )
        })}
        {nodes.map((n) => {
          const hot = hlN.has(String(n.id))
          return (
            <g key={String(n.id)}>
              <circle cx={n.x} cy={n.y} r={16} className={hot ? 'node hot' : 'node'} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" className="node-label">
                {n.label ?? n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
