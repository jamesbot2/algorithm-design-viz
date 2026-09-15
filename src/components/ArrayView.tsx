import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { ArrayOp, HighlightRole, Step, StepRanges } from '../types/step'
import { deriveArrayPointers } from '../types/step'
import { useMotion } from '../theme/MotionContext'
import { resolveDuration } from '../theme/motion'

interface Props {
  name: string
  values: (number | string)[]
  highlights?: number[]
  roles?: Record<number, HighlightRole>
  pointers?: Record<string, number>
  defaultMode?: 'bars' | 'cells'
  scaleMax?: number
  ranges?: StepRanges
  arrayOps?: ArrayOp[]
  elementIds?: string[]
  prevValues?: (number | string)[]
  prevElementIds?: string[]
  /** When true, skip FLIP (seek jump / non-adjacent snap) */
  snapSwap?: boolean
}

const ROLE_CLASS: Record<HighlightRole, string> = {
  compare: 'hl-compare',
  swap: 'hl-swap',
  sorted: 'hl-sorted',
  pivot: 'hl-pivot',
  read: 'hl-read',
  focus: 'hl-focus',
  done: 'hl-done',
  update: 'hl-swap',
  accepted: 'hl-sorted',
  rejected: 'hl-swap',
  pruned: 'hl-read',
  optimal: 'hl-sorted',
}

const LEGACY_ORDER: HighlightRole[] = ['compare', 'swap', 'focus', 'done']

function roleForIndex(
  i: number,
  highlights: number[],
  roles?: Record<number, HighlightRole>,
  ops?: ArrayOp[],
): HighlightRole | null {
  if (roles && roles[i]) return roles[i]
  if (ops?.length) {
    for (const op of ops) {
      if (!op.indices.includes(i)) continue
      if (op.type === 'compare') return 'compare'
      if (op.type === 'swap') return 'swap'
      if (op.type === 'write' || op.type === 'move' || op.type === 'copy') return 'update'
    }
  }
  const hi = highlights.indexOf(i)
  if (hi < 0) return null
  return LEGACY_ORDER[0]!
}

function barSuitable(values: (number | string)[]): boolean {
  if (!values.length) return false
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v as number))) return false
  if (values.length > 24) return false
  return true
}

function rangeStyle(
  range: [number, number] | undefined,
  n: number,
): { left: string; width: string } | null {
  if (!range || n <= 0) return null
  const lo = Math.max(0, Math.min(range[0], range[1]))
  const hi = Math.min(n - 1, Math.max(range[0], range[1]))
  if (hi < lo) return null
  const leftPct = (lo / n) * 100
  const widthPct = ((hi - lo + 1) / n) * 100
  return { left: `${leftPct}%`, width: `${widthPct}%` }
}

function resolveIds(values: (number | string)[], elementIds?: string[]): string[] {
  if (elementIds && elementIds.length === values.length) return elementIds
  return values.map((_, i) => `el-${i}`)
}

