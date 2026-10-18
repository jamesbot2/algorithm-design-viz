import type { Step } from '../../../types/step'
import type { BoundsView, DsuView, FenwickView, HeapView } from '../../../types/advancedView'
import { Frame } from './frame'
import { cell } from './cell'
import { SegScene } from './SegScene'
import { FamScene } from './FamScene'
import { dsuLayout, fenwickCover, heapSlot, levelsFor, lowbit } from './scenes'
import './advanced.css'

/** Main stage for `Step.advanced`. Every drawn object carries data-* so tests read the SCENE, not the data table. */
export default function AdvancedScene({ step }: { step: Step; prevStep?: Step }) {
  const v = step.advanced
  if (!v) return null
  return (
    <div className="adv-scene" data-testid="adv-scene" data-scene-kind={v.kind} data-step-id={step.id}>
      {v.kind === 'dsu' && <DsuScene v={v} />}
      {v.kind === 'fenwick' && <FenwickScene v={v} />}
      {v.kind === 'heap' && <HeapScene v={v} />}
      {v.kind === 'bounds' && <BoundsScene v={v} />}
      {v.kind === 'seg' && <SegScene v={v} />}
      {v.kind === 'fam' && <FamScene v={v} />}
    </div>
  )
}


/* ───────────────────────── DSU ───────────────────────── */
function DsuScene({ v }: { v: DsuView }) {
  const path = new Set(v.findPath ?? [])
  const compressed = new Set(v.compressed ?? [])
  const cmp = new Set(v.compare ?? [])
  return (
    <Frame
      head={
        <>
          <b data-testid="dsu-op">{v.op}</b>
          <span>
            集合数 <b data-testid="dsu-components">{v.components}</b>
          </span>
          {v.findPath && v.findPath.length > 0 && (
            <span data-testid="dsu-findpath" data-path={v.findPath.join(',')}>
              find 路径：{v.findPath.join(' → ')}
              {v.root !== undefined ? `（根 ${v.root}）` : ''}
            </span>
          )}
          {v.link && (
            <span data-testid="dsu-link" data-child={v.link.child} data-parent={v.link.parent}>
              合并：{v.link.child} 挂到 {v.link.parent} 下
            </span>
          )}
        </>
      }
    >
      {(w, h) => {
        const r = Math.max(9, Math.min(16, Math.floor(w / v.n / 2) - 2))
        const stripH = 44
        const lay = dsuLayout(v, w, 6, h - stripH - 8, r)
        const cw = cell(w, v.n, 44)
        const x0 = Math.floor((w - cw * v.n) / 2)
        const role = (i: number) =>
          v.link?.child === i ? 'link' : compressed.has(i) ? 'compressed' : cmp.has(i) ? 'compare' : path.has(i) ? (v.root === i ? 'root' : 'path') : v.parent[i] === i ? 'isroot' : 'plain'
        return (
          <>
            <g data-testid="dsu-forest">
              {v.parent.map((p, i) =>
                p === i ? null : (
                  <line key={`e${i}`} className="adv-edge" data-testid="dsu-edge" data-child={i} data-parent={p} x1={lay.pos[i]!.x} y1={lay.pos[i]!.y} x2={lay.pos[p]!.x} y2={lay.pos[p]!.y} />
                ),
              )}
              {v.parent.map((p, i) => (
                <g key={i} className={`adv-node role-${role(i)}`} data-testid="dsu-node" data-node={i} data-parent={p} data-size={v.size[i]} data-root={p === i ? '1' : '0'} data-role={role(i)} transform={`translate(${lay.pos[i]!.x},${lay.pos[i]!.y})`}>
                  <circle r={r} />
                  <text textAnchor="middle" dy="0.35em">
                    {i}
                  </text>
                  {p === i && (
                    <text className="adv-sub" textAnchor="middle" y={-r - 3}>
                      size {v.size[i]}
                    </text>
                  )}
                </g>
              ))}
            </g>
            <g data-testid="dsu-strip" transform={`translate(${x0},${h - stripH})`}>
              <text className="adv-sub" x={0} y={-2}>
                parent[]
              </text>
              {v.parent.map((p, i) => (
                <g key={i} data-testid="dsu-cell" data-index={i} data-value={p} className={`adv-cell role-${role(i)}`} transform={`translate(${i * cw},6)`}>
                  <rect width={cw - 2} height={22} rx={3} />
                  <text x={(cw - 2) / 2} y={11} textAnchor="middle" dy="0.35em">
                    {p}
                  </text>
                  <text className="adv-idx" x={(cw - 2) / 2} y={34} textAnchor="middle">
                    {i}
                  </text>
                </g>
              ))}
            </g>
          </>
        )
      }}
    </Frame>
  )
}

