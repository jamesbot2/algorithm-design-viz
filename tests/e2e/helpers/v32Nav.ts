import type { Page } from '@playwright/test'

/**
 * V32 nav detectors. Optional fault injection (env V32_FAULT) runs the SAME tests against a
 * deliberately broken shell so the detectors are proven to fail:
 *   dots        – 24 non-interactive dot bullets injected into the rail
 *   hide-entry  – collapsed catalog entry hidden
 *   dark-rail   – rail background restored to a contrasting dark panel
 */
export async function injectFault(page: Page) {
  const f = process.env.V32_FAULT
  if (!f) return
  await page.evaluate((fault) => {
    const st = document.createElement('style')
    if (fault === 'hide-entry') st.textContent = '[data-testid="catalog-entry"]{display:none!important}'
    if (fault === 'dark-rail') st.textContent = '.sidebar{background:#000!important}'
    document.head.appendChild(st)
    if (fault === 'dots') {
      const nav = document.querySelector('.sidebar .nav-scroll')
      for (let i = 0; i < 24; i++) {
        const d = document.createElement('div')
        d.className = 'fault-dot'
        d.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#888;margin:8px auto'
        nav?.appendChild(d)
      }
    }
  }, f)
}

/** Rail reachability: visible items in the rail must all be interactive and named, and the catalog entry must exist. */
export async function railAudit(page: Page) {
  return page.evaluate(() => {
    const sb = document.querySelector('.sidebar') as HTMLElement
    const vis = (e: Element) => {
      const r = e.getBoundingClientRect()
      const cs = getComputedStyle(e)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
    }
    const interactive = (e: Element) => !!e.closest('a,button,input,select,[tabindex]')
    // leaf visual items in the rail (anything painted that has no element children)
    const leaves = [...sb.querySelectorAll('*')].filter((e) => !(e instanceof SVGElement) && e.children.length === 0 && vis(e))
    const nonInteractive = leaves.filter((e) => !interactive(e))
    const focusables = [...sb.querySelectorAll<HTMLElement>('a,button,input,select,[tabindex]')].filter((e) => e.tabIndex >= 0 && vis(e))
    const unnamed = focusables.filter((e) => !(e.getAttribute('aria-label') || e.textContent?.trim()))
    const entry = document.querySelector('[data-testid="catalog-entry"]')
    return {
      width: Math.round(sb.getBoundingClientRect().width),
      nonInteractive: nonInteractive.map((e) => e.className || e.tagName),
      focusables: focusables.map((e) => e.getAttribute('aria-label') || e.textContent?.trim()),
      unnamed: unnamed.length,
      entryVisible: !!entry && vis(entry),
    }
  })
}

/** Pixel-measured colour distance between the rail and the workbench canvas next to it (not CSS existence). */
export async function railContrast(page: Page) {
  const buf = await page.screenshot()
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const x = c.getContext('2d')!
    x.drawImage(img, 0, 0)
    const r = document.querySelector('.sidebar')!.getBoundingClientRect()
    const mw = document.querySelector('.main-wrap')!.getBoundingClientRect()
    const px = (X: number, Y: number) => [...x.getImageData(Math.round(X), Math.round(Y), 1, 1).data.slice(0, 3)]
    const lum = (p: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2])
    }
    const y = Math.min(r.bottom, innerHeight) - 8
    const a = px(r.left + 4, y)
    const m = px(Math.max(mw.left, r.right) + 3, y)
    const la = lum(a)
    const lm = lum(m)
    return {
      rail: a,
      work: m,
      ratio: (Math.max(la, lm) + 0.05) / (Math.min(la, lm) + 0.05),
      dRGB: Math.hypot(a[0] - m[0], a[1] - m[1], a[2] - m[2]),
    }
  }, buf.toString('base64'))
}

/** Workbench identity snapshot: run, step, playing, variables, code scroll, solve count. */
export async function wbState(page: Page) {
  return page.evaluate(() => {
    const viz = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
    const cm = document.querySelector('.cm-scroller') as HTMLElement | null
    return {
      runId: viz?.dataset.runId ?? null,
      playing: viz?.dataset.playing ?? null,
      step: document.querySelector('[data-testid="step-counter"]')?.textContent?.trim() ?? null,
      banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim() ?? null,
      solveCount: (document.querySelector('.algo-page') as HTMLElement | null)?.dataset.solveCount ?? null,
      /** reading position = first source line number whose gutter cell is at/below the scroller top */
      cmTop: (() => {
        if (!cm) return null
        const top = cm.getBoundingClientRect().top
        const g = [...cm.querySelectorAll('.cm-lineNumbers .cm-gutterElement')].find((e) => e.getBoundingClientRect().bottom > top + 1 && /\d/.test(e.textContent ?? ''))
        return g ? Number(g.textContent) : null
      })(),
      /** variables / inspector readout and the executing source line (code position) */
      vars: document.querySelector('[data-testid="viz-inspector"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      execLine: (() => {
        const l = document.querySelector('.cm-exec-line') as HTMLElement | null
        if (!l) return null
        const all = [...document.querySelectorAll('.cm-content > .cm-line')]
        return all.indexOf(l)
      })(),
      /** running Web Animations inside the stage (animation state) */
      anims: viz ? viz.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length : null,
      cmCount: document.querySelectorAll('.cm-editor').length,
      cmNode: (() => {
        const e = document.querySelector('.cm-editor') as (HTMLElement & { __v32?: string }) | null
        if (!e) return null
        e.__v32 ??= Math.random().toString(36).slice(2)
        return e.__v32
      })(),
    }
  })
}