function ArrayView({
  name,
  values,
  highlights = [],
  roles,
  pointers = {},
  defaultMode,
  scaleMax,
  ranges,
  arrayOps,
  elementIds,
  prevValues,
  prevElementIds,
  snapSwap = false,
}: Props) {
  const numeric = values.every((v) => typeof v === 'number' && Number.isFinite(v as number))
  const suitable = barSuitable(values)
  const [mode, setMode] = useState<'bars' | 'cells'>(
    defaultMode ?? (suitable ? 'bars' : 'cells'),
  )
  const { mode: motionMode } = useMotion()
  const swapMs = resolveDuration(280, motionMode, 600)

  const nums = useMemo(
    () => (numeric ? (values as number[]) : values.map(() => 1)),
    [numeric, values],
  )
  const max = useMemo(() => {
    const local = Math.max(1, ...nums.map((n) => Math.abs(n)))
    return Math.max(local, scaleMax ?? 0, 1)
  }, [nums, scaleMax])
  const minH = 12
  const maxH = 160
  const hasNegative = numeric && nums.some((n) => n < 0)

  const ids = useMemo(() => resolveIds(values, elementIds), [values, elementIds])

  const pointersByIndex = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const [label, idx] of Object.entries(pointers)) {
      if (typeof idx !== 'number' || idx < 0 || idx >= values.length) continue
      const list = map.get(idx) ?? []
      list.push(label)
      map.set(idx, list)
    }
    return map
  }, [pointers, values.length])

  /** Real swap only when explicit swap op present — never from highlights.length >= 2 */
  const swapPair = useMemo(() => {
    const swapOp = arrayOps?.find((o) => o.type === 'swap' && o.indices.length >= 2)
    if (swapOp) return [swapOp.indices[0]!, swapOp.indices[1]!] as [number, number]
    if (roles) {
      const swapIdxs: number[] = []
      for (const [k, r] of Object.entries(roles)) {
        if (r === 'swap') swapIdxs.push(Number(k))
      }
      if (swapIdxs.length >= 2) return [swapIdxs[0]!, swapIdxs[1]!] as [number, number]
    }
    return null
  }, [arrayOps, roles])

  const slotRefs = useRef<Map<number, HTMLElement | null>>(new Map())
  const layerRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const prevCenters = useRef<Map<string, number>>(new Map())
  const animToken = useRef(0)

  // Clear transforms on cancel / remount / non-swap
  const clearTransforms = () => {
    for (const el of layerRefs.current.values()) {
      if (!el) continue
      el.style.transition = 'none'
      el.style.transform = 'none'
    }
  }

  useEffect(() => {
    return () => {
      animToken.current += 1
      clearTransforms()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const token = ++animToken.current
    const layers = layerRefs.current
    const slots = slotRefs.current

    // Measure current slot centers
    const slotCenter = (i: number) => {
      const el = slots.get(i)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.left + r.width / 2
    }

    const shouldFlip =
      swapPair !== null &&
      !snapSwap &&
      prevValues &&
      prevValues.length === values.length &&
      motionMode !== 'reduced' &&
      swapMs > 0

    if (!shouldFlip || !swapPair) {
      clearTransforms()
      // Record centers for next time
      for (let i = 0; i < values.length; i++) {
        const c = slotCenter(i)
        const id = ids[i]
        if (c != null && id) prevCenters.current.set(id, c)
      }
      return
    }

    const [i, j] = swapPair
    const adjacent = Math.abs(j - i) === 1
    // Seek / non-adjacent: snap (no residual translate)
    if (!adjacent && snapSwap) {
      clearTransforms()
      return
    }

    // FLIP: elements now sit in new slots; invert from previous centers
    const idAt = (idx: number) => ids[idx]!
    const targets = [i, j]

    for (const idx of targets) {
      const id = idAt(idx)
      const layer = layers.get(id)
      const newCenter = slotCenter(idx)
      const oldCenter = prevCenters.current.get(id)
      if (!layer || newCenter == null || oldCenter == null) continue
      const dx = oldCenter - newCenter
      layer.style.transition = 'none'
      layer.style.transform = `translateX(${dx}px)`
    }

    // Force reflow
    void document.body.offsetHeight

    requestAnimationFrame(() => {
      if (animToken.current !== token) return
      for (const idx of targets) {
        const id = idAt(idx)
        const layer = layers.get(id)
        if (!layer) continue
        layer.style.transition = `transform ${swapMs}ms ease`
        layer.style.transform = 'translateX(0px)'
      }
      window.setTimeout(() => {
        if (animToken.current !== token) return
        for (const idx of targets) {
          const id = idAt(idx)
          const layer = layers.get(id)
          if (!layer) continue
          layer.style.transition = 'none'
          layer.style.transform = 'none'
        }
        // Update prev centers after settle
        for (let k = 0; k < values.length; k++) {
          const c = slotCenter(k)
          const id = ids[k]
          if (c != null && id) prevCenters.current.set(id, c)
        }
      }, swapMs + 20)
    })
  }, [
    values,
    ids,
    swapPair,
    snapSwap,
    prevValues,
    prevElementIds,
    motionMode,
    swapMs,
  ])

  const curBand = rangeStyle(ranges?.current, values.length)
  const bestBand = rangeStyle(ranges?.best, values.length)

  return (
    <div className="array-view" data-array={name}>
      <div className="array-label">
        <span>{name}</span>
        {numeric && (
          <div className="view-toggle">
            <button
              type="button"
              className={mode === 'bars' ? 'active' : ''}
              onClick={() => setMode('bars')}
              disabled={!suitable && mode !== 'bars'}
            >
              柱状
            </button>
            <button
              type="button"
              className={mode === 'cells' ? 'active' : ''}
              onClick={() => setMode('cells')}
            >
              单元格
            </button>
          </div>
        )}
      </div>

      {mode === 'bars' && numeric ? (
        <div className={`bars-wrap${hasNegative ? ' signed' : ''}`} style={{ position: 'relative' }}>
          {bestBand && <div className="range-band best" style={bestBand} title="最优窗口" />}
          {curBand && <div className="range-band current" style={curBand} title="当前窗口" />}
          {hasNegative && <div className="bar-baseline" aria-hidden />}
          {values.map((v, i) => {
            const role = roleForIndex(i, highlights, roles, arrayOps)
            const n = nums[i]!
            const h = minH + (Math.abs(n) / max) * (maxH - minH)
            const ptrs = pointersByIndex.get(i) ?? []
            const neg = n < 0
            const isSwap = swapPair !== null && (i === swapPair[0] || i === swapPair[1])
            const eid = ids[i]!
            return (
              <div
                key={eid}
                className={`bar-col${neg ? ' neg' : ' pos'}`}
                data-el-id={eid}
                data-slot-index={i}
                ref={(el) => {
                  slotRefs.current.set(i, el)
                }}
              >
                {/* Outer slot is stable geometry; inner flip layer translates; pulse on deepest */}
                <div
                  className="bar-flip-layer"
                  data-flip-layer
                  ref={(el) => {
                    layerRefs.current.set(eid, el)
                  }}
                  style={{ transform: 'none' } as CSSProperties}
                >
                  <div
                    className={`bar${role ? ` ${ROLE_CLASS[role]}` : ''}${neg ? ' bar-neg' : ''}${
                      isSwap ? ' anim-swap-geo' : role === 'compare' ? ' anim-compare-pulse' : ''
                    }`}
                    style={{ height: `${h}px` }}
                    title={`[${i}] = ${v}`}
                  >
                    <span className="bar-val">{String(v)}</span>
                  </div>
                </div>
                <span className="bar-idx">{i}</span>
                <div className="pointer-row">
                  {ptrs.map((p) => (
                    <span key={p} className="ptr-tag">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="array-cells">
            {values.map((v, i) => {
              const role = roleForIndex(i, highlights, roles, arrayOps)
              const isSwap = swapPair !== null && (i === swapPair[0] || i === swapPair[1])
              const eid = ids[i]!
              return (
                <div
                  key={eid}
                  className="cell-slot"
                  data-el-id={eid}
                  data-slot-index={i}
                  ref={(el) => {
                    slotRefs.current.set(i, el)
                  }}
                >
                  <div
                    className="cell-flip-layer"
                    data-flip-layer
                    ref={(el) => {
                      layerRefs.current.set(eid, el)
                    }}
                    style={{ transform: 'none' }}
                  >
                    <div
                      className={`cell${role ? ` ${ROLE_CLASS[role]}` : ''}${
                        isSwap ? ' anim-swap-geo' : ''
                      }`}
                    >
                      <span className="cell-idx">{i}</span>
                      <span className="cell-val">{String(v)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {Object.keys(pointers).length > 0 && (
            <div className="pointer-row" style={{ justifyContent: 'flex-start', marginTop: '0.5rem' }}>
              {Object.entries(pointers).map(([label, idx]) => (
                <span key={label} className="ptr-tag">
                  {label}={idx}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {(ranges?.current || ranges?.best) && (
        <p className="matrix-note">
          {ranges.current && (
            <>
              当前窗口 [{ranges.current[0]},{ranges.current[1]}]
            </>
          )}
          {ranges.current && ranges.best && ' · '}
          {ranges.best && (
            <>
              最优窗口 [{ranges.best[0]},{ranges.best[1]}]
            </>
          )}
        </p>
      )}
    </div>
  )
}

export default memo(ArrayView)

export const ArraysFromStep = memo(function ArraysFromStep({
  step,
  prevStep,
  scaleMaxByArray,
  snapSwap,
}: {
  step: Step
  prevStep?: Step
  scaleMaxByArray?: Record<string, number>
  snapSwap?: boolean
}) {
  if (!step.arrays) return null
  return (
    <div className="arrays-panel">
      {Object.entries(step.arrays).map(([name, values]) => (
        <ArrayView
          key={name}
          name={name}
          values={values}
          highlights={step.highlights?.[name] ?? []}
          roles={step.roles?.[name]}
          pointers={deriveArrayPointers(step, name)}
          scaleMax={scaleMaxByArray?.[name]}
          ranges={name === 'a' || Object.keys(step.arrays!).length === 1 ? step.ranges : undefined}
          arrayOps={step.arrayOps?.[name]}
          elementIds={step.elementIds?.[name]}
          prevValues={prevStep?.arrays?.[name]}
          prevElementIds={prevStep?.elementIds?.[name]}
          snapSwap={snapSwap}
        />
      ))}
    </div>
  )
})
