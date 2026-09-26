import type { Page } from '@playwright/test'

/**
 * V24-03 primary-object visibility detector.
 *
 * Checks the stage's REAL animated objects (bars / cells / values / indices /
 * pointers / forest nodes / interval labels) against the drawing area:
 *   element box ∩ every clipping ancestor (overflow ≠ visible) ∩ viewport,
 * with sub-pixel tolerance, plus a topmost hit-test at the centre.
 *
 * Scope rules (V24-03 §6): only elements inside the ONE visible stage
 * ([data-testid="viz-canvas"]) are counted; anything under an inert /
 * aria-hidden measuring probe, `[hidden]`, or display:none is excluded.
 * No fault-specific ids — the same selectors run on the normal page and on
 * negative-control injections.
 */

export interface ObjVis {
  group: string
  text: string
  elW: number
  elH: number
  visW: number
  visH: number
  full: boolean
  hit: boolean
}

export interface StageObjects {
  frame: {
    runId: string | null
    stepIndex: number
    counter: string
    banner: string
    execLine: number
    primary: string | null
    primaryKind: string | null
    vp: { w: number; h: number }
  }
  stage: { x: number; y: number; w: number; h: number } | null
  groups: Record<string, ObjVis[]>
}

/** Selectors (relative to the stage) for each object group to measure. */
export type GroupSelectors = Record<string, string>

export async function measureStageObjects(page: Page, groups: GroupSelectors, tol = 0.75): Promise<StageObjects> {
  return page.evaluate(
    ({ groups, tol }) => {
      const stage = [...document.querySelectorAll('[data-testid="viz-canvas"]')].find(
        (s) => !s.closest('[inert],[aria-hidden="true"],[hidden]'),
      ) as HTMLElement | undefined
      const excluded = (el: Element) => {
        if (el.closest('[inert],[aria-hidden="true"],[hidden]')) return true
        const cs = getComputedStyle(el)
        return cs.display === 'none'
      }
      const clip = (el: Element) => {
        const a = el.getBoundingClientRect()
        let t = a.top
        let b = a.bottom
        let l = a.left
        let r = a.right
        let n = el.parentElement
        let invisible = false
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n)
          if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) invisible = true
          if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
            const nr = n.getBoundingClientRect()
            t = Math.max(t, nr.top)
            b = Math.min(b, nr.bottom)
            l = Math.max(l, nr.left)
            r = Math.min(r, nr.right)
          }
          n = n.parentElement
        }
        const own = getComputedStyle(el)
        if (own.visibility === 'hidden' || Number(own.opacity) === 0) invisible = true
        t = Math.max(t, 0)
        l = Math.max(l, 0)
        b = Math.min(b, window.innerHeight)
        r = Math.min(r, window.innerWidth)
        const visW = invisible ? 0 : Math.max(0, r - l)
        const visH = invisible ? 0 : Math.max(0, b - t)
        return { a, visW, visH }
      }
      const out: Record<string, unknown[]> = {}
      for (const [g, sel] of Object.entries(groups)) {
        const els = stage ? [...stage.querySelectorAll(sel)].filter((e) => !excluded(e)) : []
        out[g] = els.map((el) => {
          const { a, visW, visH } = clip(el)
          const full = a.width > 0 && a.height > 0 && visW >= a.width - tol && visH >= a.height - tol
          let hit = false
          if (full) {
            const top = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)
            hit = !!top && (el === top || el.contains(top))
          }
          return {
            group: g,
            text: (el.textContent || '').trim().slice(0, 24),
            elW: Math.round(a.width * 100) / 100,
            elH: Math.round(a.height * 100) / 100,
            visW: Math.round(visW * 100) / 100,
            visH: Math.round(visH * 100) / 100,
            full,
            hit,
          }
        })
      }
      const viz = document.querySelector('[data-testid="visualizer"]')
      const wrap = document.querySelector('[data-testid="code-mirror-wrap"]')
      const sr = stage?.getBoundingClientRect()
      return {
        frame: {
          runId: viz?.getAttribute('data-run-id') ?? null,
          stepIndex: Number(viz?.getAttribute('data-step-index') ?? -1),
          counter: document.querySelector('[data-testid="step-counter"]')?.textContent?.trim() ?? '',
          banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim() ?? '',
          execLine: Number(wrap?.getAttribute('data-exec-line') || 0),
          primary: stage?.getAttribute('data-primary-scene') ?? null,
          primaryKind: stage?.getAttribute('data-primary-kind') ?? null,
          vp: { w: window.innerWidth, h: window.innerHeight },
        },
        stage: sr ? { x: sr.left, y: sr.top, w: sr.width, h: sr.height } : null,
        groups: out as Record<string, ObjVis[]>,
      }
    },
    { groups, tol },
  )
}

