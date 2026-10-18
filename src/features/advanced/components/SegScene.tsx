import type { SegView } from '../../../types/advancedView'
import { Frame } from './frame'
import { cell } from './cell'

interface Slot {
  node: number
  lo: number
  hi: number
  depth: number
}

/** Heap-numbered recursive layout: node k covers [lo,hi); children 2k:[lo,mid) and 2k+1:[mid,hi). */
function slots(n: number): Slot[] {
  const out: Slot[] = []
  const go = (node: number, lo: number, hi: number, depth: number) => {
    out.push({ node, lo, hi, depth })
    if (hi - lo === 1) return
    const mid = lo + ((hi - lo) >> 1)
    go(2 * node, lo, mid, depth + 1)
    go(2 * node + 1, mid, hi, depth + 1)
  }
  if (n > 0) go(1, 0, n, 0)
  return out
}

export function SegScene({ v }: { v: SegView }) {
  const all = slots(v.n)
  const depth = all.reduce((m, s) => Math.max(m, s.depth), 0) + 1
  const roleOf = new Map<number, string>()
  for (const x of v.visited) roleOf.set(x.node, x.role)
  const q = v.query
  return (
    <Frame
      head={
        <>
          <b data-testid="seg-op">{v.op}</b>
          {q && (
            <span data-testid="seg-query" data-l={q[0]} data-r={q[1]}>
              查询 [{q[0]},{q[1]})
            </span>
          )}
          {q && (
            <span>
              累计 <b data-testid="seg-accum">{v.accum ?? 0}</b>
            </span>
          )}
          {v.adding && (
            <span data-testid="seg-adding" data-l={v.adding.l} data-r={v.adding.r} data-v={v.adding.v}>
              每个元素 += {v.adding.v}
            </span>
          )}
          {v.target && (
            <span data-testid="seg-target" data-index={v.target.index} data-value={v.target.value}>
              a[{v.target.index}] ← {v.target.value}
            </span>
          )}
          {v.result !== undefined && (
            <b data-testid="seg-result" data-value={v.result}>
              结果 = {v.result}
            </b>
          )}
        </>
      }
    >
      {(w, h) => {
        const stripH = 48
        const n = v.n
        const cw = cell(w, n, 46)
        const x0 = Math.floor((w - cw * n) / 2)
        const bw = Math.max(26, Math.min(64, cw * 1.6))
        const bh = 24
        const gapY = depth > 1 ? Math.min(58, (h - stripH - bh - 14) / (depth - 1)) : 0
        const pos = (s: Slot) => ({ x: x0 + ((s.lo + s.hi) / 2) * cw, y: 6 + bh / 2 + s.depth * gapY })
        const byNode = new Map(all.map((s) => [s.node, s]))
        return (
          <>
            <g data-testid="seg-tree">
              {all.map((s) => {
                if (s.node === 1) return null
                const p = byNode.get(s.node >> 1)!
                return <line key={`e${s.node}`} className="adv-edge" data-testid="seg-edge" data-child={s.node} data-parent={s.node >> 1} x1={pos(s).x} y1={pos(s).y} x2={pos(p).x} y2={pos(p).y} />
              })}
              {all.map((s) => {
                const val = v.tree[s.node]
                const role = roleOf.get(s.node) ?? 'plain'
                const cur = v.node === s.node
                return (
                  <g
                    key={s.node}
                    className={`adv-node seg-node seg-${role}${cur ? ' seg-current' : ''}${val == null ? ' is-empty' : ''}`}
                    data-testid="seg-node"
                    data-node={s.node}
                    data-lo={s.lo}
                    data-hi={s.hi}
                    data-value={val ?? ''}
                    data-built={val == null ? '0' : '1'}
                    data-role={role}
                    data-current={cur ? '1' : '0'}
                    data-lazy={v.lazy ? (v.lazy[s.node] ?? 0) : ''}
                    data-tagged={v.tagged?.includes(s.node) ? '1' : '0'}
                    transform={`translate(${pos(s).x - bw / 2},${pos(s).y - bh / 2})`}
                  >
                    <rect width={bw} height={bh} rx={4} />
                    <text x={bw / 2} y={bh / 2 - 3} textAnchor="middle" dy="0.35em">
                      {val ?? '·'}
                    </text>
                    {v.lazy && (v.lazy[s.node] ?? 0) !== 0 && (
                      <text className="seg-tag" data-testid="seg-tag" x={bw + 2} y={4} textAnchor="start">
                        ⚑{v.lazy[s.node]}
                      </text>
                    )}
                    <text className="adv-idx" x={bw / 2} y={bh + 9} textAnchor="middle">
                      [{s.lo},{s.hi})
                    </text>
                  </g>
                )
              })}
            </g>
            <g data-testid="seg-array" transform={`translate(${x0},${h - stripH})`}>
              <text className="adv-sub" x={0} y={-2}>
                数组 a（半开区间 [l,r)）
              </text>
              {Array.from({ length: n }, (_, i) => {
                const inQ = !!q && i >= q[0] && i < q[1]
                const isT = v.target?.index === i
                return (
                  <g key={i} data-testid="seg-cell" data-index={i} data-in-query={inQ ? '1' : '0'} data-target={isT ? '1' : '0'} className={`adv-cell${inQ ? ' role-compare' : ''}${isT ? ' role-swap' : ''}`} transform={`translate(${i * cw},6)`}>
                    <rect width={cw - 2} height={22} rx={3} />
                    <text x={(cw - 2) / 2} y={11} textAnchor="middle" dy="0.35em">
                      {i}
                    </text>
                  </g>
                )
              })}
            </g>
          </>
        )
      }}
    </Frame>
  )
}
