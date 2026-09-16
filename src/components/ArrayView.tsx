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
  /** Display label; defaults to name. Use for buffers e.g. "temp · key". */
  label?: string
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
  /** Compact buffer strip — prefer cells, smaller chart */
  compact?: boolean
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

/** Signed-bar geometry: shared abs domain; zero has data height 0. */
export function computeBarGeometry(
  values: number[],
  scaleMax?: number,
  maxH = 160,
): {
  absMax: number
  zeroRatio: number
  heights: number[]
  directions: ('pos' | 'neg' | 'zero')[]
} {
  const absMax = Math.max(1, scaleMax ?? 0, ...values.map((v) => Math.abs(v)))
  const hasPos = values.some((v) => v > 0)
  const hasNeg = values.some((v) => v < 0)
  let zeroRatio = 1
  if (hasPos && hasNeg) zeroRatio = 0.5
  else if (hasNeg) zeroRatio = 0
  const half = hasPos && hasNeg
  const heights = values.map((v) => {
    if (v === 0) return 0
    const span = half ? maxH / 2 : maxH
    return (Math.abs(v) / absMax) * span
  })
  const directions = values.map((v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero') as 'pos' | 'neg' | 'zero')
  return { absMax, zeroRatio, heights, directions }
}

function uniqueDisplayIds(ids: string[]): string[] {
  const seen = new Map<string, number>()
  return ids.map((id) => {
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    return n === 0 ? id : `${id}#${n}`
  })
}


/** Element ids whose slot index changed — drives XY FLIP for swap and same-array move. */
export function relocatingElementIds(prevIds: string[] | undefined, nextIds: string[]): string[] {
  if (!prevIds || prevIds.length !== nextIds.length) return []
  const prevIndex = new Map(prevIds.map((id, i) => [id, i]))
  const out: string[] = []
  for (let i = 0; i < nextIds.length; i++) {
    const id = nextIds[i]!
    // Skip ephemeral vacancies — they are not continuous identity
    if (id.startsWith('vacant:') || id.startsWith('pending:')) continue
    const prev = prevIndex.get(id)
    if (prev !== undefined && prev !== i) out.push(id)
  }
  return out
}

function resolveIds(values: (number | string)[], elementIds?: string[]): string[] {
  if (elementIds && elementIds.length === values.length) return elementIds
  return values.map((_, i) => `el-${i}`)
}

function ArrayView({
  name,
  label,
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
  compact = false,
}: Props) {
  const numeric = values.every((v) => typeof v === 'number' && Number.isFinite(v as number))
  const suitable = barSuitable(values)
  const [mode, setMode] = useState<'bars' | 'cells'>(
    defaultMode ?? (compact ? 'cells' : suitable ? 'bars' : 'cells'),
  )
  const { mode: motionMode, speedIntervalMs, transitionEpoch } = useMotion()
  const swapMs = resolveDuration(280, motionMode, speedIntervalMs)

  const nums = useMemo(
    () => (numeric ? (values as number[]) : values.map(() => 1)),
    [numeric, values],
  )
  const [maxH, setMaxH] = useState(compact ? 64 : 160)
  const geo = useMemo(
    () => (numeric ? computeBarGeometry(nums, scaleMax, maxH) : null),
    [numeric, nums, scaleMax, maxH],
  )
  const hasNegative = Boolean(geo && (geo.zeroRatio < 1 || nums.some((n) => n < 0)))
  const hasPositive = Boolean(geo && nums.some((n) => n > 0))
  const signedMode = Boolean(geo && (hasNegative || nums.every((n) => n === 0)))

  const ids = useMemo(() => uniqueDisplayIds(resolveIds(values, elementIds)), [values, elementIds])

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
  const prevCenters = useRef<Map<string, { x: number; y: number }>>(new Map())
  const animToken = useRef(0)
  const transitionIdRef = useRef(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Fit signed/unsigned bar chart into remaining stage (after banner/toggles) — landscape short prefers taller bars.
  useLayoutEffect(() => {
    if (compact || mode !== 'bars') return
    const self = wrapRef.current
    if (!self) return
    const stage = self.closest('[data-testid="viz-canvas"]') as HTMLElement | null
    const apply = () => {
      const stageH = stage?.clientHeight ?? 0
      if (stageH <= 0) return
      const top = stage?.getBoundingClientRect().top ?? 0
      const roomInViewport = Math.max(0, window.innerHeight - top - 4)
      const usable = Math.min(stageH, roomInViewport)
      const labelH = self.querySelector('.array-label')?.getBoundingClientRect().height ?? 28
      const noteH = self.querySelector('.matrix-note')?.getBoundingClientRect().height ?? 0
      const short = window.innerHeight <= 520
      const ultra = window.innerHeight <= 400
      const landscape = window.innerWidth > window.innerHeight
      // signed chart box ≈ maxH+40; keep that inside remaining stage after label/note
      const chartChrome = 40
      const overhead = labelH + noteH + chartChrome + 8
      const minBudget = landscape && ultra ? 140 : landscape && short ? 110 : short ? 80 : 56
      const maxBudget = landscape && ultra ? 240 : landscape && short ? 220 : short ? 180 : 160
      const budget = Math.max(minBudget, Math.min(maxBudget, usable - overhead))
      setMaxH((prev) => (Math.abs(prev - budget) >= 4 ? budget : prev))
    }
    apply()
    const ro = new ResizeObserver(apply)
    if (stage) ro.observe(stage)
    ro.observe(self)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [compact, mode, values.length, signedMode])
  const geometryGen = useRef(0)
  const [rangeMasks, setRangeMasks] = useState<{
    current: { left: number; width: number }[]
    best: { left: number; width: number }[]
  }>({ current: [], best: [] })

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

  // Invalidate geometry cache on bars/cells toggle (hide→restore remounts layers)
  useEffect(() => {
    geometryGen.current += 1
    prevCenters.current.clear()
    animToken.current += 1
    clearTransforms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let lastW = el.clientWidth
    let lastH = el.clientHeight
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      lastW = w
      lastH = h
      geometryGen.current += 1
      prevCenters.current.clear()
      clearTransforms()
      animToken.current += 1
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // V10-04: cancel-old vs create-new in ONE layout pass.
  // A separate useEffect(clear on transitionEpoch) ran AFTER layout and killed
  // the brand-new FLIP that goNext just created (epoch+idx batched).
  const lastCancelEpoch = useRef(transitionEpoch)
  const lastGeomSig = useRef('')

  useLayoutEffect(() => {
    const epochChanged = lastCancelEpoch.current !== transitionEpoch
    lastCancelEpoch.current = transitionEpoch
    const geomSig = `${ids.join('\0')}|${values.join('\0')}|${swapPair ? swapPair.join(',') : ''}|${arrayOps?.map((o) => o.type).join(',') ?? ''}`
    const geometryChanged = lastGeomSig.current !== geomSig
    lastGeomSig.current = geomSig
    // Invalidate in-flight RAF/timeouts from any prior transition instance
    if (epochChanged || snapSwap) {
      animToken.current += 1
    }
    const token = ++animToken.current
    const transitionId = ++transitionIdRef.current
    const layers = layerRefs.current
    const slots = slotRefs.current
    const gen = geometryGen.current

    const slotCenter = (i: number) => {
      const el = slots.get(i)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }

    const seedCenters = () => {
      for (let i = 0; i < values.length; i++) {
        const c = slotCenter(i)
        const id = ids[i]
        if (c != null && id) prevCenters.current.set(id, c)
      }
    }

    // Pause/seek/reset: epoch bumped without new geometry → cancel only (do not restart FLIP)
    if (snapSwap || (epochChanged && !geometryChanged)) {
      clearTransforms()
      seedCenters()
      return
    }

    // FLIP targets: explicit swap pair OR same-array move (id relocates). Copy/write from
    // aux buffers (temp/left/right) are intentional instant — buffer strip is the mid-viz.
    const movingIds = relocatingElementIds(prevElementIds, ids)
    const hasMoveOp = Boolean(arrayOps?.some((o) => o.type === 'move'))
    const flipIds =
      swapPair !== null
        ? [ids[swapPair[0]!]!, ids[swapPair[1]!]!].filter(Boolean)
        : hasMoveOp
          ? movingIds
          : movingIds.length > 0 && !arrayOps?.some((o) => o.type === 'copy' || o.type === 'write')
            ? movingIds
            : []

    const shouldFlip =
      flipIds.length > 0 &&
      !snapSwap &&
      prevValues &&
      prevValues.length === values.length &&
      motionMode !== 'reduced' &&
      swapMs > 0

    if (!shouldFlip) {
      clearTransforms()
      seedCenters()
      return
    }

    const idToIndex = new Map(ids.map((id, i) => [id, i]))
    for (const id of flipIds) {
      const idx = idToIndex.get(id)
      if (idx == null) continue
      const layer = layers.get(id)
      const newCenter = slotCenter(idx)
      const oldCenter = prevCenters.current.get(id)
      if (!layer || newCenter == null || oldCenter == null) continue
      const dx = oldCenter.x - newCenter.x
      const dy = oldCenter.y - newCenter.y
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      layer.style.transition = 'none'
      layer.style.transform = `translate(${dx}px, ${dy}px)`
      layer.dataset.transitionId = String(transitionId)
      layer.dataset.runFlip = '1'
    }

    void document.body.offsetHeight

    requestAnimationFrame(() => {
      if (animToken.current !== token || geometryGen.current !== gen) return
      for (const id of flipIds) {
        const layer = layers.get(id)
        if (!layer || layer.dataset.transitionId !== String(transitionId)) continue
        layer.style.transition = `transform ${swapMs}ms ease`
        layer.style.transform = 'translate(0px, 0px)'
      }
      window.setTimeout(() => {
        if (animToken.current !== token || geometryGen.current !== gen) return
        for (const id of flipIds) {
          const layer = layers.get(id)
          if (!layer || layer.dataset.transitionId !== String(transitionId)) continue
          layer.style.transition = 'none'
          layer.style.transform = 'none'
          delete layer.dataset.runFlip
        }
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
    arrayOps,
    snapSwap,
    prevValues,
    prevElementIds,
    motionMode,
    swapMs,
    transitionEpoch,
  ])


  // V11-01: range masks from real slot rects (segmented when cells wrap)
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = (range: [number, number] | undefined) => {
      if (!range || values.length <= 0) return [] as { left: number; width: number }[]
      const lo = Math.max(0, Math.min(range[0], range[1]))
      const hi = Math.min(values.length - 1, Math.max(range[0], range[1]))
      const wrapRect = wrap.getBoundingClientRect()
      const segs: { left: number; width: number }[] = []
      let segStart: DOMRect | null = null
      let segEnd: DOMRect | null = null
      let lastTop: number | null = null
      const flush = () => {
        if (!segStart || !segEnd) return
        segs.push({
          left: segStart.left - wrapRect.left,
          width: segEnd.right - segStart.left,
        })
        segStart = null
        segEnd = null
      }
      for (let i = lo; i <= hi; i++) {
        const el = slotRefs.current.get(i)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (lastTop !== null && Math.abs(r.top - lastTop) > 4) flush()
        if (!segStart) segStart = r
        segEnd = r
        lastTop = r.top
      }
      flush()
      return segs
    }
    setRangeMasks({
      current: measure(ranges?.current),
      best: measure(ranges?.best),
    })
  }, [values, ranges, mode, ids])

  const curBand = rangeStyle(ranges?.current, values.length)
  const bestBand = rangeStyle(ranges?.best, values.length)

  return (
    <div
      className={`array-view${compact ? ' array-view-compact' : ''}`}
      data-array={name}
      ref={wrapRef}
      data-flip-xy="1"
      data-compact={compact ? '1' : '0'}
    >
      <div className="array-label">
        <span>{label ?? name}</span>
        {numeric && !compact && (
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

      {mode === 'bars' && numeric && geo ? (
        <div
          className={`bars-wrap${signedMode ? ' signed' : ''}`}
          style={
            {
              position: 'relative',
              '--bar-chart-h': `${signedMode && hasPositive && hasNegative ? maxH + 40 : maxH + 24}px`,
              '--zero-ratio': String(geo.zeroRatio),
            } as CSSProperties
          }
          data-signed={signedMode ? '1' : '0'}
          data-abs-max={geo.absMax}
        >
          {rangeMasks.best.map((s, i) => (
            <div
              key={`best-${i}`}
              className="range-band best range-band-abs"
              style={{ left: s.left, width: s.width }}
              title="最优窗口"
            />
          ))}
          {rangeMasks.current.map((s, i) => (
            <div
              key={`cur-${i}`}
              className="range-band current range-band-abs"
              style={{ left: s.left, width: s.width }}
              title="当前窗口"
            />
          ))}
          {rangeMasks.current.length === 0 && curBand && (
            <div className="range-band current" style={curBand} title="当前窗口" />
          )}
          {rangeMasks.best.length === 0 && bestBand && (
            <div className="range-band best" style={bestBand} title="最优窗口" />
          )}
          {signedMode && <div className="bar-baseline" style={{ top: `${geo.zeroRatio * 100}%` }} aria-hidden />}
          {values.map((v, i) => {
            const role = roleForIndex(i, highlights, roles, arrayOps)
            const h = geo.heights[i]!
            const dir = geo.directions[i]!
            const ptrs = pointersByIndex.get(i) ?? []
            const isSwap = swapPair !== null && (i === swapPair[0] || i === swapPair[1])
            const eid = ids[i]!
            const slotKey = `slot-${i}`
            return (
              <div
                key={slotKey}
                className={`bar-col ${dir}`}
                data-el-id={eid}
                data-slot-index={i}
                data-bar-dir={dir}
                data-bar-h={h}
                ref={(el) => {
                  slotRefs.current.set(i, el)
                }}
              >
                <div
                  className="bar-flip-layer"
                  data-flip-layer
                  ref={(el) => {
                    layerRefs.current.set(eid, el)
                  }}
                  style={{ transform: 'none' } as CSSProperties}
                >
                  {dir === 'zero' ? (
                    <button
                      type="button"
                      className={`bar-zero-marker${role ? ` ${ROLE_CLASS[role]}` : ''}`}
                      data-bar-zero
                      data-data-height="0"
                      title={`[${i}] = ${v}`}
                      aria-label={`索引 ${i} 值 0`}
                    >
                      <span className="bar-val">0</span>
                    </button>
                  ) : (
                    <div
                      className={`bar${role ? ` ${ROLE_CLASS[role]}` : ''}${dir === 'neg' ? ' bar-neg' : ''}${
                        isSwap ? ' anim-swap-geo' : role === 'compare' ? ' anim-compare-pulse' : ''
                      }`}
                      style={{
                        height: `${h}px`,
                        // Width from slot geometry (100%), not label text
                        width: '100%',
                        minHeight: 0,
                      }}
                      data-data-height={h}
                      title={`[${i}] = ${v}`}
                    >
                      <span className="bar-val">{String(v)}</span>
                    </div>
                  )}
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
              const slotKey = `slot-${i}`
              return (
                <div
                  key={slotKey}
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

/** Aux copy buffers shown as a compact strip (not full-height second bar chart). */
const BUFFER_ARRAY_NAMES = new Set(['temp', 'left', 'right', 'key'])
const BUFFER_LABELS: Record<string, string> = {
  temp: 'temp · key',
  left: 'left',
  right: 'right',
  key: 'key',
}

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
  const entries = Object.entries(step.arrays)
  const buffers = entries.filter(([name]) => BUFFER_ARRAY_NAMES.has(name))
  const primary = entries.filter(([name]) => !BUFFER_ARRAY_NAMES.has(name))
  const renderOne = (name: string, values: (number | string)[], compact: boolean) => (
    <ArrayView
      key={name}
      name={name}
      label={compact ? BUFFER_LABELS[name] ?? name : undefined}
      values={values}
      highlights={step.highlights?.[name] ?? []}
      roles={step.roles?.[name]}
      pointers={deriveArrayPointers(step, name)}
      scaleMax={scaleMaxByArray?.[name]}
      ranges={!compact && (name === 'a' || primary.length === 1) ? step.ranges : undefined}
      arrayOps={step.arrayOps?.[name]}
      elementIds={step.elementIds?.[name]}
      prevValues={prevStep?.arrays?.[name]}
      prevElementIds={prevStep?.elementIds?.[name]}
      snapSwap={snapSwap}
      compact={compact}
      defaultMode={compact ? 'cells' : undefined}
    />
  )
  return (
    <div className="arrays-panel">
      {buffers.length > 0 && (
        <div className="array-buffers" data-testid="array-buffers" aria-label="临时缓冲">
          {buffers.map(([name, values]) => renderOne(name, values, true))}
        </div>
      )}
      {primary.map(([name, values]) => renderOne(name, values, false))}
    </div>
  )
})
