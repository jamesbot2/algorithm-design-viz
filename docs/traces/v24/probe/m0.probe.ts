import { test, expect, type Page } from '/workspace/algorithm-design-viz/node_modules/@playwright/test/index.mjs'
import * as fs from 'node:fs'
import { measureStageObjects, MAIN_ARRAY_GROUPS, HUFFMAN_GROUPS, BUFFER_GROUPS, measureLabelText } from '/workspace/algorithm-design-viz/tests/e2e/helpers/primaryObjects'

const TAG = process.env.TAG || 'before'
const SHOTDIR = process.env.SHOTDIR || `/workspace/algorithm-design-viz/docs/screenshots/v24/${TAG}`
fs.mkdirSync(SHOTDIR, { recursive: true })
const out: Record<string, unknown> = {}
const VPS = [[1366, 768], [1920, 1080], [390, 844], [1024, 600], [844, 390]] as const

async function open(page: Page, algo: string) {
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible()
}
async function runIt(page: Page) {
  await page.getByTestId('run-btn').click()
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview') === '0')
  await page.waitForTimeout(300)
}
async function next(page: Page, n: number) {
  for (let i = 0; i < n; i++) await page.getByTestId('next-step-btn').click()
  await page.waitForTimeout(500)
}
async function demo(page: Page) {
  const t = page.getByTestId('workbench-tab-demo')
  if (await t.isVisible()) await t.click()
  await page.waitForTimeout(200)
}
const summarize = (list: { full: boolean; visH: number; elH: number }[] = []) => ({
  n: list.length, full: list.filter((x) => x.full).length,
  visH: list.map((x) => x.visH), elH: list.map((x) => x.elH),
})

for (const [w, h] of VPS) {
  test(`merge 7 @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await open(page, 'mergeSort')
    await runIt(page)
    await next(page, 20)
    await demo(page)
    for (const mode of ['bars', 'cells']) {
      if (mode === 'cells') {
        const b = page.locator('[data-testid="viz-canvas"] .array-view[data-array="a"] .view-toggle button', { hasText: '单元格' })
        if (await b.count()) { await b.first().scrollIntoViewIfNeeded(); await b.first().click(); await page.waitForTimeout(300) }
      }
      const m = await measureStageObjects(page, { ...MAIN_ARRAY_GROUPS('a'), ...BUFFER_GROUPS })
      out[`merge7-${w}x${h}-${mode}`] = { frame: m.frame, stage: m.stage, bars: summarize(m.groups.bars), values: summarize(m.groups.values), slots: summarize(m.groups.slots), pointers: summarize(m.groups.pointers), buffers: summarize(m.groups.bufferValues) }
      await page.screenshot({ path: `${SHOTDIR}/merge7-21of55-${mode}-${w}x${h}.png` })
    }
  })
  test(`merge 4132 @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await open(page, 'mergeSort')
    const ed = page.getByTestId('input-edit-toggle')
    if ((await page.getByTestId('input-panel').getAttribute('data-editing')) !== '1') await ed.click()
    await page.getByTestId('array-input').fill('4,1,3,2')
    await runIt(page)
    if ((await page.getByTestId('input-panel').getAttribute('data-editing')) === '1' && (await ed.isVisible())) { await ed.click().catch(() => {}) }
    await next(page, 12)
    await demo(page)
    for (const mode of ['bars', 'cells']) {
      if (mode === 'cells') {
        const b = page.locator('[data-testid="viz-canvas"] .array-view[data-array="a"] .view-toggle button', { hasText: '单元格' })
        if (await b.count()) { await b.first().scrollIntoViewIfNeeded(); await b.first().click(); await page.waitForTimeout(300) }
      }
      const m = await measureStageObjects(page, { ...MAIN_ARRAY_GROUPS('a'), ...BUFFER_GROUPS })
      const dims = await page.evaluate(() => {
        const v = document.querySelector('[data-testid="viz-canvas"] .array-view[data-array="a"]:not(.array-buffers .array-view)')
        const bw = v?.querySelector('.bars-wrap, .array-cells')
        return { frameH: v?.getBoundingClientRect().height, innerH: bw?.getBoundingClientRect().height, innerMin: bw ? getComputedStyle(bw).minHeight : null }
      })
      out[`merge4-${w}x${h}-${mode}`] = { frame: m.frame, dims, bars: summarize(m.groups.bars), values: summarize(m.groups.values), slots: summarize(m.groups.slots) }
      await page.screenshot({ path: `${SHOTDIR}/merge4132-13of25-${mode}-${w}x${h}.png` })
    }
  })
  test(`huffman @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await open(page, 'huffman')
    await runIt(page)
    await next(page, 3)
    await demo(page)
    const m = await measureStageObjects(page, HUFFMAN_GROUPS)
    out[`huffman-${w}x${h}`] = { frame: m.frame, ...Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, summarize(v)])) }
    await page.screenshot({ path: `${SHOTDIR}/huffman-4of10-${w}x${h}.png` })
  })
  test(`activity @${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await open(page, 'activitySelection')
    await runIt(page)
    await next(page, 3)
    await demo(page)
    const sel = '.array-view[data-array="activities"] .cell-val, [data-testid="activity-card"] .act-id, [data-testid="activity-card"] .act-range'
    const lab = await measureLabelText(page, '.array-view[data-array="activities"] .cell-val, [data-testid="activity-card"]')
    const fr = await measureStageObjects(page, {})
    out[`activity-${w}x${h}`] = { frame: fr.frame, count: lab.count, overlaps: lab.overlaps, clipped: lab.clipped, widths: lab.widths, sel }
    await page.screenshot({ path: `${SHOTDIR}/activity-4of14-${w}x${h}.png` })
  })
}
test.afterAll(() => {
  fs.mkdirSync('/workspace/algorithm-design-viz/docs/traces/v24', { recursive: true })
  const f = `/workspace/algorithm-design-viz/docs/traces/v24/m0-metrics-${TAG}.json`
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
  fs.writeFileSync(f, JSON.stringify({ ...prev, ...out }, null, 2))
})
