import type { Page } from '@playwright/test'

/**
 * V23 geometry probes — evaluated in the page against REAL boxes.
 * - clipVis: element box ∩ every clipping ancestor ∩ viewport (not toBeVisible).
 * - graph: every node circle / node label / edge label box must lie inside the plot
 *   and be the TOPMOST element at its center (elementFromPoint, not elementsFromPoint).
 * - regions: scene / data / code / transport rects must not intersect each other.
 */
export async function measureWorkbench(page: Page) {
  return page.evaluate(() => {
    const R = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }
    }
    const inter = (a: ReturnType<typeof R>, b: ReturnType<typeof R>) => {
      if (!a || !b) return 0
      const w = Math.min(a.r, b.r) - Math.max(a.x, b.x)
      const h = Math.min(a.b, b.b) - Math.max(a.y, b.y)
      return w > 0 && h > 0 ? w * h : 0
    }
    const clipVis = (el: Element | null) => {
      if (!el) return { elW: 0, elH: 0, visW: 0, visH: 0 }
      const a = el.getBoundingClientRect()
      let t = a.top
      let b = a.bottom
      let l = a.left
      let r = a.right
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
      return { elW: a.width, elH: a.height, visW: Math.max(0, r - l), visH: Math.max(0, b - t) }
    }
    const fully = (el: Element | null, tol = 1.5) => {
      const m = clipVis(el)
      return m.elW > 0 && m.elH > 0 && m.visW >= m.elW - tol && m.visH >= m.elH - tol
    }
    const q = (s: string) => document.querySelector(s)
    const layout = q('[data-testid="workbench-layout"]') as HTMLElement | null
    const hiddenish = (el: Element | null) => !el || (el as HTMLElement).closest('[hidden]') !== null
    const regions = {
      scene: hiddenish(q('[data-testid="workbench-viz-slot"]')) ? null : R(q('[data-testid="workbench-viz-slot"]')),
      data: hiddenish(q('[data-testid="workbench-data-slot"]')) ? null : R(q('[data-testid="workbench-data-slot"]')),
      code: hiddenish(q('[data-testid="workbench-code-slot"]')) ? null : R(q('[data-testid="workbench-code-slot"]')),
      transport: R(q('[data-testid="workbench-transport-slot"]')),
      toolbar: R(q('[data-testid="input-panel"]')),
    }
    const names = Object.keys(regions) as (keyof typeof regions)[]
    const overlaps: string[] = []
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const a = regions[names[i]!]
        const b = regions[names[j]!]
        const o = inter(a, b)
        if (o > 1) overlaps.push(`${names[i]}×${names[j]}=${Math.round(o)}`)
      }

    // Graph
    const plot = q('[data-testid="graph-plot"]')
    const plotR = hiddenish(plot) ? null : R(plot)
    let graph: null | {
      plot: ReturnType<typeof R>
      nodes: number
      bbox: { w: number; h: number }
      outside: string[]
      occluded: string[]
      arrows: number
      edgeLabels: number
      minLabelPx: number
    } = null
    if (plotR && plot) {
      const items = [
        ...[...plot.querySelectorAll('circle')].map((e) => ['node', e] as const),
        ...[...plot.querySelectorAll('text.node-label')].map((e) => ['label', e] as const),
        ...[...plot.querySelectorAll('text.edge-label')].map((e) => ['w', e] as const),
      ]
      const outside: string[] = []
      const occluded: string[] = []
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      let minLabelPx = Infinity
      for (const [kind, el] of items) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (kind === 'node') {
          minX = Math.min(minX, r.left)
          minY = Math.min(minY, r.top)
          maxX = Math.max(maxX, r.right)
          maxY = Math.max(maxY, r.bottom)
        } else {
          minLabelPx = Math.min(minLabelPx, r.height)
        }
        const txt = `${kind}:${(el.textContent || el.getAttribute('data-node-id') || '').trim().slice(0, 6)}`
        if (r.left < plotR.x - 1 || r.top < plotR.y - 1 || r.right > plotR.r + 1 || r.bottom > plotR.b + 1) outside.push(txt)
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const top = document.elementFromPoint(cx, cy)
        if (!top || !plot.contains(top)) occluded.push(`${txt}@${top ? (top as HTMLElement).className || top.tagName : 'none'}`)
      }
      graph = {
        plot: plotR,
        nodes: plot.querySelectorAll('circle').length,
        bbox: { w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) },
        outside,
        occluded,
        arrows: [...plot.querySelectorAll('[marker-end]')].filter((e) => (e.getAttribute('marker-end') || '') !== '').length,
        edgeLabels: plot.querySelectorAll('text.edge-label').length,
        minLabelPx: Number.isFinite(minLabelPx) ? minLabelPx : 0,
      }
    }

    // Code: exec line must be fully visible inside its own scroller when code is visible.
    const wrap = q('[data-testid="code-mirror-wrap"]') as HTMLElement | null
    const execEl = q('.cm-exec-line') ?? q('.code-pre .code-line.active')
    const stepText = q('[data-testid="viz-banner-text"]')
    const transportBtns = ['reset-playback-btn', 'prev-step-btn', 'play-btn', 'next-step-btn', 'playback-settings-toggle'].map(
      (t) => [t, fully(q(`[data-testid="${t}"]`))] as const,
    )
    const toolbarBtns = ['input-edit-toggle', 'run-btn', 'cancel-btn'].map((t) => [t, fully(q(`[data-testid="${t}"]`))] as const)
    const theory = q('.theory-toggle')

    return {
      vp: { w: window.innerWidth, h: window.innerHeight },
      mode: layout?.dataset.layoutMode ?? '',
      activeView: layout?.dataset.activeView ?? '',
      regions,
      overlaps,
      graph,
      code: {
        visible: !!regions.code,
        width: regions.code?.w ?? 0,
        cmWidth: wrap?.getBoundingClientRect().width ?? 0,
        execFully: execEl ? fully(execEl) : null,
        editors: document.querySelectorAll('.cm-editor').length,
      },
      data: {
        bodyScroll: (() => {
          const b = q('[data-testid="workbench-data-body"]') as HTMLElement | null
          return b ? { client: b.clientHeight, scroll: b.scrollHeight } : null
        })(),
        summary: q('[data-testid="data-config-summary"]')?.textContent ?? '',
        pills: [...document.querySelectorAll('[data-testid="var-chip"]')].map((e) => e.getAttribute('data-var')),
      },
      stepTextFully: fully(stepText),
      transportBtns,
      toolbarBtns,
      theoryFully: fully(theory),
      counter: q('[data-testid="step-counter"]')?.textContent ?? '',
      runId: q('[data-testid="visualizer"]')?.getAttribute('data-run-id') ?? '',
      stepIndex: q('[data-testid="visualizer"]')?.getAttribute('data-step-index') ?? '',
      solveCount: Number(q('.algo-page')?.getAttribute('data-solve-count') ?? '0'),
      visualizers: document.querySelectorAll('[data-testid="visualizer"]').length,
      transports: document.querySelectorAll('.playback-transport').length,
      pageScrollH: (q('.main') as HTMLElement | null)?.scrollHeight ?? 0,
      pageClientH: (q('.main') as HTMLElement | null)?.clientHeight ?? 0,
    }
  })
}

export type WorkbenchMetrics = Awaited<ReturnType<typeof measureWorkbench>>
