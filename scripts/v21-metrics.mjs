
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://127.0.0.1:5173/algorithm-design-viz/'
const label = process.argv[2] || 'after'
const OUT = path.join(process.cwd(), 'docs/traces/v21')
const SHOT = path.join(process.cwd(), 'docs/screenshots/v21', label)
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(SHOT, { recursive: true })
const chromePath = '/usr/bin/google-chrome'

async function ensureInputEditing(page) {
  const edit = page.getByTestId('input-edit-toggle')
  await edit.waitFor({ state: 'visible', timeout: 15000 })
  const t = (await edit.textContent()) ?? ''
  if (t.includes('编辑输入')) await edit.click()
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="input-panel"]')?.getAttribute('data-editing') === '1',
  )
}

async function prepareDijkstra(page) {
  await page.goto(BASE + '#/algo/dijkstra')
  await page.waitForSelector('[data-testid="workbench-layout"]', { timeout: 20000 })
  await ensureInputEditing(page)
  await page.getByTestId('graph-n').fill('3')
  await page.getByTestId('graph-start').fill('0')
  await page.getByTestId('graph-edges').fill('0 1 10\n0 2 1\n2 1 1')
  await page.getByTestId('run-btn').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="visualizer"]')
    if (!el || el.getAttribute('data-preview') !== '0') return false
    const rid = el.getAttribute('data-run-id')
    return !!rid && rid !== 'preview'
  }, { timeout: 30000 })
}

async function prepareLcs(page) {
  await page.goto(BASE + '#/algo/lcs')
  await page.waitForSelector('[data-testid="workbench-layout"]', { timeout: 20000 })
  await ensureInputEditing(page)
  await page.getByTestId('run-btn').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="visualizer"]')
    return el && el.getAttribute('data-preview') === '0'
  }, { timeout: 30000 })
}

async function openPseudo(page) {
  // Short viewports use workbench tabs — reveal code panel first
  const layout = await page.getByTestId('workbench-layout').getAttribute('data-layout')
  if (layout === 'tabs') {
    const codeTab = page.locator('.workbench-tabs button[role="tab"]', { hasText: '代码' })
    if (await codeTab.count()) await codeTab.click()
    await page.waitForTimeout(150)
  }
  await page.getByTestId('tab-pseudo').evaluate((el) => el.click())
  await page.waitForSelector('[data-testid="pseudo-pre"]', { state: 'attached', timeout: 8000 })
  await page.waitForFunction(() => {
    const pre = document.querySelector('[data-testid="pseudo-pre"]')
    return !!pre && pre.clientHeight > 0 && !pre.closest('[hidden]')
  }, { timeout: 8000 })
  await page.waitForTimeout(400)
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const results = { label, at: new Date().toISOString() }

for (const vp of [
  { w: 1366, h: 600, key: 'pseudo_1366x600' },
  { w: 844, h: 390, key: 'pseudo_844x390' },
  { w: 390, h: 844, key: 'pseudo_390x844' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await prepareDijkstra(page)
  await openPseudo(page)
  const m = await page.evaluate((L) => {
    const pre = document.querySelector('[data-testid="pseudo-pre"]')
    const el = pre?.querySelector(`[data-line="${L}"]`)
    if (!pre || !el) return { ok: false }
    const preR = pre.getBoundingClientRect()
    const elR = el.getBoundingClientRect()
    const visH = Math.max(0, Math.min(elR.bottom, preR.bottom) - Math.max(elR.top, preR.top))
    let top = elR.top, bottom = elR.bottom
    let node = pre
    while (node && node !== document.body) {
      const r = node.getBoundingClientRect()
      const cs = getComputedStyle(node)
      if (['hidden', 'auto', 'scroll'].includes(cs.overflowY) || cs.overflow === 'hidden') {
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      node = node.parentElement
    }
    return {
      ok: true,
      execLine: pre.getAttribute('data-exec-line') || pre.getAttribute('data-exec-line'),
      dataExec: pre.getAttribute('data-exec-line'),
      meta: document.querySelector('.code-browser-meta')?.textContent ?? '',
      offsetTop: el.offsetTop,
      offsetParent: String(el.offsetParent?.className || '').slice(0, 90),
      preScrollTop: pre.scrollTop,
      preClientH: pre.clientHeight,
      elH: Math.round(elR.height),
      visH: Math.round(visH),
      clipIntersect: Math.round(Math.max(0, Math.min(bottom, elR.bottom) - Math.max(top, elR.top))),
      contentTop: pre.scrollTop + (elR.top - preR.top),
      text: (el.textContent || '').slice(0, 80),
    }
  }, 2)
  results[vp.key] = m
  await page.screenshot({ path: path.join(SHOT, `v21-01-pseudo-line2-${vp.w}x${vp.h}.png`) })
  console.log(vp.key, JSON.stringify({ visH: m.visH, clip: m.clipIntersect, op: m.offsetParent, st: m.preScrollTop, ct: m.contentTop, elH: m.elH, meta: m.meta }))
  await page.close()
}

{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await prepareDijkstra(page)
  for (let i = 0; i < 15; i++) await page.getByTestId('next-step-btn').click()
  await page.waitForTimeout(250)
  const scroller = page.locator('.cm-scroller')
  await scroller.waitFor({ state: 'visible' })
  const box = await scroller.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -220); await page.waitForTimeout(25) }
  await page.waitForTimeout(120)
  const measurePin = () => {
    const s = document.querySelector('.cm-scroller')
    return {
      scrollTop: s?.scrollTop ?? null,
      clientH: s?.clientHeight ?? null,
      paused: !!document.querySelector('[data-testid="follow-paused"]'),
      vh: window.innerHeight,
    }
  }
  const afterUp = await page.evaluate(measurePin)
  let st = afterUp.scrollTop ?? 0
  let guard = 0
  while (st < 135 && guard++ < 60) {
    await page.mouse.wheel(0, 28)
    await page.waitForTimeout(25)
    st = (await page.evaluate(measurePin)).scrollTop ?? 0
  }
  const at140 = await page.evaluate(measurePin)
  await page.getByTestId('inspector-sheet-toggle').evaluate((el) => el.click())
  await page.waitForTimeout(600)
  const afterData = await page.evaluate(measurePin)
  results.pin = { afterUp, at140, afterData }
  await page.screenshot({ path: path.join(SHOT, 'v21-02-pin-after-data.png') })
  console.log('pin', JSON.stringify(results.pin))

  // close sheet if open
  const open = await page.evaluate(() => !!document.querySelector('[data-testid="inspector-sheet"]'))
  if (open) {
    await page.getByTestId('inspector-sheet-toggle').evaluate((el) => el.click())
    await page.waitForTimeout(350)
  }
  const box2 = await scroller.boundingBox()
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2)
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -220); await page.waitForTimeout(20) }
  st = 0; guard = 0
  while (st < 135 && guard++ < 60) {
    await page.mouse.wheel(0, 28)
    await page.waitForTimeout(25)
    st = (await page.evaluate(measurePin)).scrollTop ?? 0
  }
  const beforeH = await page.evaluate(measurePin)
  await page.setViewportSize({ width: 1366, height: 780 })
  await page.waitForTimeout(550)
  const afterH = await page.evaluate(measurePin)
  results.pinHeight = { beforeH, afterH }
  console.log('pinHeight', JSON.stringify(results.pinHeight))
  await page.close()
}