/* ───────────────────────── Fenwick ───────────────────────── */
function FenwickScene({ v }: { v: FenwickView }) {
  const path = new Set(v.path)
  const n = v.n
  const L = levelsFor(n)
  const [ql, qr] = v.query ?? [-1, -1]
  return (
    <Frame
      head={
        <>
          <b data-testid="fw-op">{v.op}</b>
          {v.node !== undefined && (
            <span data-testid="fw-node-info" data-node={v.node}>
              p={v.node}（二进制 {v.node.toString(2)}，lowbit={lowbit(v.node)}）
            </span>
          )}
          {v.path.length > 0 && (
            <span data-testid="fw-path" data-path={v.path.join(',')}>
              访问路径：{v.path.map((p) => `T[${p}]`).join(v.direction === 'up' ? ' → ' : ' + ')}
            </span>
          )}
          {v.query && (
            <span data-testid="fw-query" data-l={ql} data-r={qr}>
              区间 [{ql},{qr}) = 内部 1-based ({ql},{qr}]
            </span>
          )}
          {v.accum !== undefined && (
            <span>
              累计 <b data-testid="fw-accum">{v.accum}</b>
            </span>
          )}
        </>
      }
    >
      {(w, h) => {
        const cw = cell(w, n, 56)
        const x0 = Math.floor((w - cw * n) / 2)
        const rowH = 28
        const barH = Math.max(18, Math.min(26, Math.floor((h - rowH - 34) / L) - 3))
        return (
          <g transform={`translate(${x0},4)`}>
            <g data-testid="fw-array">
              {v.values.map((val, i) => {
                const inQ = i >= ql && i < qr
                return (
                  <g key={i} data-testid="fw-cell" data-index={i} data-value={val} data-in-query={inQ ? '1' : '0'} className={`adv-cell${inQ ? ' role-compare' : ''}`} transform={`translate(${i * cw},0)`}>
                    <rect width={cw - 2} height={rowH} rx={3} />
                    <text x={(cw - 2) / 2} y={rowH / 2} textAnchor="middle" dy="0.35em">
                      {val}
                    </text>
                    <text className="adv-idx" x={(cw - 2) / 2} y={rowH + 11} textAnchor="middle">
                      {i}
                    </text>
                  </g>
                )
              })}
            </g>
            <g data-testid="fw-tree" transform={`translate(0,${rowH + 20})`}>
              {v.tree.map((val, k) => {
                const i = k + 1
                const [a, b] = fenwickCover(i)
                const lvl = Math.log2(lowbit(i))
                const cur = v.node === i
                return (
                  <g
                    key={i}
                    data-testid="fw-node"
                    data-i={i}
                    data-value={val}
                    data-from={a}
                    data-to={b}
                    data-lowbit={lowbit(i)}
                    data-on-path={path.has(i) ? '1' : '0'}
                    data-current={cur ? '1' : '0'}
                    className={`adv-bar${cur ? ' role-focus' : path.has(i) ? ' role-path' : ''}`}
                    transform={`translate(${a * cw},${lvl * (barH + 3)})`}
                  >
                    <rect width={(b - a) * cw - 2} height={barH} rx={3} />
                    <text x={((b - a) * cw - 2) / 2} y={barH / 2} textAnchor="middle" dy="0.35em">
                      {(b - a) * cw >= 52 ? `T[${i}]=${val}` : String(val)}
                    </text>
                  </g>
                )
              })}
            </g>
          </g>
        )
      }}
    </Frame>
  )
}