/** Stage `a` (never the buffers, never the data table) — bars or cells mode. */
export const MAIN_ARRAY_GROUPS = (name = 'a'): GroupSelectors => {
  const root = `.array-view[data-array="${name}"]:not(.array-buffers .array-view)`
  return {
    slots: `${root} [data-slot-index]`,
    bars: `${root} .bar, ${root} .bar-zero-marker`,
    values: `${root} .bar-val, ${root} .cell-val`,
    indices: `${root} .bar-idx, ${root} .cell-idx`,
    pointers: `${root} .ptr-tag`,
  }
}

export const BUFFER_GROUPS: GroupSelectors = {
  bufferValues: '[data-testid="array-buffers"] .cell-val',
}

/** Huffman: forest nodes (symbol leaves + merged parents) and the compact input table. */
export const HUFFMAN_GROUPS: GroupSelectors = {
  forestNodes: '[data-forest-node]',
  forestLeaves: '[data-forest-node][data-leaf="1"]',
  forestLabels: '[data-forest-node] .fn-label',
  inputSymbols: '[data-testid="huffman-input-table"] [data-sym]',
  // the glyphs inside each chip (symbol + frequency): a chip box can be visible while its text is cut
  inputGlyphs: '[data-testid="huffman-input-table"] [data-sym] > b, [data-testid="huffman-input-table"] [data-sym] > .fh-freq',
  // legacy (V23) array presentation — measured so before/after compare the same objects
  legacySymbols: '.array-view[data-array="symbols"] .cell-val',
  legacyFreqs: '.array-view[data-array="freqs"] .bar-val, .array-view[data-array="freqs"] .cell-val',
}

export function notFullyVisible(list: ObjVis[]): ObjVis[] {
  return list.filter((o) => !o.full)
}

/**
 * Failure list for a primary array (empty = pass). Buffers are NOT consulted:
 * "a value in buffers" never stands in for `a` being shown (V24-03 §4).
 */
export function mainArrayFailures(m: StageObjects, expectLen: number, opts: { requireHit?: boolean } = {}): string[] {
  const f: string[] = []
  const g = m.groups
  if ((g.slots?.length ?? 0) !== expectLen) f.push(`a:slots ${g.slots?.length ?? 0}/${expectLen}`)
  if ((g.values?.length ?? 0) !== expectLen) f.push(`a:values ${g.values?.length ?? 0}/${expectLen}`)
  for (const k of ['slots', 'bars', 'values', 'indices', 'pointers'] as const) {
    const bad = notFullyVisible(g[k] ?? [])
    if (bad.length) f.push(`a:${k} clipped ${bad.length}/${g[k]!.length} (minVisH ${Math.min(...bad.map((b) => b.visH))})`)
  }
  if (opts.requireHit !== false) {
    const miss = (g.values ?? []).filter((v) => v.full && !v.hit)
    if (miss.length) f.push(`a:values occluded ${miss.length}`)
  }
  return f
}

/** Per-array stage values in DOM slot order (for same-frame semantic comparison). */
export async function stageArrayValues(page: Page, name: string): Promise<string[]> {
  return page.evaluate((name) => {
    const stage = document.querySelector('[data-testid="viz-canvas"]')
    const view = stage
      ? [...stage.querySelectorAll(`.array-view[data-array="${name}"]`)].find((v) => !v.closest('.array-buffers'))
      : undefined
    if (!view) return []
    return [...view.querySelectorAll('[data-slot-index]')].map(
      (s) => (s.querySelector('.bar-val, .cell-val')?.textContent ?? '').trim(),
    )
  }, name)
}

export interface LabelBox {
  text: string
  left: number
  right: number
  top: number
  bottom: number
  full: boolean
}

/**
 * Real TEXT rects (Range over each label's text) — not textContent / CSS font-size.
 * Returns neighbour overlaps (> tol px in both axes) and clipped labels.
 */
