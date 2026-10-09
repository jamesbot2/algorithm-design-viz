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
import { SHORT_BAR_PX, SIGNED_MIN_SPAN_PX, signedLabelPlacement, signedPlotLanes } from './signedPlot'
import type { PlaybackTransition } from './workbench/playbackIntent'

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
  /** V30: the player's real displayed transition (from → to, intent, pause intent). */
  transition?: PlaybackTransition
  /** V30-02: ops of the step that defines from→to (later step when adjacent) — drives travel for Next AND Prev. */
  motionOps?: ArrayOp[]
  /** Compact buffer strip — prefer cells, smaller chart */
  compact?: boolean
  /** V24-02: label presentation for string cells (interval → id + [start,finish) card). */
  labelFormat?: 'interval-card'
  /**
   * V30-03b: run budget for the pointer track (main view only) — the worst stacked label set
   * any single slot carries across the whole run. The track is a fixed template sized by it,
   * so pointers appearing / stacking never move the plot or the next wrapped row.
   */
  pointerBudget?: PointerBudget
}

const ROLE_CLASS: Record<HighlightRole, string> = {
  compare: 'hl-compare',
  swap: 'hl-swap',
  sorted: 'hl-sorted',
  pivot: 'hl-pivot',
  read: 'hl-read',
  focus: 'hl-focus',
  done: 'hl-done',
  update: 'hl-update',
  accepted: 'hl-sorted',
  rejected: 'hl-read', // V29 M3: not swap language
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

export type PointerBudget = { labels: string[] }

const pointerBudgetCache = new WeakMap<Step[], Map<string, PointerBudget | undefined>>()
/** Worst per-slot pointer stack of `name` over the immutable run (by count, then label length). */
function pointerBudgetOf(runSteps: Step[] | undefined, name: string): PointerBudget | undefined {
  if (!runSteps || runSteps.length === 0) return undefined
  let byName = pointerBudgetCache.get(runSteps)
  if (!byName) {
    byName = new Map()
    pointerBudgetCache.set(runSteps, byName)
  }
  if (byName.has(name)) return byName.get(name)
  let best: string[] | null = null
  const score = (l: string[]) => l.length * 1000 + l.join('').length
  for (const s of runSteps) {
    const len = s.arrays?.[name]?.length ?? 0
    const at = new Map<number, string[]>()
    for (const [lab, idx] of Object.entries(deriveArrayPointers(s, name))) {
      if (typeof idx !== 'number' || idx < 0 || idx >= len) continue
      at.set(idx, [...(at.get(idx) ?? []), lab])
    }
    for (const l of at.values()) if (!best || score(l) > score(best)) best = l
  }
  const out = best ? { labels: best } : undefined
  byName.set(name, out)
  return out
}

/** Hidden, inert copy of the run's worst pointer stack: shares the track's grid cell. */
function PtrSizer({ labels }: { labels: string[] }) {
  return (
    <span className="ptr-sizer" aria-hidden="true">
      {labels.map((l) => (
        <span key={l} className="ptr-tag-sizer">
          {l}
        </span>
      ))}
    </span>
  )
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
  transition,
  motionOps,
  compact = false,
  labelFormat,
  pointerBudget,
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
  /** V25 acceptance: min box height (px) that still fits a SIGNED_MIN_SPAN_PX plot + its tracks. */
  const [signedFloor, setSignedFloor] = useState<number | null>(null)
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
  const ptrBudget = compact ? undefined : pointerBudget
  const lanes = signedPlotLanes(signedMode ? geo : null, maxH)
  /** Largest span s ≤ avail with s + lanes(s) ≤ avail (V25-02: lanes never starve the plot). */
  const fitSpanRef = useRef((avail: number) => Math.max(32, avail))
  fitSpanRef.current = (avail: number) => {
    for (let span = Math.floor(avail); span > 32; span -= 1) {
      const g = computeBarGeometry(nums, scaleMax, span, signedDomain)
      const l = signedPlotLanes(g, span)
      if (span + l.top + l.bottom <= avail) return span
    }
    return 32
  }
  /** Lanes of a SIGNED_MIN_SPAN_PX plot for the current values (ref: read inside the fit effect). */
  const floorLanesRef = useRef(() => ({ top: 0, bottom: 0 }))
  floorLanesRef.current = () =>
    signedPlotLanes(computeBarGeometry(nums, scaleMax, SIGNED_MIN_SPAN_PX, signedDomain), SIGNED_MIN_SPAN_PX)
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
  /** V30: layout centres (untransformed) of the snapshot this view last displayed, by element id. */
  const layoutCenters = useRef<Map<string, { x: number; y: number }>>(new Map())
  /** V30-02: element ids this view last displayed (the real FLIP source, not trace idx-1). */
  const lastIdsRef = useRef<string[] | null>(null)
  const animToken = useRef(0)
  const transitionIdRef = useRef(0)
  /** V29 M2: WAAPI FLIP animations — pause freezes, seek/epoch cancels. */
  const flipAnims = useRef<Map<string, Animation>>(new Map())
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
        colChrome = Math.max(colChrome, 30)
      } else if (wrap) {
        for (const col of Array.from(wrap.querySelectorAll(':scope > .bar-col'))) {
          const layer = col.querySelector(':scope > .bar-flip-layer') as HTMLElement | null
          colChrome = Math.max(colChrome, (col as HTMLElement).offsetHeight - (layer?.offsetHeight ?? 0))
        }
        colChrome = Math.max(colChrome, 30)
      }
      // V30-03b: the plot strut reads the same measured column chrome (no re-render needed).
      if (wrap && !signedMode) wrap.style.setProperty('--bars-col-chrome', `${colChrome}px`)
      const budget = Math.floor(box - chromeY - labelH - noteH - wrapPad - colChrome - 2)
      if (signedMode) {
        // Readable floor: the box never gets smaller than label + a SIGNED_MIN_SPAN_PX plot (with
        // its own lanes) + the measured annotation tracks; a shorter stage scrolls (scene.css)
        // instead of squashing the plot and cutting the index / pointer tracks.
        const l = floorLanesRef.current()
        const floor = Math.ceil(box - budget + SIGNED_MIN_SPAN_PX + l.top + l.bottom)
        setSignedFloor((prev) => (prev != null && Math.abs(prev - floor) < 1 ? prev : floor))
      }
      // signed: `budget` is the whole plot (lanes + span); pick the largest span whose
      // own lanes still fit — lanes are evaluated for the CANDIDATE span, not the current one.
      const next = signedMode ? fitSpanRef.current(budget) : Math.max(32, budget)
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

  // Clear transforms on cancel / remount / non-swap / seek snap
  const cancelFlipAnim = (anim: Animation) => {
    try {
      anim.cancel()
    } catch {
      /* ignore sync cancel errors */
    }
    // happy-dom rejects `finished` on cancel — avoid unhandled rejection
    try {
      void anim.finished.catch(() => {})
    } catch {
      /* ignore */
    }
  }
  const clearLayer = (el: HTMLElement) => {
    el.style.transition = 'none'
    el.style.transform = 'none'
    delete el.dataset.runFlip
    delete el.dataset.transitionId
    delete el.dataset.transitionFrom
    delete el.dataset.transitionTo
    delete el.dataset.actionIntent
    delete el.dataset.direction
  }
  const clearTransforms = () => {
    for (const anim of flipAnims.current.values()) cancelFlipAnim(anim)
    flipAnims.current.clear()
    for (const el of layerRefs.current.values()) {
      if (!el) continue
      clearLayer(el)
    }
    overlayHostRef.current?.removeAttribute('data-flip')
  }
  /** V30: layout (untransformed slot) centre of every displayed element id. */
  const measureLayout = (forIds: string[]) => {
    const out = new Map<string, { x: number; y: number }>()
    for (let i = 0; i < forIds.length; i++) {
      const el = slotRefs.current.get(i)
      if (!el) continue
      const r = el.getBoundingClientRect()
      out.set(forIds[i]!, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    return out
  }
  /** Current animated offset of a flip layer (WAAPI fill: forwards → computed transform). */
  const currentOffset = (el: HTMLElement | null | undefined) => {
    if (!el) return { x: 0, y: 0 }
    const tr = getComputedStyle(el).transform
    const m = tr && tr !== 'none' ? tr.match(/matrix\(([^)]+)\)/) : null
    if (!m) return { x: 0, y: 0 }
    const p = m[1]!.split(',').map(Number)
    return { x: p[4] || 0, y: p[5] || 0 }
  }

  useEffect(() => {
    return () => {
      animToken.current += 1
      clearTransforms()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Invalidate geometry cache on bars/cells toggle (hide→restore remounts layers);
  // re-measure the new layout so the very next step still travels.
  useEffect(() => {
    geometryGen.current += 1
    animToken.current += 1
    clearTransforms()
    layoutCenters.current = measureLayout(lastIdsRef.current ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // V29 M2 / V30-01: only an explicit Pause (transition.motionPaused) freezes in-flight WAAPI;
  // resume / manual step continues from the same progress. The autoplay flag is NOT consulted,
  // so a manual Next during autoplay plays its new transition instead of freezing it at t=0.
  const motionPaused = transition?.motionPaused ?? false
  useLayoutEffect(() => {
    for (const anim of flipAnims.current.values()) {
      try {
        if (motionPaused && anim.playState === 'running') anim.pause()
        else if (!motionPaused && anim.playState === 'paused') anim.play()
      } catch {
        /* ignore */
      }
    }
  }, [motionPaused])

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
      clearTransforms()
      animToken.current += 1
      layoutCenters.current = measureLayout(lastIdsRef.current ?? [])
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
  const lastTransitionKey = useRef<string | null>(null)

  useLayoutEffect(() => {
    const epochChanged = lastCancelEpoch.current !== transitionEpoch
    lastCancelEpoch.current = transitionEpoch
    const ops = motionOps ?? arrayOps
    const geomSig = `${ids.join('\0')}|${values.join('\0')}|${ops?.map((o) => `${o.type}:${o.indices.join(',')}`).join(';') ?? ''}`
    const geometryChanged = lastGeomSig.current !== geomSig
    lastGeomSig.current = geomSig
    const tKey = transition ? `${String(transition.runId ?? '')}|${transition.transitionId}` : null
    const transitionChanged = transition ? lastTransitionKey.current !== tKey : geometryChanged
    lastTransitionKey.current = tKey
    // Invalidate in-flight RAF/timeouts from any prior transition instance
    if (epochChanged || snapSwap) animToken.current += 1
    const transitionId = transition ? transition.transitionId : ++transitionIdRef.current
    const layers = layerRefs.current
    const host = overlayHostRef.current
    const newLayout = measureLayout(ids)
    const commit = () => {
      layoutCenters.current = newLayout
      lastIdsRef.current = ids
    }

    // Seek/reset/replace-run/replay or a non-adjacent jump: snapshot (cancel, no travel).
    const snapshotJump =
      snapSwap ||
      (epochChanged && !geometryChanged) ||
      (transition != null &&
        transitionChanged &&
        (transition.snapshot || Math.abs(transition.to - transition.from) !== 1))
    if (snapshotJump) {
      clearTransforms()
      commit()
      return
    }
    // Re-render without a new transition (theme, font, data tab, pause…): keep in-flight motion.
    if (!transitionChanged && !geometryChanged) {
      commit()
      return
    }

    // V30-02: FLIP source = the snapshot ACTUALLY displayed (this view's last committed ids),
    // target = current ids, matched by element identity — works for Next and Prev alike.
    const sourceIds = lastIdsRef.current ?? prevElementIds
    const movingIds = relocatingElementIds(sourceIds, ids)
    const motionSwapOp = ops?.find((o) => o.type === 'swap' && o.indices.length >= 2)
    const motionSwap = motionSwapOp ? ([motionSwapOp.indices[0]!, motionSwapOp.indices[1]!] as [number, number]) : swapPair
    const hasMoveOp = Boolean(ops?.some((o) => o.type === 'move'))
    const selfSwap = Boolean(motionSwap && motionSwap[0] === motionSwap[1])
    let flipIds: string[] = []
    if (selfSwap) {
      flipIds = []
    } else if (motionSwap !== null) {
      flipIds = movingIds.length > 0 ? movingIds : [ids[motionSwap[0]!]!, ids[motionSwap[1]!]!].filter(Boolean)
    } else if (hasMoveOp) {
      flipIds = movingIds
    } else if (movingIds.length > 0 && !ops?.some((o) => o.type === 'copy' || o.type === 'write')) {
      flipIds = movingIds
    }
    const flipSet = new Set(flipIds)

    const canFlip = flipIds.length > 0 && motionMode !== 'reduced' && swapMs > 0
    // In-flight motion of elements that are not part of this transition: keep it running when
    // their layout slot did not move (it still lands correctly); snap it when it did.
    for (const [id, anim] of [...flipAnims.current.entries()]) {
      if (canFlip && flipSet.has(id)) continue
      const a = layoutCenters.current.get(id)
      const b = newLayout.get(id)
      const moved = !a || !b || Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5
      if (moved) {
        cancelFlipAnim(anim)
        flipAnims.current.delete(id)
        const layer = layers.get(id)
        if (layer) clearLayer(layer)
      }
    }
    if (!canFlip) {
      if (flipAnims.current.size === 0) host?.removeAttribute('data-flip')
      commit()
      return
    }

    // V29 M1: pin chart track — disable in-slot height lerp while identity FLIP runs.
    host?.setAttribute('data-flip', '1')
    const ease = 'cubic-bezier(0.2, 0, 0, 1)' // no overshoot / elastic / back
    const direction = transition ? (transition.to >= transition.from ? 'forward' : 'backward') : 'forward'
    let started = 0
    for (const id of flipIds) {
      const layer = layers.get(id)
      const newCenter = newLayout.get(id)
      const base = layoutCenters.current.get(id)
      if (!layer || newCenter == null || base == null) continue
      // Interrupt: continue from the CURRENT rendered position (layout + in-flight offset).
      const off = flipAnims.current.has(id) ? currentOffset(layer) : { x: 0, y: 0 }
      const prior = flipAnims.current.get(id)
      if (prior) {
        flipAnims.current.delete(id)
        cancelFlipAnim(prior)
      }
      const dx = base.x + off.x - newCenter.x
      // Same-row bars: horizontal move only (shared baseline / zero domain).
      const dyRaw = base.y + off.y - newCenter.y
      const dy = Math.abs(dyRaw) < 4 ? 0 : dyRaw
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        clearLayer(layer)
        continue
      }
      layer.style.transition = 'none'
      layer.style.transform = 'none'
      layer.dataset.transitionId = String(transitionId)
      layer.dataset.runFlip = '1'
      layer.dataset.runId = String(transition?.runId ?? '')
      layer.dataset.transitionFrom = String(transition?.from ?? '')
      layer.dataset.transitionTo = String(transition?.to ?? '')
      layer.dataset.actionIntent = transition?.intent ?? 'legacy'
      layer.dataset.geometryVersion = String(geometryGen.current)
      layer.dataset.direction = direction
      const anim = layer.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0px, 0px)' },
        ],
        { duration: swapMs, easing: ease, fill: 'forwards' },
      )
      try {
        anim.id = `flip:${String(transition?.runId ?? '')}:${transitionId}:${id}`
      } catch {
        /* ignore */
      }
      flipAnims.current.set(id, anim)
      started += 1
      anim.addEventListener('finish', () => {
        // Stale callback guard: only the animation currently owning this element may clean up.
        if (flipAnims.current.get(id) !== anim) return
        flipAnims.current.delete(id)
        clearLayer(layer)
        try {
          anim.cancel() // drop fill:forwards effect; layer is at its layout slot
        } catch {
          /* ignore */
        }
        if (flipAnims.current.size === 0) overlayHostRef.current?.removeAttribute('data-flip')
      })
    }
    if (started === 0 && flipAnims.current.size === 0) host?.removeAttribute('data-flip')
    commit()
  }, [
    values,
    ids,
    swapPair,
    arrayOps,
    motionOps,
    transition,
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

  const floorOn = signedMode && !compact && mode === 'bars' && signedFloor != null
  const curBand = rangeStyle(ranges?.current, values.length)
  const bestBand = rangeStyle(ranges?.best, values.length)

  return (
    <div
      className={`array-view${compact ? ' array-view-compact' : ''}`}
      data-array={name}
      ref={wrapRef}
      data-flip-xy="1"
      data-compact={compact ? '1' : '0'}
      data-signed-floor={floorOn ? '1' : undefined}
      style={floorOn ? ({ '--signed-floor': `${signedFloor}px` } as CSSProperties) : undefined}
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
          data-flip={
            swapPair !== null || (motionOps ?? arrayOps)?.some((o) => o.type === 'move' || o.type === 'swap')
              ? '1'
              : undefined
          }
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
          {/* V30-03b: zero-width plot strut = the run's tallest column (scaleMax → maxH + measured
              chrome). A frame whose tallest element is parked in a buffer keeps the same baseline
              instead of lifting every bar; it never exceeds what a full frame already occupies. */}
          {!signedMode && (
            <span
              className="bars-strut"
              aria-hidden
              style={{ height: `calc(${maxH}px + var(--bars-col-chrome, 30px))` }}
            />
          )}
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
                    data-label-pos={signedMode ? signedLabelPlacement(h, dir, geo.zeroRatio, maxH) : undefined}
                    title={`[${i}] = ${v}`}
                  >
                    <span className="bar-val">{String(v)}</span>
                  </div>
                )}
              </div>
            )
            // V29 M2: identity key — React reorders the column with the element; height travels with id.
            return (
              <div
                key={eid}
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
                <div className="pointer-row" data-ptr-count={ptrs.length} data-ptr-budget={ptrBudget ? ptrBudget.labels.length : undefined}>
                  {ptrBudget ? (
                    <>
                      <span className="ptr-live">
                        {ptrs.map((p) => (
                          <span key={p} className="ptr-tag">
                            {p}
                          </span>
                        ))}
                      </span>
                      <PtrSizer labels={ptrBudget.labels} />
                    </>
                  ) : (
                    ptrs.map((p) => (
                      <span key={p} className="ptr-tag">
                        {p}
                      </span>
                    ))
                  )}
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
                  {(hasPointers || compact || ptrBudget) && (
                    // V24: pointer tags sit under THEIR slot (aligned with value / index);
                    // compact companions always reserve the row so their height is stable.
                    // V30-03b: the main view reserves the run's worst stack (hidden sizer).
                    <div className="pointer-row cell-ptrs" data-ptr-budget={ptrBudget ? ptrBudget.labels.length : undefined}>
                      {ptrBudget ? (
                        <>
                          <span className="ptr-live">
                            {(pointersByIndex.get(i) ?? []).map((p) => (
                              <span key={p} className="ptr-tag" title={`${p}=${i}`}>
                                {p}
                              </span>
                            ))}
                          </span>
                          <PtrSizer labels={ptrBudget.labels} />
                        </>
                      ) : (
                        (pointersByIndex.get(i) ?? []).map((p) => (
                          <span key={p} className="ptr-tag" title={`${p}=${i}`}>
                            {p}
                          </span>
                        ))
                      )}
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

/** V30-02: ops describing the displayed from→to transition (undefined → legacy target ops). */
function motionOpsFor(motionStep: Step | undefined, transition: PlaybackTransition | undefined, name: string): ArrayOp[] | undefined {
  if (!transition) return undefined
  if (!motionStep) return []
  return motionStep.arrayOps?.[name] ?? []
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
  transition,
  motionStep,
  /** V18-02: when matrix/board is primary, render arrays as compact companion labels */
  companionMode = false,
  presentation,
  auxBar,
  auxBarFor,
  runSteps,
}: {
  step: Step
  prevStep?: Step
  scaleMaxByArray?: Record<string, number>
  signedDomainByArray?: Record<string, { hasPos: boolean; hasNeg: boolean }>
  snapSwap?: boolean
  /** V30: real displayed transition + the step whose ops define it. */
  transition?: PlaybackTransition
  motionStep?: Step
  /** V30-03: inert aux-bar clone per frame + the run, for the companion-strip budget. */
  auxBarFor?: (s: Step) => ReactNode
  runSteps?: Step[]
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
        transition={transition}
        motionStep={motionStep}
        presentation={presentation}
        auxBar={auxBar}
        auxBarFor={auxBarFor}
        runSteps={runSteps}
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
      transition={transition}
      motionOps={motionOpsFor(motionStep, transition, name)}
      compact={compact}
      defaultMode={compact ? 'cells' : undefined}
      pointerBudget={compact ? undefined : pointerBudgetOf(runSteps, name)}
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
    <div
      className="arrays-panel"
      data-array-order="primary-first"
      data-testid="arrays-panel"
      data-multi-primary={primary.length > 1 ? '1' : undefined}
    >
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
 * V30-03: ONE geometry template for compact companion cards. The real compact ArrayView
 * (cells mode) renders exactly this markup per slot (label · cell-slot › cell-flip-layer ›
 * cell[cell-idx + cell-val] · pointer-row); the empty-frame placeholder and the run-budget
 * sizers render it through this component, so ghost and real cards share font, line-height,
 * index track and pointer track by construction (no per-pixel padding).
 */
export function CompactCellsCard({
  label,
  values,
  pointers,
  placeholder = false,
}: {
  label: string
  values: (number | string)[]
  pointers?: Record<string, number>
  placeholder?: boolean
}) {
  const byIdx = new Map<number, string[]>()
  for (const [lab, idx] of Object.entries(pointers ?? {})) {
    if (typeof idx !== 'number') continue
    byIdx.set(idx, [...(byIdx.get(idx) ?? []), lab])
  }
  const shown = placeholder ? ['—'] : values
  return (
    <div className="array-view array-view-compact" data-placeholder={placeholder ? '1' : undefined}>
      <div className="array-label">
        <span>{label}</span>
      </div>
      <div className="array-cells" style={{ position: 'relative' }}>
        {shown.map((v, i) => (
          <div key={i} className="cell-slot">
            <div className="cell-flip-layer" style={{ transform: 'none' }}>
              <div className={`cell${placeholder ? ' cell-ghost' : ''}`}>
                <span className="cell-idx">{placeholder ? '\u00a0' : i}</span>
                <span className={`cell-val${placeholder ? ' cell-ghost-val muted' : ''}`}>{String(v)}</span>
              </div>
            </div>
            <div className="pointer-row cell-ptrs">
              {(byIdx.get(i) ?? []).map((lab) => (
                <span key={lab} className="ptr-tag">
                  {lab}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type CompanionEntry = [string, (number | string)[]]

function companionEntriesOf(step: Step, key: string, companionNames: string[]): CompanionEntry[] {
  const arrays = step.arrays ?? {}
  const companions = Object.entries(arrays).filter(([n]) => n !== key && companionNames.includes(n))
  // Any other array the module did not classify stays visible as a compact companion.
  const others = Object.entries(arrays).filter(([n]) => n !== key && !companionNames.includes(n))
  return [...companions, ...others]
}

function auxSignature(step: Step, callStackVar?: string): string {
  if (!callStackVar) return ''
  const cs = step.vars?.[callStackVar]
  if (typeof cs !== 'string' || cs === '(empty)') return `~${String(cs)}`
  const frames = cs.split(' › ')
  return `${frames[frames.length - 1]}|${frames.length}`
}

/** Width-relevant shape of a frame's companion strip (mono values → char count; pointer labels). */
function companionShape(step: Step, entries: CompanionEntry[], callStackVar?: string): string {
  const cards = entries.length
    ? entries
        .map(([n, vals]) => {
          const ptrs = deriveArrayPointers(step, n)
          const at = new Map<number, string[]>()
          for (const [lab, i] of Object.entries(ptrs)) if (typeof i === 'number') at.set(i, [...(at.get(i) ?? []), lab])
          return `${n}:${vals.map((v, i) => `${String(v).length}${at.has(i) ? `(${at.get(i)!.join(',')})` : ''}`).join(' ')}`
        })
        .join(';')
    : '∅'
  return `${cards}#${auxSignature(step, callStackVar)}`
}

const MAX_SIZERS = 240

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
 *
 * V30-03: the strip height is budgeted by the RUN's maximum legal content, not per-frame
 * growth: every distinct strip shape of the run is laid out (visibility:hidden, inert) in
 * the same grid cell as the live row, so the cell is as tall as the tallest frame — no
 * measured min-height, no ratchet, no clipping, no font shrink.
 */
function DeclaredArrayScene({
  step,
  prevStep,
  scaleMaxByArray,
  signedDomainByArray,
  snapSwap,
  transition,
  motionStep,
  presentation,
  auxBar,
  auxBarFor,
  runSteps,
}: {
  step: Step
  prevStep?: Step
  scaleMaxByArray?: Record<string, number>
  signedDomainByArray?: Record<string, { hasPos: boolean; hasNeg: boolean }>
  snapSwap?: boolean
  transition?: PlaybackTransition
  motionStep?: Step
  presentation: PresentationDescriptor
  auxBar?: ReactNode
  /** V30-03: inert aux-bar clone for a given frame (run-budget sizers). */
  auxBarFor?: (s: Step) => ReactNode
  /** V30-03: the whole run (immutable trace) — used only to budget the companion strip. */
  runSteps?: Step[]
}) {
  const arrays = step.arrays ?? {}
  const key = presentation.primaryKey!
  const companionNames = useMemo(() => presentation.companions ?? [], [presentation.companions])
  const primaryValues = arrays[key]
  const compactEntries = companionEntriesOf(step, key, companionNames)
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
      transition={transition}
      motionOps={motionOpsFor(motionStep, transition, name)}
      compact={compact}
      defaultMode={compact ? 'cells' : undefined}
      labelFormat={presentation.labelFormat?.[name]}
      pointerBudget={compact ? undefined : pointerBudgetOf(runSteps, name)}
    />
  )
  const hasLabelFormats = Boolean(presentation.labelFormat && Object.keys(presentation.labelFormat).some((n) => n !== key))
  const budgetOn = Boolean(presentation.reserveCompanions && runSteps && runSteps.length > 1 && !hasLabelFormats)
  /** One representative frame per distinct strip shape of the run (bounded). */
  const sizerFrames = useMemo(() => {
    if (!budgetOn || !runSteps) return [] as Step[]
    const seen = new Map<string, Step>()
    for (const s of runSteps) {
      const shape = companionShape(s, companionEntriesOf(s, key, companionNames), presentation.callStackVar)
      if (!seen.has(shape)) seen.set(shape, s)
      if (seen.size >= MAX_SIZERS) break
    }
    return [...seen.values()]
  }, [budgetOn, runSteps, key, companionNames, presentation.callStackVar])
  /**
   * V30-03 fit guard: the run-max strip is only used when it still leaves the main array its
   * floor inside the stage viewport. Otherwise (narrow split pane with the tree open, very short
   * stage) the strip becomes a CAPPED band of one fixed height for the whole run:
   *   cap = clamp(stage − main floor − chrome, smallest run shape, run-max)
   * Frames whose companions exceed the cap scroll locally inside the band (the tree toggle is
   * sticky in it), so the main array keeps one allocation on every frame and is never pushed
   * lower than the smallest legal strip would put it. Decided from measured geometry only.
   */
  const panelRef = useRef<HTMLDivElement>(null)
  /** null = run-max fits; number = capped band height (px). */
  const [budgetCap, setBudgetCap] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!budgetOn) return
    const panel = panelRef.current
    const stage = panel?.closest('[data-stage-viewport]') as HTMLElement | null
    if (!panel || !stage) return
    const px = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
    const check = () => {
      const strip = panel.querySelector(':scope > .scene-companions') as HTMLElement | null
      const main = panel.querySelector(':scope > .array-view') as HTMLElement | null
      if (!strip || !main) return
      let sizerMax = 0
      let sizerMin = Infinity
      for (const s of Array.from(strip.querySelectorAll(':scope > .scene-companions-sizer'))) {
        const h = (s as HTMLElement).getBoundingClientRect().height
        sizerMax = Math.max(sizerMax, h)
        sizerMin = Math.min(sizerMin, h)
      }
      if (!Number.isFinite(sizerMin)) return
      const pcs = getComputedStyle(panel)
      const pane = panel.parentElement
      const acs = pane ? getComputedStyle(pane) : null
      const mcs = getComputedStyle(main)
      const chrome =
        px(pcs.rowGap) + px(pcs.paddingTop) + px(pcs.paddingBottom) +
        (acs ? px(acs.paddingTop) + px(acs.paddingBottom) : 0) + px(mcs.marginTop) + px(mcs.marginBottom)
      const avail = stage.clientHeight - px(mcs.minHeight) - chrome
      const cap = sizerMax <= avail + 0.5 ? null : Math.max(sizerMin, Math.min(avail, sizerMax))
      setBudgetCap((prev) =>
        prev === cap || (prev !== null && cap !== null && Math.abs(prev - cap) < 0.5) ? prev : cap,
      )
    }
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(stage)
    ro?.observe(panel)
    // capped sizers are out of flow: a shape change (fonts, width) does not resize the panel
    for (const sz of Array.from(panel.querySelectorAll(':scope > .scene-companions > .scene-companions-sizer'))) ro?.observe(sz)
    return () => ro?.disconnect()
  }, [budgetOn, sizerFrames])

  const ghost = (sizer: boolean) => (
    <div
      className="array-buffers scene-companions-empty"
      data-testid={sizer ? undefined : 'scene-companions-empty'}
      aria-label={sizer ? undefined : `${companionNames.join(' / ')}：本步无缓冲`}
    >
      {companionNames.slice(0, 2).map((name) => (
        <CompactCellsCard key={name} label={BUFFER_LABELS[name] ?? name} values={[]} placeholder />
      ))}
      <span className="scene-companions-note muted">本步无缓冲</span>
    </div>
  )
  const showStrip = compactEntries.length > 0 || presentation.reserveCompanions || auxBar
  return (
    <div
      ref={panelRef}
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
          data-budget={budgetOn ? (budgetCap === null ? 'run-max' : 'capped') : undefined}
          style={budgetOn && budgetCap !== null ? ({ '--companion-cap': `${budgetCap}px` } as CSSProperties) : undefined}
          data-sizers={budgetOn ? sizerFrames.length : undefined}
        >
          <div className="scene-companions-row" data-live="1">
            {compactEntries.length > 0 ? (
              <div className="array-buffers" data-testid="array-buffers" aria-label="临时缓冲">
                {compactEntries.map(([name, values]) => renderOne(name, values, true))}
              </div>
            ) : presentation.reserveCompanions ? (
              ghost(false)
            ) : null}
            {auxBar && <div className="scene-aux-bar">{auxBar}</div>}
          </div>
          {sizerFrames.map((s, k) => {
            const entries = companionEntriesOf(s, key, companionNames)
            const aux = auxBarFor?.(s)
            return (
              <div key={k} className="scene-companions-row scene-companions-sizer" aria-hidden="true" inert>
                {entries.length > 0 ? (
                  <div className="array-buffers">
                    {entries.map(([name, values]) => (
                      <CompactCellsCard
                        key={name}
                        label={BUFFER_LABELS[name] ?? name}
                        values={values}
                        pointers={deriveArrayPointers(s, name)}
                      />
                    ))}
                  </div>
                ) : (
                  ghost(true)
                )}
                {aux && <div className="scene-aux-bar">{aux}</div>}
              </div>
            )
          })}
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
