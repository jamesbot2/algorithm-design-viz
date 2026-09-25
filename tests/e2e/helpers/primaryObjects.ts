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
