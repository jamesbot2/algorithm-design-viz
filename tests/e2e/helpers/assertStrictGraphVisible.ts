import type { Page } from '@playwright/test'

/**
 * V14-04 in-page strict visibility: topmost elementsFromPoint hit must be the
 * target node/label. "stack contains .graph-svg" is NOT sufficient.
 */
export async function measureStrictGraphVisibility(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = []
    const details: { id: string; kind: string; issues: string[] }[] = []

    const plot =
      (document.querySelector('[data-testid="graph-plot"]') as HTMLElement | null) ||
      (document.querySelector('.graph-plot') as HTMLElement | null)
    const svg =
      (document.querySelector('[data-testid="graph-svg"]') as SVGElement | null) ||
      (document.querySelector('.graph-svg') as SVGElement | null)
    const stage =
      (document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null) ||
      (document.querySelector('.stage-viewport') as HTMLElement | null)

    if (!svg || !stage || !plot) {
      return { ok: false, issues: ['missing-svg-or-stage'], details: [], nodesChecked: 0 }
    }

    const plotR = plot.getBoundingClientRect()
    const stageR = stage.getBoundingClientRect()
    if (plotR.width < 8 || plotR.height < 8 || stageR.width < 8 || stageR.height < 8) {
      issues.push('hidden-canvas')
    }

    const isTopmostTarget = (top: Element | null, target: Element) => {
      if (!top) return false
      if (top === target || target.contains(top)) return true
      const topNode = top.closest?.('[data-node-id], [data-testid^="graph-node"]')
      const tgtNode = target.closest?.('[data-node-id], [data-testid^="graph-node"]')
      return Boolean(topNode && tgtNode && topNode === tgtNode)
    }

    const checkTarget = (target: Element, kind: string, id: string, isLabel = false) => {
      const local: string[] = []
      const r = target.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) local.push('hidden-canvas')
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      if (
        cx < plotR.left - 0.5 ||
        cx > plotR.right + 0.5 ||
        cy < plotR.top - 0.5 ||
        cy > plotR.bottom + 0.5 ||
        cy < stageR.top - 0.5 ||
        cy > stageR.bottom + 0.5
      ) {
        local.push(cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight ? 'off-viewport' : 'clipped')
      }
      const stack = document.elementsFromPoint(cx, cy)
      const top = stack[0] ?? null
      if (!top) local.push('empty-hit')
      else if (!isTopmostTarget(top, target)) {
        local.push('topmost-not-target')
        const inPlot = Boolean(
          top.closest?.(
            '.graph-svg, .graph-plot, .graph-view, [data-testid="graph-svg"], [data-testid="graph-plot"]',
          ),
        )
        if (!inPlot) local.push('opaque-overlay')
      }
      if (top?.closest?.('[data-testid="viz-inspector"], .viz-inspector, .inspector-sheet')) {
        local.push('inspector-cover')
      }
      if (top?.closest?.('.playback-transport, [data-testid="workbench-transport"], .transport-bar')) {
        local.push('transport-cover')
      }
      if (isLabel && r.height < 10 && r.width < 10) local.push('unreadable-label')
      if (local.length) {
        issues.push(...local)
        details.push({ id, kind, issues: local })
      }
    }

    const nodeGs = [...document.querySelectorAll('.graph-svg g[data-node-id]')] as Element[]
    const fallback = [...document.querySelectorAll('.graph-svg circle')] as Element[]
    const targets = nodeGs.length ? nodeGs : fallback
    let nodesChecked = 0
    for (const n of targets.slice(0, 12)) {
      const id = n.getAttribute('data-node-id') ?? `n${nodesChecked}`
      const circle = (n.querySelector?.('circle') as Element | null) ?? n
      checkTarget(circle, 'node', id)
      nodesChecked++
      const label = n.querySelector?.('text.node-label, .node-label, text') as Element | null
      if (label) checkTarget(label, 'label', id, true)
    }

    let edgeLabelsChecked = 0
    for (const lab of [
      ...document.querySelectorAll('.graph-svg .edge-label, .graph-svg [data-edge-label]'),
    ].slice(0, 8)) {
      checkTarget(lab as Element, 'edge-label', `e${edgeLabelsChecked}`, true)
      edgeLabelsChecked++
    }

    const uniqueIssues = [...new Set(issues)]
    return {
      ok: uniqueIssues.length === 0 && nodesChecked > 0,
      issues: uniqueIssues,
      details,
      nodesChecked,
      edgeLabelsChecked,
      plot: { w: plotR.width, h: plotR.height },
      stage: { w: stageR.width, h: stageR.height },
    }
  })
}

export async function injectOpaqueOverlayFault(page: Page) {
  await page.evaluate(() => {
    document.getElementById('v14-fault-overlay')?.remove()
    const d = document.createElement('div')
    d.id = 'v14-fault-overlay'
    d.className = 'v14-random-opaque-overlay-class-zz9'
    d.style.cssText =
      'position:fixed;inset:0;background:rgba(255,0,0,0.85);z-index:2147483646;pointer-events:auto;'
    document.body.appendChild(d)
  })
}