export async function measureLabelText(page: Page, selector: string, tol = 0.5) {
  return page.evaluate(
    ({ selector, tol }) => {
      const stage = document.querySelector('[data-testid="viz-canvas"]')
      const els = stage
        ? [...stage.querySelectorAll(selector)].filter((e) => !e.closest('[inert],[aria-hidden="true"],[hidden]'))
        : []
      const boxes = els.map((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
        const left = Math.min(...rects.map((r) => r.left))
        const right = Math.max(...rects.map((r) => r.right))
        const top = Math.min(...rects.map((r) => r.top))
        const bottom = Math.max(...rects.map((r) => r.bottom))
        // clip through ancestors
        let t = top
        let b = bottom
        let l = left
        let r = right
        let n = el.parentElement
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n)
          if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
            const nr = n.getBoundingClientRect()
            t = Math.max(t, nr.top)
            b = Math.min(b, nr.bottom)
            l = Math.max(l, nr.left)
            r = Math.min(r, nr.right)
          }
          n = n.parentElement
        }
        t = Math.max(t, 0)
        l = Math.max(l, 0)
        b = Math.min(b, window.innerHeight)
        r = Math.min(r, window.innerWidth)
        const full = rects.length > 0 && r - l >= right - left - tol && b - t >= bottom - top - tol
        return { text: (el.textContent || '').trim(), left, right, top, bottom, full, rects: rects.length }
      })
      const overlaps: { a: string; b: string; dx: number; dy: number }[] = []
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i]!
          const B = boxes[j]!
          const dx = Math.min(A.right, B.right) - Math.max(A.left, B.left)
          const dy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top)
          if (dx > tol && dy > tol) overlaps.push({ a: A.text, b: B.text, dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100 })
        }
      }
      return {
        count: boxes.length,
        overlaps,
        clipped: boxes.filter((b) => !b.full).map((b) => b.text),
        widths: boxes.map((b) => Math.round((b.right - b.left) * 100) / 100),
        boxes,
      }
    },
    { selector, tol },
  )
}

/**
 * V25-02 signed-chart annotation check — same detection path as the V24 detector
 * (real stage, one visible canvas, main array only, buffers excluded).
 *
 * A "conflict" is a REAL reading collision, not any bounding-box intersection:
 *   pointer tag (border box)  × value glyphs (Range) / bar bodies / index glyphs / other tags
 *   index glyphs (Range)      × value glyphs / bar bodies
 *   value glyphs of slot i    × bar body of slot j ≠ i   (label spilling onto a neighbour)
 * Range bands, the zero line, state colours and focus outlines may overlap by design and
 * are NOT counted. Also reports: pointer/index alignment with their own slot, value glyphs
 * outside their plot area, zero-value data height, and the zero-line geometry.
 */
export interface SignedAnnotationReport {
  signed: boolean
  slots: {
    i: number
    value: string
    dir: string | null
    dataH: number
    barH: number
    ptrs: string[]
    valueInPlot: boolean
    ptrAligned: boolean
    idxAligned: boolean
  }[]
  conflicts: { a: string; b: string; dx: number; dy: number }[]
  zeroLineY: number | null
  posBottoms: number[]
  negTops: number[]
  zeroMarkerCenters: number[]
}

