// V23 M0/M4 layout inventory — measures the REAL running app (no design images).
// Usage: node scripts/v23-inventory.mjs <baseUrl> <outDir> <label> [algo=bfs]
// Records rects + scroll owners for header/nav/input/stage/data/code/transport,
// graph content bbox vs occluders, and a full-page screenshot per viewport/state.
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const [,, BASE = 'http://127.0.0.1:5173/algorithm-design-viz/', OUT = 'docs/screenshots/v23/after', LABEL = 'after', ALGO = 'bfs'] = process.argv
const VIEWPORTS = (process.env.V23_VIEWPORTS || '1366x768,1920x1080,1024x600,390x844,844x390')
  .split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h } })
const STATES = (process.env.V23_STATES || 'preview,previewdata,mid,dataopen,editopen').split(',')
fs.mkdirSync(OUT, { recursive: true })

const REGIONS = {
  header: '.topbar',
  nav: '[data-testid="app-sidebar"]',
  inputSummary: '[data-testid="input-summary-bar"]',
  inputBody: '[data-testid="input-panel-body"]',
  stepText: '[data-testid="viz-banner"]',
  stage: '[data-testid="viz-canvas"]',
  graphPlot: '[data-testid="graph-plot"]',
  dataInline: '[data-testid="viz-inspector"]',
  dataSheet: '[data-testid="inspector-sheet"]',
  dataSlot: '[data-testid="workbench-data-slot"]',
  codeSlot: '[data-testid="workbench-code-slot"]',
  codeScroller: '[data-testid="workbench-code-slot"] .cm-scroller',
  transport: '[data-testid="workbench-transport-slot"]',
}

async function measure(page) {
  return page.evaluate((REGIONS) => {
    const vis = (el) => {
      if (!el) return false
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }
    const scrollOwner = (el) => {
      let p = el
      while (p && p !== document.documentElement) {
        const cs = getComputedStyle(p)
        if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) {
          return (p.getAttribute('data-testid') || p.className || p.tagName).toString().slice(0, 60)
        }
        p = p.parentElement
      }
      return document.scrollingElement.scrollHeight > innerHeight + 1 ? 'document' : 'none'
    }
    const out = { regions: {}, vw: innerWidth, vh: innerHeight, docScrollH: document.scrollingElement.scrollHeight }
    for (const [k, sel] of Object.entries(REGIONS)) {
      const el = document.querySelector(sel)
      if (!vis(el)) { out.regions[k] = null; continue }
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      out.regions[k] = {
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        position: cs.position, overflow: `${cs.overflowX}/${cs.overflowY}`, flex: cs.flex,
        minH: cs.minHeight, maxH: cs.maxHeight, scrollH: el.scrollHeight, clientH: el.clientHeight,
        scrollOwner: scrollOwner(el),
      }
    }
    // Graph content bbox (nodes + edge labels) in client coords
    const shapes = [...document.querySelectorAll('[data-testid="graph-svg"] circle, [data-testid="graph-svg"] .edge-label, [data-testid="graph-svg"] .node-label')]
    if (shapes.length) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const s of shapes) { const r = s.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom) }
      out.graphContent = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), nodes: document.querySelectorAll('[data-testid="graph-svg"] circle').length }
      // Occluders: any visible data surface / fixed panel whose rect intersects graph content
      const occ = []
      const cands = [...document.querySelectorAll('[data-testid="inspector-sheet"], [data-testid="viz-inspector"], [data-testid="workbench-data-slot"], [data-testid="vars-panel"], .var-chip, [data-testid="workbench-transport-slot"], [data-testid="workbench-code-slot"], [data-testid="input-panel-body"]')]
      for (const c of cands) {
        if (!vis(c)) continue
        const r = c.getBoundingClientRect()
        const ix = Math.max(0, Math.min(x1, r.right) - Math.max(x0, r.left))
        const iy = Math.max(0, Math.min(y1, r.bottom) - Math.max(y0, r.top))
        if (ix * iy > 4) occ.push({ el: (c.getAttribute('data-testid') || c.className).slice(0, 40), area: Math.round(ix * iy) })
      }
      out.graphOccluders = occ
      // Clip: is graph content inside the plot viewport?
      const plot = document.querySelector('[data-testid="graph-plot"]')
      if (plot) {
        const p = plot.getBoundingClientRect()
        out.graphInsidePlot = x0 >= p.left - 1 && y0 >= p.top - 1 && x1 <= p.right + 1 && y1 <= p.bottom + 1
      }
    }
    const vars = [...document.querySelectorAll('.var-chip')].filter(vis).map((c) => c.textContent?.trim())
    out.varPills = vars.slice(0, 12)
    out.layoutAttrs = {}
    const wb = document.querySelector('[data-testid="workbench-layout"]')
    if (wb) for (const a of wb.getAttributeNames()) if (a.startsWith('data-')) out.layoutAttrs[a] = wb.getAttribute(a)
    return out
  }, REGIONS)
}

