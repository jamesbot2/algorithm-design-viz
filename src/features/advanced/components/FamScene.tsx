import type { FamMark, FamView } from '../../../types/advancedView'
import { Frame } from './frame'
import { cell } from './cell'

const roleOf = (m?: FamMark) => (m ? { cur: 'role-focus', hit: 'role-accepted', done: 'role-root', warn: 'role-compressed', range: 'role-compare', pivot: 'role-swap' }[m] : '')

function layoutGraph(g: NonNullable<FamView['graph']>, w: number, h: number): { x: number; y: number }[] {
  if (g.layout === 'tree' && g.depth) {
    const maxD = g.depth.reduce((m, d) => Math.max(m, d), 0)
    const byD: number[][] = Array.from({ length: maxD + 1 }, () => [])
    g.depth.forEach((d, i) => byD[d]!.push(i))
    const pos: { x: number; y: number }[] = new Array(g.n)
    byD.forEach((nodes, d) => nodes.forEach((v, k) => (pos[v] = { x: ((k + 1) * w) / (nodes.length + 1), y: 14 + (maxD === 0 ? 0 : (d * (h - 28)) / maxD) })))
    return pos
  }
  const r = Math.max(10, Math.min(w / 2 - 20, h / 2 - 14))
  return Array.from({ length: g.n }, (_, i) => ({ x: w / 2 + r * Math.cos((2 * Math.PI * i) / g.n - Math.PI / 2), y: h / 2 + r * Math.sin((2 * Math.PI * i) / g.n - Math.PI / 2) }))
}

export function FamScene({ v }: { v: FamView }) {
  return (
    <Frame
      head={
        <>
          <b data-testid="fam-op">{v.op}</b>
          {(v.scalars ?? []).map((s) => (
            <span key={s.id}>
              {s.label} <b data-testid="fam-scalar" data-key={s.id} data-value={String(s.value)}>{s.value}</b>
            </span>
          ))}
          {v.result && (
            <b data-testid="fam-result" data-value={v.result.join(',')}>
              结果 = [{v.result.join(', ')}]
            </b>
          )}
        </>
      }
    >
      {(w, h) => {
        const gH = v.graph ? Math.max(70, Math.min(h * 0.45, 190)) : 0
        const rows = v.rows
        const widest = rows.reduce((m, r) => Math.max(m, r.cells.length), 1)
        const labelW = 64
        const cw = cell(w - labelW, widest, 44)
        const rh = Math.max(26, Math.min(40, (h - gH - 8) / Math.max(1, rows.length)))
        const pos = v.graph ? layoutGraph(v.graph, w, gH) : []
        return (
          <>
            {v.graph && (
              <g data-testid="fam-graph">
                {v.graph.edges.map(([a, b], i) => {
                  const m = v.graph!.edgeMarks?.[`${a}-${b}`]
                  return <line key={i} className={`adv-edge${m ? ' fam-edge-hot' : ''}`} data-testid="fam-edge" data-u={a} data-v={b} data-mark={m ?? ''} x1={pos[a]!.x} y1={pos[a]!.y} x2={pos[b]!.x} y2={pos[b]!.y} markerEnd={v.graph!.directed ? 'url(#fam-arrow)' : undefined} />
                })}
                {Array.from({ length: v.graph.n }, (_, i) => {
                  const m = v.graph!.marks?.[i]
                  return (
                    <g key={i} className={`adv-node ${roleOf(m)}`} data-testid="fam-node" data-node={i} data-mark={m ?? ''} transform={`translate(${pos[i]!.x},${pos[i]!.y})`}>
                      <circle r={12} />
                      <text textAnchor="middle" dy="0.35em">
                        {i}
                      </text>
                    </g>
                  )
                })}
                {v.graph.directed && (
                  <defs>
                    <marker id="fam-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill="var(--muted, #64748b)" />
                    </marker>
                  </defs>
                )}
              </g>
            )}
            <g transform={`translate(0,${gH + 4})`}>
              {rows.map((r, ri) => (
                <g key={r.id} data-testid="fam-row" data-row={r.id} transform={`translate(0,${ri * rh})`}>
                  <text className="adv-sub" x={4} y={rh / 2} dy="0.35em">
                    {r.label}
                  </text>
                  {r.cells.map((c, i) => {
                    const m = r.marks?.[i]
                    return (
                      <g key={i} className={`adv-cell ${roleOf(m)}${c === null ? ' is-empty' : ''}`} data-testid="fam-cell" data-row={r.id} data-i={i + (r.offset ?? 0)} data-value={c ?? ''} data-mark={m ?? ''} transform={`translate(${labelW + i * cw},2)`}>
                        <rect width={cw - 2} height={rh - 6} rx={3} />
                        <text x={(cw - 2) / 2} y={(rh - 6) / 2} textAnchor="middle" dy="0.35em">
                          {c ?? '·'}
                        </text>
                      </g>
                    )
                  })}
                </g>
              ))}
            </g>
          </>
        )
      }}
    </Frame>
  )
}