/* ───────────────────────── Heap ───────────────────────── */
function HeapScene({ v }: { v: HeapView }) {
  const cmp = new Set(v.compare ?? [])
  const sw = new Set(v.swapped ?? [])
  return (
    <Frame
      head={
        <>
          <b data-testid="heap-op">{v.op}</b>
          <span>
            size <b data-testid="heap-size">{v.heap.length}</b>
          </span>
          <span data-testid="heap-top" data-value={v.heap.length ? v.heap[0] : ''}>
            top = {v.heap.length ? v.heap[0] : '（空）'}
          </span>
          {v.popped !== undefined && <span data-testid="heap-popped">被移出：{v.popped}</span>}
          {v.stopped && <b className="adv-warn" data-testid="heap-stopped">已在未定义行为前停止</b>}
        </>
      }
    >
      {(w, h) => {
        const cw = cell(w, v.cap + (v.parked !== undefined ? 1 : 0), 46)
        const slots = Math.max(v.cap, v.heap.length + (v.parked !== undefined ? 1 : 0))
        const x0 = Math.floor((w - cw * slots) / 2)
        const levels = levelsFor(v.cap)
        const stripH = 48
        const r = Math.max(10, Math.min(16, Math.floor(w / 2 ** (levels - 1) / 2) - 2))
        const gapY = levels > 1 ? Math.min(52, (h - stripH - 2 * r - 8) / (levels - 1)) : 0
        const nodePos = (i: number) => heapSlot(i, w, 6 + r, gapY)
        const role = (i: number) => (sw.has(i) ? 'swap' : cmp.has(i) ? 'compare' : v.cursor === i ? 'focus' : 'plain')
        return (
          <>
            <g data-testid="heap-tree">
              {v.heap.map((_, i) =>
                i === 0 ? null : (
                  <line key={`e${i}`} className="adv-edge" data-testid="heap-edge" data-child={i} data-parent={(i - 1) >> 1} x1={nodePos(i).x} y1={nodePos(i).y} x2={nodePos((i - 1) >> 1).x} y2={nodePos((i - 1) >> 1).y} />
                ),
              )}
              {v.heap.map((val, i) => (
                <g key={i} className={`adv-node role-${role(i)}`} data-testid="heap-node" data-index={i} data-value={val} data-role={role(i)} transform={`translate(${nodePos(i).x},${nodePos(i).y})`}>
                  <circle r={r} />
                  <text textAnchor="middle" dy="0.35em">
                    {val}
                  </text>
                </g>
              ))}
            </g>
            <g data-testid="heap-array" transform={`translate(${x0},${h - stripH})`}>
              <text className="adv-sub" x={0} y={-2}>
                数组（只有堆序，不是有序数组）
              </text>
              {Array.from({ length: slots }, (_, i) => {
                const inHeap = i < v.heap.length
                const isParked = v.parked !== undefined && i === v.parked && !inHeap
                return (
                  <g key={i} data-testid="heap-cell" data-index={i} data-value={inHeap ? v.heap[i] : ''} data-filled={inHeap ? '1' : '0'} data-parked={isParked ? '1' : '0'} className={`adv-cell${inHeap ? ` role-${role(i)}` : ' is-empty'}`} transform={`translate(${i * cw},6)`}>
                    <rect width={cw - 2} height={22} rx={3} />
                    <text x={(cw - 2) / 2} y={11} textAnchor="middle" dy="0.35em">
                      {inHeap ? v.heap[i] : isParked ? v.popped : ''}
                    </text>
                    <text className="adv-idx" x={(cw - 2) / 2} y={34} textAnchor="middle">
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

/* ───────────────────────── lower_bound / upper_bound ───────────────────────── */
function BoundsScene({ v }: { v: BoundsView }) {
  const n = v.arr.length
  const name = v.mode === 'lower' ? 'lower_bound' : 'upper_bound'
  return (
    <Frame
      head={
        <>
          <b data-testid="bd-op">
            {name}({v.target})
          </b>
          <span data-testid="bd-range" data-first={v.first} data-last={v.last}>
            区间 [first,last) = [{v.first},{v.last})
          </span>
          {v.mid !== undefined && <span data-testid="bd-mid" data-mid={v.mid}>mid={v.mid}</span>}
          {v.cmp && (
            <span data-testid="bd-cmp" data-go-right={v.cmp.goRight ? '1' : '0'}>
              {v.cmp.text} → {v.cmp.goRight ? '真' : '假'}
            </span>
          )}
          {v.result !== undefined && (
            <b data-testid="bd-result" data-index={v.result} data-end={v.result === n ? '1' : '0'}>
              结果 {v.result === n ? `= end()（下标 ${n}，不可解引用）` : `= 下标 ${v.result}（值 ${v.arr[v.result]}）`}
            </b>
          )}
        </>
      }
    >
      {(w) => {
        const cw = cell(w, n + 1, 52)
        const x0 = Math.floor((w - cw * (n + 1)) / 2)
        const top = 26
        const mark = (idx: number, label: string, cls: string, lvl: number) => (
          <g key={label} data-testid="bd-marker" data-name={label} data-index={idx} className={`adv-marker ${cls}`} transform={`translate(${idx * cw + (cw - 2) / 2},${top + 52 + lvl * 15})`}>
            <path d="M0,-9 L5,0 L-5,0 Z" />
            <text y={12} textAnchor="middle">
              {label}
            </text>
          </g>
        )
        return (
          <g transform={`translate(${x0},4)`}>
            <rect data-testid="bd-band" className="adv-band" x={v.first * cw - 1} y={top - 6} width={Math.max(0, (v.last - v.first) * cw)} height={46} rx={4} />
            {v.arr.map((val, i) => {
              const inRange = i >= v.first && i < v.last
              const eq = val === v.target
              return (
                <g key={i} data-testid="bd-cell" data-index={i} data-value={val} data-in-range={inRange ? '1' : '0'} data-equal={eq ? '1' : '0'} data-mid={v.mid === i ? '1' : '0'} className={`adv-cell${v.mid === i ? ' role-focus' : ''}${inRange ? '' : ' is-out'}${eq ? ' is-equal' : ''}`} transform={`translate(${i * cw},${top})`}>
                  <rect width={cw - 2} height={34} rx={3} />
                  <text x={(cw - 2) / 2} y={17} textAnchor="middle" dy="0.35em">
                    {val}
                  </text>
                  <text className="adv-idx" x={(cw - 2) / 2} y={46} textAnchor="middle">
                    {i}
                  </text>
                </g>
              )
            })}
            <g data-testid="bd-end" data-index={n} className={`adv-cell is-end${v.result === n ? ' role-accepted' : ''}`} transform={`translate(${n * cw},${top})`}>
              <rect width={cw - 2} height={34} rx={3} strokeDasharray="4 3" />
              <text x={(cw - 2) / 2} y={17} textAnchor="middle" dy="0.35em">
                end
              </text>
              <text className="adv-idx" x={(cw - 2) / 2} y={46} textAnchor="middle">
                {n}
              </text>
            </g>
            {v.result === undefined && mark(v.first, 'first', 'm-first', 0)}
            {v.result === undefined && mark(Math.min(v.last, n), v.last === n ? 'last=end' : 'last', 'm-last', 1)}
            {v.result !== undefined && mark(v.result, 'result', 'm-result', 0)}
          </g>
        )
      }}
    </Frame>
  )
}