async function clickIfVisible(page, sel) {
  const l = page.locator(sel).first()
  if (await l.count() && await l.isVisible()) { await l.click(); return true }
  return false
}

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const report = []
for (const vp of VIEWPORTS) {
  for (const state of STATES) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
    const page = await ctx.newPage()
    await page.goto(`${BASE}#/algo/${ALGO}`)
    await page.waitForSelector('[data-testid="viz-canvas"]', { state: 'attached' })
    await page.waitForTimeout(600)
    const notes = []
    if (state !== 'preview' && state !== 'previewdata') {
      // edit toggle may be auto-open for graph algos on tall viewports — collapse first for run states
      await page.locator('[data-testid="run-btn"]').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview') === '0', null, { timeout: 15000 })
      await page.waitForTimeout(400)
      const next = page.locator('[data-testid="next-step-btn"]:visible').first()
      for (let i = 0; i < 8; i++) {
        const before = await page.locator('[data-testid="visualizer"]').getAttribute('data-step-index')
        await next.click()
        await page.waitForFunction((b) => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index') !== b, before, { timeout: 5000 })
      }
      notes.push('frame ' + (await page.locator('[data-testid="visualizer"]').getAttribute('data-step-index')))
      await page.waitForTimeout(300)
    }
    if (state === 'dataopen' || state === 'previewdata') {
      const ok = (await clickIfVisible(page, '[data-testid="inspector-sheet-toggle"]')) ||
        (await clickIfVisible(page, '[data-testid="workbench-tab-data"]')) ||
        (await clickIfVisible(page, '[data-testid="data-toggle"][aria-expanded="false"]'))
      notes.push(ok ? 'data entry clicked' : 'data already visible (docked) / no entry')
      await page.waitForTimeout(400)
    }
    if (state === 'editopen') {
      const t = page.locator('[data-testid="input-edit-toggle"]')
      if ((await t.textContent())?.includes('编辑')) await t.click()
      await page.waitForTimeout(400)
    }
    const m = await measure(page)
    const file = `${LABEL}-${ALGO}-${vp.w}x${vp.h}-${state}.png`
    await page.screenshot({ path: path.join(OUT, file), fullPage: false })
    report.push({ viewport: `${vp.w}x${vp.h}`, state, file, notes, ...m })
    await ctx.close()
  }
}
await browser.close()
fs.writeFileSync(path.join(OUT, `${LABEL}-${ALGO}-inventory.json`), JSON.stringify(report, null, 1))
for (const r of report) {
  const g = r.graphContent
  const R = r.regions
  console.log(`${r.viewport} ${r.state.padEnd(8)} stage=${R.stage ? R.stage.w + 'x' + R.stage.h : '-'} plot=${R.graphPlot ? R.graphPlot.w + 'x' + R.graphPlot.h : '-'} graph=${g ? g.w + 'x' + g.h + ' n' + g.nodes + ' inside=' + r.graphInsidePlot : '-'} occ=${JSON.stringify(r.graphOccluders || [])} data=${(R.dataSlot || R.dataSheet || R.dataInline) ? JSON.stringify(R.dataSlot || R.dataSheet || R.dataInline).slice(0, 60) : '-'} code=${R.codeSlot ? R.codeSlot.w + 'x' + R.codeSlot.h : '-'} doc=${r.docScrollH} ${r.notes.join(';')}`)
}
