import type { Page } from '@playwright/test'

/**
 * V22-03 joint readability detector (moved verbatim from the V22 spec so V23 can run
 * the SAME detector against fault injections). Reads only production selectors —
 * never fault-only test ids.
 */
/** Same-frame joint: input glyphs + DP cell + locate/resume + code — BEFORE focus/scrollIntoView. */
export async function measureJoint(page: Page) {
  return page.evaluate(() => {
    const clipIntersect = (el: Element | null) => {
      if (!el) return { ok: false as const, elH: 0, visH: 0, elW: 0, visW: 0 }
      const a = el.getBoundingClientRect()
      let top = a.top
      let bottom = a.bottom
      let left = a.left
      let right = a.right
      let node: HTMLElement | null = el as HTMLElement
      while (node && node !== document.body) {
        const r = node.getBoundingClientRect()
        const cs = getComputedStyle(node)
        const oy = cs.overflowY
        const ox = cs.overflowX
        if (
          ['hidden', 'auto', 'scroll'].includes(oy) ||
          ['hidden', 'auto', 'scroll'].includes(ox) ||
          cs.overflow === 'hidden'
        ) {
          top = Math.max(top, r.top)
          bottom = Math.min(bottom, r.bottom)
          left = Math.max(left, r.left)
          right = Math.min(right, r.right)
        }
        node = node.parentElement
      }
      const visH = Math.max(0, Math.min(bottom, a.bottom) - Math.max(top, a.top))
      const visW = Math.max(0, Math.min(right, a.right) - Math.max(left, a.left))
      return {
        ok: true as const,
        elH: a.height,
        visH,
        elW: a.width,
        visW,
      }
    }

    const strip = document.querySelector('[data-testid="array-labels"]') as HTMLElement | null
    const chars = [...document.querySelectorAll('[data-testid="array-labels"] .compact-ch')]
    const glyphStats = chars.map((el) => {
      const m = clipIntersect(el)
      const full = m.elH > 0 && m.visH >= Math.min(m.elH * 0.9, m.elH - 0.5)
      const falsePos8 = m.visH >= 8 && !full
      return { full, falsePos8, visH: m.visH, elH: m.elH, text: (el.textContent || '').slice(0, 4) }
    })

    const locate = document.querySelector('[data-testid="matrix-locate-btn"]') as HTMLElement | null
    const resume = document.querySelector(
      '[data-testid="matrix-resume-follow-btn"]',
    ) as HTMLElement | null
    const locateM = clipIntersect(locate)
    const resumeM = clipIntersect(resume)
    const hit = (el: HTMLElement | null) => {
      if (!el) return false
      const b = el.getBoundingClientRect()
      if (b.width < 2 || b.height < 2) return false
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
      return !!(top && (top === el || el.contains(top)))
    }

    const scroller = document.querySelector('.matrix-scroll') as HTMLElement | null
    const cell = document.querySelector(
      '.matrix-table td.hl-focus, .matrix-table td.hl-write',
    ) as HTMLElement | null
    const cellM = clipIntersect(cell)
    // Neighbors (optional)
    let neighborOk = true
    if (cell) {
      const tr = cell.parentElement
      const idx = tr ? [...tr.children].indexOf(cell) : -1
      const neigh = [tr?.children[idx - 1], tr?.children[idx + 1]].filter(Boolean) as Element[]
      for (const n of neigh) {
        const nm = clipIntersect(n)
        if (nm.elH > 0 && nm.visH < nm.elH * 0.5) neighborOk = false
      }
    }

    const wrap = document.querySelector('[data-testid="code-mirror-wrap"]') as HTMLElement | null
    const cmScroller = document.querySelector('.cm-scroller') as HTMLElement | null
    const execLine = Number(wrap?.getAttribute('data-exec-line') || 0)
    const lines = [...document.querySelectorAll('.cm-line')]
    const execEl = execLine > 0 ? (lines[execLine - 1] as HTMLElement | undefined) : undefined
    const execM = clipIntersect(execEl ?? null)
    const codeW = wrap?.getBoundingClientRect().width ?? 0

    const view = document.querySelector('.matrix-view') as HTMLElement | null
    let overhang = 0
    if (scroller && view) {
      overhang = scroller.getBoundingClientRect().bottom - view.getBoundingClientRect().bottom
    }

    return {
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent ?? '',
      runId: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-run-id'),
      cursor: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-cursor'),
      vp: { w: window.innerWidth, h: window.innerHeight },
      stripH: strip ? strip.getBoundingClientRect().height : 0,
      glyphs: {
        total: chars.length,
        fullReadable: glyphStats.filter((g) => g.full).length,
        falsePos8: glyphStats.filter((g) => g.falsePos8).length,
        minVisH: glyphStats.length ? Math.min(...glyphStats.map((g) => g.visH)) : 0,
        avgElH: glyphStats.length
          ? glyphStats.reduce((s, g) => s + g.elH, 0) / glyphStats.length
          : 0,
        sample: glyphStats.slice(0, 4),
      },
      locate: {
        ...locateM,
        hit: hit(locate),
        disabled: locate?.hasAttribute('disabled') ?? false,
      },
      resume: {
        ...resumeM,
        hit: hit(resume),
        disabled: resume?.hasAttribute('disabled') ?? false,
      },
      matrix: {
        cellOk: cellM.ok,
        cellH: cellM.elH,
        cellIntersect: cellM.visH,
        neighborOk,
        scrollH: scroller?.getBoundingClientRect().height ?? 0,
        clientH: scroller?.clientHeight ?? 0,
        minH: scroller ? getComputedStyle(scroller).minHeight : '',
        overhang: Math.round(overhang * 10) / 10,
        paused: !!document.querySelector('[data-testid="matrix-follow-paused"]'),
      },
      code: {
        wrapW: codeW,
        execVisH: execM.visH,
        execElH: execM.elH,
        execLine,
        cmClientH: cmScroller?.clientHeight ?? 0,
      },
    }
  })
}


export type JointMetrics = Awaited<ReturnType<typeof measureJoint>>

/**
 * Same criteria as V22's assertJointReadable, returned as a list so a fault can be
 * shown to FAIL the detector (non-empty) and the restored page to PASS it (empty).
 */
export function jointFailures(m: JointMetrics, opts: { desktopCode?: boolean } = {}): string[] {
  const f: string[] = []
  if (!(m.glyphs.total > 0)) f.push('glyphs:none')
  if (m.glyphs.fullReadable !== m.glyphs.total) f.push(`glyphs:clipped ${m.glyphs.total - m.glyphs.fullReadable}/${m.glyphs.total}`)
  if (m.glyphs.falsePos8 !== 0) f.push(`glyphs:half ${m.glyphs.falsePos8}`)
  if (!(m.locate.ok && m.locate.visH >= m.locate.elH * 0.9 - 0.5)) f.push('locate:clipped')
  if (!(m.resume.ok && m.resume.visH >= m.resume.elH * 0.9 - 0.5)) f.push('resume:clipped')
  if (!m.locate.hit) f.push('locate:not-hit')
  if (m.matrix.cellOk) {
    if (m.matrix.cellIntersect < Math.floor(m.matrix.cellH * 0.85)) f.push('cell:clipped')
    if (m.matrix.overhang > 1) f.push(`matrix:overhang ${m.matrix.overhang}`)
    if (/^120px$/.test(m.matrix.minH)) f.push('matrix:hard-120')
  }
  if (opts.desktopCode !== false && m.vp.w >= 1024 && !(m.code.wrapW > 40)) f.push(`code:width ${m.code.wrapW}`)
  return f
}