{
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await prepareLcs(page)
  for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
  await page.waitForTimeout(400)
  const measureMatrix = () => {
    const scroller = document.querySelector('.matrix-scroll')
    const cell2 = document.querySelector(
      '.matrix-table td.hl-focus, .matrix-table td.hl-write, .matrix-table td[class*="hl-"], .matrix-table td[class*="focus"], .matrix-table td[class*="write"]'
    )
    if (!scroller || !cell2) {
      return { ok: false, scroller: !!scroller, counter: document.querySelector('[data-testid="step-counter"]')?.textContent }
    }
    const cellR = cell2.getBoundingClientRect()
    const scrollR = scroller.getBoundingClientRect()
    let top = cellR.top, bottom = cellR.bottom
    const chain = []
    let node = cell2
    while (node && node !== document.body) {
      const r = node.getBoundingClientRect()
      const cs = getComputedStyle(node)
      const ov = cs.overflowY
      const interesting = ['hidden', 'auto', 'scroll'].includes(ov) ||
        ['matrix-scroll', 'matrix-view', 'stage-viewport', 'viz-main', 'matrices-panel'].some((c) => node.classList.contains(c))
      if (interesting) {
        chain.push({
          cls: String(node.className).slice(0, 70),
          ov, h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom),
          clientH: node.clientHeight, minH: cs.minHeight,
        })
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      node = node.parentElement
    }
    const intersectClip = Math.max(0, Math.min(bottom, cellR.bottom) - Math.max(top, cellR.top))
    return {
      ok: true,
      cell: cell2.getAttribute('data-cell'),
      cellH: Math.round(cellR.height),
      scrollerClientH: scroller.clientHeight,
      scrollerRectH: Math.round(scrollR.height),
      intersectClip: Math.round(intersectClip),
      vsScroll: Math.round(Math.max(0, Math.min(cellR.bottom, scrollR.bottom) - Math.max(cellR.top, scrollR.top))),
      minH: getComputedStyle(scroller).minHeight,
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent,
      chain,
    }
  }
  results.matrix_14 = await page.evaluate(measureMatrix)
  await page.screenshot({ path: path.join(SHOT, 'v21-03-matrix-14-1366.png') })
  console.log('matrix14', JSON.stringify(results.matrix_14))
  for (const target of [31, 74, 75, 94, 95]) {
    while (true) {
      const c = await page.getByTestId('step-counter').textContent()
      const cur = Number((c || '').match(/(\d+)\s*\//)?.[1] || 0)
      if (cur >= target) break
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
    }
    await page.waitForTimeout(220)
    results['matrix_' + target] = await page.evaluate(measureMatrix)
    const m = results['matrix_' + target]
    console.log('matrix' + target, m.cellH, m.intersectClip, m.minH, m.counter)
  }
  await page.close()
}

const outFile = path.join(OUT, label === 'before' ? 'v21-m0-baseline.json' : 'v21-after-metrics.json')
fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
await browser.close()
console.log('WROTE', outFile)
