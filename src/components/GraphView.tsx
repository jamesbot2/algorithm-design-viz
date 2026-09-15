import type { GraphState } from '../types/step'

export default function GraphView({ graph }: { graph: GraphState }) {
  const w = 520, h = 280
  const nodeMap = new Map(graph.nodes.map((n) => [String(n.id), n]))
  const hlN = new Set((graph.highlightNodes ?? []).map(String))
  const hlE = new Set((graph.highlightEdges ?? []).map(([a, b]) => `${a}-${b}`))

  return (
    <div className="graph-view">
      <svg viewBox={`0 0 ${w} ${h}`} className="graph-svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="18" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#7aa2f7" />
          </marker>
        </defs>
        {graph.edges.map((e, i) => {
          const a = nodeMap.get(String(e.from))
          const b = nodeMap.get(String(e.to))
          if (!a || !b) return null
          const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0
          const key1 = `${e.from}-${e.to}`, key2 = `${e.to}-${e.from}`
          const hot = hlE.has(key1) || hlE.has(key2)
          const mx = (ax + bx) / 2, my = (ay + by) / 2
          return (
            <g key={i}>
              <line
                x1={ax} y1={ay} x2={bx} y2={by}
                className={hot ? 'edge hot' : 'edge'}
                markerEnd={e.directed ? 'url(#arrow)' : undefined}
              />
              {e.weight !== undefined && (
                <text x={mx} y={my - 6} className="edge-label">{e.weight}</text>
              )}
            </g>
          )
        })}
        {graph.nodes.map((n) => {
          const x = n.x ?? 0, y = n.y ?? 0
          const hot = hlN.has(String(n.id))
          return (
            <g key={String(n.id)}>
              <circle cx={x} cy={y} r={16} className={hot ? 'node hot' : 'node'} />
              <text x={x} y={y + 4} textAnchor="middle" className="node-label">
                {n.label ?? n.id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
