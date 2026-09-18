import type { Page } from '@playwright/test'

/**
 * V16-03: E2E entry that calls the SAME core as DOM tests
 * (`window.__algoVizStrictVisibility.measurePageGraphVisibility`).
 * Fault inject only mutates the page; detector is the sole pass/fail.
 */

export async function measureStrictGraphVisibility(page: Page) {
  // Wait briefly for bridge (module evaluated with app)
  await page.waitForFunction(
    () => Boolean((window as unknown as { __algoVizStrictVisibility?: unknown }).__algoVizStrictVisibility),
    { timeout: 15_000 },
  )
  return page.evaluate(() => {
    const api = (window as unknown as {
      __algoVizStrictVisibility: {
        measurePageGraphVisibility: (opts?: { minLabelPx?: number }) => {
          ok: boolean
          issues: string[]
          details: unknown[]
          nodesChecked: number
          edgeLabelsChecked: number
          plot: { w: number; h: number } | null
          stage: { w: number; h: number } | null
          fieldsSummary: {
            geometryVisible: boolean
            hitReachable: boolean
            textReadable: boolean
            paintOcclusionChecked: boolean
          }
        }
      }
    }).__algoVizStrictVisibility
    return api.measurePageGraphVisibility({ minLabelPx: 10 })
  })
}

/** pe:auto opaque overlay (classic V14 fault). */
export async function injectOpaqueOverlayFault(page: Page) {
  await page.evaluate(() => {
    document.getElementById('v14-fault-overlay')?.remove()
    document.getElementById('v16-fault-pe-none')?.remove()
    const d = document.createElement('div')
    d.id = 'v14-fault-overlay'
    d.className = 'v14-random-opaque-overlay-class-zz9'
    d.style.cssText =
      'position:fixed;inset:0;background:rgba(255,0,0,0.85);z-index:2147483646;pointer-events:auto;'
    document.body.appendChild(d)
  })
}

/** V16-03: pe:none opaque paint fault — must fail via detector paintOcclusionChecked. */
export async function injectPointerNonePaintFault(page: Page) {
  await page.evaluate(() => {
    document.getElementById('v14-fault-overlay')?.remove()
    document.getElementById('v16-fault-pe-none')?.remove()
    const d = document.createElement('div')
    d.id = 'v16-fault-pe-none'
    d.className = 'v16-pe-none-opaque-fault-class'
    d.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,255,0.75);z-index:2147483646;pointer-events:none;'
    document.body.appendChild(d)
  })
}

export async function clearVisibilityFaults(page: Page) {
  await page.evaluate(() => {
    document.getElementById('v14-fault-overlay')?.remove()
    document.getElementById('v16-fault-pe-none')?.remove()
  })
}
