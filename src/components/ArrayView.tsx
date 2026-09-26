import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { ArrayOp, HighlightRole, Step, StepRanges } from '../types/step'
import { deriveArrayPointers } from '../types/step'
import type { PresentationDescriptor } from '../types/presentation'
import { useMotion } from '../theme/MotionContext'
import { resolveDuration } from '../theme/motion'
import { SHORT_BAR_PX, signedPlotLanes } from './signedPlot'

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
  /** Run-level signed domain (stable half-span across steps). */
  signedDomain?: { hasPos: boolean; hasNeg: boolean }
  ranges?: StepRanges
  arrayOps?: ArrayOp[]
  elementIds?: string[]
  prevValues?: (number | string)[]
  prevElementIds?: string[]
  /** When true, skip FLIP (seek jump / non-adjacent snap) */
  snapSwap?: boolean
  /** Compact buffer strip — prefer cells, smaller chart */
  compact?: boolean
  /** V24-02: label presentation for string cells (interval → id + [start,finish) card). */
  labelFormat?: 'interval-card'
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

/** Signed-bar geometry: shared abs domain; zero has data height 0.
 * Pass runDomain so mid-run all-positive frames keep the same half-span as signed runs.
 */
export function computeBarGeometry(
  values: number[],
  scaleMax?: number,
  maxH = 160,
  runDomain?: { hasPos: boolean; hasNeg: boolean },
): {
  absMax: number
  zeroRatio: number
  heights: number[]
  directions: ('pos' | 'neg' | 'zero')[]
} {
  const absMax = Math.max(1, scaleMax ?? 0, ...values.map((v) => Math.abs(v)))
  const hasPos = runDomain?.hasPos ?? values.some((v) => v > 0)
  const hasNeg = runDomain?.hasNeg ?? values.some((v) => v < 0)
  let zeroRatio = 1
  if (hasPos && hasNeg) zeroRatio = 0.5
  else if (hasNeg && !hasPos) zeroRatio = 0
  else if (hasPos && !hasNeg) zeroRatio = 1
  const half = hasPos && hasNeg
  const heights = values.map((v) => {
    if (v === 0) return 0
    const span = half ? maxH / 2 : maxH
    return (Math.abs(v) / absMax) * span
  })
  const directions = values.map((v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero') as 'pos' | 'neg' | 'zero')
  return { absMax, zeroRatio, heights, directions }
}

/** "A0[1,4)" → { id: "A0", range: "[1,4)" } — presentation only, endpoints kept verbatim. */
export function splitIntervalLabel(label: string): { id: string; range: string } {
  const m = label.match(/^(.*?)(\[[^\]]*[\])])$/)
  if (!m) return { id: label, range: '' }
  return { id: m[1]!, range: m[2]! }
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
  signedDomain,
  ranges,
  arrayOps,
  elementIds,
  prevValues,
  prevElementIds,
  snapSwap = false,
  compact = false,
  labelFormat,
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
    () => (numeric ? computeBarGeometry(nums, scaleMax, maxH, signedDomain) : null),
    [numeric, nums, scaleMax, maxH, signedDomain],
  )
  const hasNegative = Boolean(
    geo && (signedDomain?.hasNeg || geo.zeroRatio < 1 || nums.some((n) => n < 0)),
  )
  const hasPositive = Boolean(geo && (signedDomain?.hasPos || nums.some((n) => n > 0)))
  const signedMode = Boolean(
    geo && (hasNegative || signedDomain?.hasNeg || nums.every((n) => n === 0)),
  )

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

  const hasPointers = pointersByIndex.size > 0
  const lanes = signedPlotLanes(signedMode ? geo : null, maxH)
  const lanesRef = useRef(lanes)
  lanesRef.current = lanes
  const interval = labelFormat === 'interval-card'

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
  // V24-01A: bar geometry comes from the box this ArrayView is actually allotted
  // (its own border-box, sized by the scene layout), never from the whole stage or
  // the viewport. Chrome (label, note, index row, pointer rows) is measured from the
  // real DOM, so the chart always fits the drawing area it gets.
  useLayoutEffect(() => {
    if (compact || mode !== 'bars') return
    const self = wrapRef.current
    if (!self) return
    const px = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
    const outerH = (el: Element | null) => {
      if (!el) return 0
      const cs = getComputedStyle(el)
      return (el as HTMLElement).offsetHeight + px(cs.marginTop) + px(cs.marginBottom)
    }
    const apply = () => {
      const box = self.getBoundingClientRect().height
      if (box <= 0) return
      const cs = getComputedStyle(self)
      const chromeY =
        px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth)
      const labelH = outerH(self.querySelector(':scope > .array-label'))
      const noteH = outerH(self.querySelector(':scope > .matrix-note'))
      const wrap = self.querySelector(':scope > .bars-wrap') as HTMLElement | null
      const wcs = wrap ? getComputedStyle(wrap) : null
      const wrapPad = wcs ? px(wcs.paddingTop) + px(wcs.paddingBottom) : 0
      let colChrome = 0
      if (signedMode && wrap) {
        // V25-02: annotation tracks (index + pointer rows) are MEASURED from the real
        // column (column height minus its plot area), plus the plot's edge lanes.
        // No fixed 40/24 guess — the plot never shares pixels with the annotations.
        for (const col of Array.from(wrap.querySelectorAll(':scope > .bar-col'))) {
          const plot = col.querySelector(':scope > .bar-plot') as HTMLElement | null
          colChrome = Math.max(colChrome, (col as HTMLElement).offsetHeight - (plot?.offsetHeight ?? 0))
        }
        colChrome = Math.max(colChrome, 30) + lanesRef.current.top + lanesRef.current.bottom
      } else if (wrap) {
        for (const col of Array.from(wrap.querySelectorAll(':scope > .bar-col'))) {
          const layer = col.querySelector(':scope > .bar-flip-layer') as HTMLElement | null
          colChrome = Math.max(colChrome, (col as HTMLElement).offsetHeight - (layer?.offsetHeight ?? 0))
        }
        colChrome = Math.max(colChrome, 30)
      }
      const budget = Math.floor(box - chromeY - labelH - noteH - wrapPad - colChrome - 2)
      const next = Math.max(32, budget)
      setMaxH((prev) => {
        if (Math.abs(prev - next) < 2) return prev
        // A re-fit is geometry, not data: land it without the 220ms height transition
        // (otherwise the old, larger bars would overhang the box mid-transition).
        if (wrap) {
          wrap.setAttribute('data-refit', '1')
          requestAnimationFrame(() => requestAnimationFrame(() => wrap.removeAttribute('data-refit')))
        }
        return next
      })
    }
    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    ro?.observe(self)
    // Chrome rows (stacked pointer tags, label wrap) can grow without the allotted box
    // changing — observe them too so the chart re-fits the same box.
    const chartEl = self.querySelector(':scope > .bars-wrap')
    if (chartEl) ro?.observe(chartEl)
    const labelEl = self.querySelector(':scope > .array-label')
    if (labelEl) ro?.observe(labelEl)
    window.addEventListener('resize', apply)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [compact, mode, values.length, signedMode, hasPositive, hasNegative, lanes.top, lanes.bottom])
  const geometryGen = useRef(0)
  const [rangeMasks, setRangeMasks] = useState<{
    current: { left: number; width: number; top: number; height: number }[]
    best: { left: number; width: number; top: number; height: number }[]
  }>({ current: [], best: [] })
  const overlayHostRef = useRef<HTMLDivElement>(null)

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


  // V12-05: range masks in overlay-host coords; resize remeasure; wrap segments include top/height
  useLayoutEffect(() => {
    const host = overlayHostRef.current ?? wrapRef.current
    if (!host) return
    const measure = (range: [number, number] | undefined) => {
      if (!range || values.length <= 0)
        return [] as { left: number; width: number; top: number; height: number }[]
      const lo = Math.max(0, Math.min(range[0], range[1]))
      const hi = Math.min(values.length - 1, Math.max(range[0], range[1]))
      const hostRect = host.getBoundingClientRect()
      const segs: { left: number; width: number; top: number; height: number }[] = []
      let segStart: DOMRect | null = null
      let segEnd: DOMRect | null = null
      let lastTop: number | null = null
      const flush = () => {
        if (!segStart || !segEnd) return
        segs.push({
          left: segStart.left - hostRect.left,
          width: segEnd.right - segStart.left,
          top: Math.min(segStart.top, segEnd.top) - hostRect.top,
          height: Math.max(segStart.bottom, segEnd.bottom) - Math.min(segStart.top, segEnd.top),
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
    const apply = () =>
      setRangeMasks({
        current: measure(ranges?.current),
        best: measure(ranges?.best),
      })
    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => apply()) : null
    ro?.observe(host)
    window.addEventListener('resize', apply)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
    }
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
          ref={overlayHostRef}
          style={
            {
              position: 'relative',
              // signed: plot span + edge lanes; the annotation tracks are laid out below the plot
              '--bar-chart-h': `${signedMode ? maxH + lanes.top + lanes.bottom : maxH + 24}px`,
              '--plot-span': `${maxH}px`,
              '--plot-lane-top': `${lanes.top}px`,
              '--plot-lane-bottom': `${lanes.bottom}px`,
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
              style={{ left: s.left, width: s.width, top: s.top, height: s.height }}
              title="最优窗口"
            />
          ))}
          {rangeMasks.current.map((s, i) => (
            <div
              key={`cur-${i}`}
              className="range-band current range-band-abs"
              style={{ left: s.left, width: s.width, top: s.top, height: s.height }}
              title="当前窗口"
            />
          ))}
          {rangeMasks.current.length === 0 && curBand && (
            <div className="range-band current" style={curBand} title="当前窗口" />
          )}
          {rangeMasks.best.length === 0 && bestBand && (
            <div className="range-band best" style={bestBand} title="最优窗口" />
          )}
          {/* V25-02: y(0) = pad + lane-top + zero-ratio·span (CSS), the same line the plot uses */}
          {signedMode && <div className="bar-baseline" data-zero-line aria-hidden />}
          {values.map((v, i) => {
            const role = roleForIndex(i, highlights, roles, arrayOps)
            const h = geo.heights[i]!
            const dir = geo.directions[i]!
            const ptrs = pointersByIndex.get(i) ?? []
            const isSwap = swapPair !== null && (i === swapPair[0] || i === swapPair[1])
            const eid = ids[i]!
            const flipLayer = (
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
                      h < SHORT_BAR_PX ? ' bar-short' : ''
                    }${
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
            )
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
                {signedMode ? (
                  <div className="bar-plot" data-bar-plot>
                    {flipLayer}
                  </div>
                ) : (
                  flipLayer
                )}
                <span className="bar-idx">{i}</span>
                <div className="pointer-row" data-ptr-count={ptrs.length}>
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
          <div className="array-cells" ref={overlayHostRef} style={{ position: 'relative' }}>
            {rangeMasks.best.map((s, i) => (
              <div
                key={`cell-best-${i}`}
                className="range-band best range-band-abs"
                style={{ left: s.left, width: s.width, top: s.top, height: s.height }}
                title="最优窗口"
              />
            ))}
            {rangeMasks.current.map((s, i) => (
              <div
                key={`cell-cur-${i}`}
                className="range-band current range-band-abs"
                style={{ left: s.left, width: s.width, top: s.top, height: s.height }}
                title="当前窗口"
              />
            ))}
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
                      }${interval ? ' cell-interval' : ''}`}
                    >
                      <span className="cell-idx">{i}</span>
                      {interval ? (
                        (() => {
                          const parts = splitIntervalLabel(String(v))
                          return (
                            <span className="cell-val cell-val-interval" title={String(v)}>
                              <span className="iv-id">{parts.id}</span>
                              <span className="iv-range">{parts.range}</span>
                            </span>
                          )
                        })()
                      ) : (
                        <span className="cell-val">{String(v)}</span>
                      )}
                    </div>
                  </div>
                  {(hasPointers || compact) && (
                    // V24: pointer tags sit under THEIR slot (aligned with value / index);
                    // compact companions always reserve the row so their height is stable.
                    <div className="pointer-row cell-ptrs">
                      {(pointersByIndex.get(i) ?? []).map((p) => (
                        <span key={p} className="ptr-tag" title={`${p}=${i}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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


/** V19-03: semantic compact sequence — readable chars/values, not clipped full ArrayView cards. */
function CompactSequenceStrip({
  step,
  entries,
}: {
  step: Step
  entries: [string, (number | string)[]][]
}) {
  const ptrs = step.arrayPointers ?? {}
  const highlights = step.highlights ?? {}
  const roles = step.roles ?? {}
  const contextBits: string[] = []
  for (const [name, values] of entries) {
    const p = ptrs[name]
    if (!p) continue
    for (const [lab, idx] of Object.entries(p)) {
      if (typeof idx === 'number' && idx >= 0 && idx < values.length) {
        contextBits.push(`${name}[${lab}=${idx}]='${values[idx]}'`)
      }
    }
  }
  return (
    <div className="compact-seq-row" data-testid="compact-seq-row">
      {entries.map(([name, values]) => {
        const hl = new Set(highlights[name] ?? [])
        const roleMap = roles[name] ?? {}
        const p = ptrs[name] ?? {}
        const ptrIdx = new Set(Object.values(p).filter((v): v is number => typeof v === 'number'))
        return (
          <div key={name} className="compact-seq" data-array={name} data-testid={`compact-seq-${name}`}>
            <span className="compact-seq-name">{name}</span>
            {values.map((v, i) => {
              const role = roleMap[i]
              const isFocus = role === 'focus' || role === 'compare' || hl.has(i)
              const isPtr = ptrIdx.has(i)
              return (
                <span
                  key={i}
                  className={`compact-ch${isFocus ? ' is-focus is-compare' : ''}${isPtr ? ' is-ptr' : ''}`}
                  data-idx={i}
                  data-testid={`compact-ch-${name}-${i}`}
                  title={`${name}[${i}]=${String(v)}`}
                >
                  {String(v)}
                </span>
              )
            })}
          </div>
        )
      })}
      {contextBits.length > 0 && (
        <span className="compact-context" data-testid="compact-context">
          {contextBits.join(' · ')}
        </span>
      )}
    </div>
  )
}

/** Aux copy buffers shown as a compact strip (not full-height second bar chart). */
const BUFFER_ARRAY_NAMES = new Set(['temp', 'left', 'right', 'key'])
/** String / label arrays that accompany a DP matrix (LCS X/Y) — compact labels, not primary scene. */
const LABEL_ARRAY_NAMES = new Set(['X', 'Y', 'x', 'y', 'S', 'T', 'pattern', 'text'])
const BUFFER_LABELS: Record<string, string> = {
  temp: 'temp · key',
  left: 'left',
  right: 'right',
  key: 'key',
  selected: '已选',
}

export const ArraysFromStep = memo(function ArraysFromStep({
  step,
  prevStep,
  scaleMaxByArray,
  signedDomainByArray,
  snapSwap,
  /** V18-02: when matrix/board is primary, render arrays as compact companion labels */
  companionMode = false,
  presentation,
  auxBar,
}: {
  step: Step
  prevStep?: Step
  scaleMaxByArray?: Record<string, number>
  signedDomainByArray?: Record<string, { hasPos: boolean; hasNeg: boolean }>
  snapSwap?: boolean
  companionMode?: boolean
  /** V24: declared array primary + companions (presentation contract). */
  presentation?: PresentationDescriptor
  /** V24: switchable-auxiliary controls rendered in the companion strip. */
  auxBar?: ReactNode
}) {
  if (!companionMode && presentation?.primaryKind === 'array' && presentation.primaryKey) {
    return (
      <DeclaredArrayScene
        step={step}
        prevStep={prevStep}
        scaleMaxByArray={scaleMaxByArray}
        signedDomainByArray={signedDomainByArray}
        snapSwap={snapSwap}
        presentation={presentation}
        auxBar={auxBar}
      />
    )
  }
  if (!step.arrays) return null
  const entries = Object.entries(step.arrays)
  const buffers = entries.filter(([name]) => BUFFER_ARRAY_NAMES.has(name))
  const primary = companionMode
    ? []
    : entries.filter(([name]) => !BUFFER_ARRAY_NAMES.has(name))
  // Companion: prefer X/Y-style labels, then any other non-buffer (all compact)
  const companionEntries = companionMode
    ? [
        ...entries.filter(([name]) => LABEL_ARRAY_NAMES.has(name)),
        ...entries.filter(
          ([name]) => !BUFFER_ARRAY_NAMES.has(name) && !LABEL_ARRAY_NAMES.has(name),
        ),
      ]
    : []
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
      signedDomain={signedDomainByArray?.[name]}
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
  if (companionMode) {
    return (
      <div
        className="arrays-panel array-labels-strip"
        data-testid="array-labels"
        data-companion="1"
        data-compact-semantic="1"
        aria-label="输入序列"
      >
        {companionEntries.length > 0 && (
          <CompactSequenceStrip step={step} entries={companionEntries} />
        )}
        {buffers.length > 0 && (
          <div className="array-buffers" data-testid="array-buffers" aria-label="临时缓冲">
            {buffers.map(([name, values]) => renderOne(name, values, true))}
          </div>
        )}
      </div>
    )
  }
  // V18-02 / V18.1: primary owns flex budget; aux buffers stay ON TOP inside stage
  // so mid-step temp/key remains in viz-canvas (primary-first was clipping buffers below fold).
  return (
    <div className="arrays-panel" data-array-order="primary-first" data-testid="arrays-panel">
      {buffers.length > 0 && (
        <div className="array-buffers" data-testid="array-buffers" aria-label="临时缓冲">
          {buffers.map(([name, values]) => renderOne(name, values, true))}
        </div>
      )}
      {primary.map(([name, values]) => renderOne(name, values, false))}
    </div>
  )
})


/**
 * V24-01: an array primary declared by the module's presentation contract.
 * Layout (top → bottom inside the stage):
 *   companion strip  — required companions (left/right, temp/key, selected) as compact
 *                      cells + the aux bar (recursion-tree toggle, call-stack summary).
 *                      Reserved on every frame when `reserveCompanions`, so the primary's
 *                      drawing area does not jump between frames.
 *   primary array    — takes the rest of the stage (flex basis 0); its bars/cells geometry
 *                      is computed from that allotted box (see ArrayView).
 * Auxiliaries (recursion tree) are never rendered here — Visualizer owns their pane.
 */
function DeclaredArrayScene({
  step,
  prevStep,
  scaleMaxByArray,
  signedDomainByArray,
  snapSwap,
  presentation,
  auxBar,
}: {
  step: Step
  prevStep?: Step
  scaleMaxByArray?: Record<string, number>
  signedDomainByArray?: Record<string, { hasPos: boolean; hasNeg: boolean }>
  snapSwap?: boolean
  presentation: PresentationDescriptor
  auxBar?: ReactNode
}) {
  const arrays = step.arrays ?? {}
  const key = presentation.primaryKey!
  const companionNames = presentation.companions ?? []
  const primaryValues = arrays[key]
  const companions = Object.entries(arrays).filter(([n]) => n !== key && companionNames.includes(n))
  // Any other array the module did not classify stays visible as a compact companion.
  const others = Object.entries(arrays).filter(([n]) => n !== key && !companionNames.includes(n))
  const compactEntries = [...companions, ...others]
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
      signedDomain={signedDomainByArray?.[name]}
      ranges={!compact ? step.ranges : undefined}
      arrayOps={step.arrayOps?.[name]}
      elementIds={step.elementIds?.[name]}
      prevValues={prevStep?.arrays?.[name]}
      prevElementIds={prevStep?.elementIds?.[name]}
      snapSwap={snapSwap}
      compact={compact}
      defaultMode={compact ? 'cells' : undefined}
      labelFormat={presentation.labelFormat?.[name]}
    />
  )
  const showStrip = compactEntries.length > 0 || presentation.reserveCompanions || auxBar
  return (
    <div
      className="arrays-panel"
      data-array-order="primary-first"
      data-declared-primary={key}
      data-testid="arrays-panel"
    >
      {showStrip && (
        <div
          className="scene-companions"
          data-testid="scene-companions"
          data-reserved={presentation.reserveCompanions ? '1' : '0'}
        >
          {compactEntries.length > 0 ? (
            <div className="array-buffers" data-testid="array-buffers" aria-label="临时缓冲">
              {compactEntries.map(([name, values]) => renderOne(name, values, true))}
            </div>
          ) : presentation.reserveCompanions ? (
            // Same card geometry as real companions (label + one cell + pointer row), so the
            // primary's allotted box does not change when buffers appear / disappear.
            <div
              className="array-buffers scene-companions-empty"
              data-testid="scene-companions-empty"
              aria-label={`${companionNames.join(' / ')}：本步无缓冲`}
            >
              {companionNames.slice(0, 2).map((name) => (
                <div key={name} className="array-view array-view-compact" data-placeholder="1">
                  <div className="array-label">
                    <span>{BUFFER_LABELS[name] ?? name}</span>
                  </div>
                  <div className="array-cells">
                    <div className="cell-slot">
                      <div className="cell cell-ghost">
                        <span className="cell-idx">&nbsp;</span>
                        <span className="cell-ghost-val muted">—</span>
                      </div>
                      <div className="pointer-row cell-ptrs" />
                    </div>
                  </div>
                </div>
              ))}
              <span className="scene-companions-note muted">本步无缓冲</span>
            </div>
          ) : null}
          {auxBar && <div className="scene-aux-bar">{auxBar}</div>}
        </div>
      )}
      {primaryValues ? (
        renderOne(key, primaryValues, false)
      ) : (
        <div className="viz-empty soft">本步无主数组 {key}</div>
      )}
    </div>
  )
}