export async function measureSignedAnnotations(page: Page, name = 'a', tol = 0.5): Promise<SignedAnnotationReport> {
  return page.evaluate(
    ({ name, tol }) => {
      type R = { l: number; r: number; t: number; b: number }
      const glyph = (el: Element | null): R | null => {
        if (!el) return null
        const range = document.createRange()
        range.selectNodeContents(el)
        const rs = [...range.getClientRects()].filter((x) => x.width > 0 && x.height > 0)
        if (!rs.length) return null
        return {
          l: Math.min(...rs.map((x) => x.left)),
          r: Math.max(...rs.map((x) => x.right)),
          t: Math.min(...rs.map((x) => x.top)),
          b: Math.max(...rs.map((x) => x.bottom)),
        }
      }
      const box = (el: Element | null): R | null => {
        if (!el) return null
        const x = el.getBoundingClientRect()
        return x.width > 0 && x.height > 0 ? { l: x.left, r: x.right, t: x.top, b: x.bottom } : null
      }
      const ov = (A: R | null, B: R | null) => {
        if (!A || !B) return null
        const dx = Math.min(A.r, B.r) - Math.max(A.l, B.l)
        const dy = Math.min(A.b, B.b) - Math.max(A.t, B.t)
        return dx > tol && dy > tol ? { dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100 } : null
      }
      const stage = [...document.querySelectorAll('[data-testid="viz-canvas"]')].find(
        (s) => !s.closest('[inert],[aria-hidden="true"],[hidden]'),
      )
      const view = stage
        ? [...stage.querySelectorAll(`.array-view[data-array="${name}"]`)].find((v) => !v.closest('.array-buffers'))
        : undefined
      const wrap = view?.querySelector('.bars-wrap') ?? null
      const slotEls = view ? [...view.querySelectorAll('[data-slot-index]')] : []
      const S = slotEls.map((s) => {
        const val = s.querySelector('.bar-val, .cell-val')
        const barEl = s.querySelector('.bar, .bar-zero-marker')
        const plot = s.querySelector('.bar-plot')
        return {
          i: Number(s.getAttribute('data-slot-index')),
          value: (val?.textContent ?? '').trim(),
          dir: s.getAttribute('data-bar-dir'),
          dataH: Number(barEl?.getAttribute('data-data-height') ?? NaN),
          slot: box(s)!,
          plot: box(plot),
          val: glyph(val),
          bar: box(barEl),
          barIsZero: !!barEl?.matches('.bar-zero-marker'),
          idx: glyph(s.querySelector('.bar-idx, .cell-idx')),
          ptrs: [...s.querySelectorAll('.ptr-tag')].map((t) => ({ label: (t.textContent ?? '').trim(), r: box(t) })),
        }
      })
      const conflicts: { a: string; b: string; dx: number; dy: number }[] = []
      const push = (a: string, b: string, o: { dx: number; dy: number } | null) => {
        if (o) conflicts.push({ a, b, ...o })
      }
      for (const A of S) {
        for (const p of A.ptrs) {
          for (const B of S) {
            push(`ptr ${p.label}@${A.i}`, `value ${B.value}@${B.i}`, ov(p.r, B.val))
            push(`ptr ${p.label}@${A.i}`, `bar ${B.value}@${B.i}`, ov(p.r, B.bar))
            push(`ptr ${p.label}@${A.i}`, `index @${B.i}`, ov(p.r, B.idx))
            for (const q of B.ptrs) if (q !== p && (B.i > A.i || (B.i === A.i && A.ptrs.indexOf(q) > A.ptrs.indexOf(p)))) push(`ptr ${p.label}@${A.i}`, `ptr ${q.label}@${B.i}`, ov(p.r, q.r))
          }
        }
        for (const B of S) {
          push(`index @${A.i}`, `value ${B.value}@${B.i}`, ov(A.idx, B.val))
          // bars/markers mode: an index glyph on any bar body is a collision
          if (wrap) push(`index @${A.i}`, `bar ${B.value}@${B.i}`, ov(A.idx, B.bar))
          if (wrap && B.i !== A.i) push(`value ${A.value}@${A.i}`, `bar ${B.value}@${B.i}`, ov(A.val, B.bar))
        }
      }
      const cx = (r: R | null) => (r ? (r.l + r.r) / 2 : NaN)
      const zl = wrap?.querySelector('.bar-baseline')?.getBoundingClientRect()
      return {
        signed: wrap?.getAttribute('data-signed') === '1',
        slots: S.map((s) => ({
          i: s.i,
          value: s.value,
          dir: s.dir,
          dataH: s.dataH,
          barH: s.bar ? Math.round((s.bar.b - s.bar.t) * 100) / 100 : 0,
          ptrs: s.ptrs.map((p) => p.label),
          valueInPlot: !s.plot || !s.val ? true : s.val.t >= s.plot.t - tol && s.val.b <= s.plot.b + tol,
          ptrAligned: s.ptrs.every((p) => cx(p.r) >= s.slot.l - tol && cx(p.r) <= s.slot.r + tol),
          idxAligned: !s.idx || (cx(s.idx) >= s.slot.l - tol && cx(s.idx) <= s.slot.r + tol),
        })),
        conflicts,
        zeroLineY: zl ? zl.top + zl.height / 2 : null,
        posBottoms: S.filter((s) => s.dir === 'pos' && s.bar).map((s) => s.bar!.b),
        negTops: S.filter((s) => s.dir === 'neg' && s.bar).map((s) => s.bar!.t),
        zeroMarkerCenters: S.filter((s) => s.barIsZero && s.bar).map((s) => (s.bar!.t + s.bar!.b) / 2),
      }
    },
    { name, tol },
  )
}

/** Failure list for a signed report (empty = pass). */
export function signedAnnotationFailures(r: SignedAnnotationReport, opts: { zeroLineTol?: number } = {}): string[] {
  const f: string[] = []
  const tol = opts.zeroLineTol ?? 1.5
  if (r.conflicts.length) f.push(`conflicts: ${JSON.stringify(r.conflicts.slice(0, 6))}`)
  for (const s of r.slots) {
    if (!s.ptrAligned) f.push(`ptr not aligned @${s.i}`)
    if (!s.idxAligned) f.push(`index not aligned @${s.i}`)
    if (!s.valueInPlot) f.push(`value outside plot @${s.i}`)
    if (s.value === '0' && s.dir === 'zero' && s.dataH !== 0) f.push(`zero drawn with data height ${s.dataH} @${s.i}`)
  }
  if (r.signed && r.zeroLineY != null) {
    for (const y of r.posBottoms) if (Math.abs(y - r.zeroLineY) > tol) f.push(`pos bar bottom ${y} ≠ zero line ${r.zeroLineY}`)
    for (const y of r.negTops) if (Math.abs(y - r.zeroLineY) > tol) f.push(`neg bar top ${y} ≠ zero line ${r.zeroLineY}`)
    for (const y of r.zeroMarkerCenters) if (Math.abs(y - r.zeroLineY) > tol) f.push(`zero marker centre ${y} ≠ zero line ${r.zeroLineY}`)
  }
  return f
}
