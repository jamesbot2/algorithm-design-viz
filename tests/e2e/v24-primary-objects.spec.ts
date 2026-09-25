/**
 * V24-03 acceptance: the stage's PRIMARY animated objects themselves.
 *
 * Every check goes through helpers/primaryObjects.ts (box ∩ all clip ancestors ∩
 * viewport, sub-pixel tolerance, topmost hit-test), scoped to the one visible stage.
 * Buffers / aux views are measured separately and never stand in for `a`.
 * Normal click / keyboard / wheel only: no force, no evaluate(click), no viewport
 * swap to rescue. retries: 0.
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { waitForRunReady } from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import {
  measureStageObjects,
  MAIN_ARRAY_GROUPS,
  BUFFER_GROUPS,
  HUFFMAN_GROUPS,
  mainArrayFailures,
  notFullyVisible,
  stageArrayValues,
  measureLabelText,
  type StageObjects,
} from './helpers/primaryObjects'

const SHOTS = path.join(process.cwd(), 'docs/screenshots/v24/after')
const TRACES = path.join(process.cwd(), 'docs/traces/v24')
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(TRACES, { recursive: true })

const trace: Record<string, unknown> = {}
const record = (k: string, v: unknown) => {
  trace[k] = v
}
test.afterAll(() => {
  const file = path.join(TRACES, `v24-e2e-${process.env.V24_TRACE_TAG ?? 'run'}.json`)
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...trace }, null, 2))
})

// ---------------------------------------------------------------- page helpers
async function openAlgo(page: Page, algo: string) {
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
}
async function setArrayInput(page: Page, value: string) {
  await ensureInputEditing(page)
  await page.getByTestId('array-input').fill(value)
}
async function run(page: Page, minSteps = 2) {
  const before = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await page.getByTestId('run-btn').click()
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid="visualizer"]')
      const rid = el?.getAttribute('data-run-id')
      return el?.getAttribute('data-preview') === '0' && !!rid && rid !== 'preview' && rid !== prev
    },
    before,
    { timeout: 30_000 },
  )
  const rid = (await page.getByTestId('visualizer').getAttribute('data-run-id'))!
  await waitForRunReady(page, { expectRunId: rid, minSteps })
  // close the input editor if it opened (keeps the default workbench geometry)
  const panel = page.getByTestId('input-panel')
  if ((await panel.getAttribute('data-editing')) === '1') {
    const t = page.getByTestId('input-edit-toggle')
    if (await t.isVisible()) await t.click()
  }
  return rid
}
const stepIdx = async (page: Page) => Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))
async function total(page: Page) {
  const t = (await page.getByTestId('step-counter').textContent()) ?? ''
  return Number(t.match(/\/\s*(\d+)/)?.[1] ?? 0)
}
/** Real click on 下一步 and wait until the cursor really advanced. */
/** Landing: no FLIP layer still in flight (mid-transition is sampled separately with clip-only checks). */
async function landed(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('[data-testid="viz-canvas"] [data-run-flip="1"]').length))
    .toBe(0)
}
async function clickNext(page: Page) {
  const before = await stepIdx(page)
  await page.getByTestId('next-step-btn').click()
  await expect.poll(() => stepIdx(page)).toBe(before + 1)
  await landed(page)
}
async function clickPrev(page: Page) {
  const before = await stepIdx(page)
  await page.getByTestId('prev-step-btn').click()
  await expect.poll(() => stepIdx(page)).toBe(before - 1)
  await landed(page)
}
async function nextN(page: Page, n: number) {
  for (let i = 0; i < n; i++) await clickNext(page)
  await page.waitForTimeout(320) // let height / FLIP transitions land
}
async function showDemo(page: Page) {
  const tab = page.getByTestId('workbench-tab-demo')
  if (await tab.isVisible()) await tab.click()
}
async function solveCount(page: Page) {
  return Number(await page.locator('[data-solve-count]').first().getAttribute('data-solve-count'))
}
async function frameState(page: Page) {
  return page.evaluate(() => ({
    runId: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-run-id'),
    cursor: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
    exec: document.querySelector('[data-testid="code-mirror-wrap"]')?.getAttribute('data-exec-line'),
    solve: document.querySelector('[data-solve-count]')?.getAttribute('data-solve-count'),
  }))
}
/** Current-data table values for an array (the data region, NOT the stage). */
async function dataTable(page: Page, name: string) {
  return page.evaluate(
    (name) =>
      [...document.querySelectorAll(`[data-testid="inspector-array-${name}"] tbody td`)].map((t) =>
        (t.textContent || '').trim(),
      ),
    name,
  )
}
async function setMode(page: Page, mode: 'bars' | 'cells') {
  const btn = page
    .getByTestId('viz-canvas')
    .locator('.array-view[data-array="a"]:not(.array-buffers .array-view) .view-toggle button', {
      hasText: mode === 'bars' ? '柱状' : '单元格',
    })
  await btn.click()
  await expect(btn).toHaveClass(/active/)
  await page.waitForTimeout(250)
}
async function mainA(page: Page) {
  return measureStageObjects(page, { ...MAIN_ARRAY_GROUPS('a'), ...BUFFER_GROUPS })
}
const brief = (m: StageObjects) => ({
  counter: m.frame.counter,
  banner: m.frame.banner,
  valuesVisH: (m.groups.values ?? []).map((v) => v.visH),
  barsVisH: (m.groups.bars ?? []).map((v) => v.visH),
  barsElH: (m.groups.bars ?? []).map((v) => v.elH),
})

/**
 * Same-frame check for merge/insertion: primary `a` fully visible (every slot, bar,
 * value, index, pointer) + stage values == current-data values + code exec line set.
 * Buffers are checked on their own (if the frame has them).
 */
async function assertArrayFrame(page: Page, label: string, n: number, opts: { buffers?: boolean } = {}) {
  const m = await mainA(page)
  expect(mainArrayFailures(m, n), `${label} ${m.frame.counter} primary a: ${JSON.stringify(brief(m))}`).toEqual([])
  const stageVals = await stageArrayValues(page, 'a')
  const tableVals = await dataTable(page, 'a')
  if (tableVals.length) expect(stageVals, `${label} ${m.frame.counter} stage a == current data a`).toEqual(tableVals)
  expect(m.frame.execLine, `${label} ${m.frame.counter} code exec line`).toBeGreaterThan(0)
  const buf = m.groups.bufferValues ?? []
  if (buf.length && opts.buffers !== false) {
    expect(notFullyVisible(buf), `${label} ${m.frame.counter} buffer values visible`).toEqual([])
  }
  return m
}

// ================================================================ V24-01A merge
test.describe('V24 merge sort — primary a vs buffers vs recursion tree', () => {
  test('merge default 7 items @1366x768: all 55 frames stepped (bars), key frames in cells', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'mergeSort')
    const rid = await run(page, 10)
    const n = await total(page)
    expect(n).toBe(55)
    const seen = new Set<string>()
    const phaseOf = (b: string) =>
      /^归并区间/.test(b) ? 'buffers' : /^比较/.test(b) ? 'compare' : /write-back/.test(b) ? 'write' : /^拷贝剩余/.test(b) ? 'remaining' : /完成|已排序/.test(b) ? 'done' : 'other'
    const keyFrames: number[] = []
    let treeNodesMax = 0
    for (let i = 0; i < n; i++) {
      if (i > 0) await clickNext(page)
      await page.waitForTimeout(40)
      const m = await assertArrayFrame(page, 'merge7 bars', 7)
      const ph = phaseOf(m.frame.banner)
      if (!seen.has(ph)) keyFrames.push(i)
      seen.add(ph)
      expect(m.frame.runId).toBe(rid)
      expect(m.frame.primary).toBe('array')
      if (i === 20) {
        expect(m.frame.banner).toContain('比较 left[0]=2 与 right[1]=8')
        record('merge7-21of55-1366-bars', brief(m))
        await page.screenshot({ path: path.join(SHOTS, 'merge7-21of55-bars-1366x768.png') })
      }
      const cs = await page.getByTestId('aux-callstack').textContent()
      expect(cs, 'call-stack summary present').toMatch(/调用栈/)
      treeNodesMax = Math.max(treeNodesMax, 0)
    }
    expect([...seen].sort()).toEqual(expect.arrayContaining(['buffers', 'compare', 'write', 'remaining']))
    expect(await dataTable(page, 'a')).toEqual(['1', '2', '3', '5', '7', '8', '9'])
    // cells mode on the same run: walk back through every key frame kind (and 21/55)
    await setMode(page, 'cells')
    for (const target of [...keyFrames, 20].sort((a, b) => b - a)) {
      while ((await stepIdx(page)) > target) await clickPrev(page)
      await page.waitForTimeout(60)
      const m = await assertArrayFrame(page, 'merge7 cells', 7)
      if (target === 20) {
        record('merge7-21of55-1366-cells', brief(m))
        await page.screenshot({ path: path.join(SHOTS, 'merge7-21of55-cells-1366x768.png') })
      }
    }
    record('merge7-keyframes', { keyFrames, phases: [...seen] })
  })

  test('merge 4,1,3,2 @1366x768: every frame in bars AND cells (stepped forward then back)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'mergeSort')
    await setArrayInput(page, '4,1,3,2')
    await run(page, 5)
    const n = await total(page)
    expect(n).toBe(25)
    let sawDup = false
    for (let i = 0; i < n; i++) {
      if (i > 0) await clickNext(page)
      await page.waitForTimeout(40)
      const m = await assertArrayFrame(page, 'merge4 bars', 4)
      const vals = await stageArrayValues(page, 'a')
      if (new Set(vals).size < vals.length) sawDup = true
      if (i === 12) {
        record('merge4-13of25-1366-bars', brief(m))
        await page.screenshot({ path: path.join(SHOTS, 'merge4132-13of25-bars-1366x768.png') })
      }
    }
    expect(sawDup, 'legal transient duplicate during copy-back is kept (never deduped)').toBe(true)
    expect(await dataTable(page, 'a')).toEqual(['1', '2', '3', '4'])
    await setMode(page, 'cells')
    for (let i = n - 1; i >= 0; i--) {
      if (i < n - 1) await clickPrev(page)
      await page.waitForTimeout(40)
      const m = await assertArrayFrame(page, 'merge4 cells', 4)
      if (i === 12) {
        record('merge4-13of25-1366-cells', brief(m))
        await page.screenshot({ path: path.join(SHOTS, 'merge4132-13of25-cells-1366x768.png') })
      }
    }
  })

  test('recursion tree open/close keeps runId/cursor/code/mode; a stays readable; tree grows', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 3)
    const s0 = await frameState(page)
    const toggle = page.getByTestId('aux-toggle-recursion-tree')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('scene-aux-pane')).toHaveCount(0)
    await assertArrayFrame(page, 'tree closed', 7)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const pane = page.getByTestId('scene-aux-pane')
    await expect(pane).toBeVisible()
    expect(await frameState(page)).toEqual(s0)
    await assertArrayFrame(page, 'tree open', 7)
    const nodes0 = await pane.locator('.st-node').count()
    await nextN(page, 17) // → 21/55
    const nodes1 = await pane.locator('.st-node').count()
    expect(nodes1, 'recursion tree grows while stepping').toBeGreaterThan(nodes0)
    const mOpen = await assertArrayFrame(page, 'tree open 21/55', 7)
    record('merge7-21of55-1366-tree-open', { ...brief(mOpen), nodes0, nodes1 })
    await page.screenshot({ path: path.join(SHOTS, 'merge7-21of55-tree-open-1366x768.png') })
    // bars → cells → bars while the tree is open: presentation only
    const s1 = await frameState(page)
    await setMode(page, 'cells')
    await assertArrayFrame(page, 'tree open cells', 7)
    await setMode(page, 'bars')
    expect(await frameState(page)).toEqual(s1)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('scene-aux-pane')).toHaveCount(0)
    expect(await frameState(page)).toEqual(s1)
    await assertArrayFrame(page, 'tree closed again', 7)
    // resize while tree open: still presentation-only
    await toggle.click()
    await page.setViewportSize({ width: 1200, height: 740 })
    await page.waitForTimeout(300)
    await assertArrayFrame(page, 'tree open 1200x740', 7)
    expect(await frameState(page)).toEqual(s1)
  })

  test('animation start / mid-transition / landing stay inside the drawing area (merge write + insertion move)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const [algo, input, n, advance] of [
      ['mergeSort', '', 7, 20],
      ['insertionSort', '5,2,4,1', 4, 2],
    ] as const) {
      await openAlgo(page, algo)
      if (input) await setArrayInput(page, input)
      await run(page, 3)
      await nextN(page, advance)
      const worst: number[] = []
      for (let k = 0; k < 4; k++) {
        // in-page rAF sampler records the WORST visible ratio of a's slots / layers / values
        await page.evaluate(() => {
          const w = window as unknown as { __v24samples: number[]; __v24stop: boolean }
          w.__v24samples = []
          w.__v24stop = false
          const stage = document.querySelector('[data-testid="viz-canvas"]')!
          const clip = (el: Element) => {
            const a = el.getBoundingClientRect()
            let t = a.top
            let b = a.bottom
            let n = el.parentElement
            while (n && n !== document.documentElement) {
              const cs = getComputedStyle(n)
              if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
                const r = n.getBoundingClientRect()
                t = Math.max(t, r.top)
                b = Math.min(b, r.bottom)
              }
              n = n.parentElement
            }
            t = Math.max(t, 0)
            b = Math.min(b, window.innerHeight)
            return a.height > 0 ? Math.max(0, b - t) / a.height : 0
          }
          const tick = () => {
            const view = [...stage.querySelectorAll('.array-view[data-array="a"]')].find((v) => !v.closest('.array-buffers'))
            if (view) {
              const els = [...view.querySelectorAll('[data-flip-layer], .bar-val, .cell-val')]
              w.__v24samples.push(Math.min(...els.map(clip)))
            }
            if (!w.__v24stop) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        })
        await page.getByTestId('next-step-btn').click()
        await page.waitForTimeout(450)
        const samples = await page.evaluate(() => {
          const w = window as unknown as { __v24samples: number[]; __v24stop: boolean }
          w.__v24stop = true
          return w.__v24samples
        })
        expect(samples.length, `${algo} sampled frames`).toBeGreaterThan(5)
        worst.push(Math.min(...samples))
        await assertArrayFrame(page, `${algo} landing`, n)
      }
      record(`anim-${algo}`, { worstVisibleRatio: worst })
      for (const w of worst) expect(w, `${algo} worst visible ratio during transition`).toBeGreaterThanOrEqual(0.98)
    }
  })
})

// ================================================================ V24-01B Huffman
test.describe('V24 Huffman — forest is the primary', () => {
  test('default 5 symbols @1366x768: every frame — select 2, merge, final tree + code table; leaves map input', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'huffman')
    const rid = await run(page, 5)
    const n = await total(page)
    expect(n).toBe(10)
    const input = new Set(['a:5', 'b:9', 'c:12', 'd:13', 'e:16'])
    let selects = 0
    let merges = 0
    for (let i = 0; i < n; i++) {
      if (i > 0) await clickNext(page)
      await page.waitForTimeout(60)
      const m = await measureStageObjects(page, HUFFMAN_GROUPS)
      expect(m.frame.runId).toBe(rid)
      expect(m.frame.primary, 'forest primary is stable on every frame').toBe('forest')
      expect(m.frame.execLine).toBeGreaterThan(0)
      for (const g of ['forestNodes', 'forestLabels', 'inputSymbols', 'inputGlyphs'] as const) {
        expect(notFullyVisible(m.groups[g]!), `huffman ${m.frame.counter} ${g} fully visible`).toEqual([])
      }
      expect(m.groups.inputSymbols!.length).toBe(5)
      const leaves = m.groups.forestLeaves!.map((l) => l.text.replace(/[01ε]+$/, ''))
      expect(new Set(leaves), `huffman ${m.frame.counter} leaves == input symbols:freqs`).toEqual(input)
      const roles = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="viz-canvas"] [data-forest-node]')].map((e) => ({
          id: e.getAttribute('data-node-id'),
          role: e.getAttribute('data-role'),
          depth: e.getAttribute('data-depth'),
          label: e.querySelector('.fn-label')?.textContent,
        })),
      )
      if (/^选取最小两棵/.test(m.frame.banner)) {
        selects++
        const sel = roles.filter((r) => r.role === 'selected' && r.depth === '0')
        expect(sel.length, `select frame ${m.frame.counter}: exactly two min subtrees`).toBe(2)
        const fOf = (l: string | null | undefined) => Number(String(l).split(/[:⊕]/).pop())
        const selIds = new Set(sel.map((r) => r.id))
        const selF = sel.map((r) => fOf(r.label))
        const restF = roles.filter((r) => r.depth === '0' && !selIds.has(r.id)).map((r) => fOf(r.label))
        if (restF.length) expect(Math.max(...selF), 'selected are the two minimum-weight trees').toBeLessThanOrEqual(Math.min(...restF))
        if (selects === 1) await page.screenshot({ path: path.join(SHOTS, 'huffman-4of10-1366x768.png') })
        record(`huffman-${m.frame.counter}`, { visH: m.groups.forestLabels!.map((x) => x.visH), sel: sel.map((s) => s.label) })
      }
      if (/^合并/.test(m.frame.banner)) {
        merges++
        const fresh = roles.find((r) => r.role === 'new')
        expect(fresh, `merge frame ${m.frame.counter}: new parent highlighted`).toBeTruthy()
        const kids = roles.filter((r) => r.role === 'merged')
        expect(kids.length).toBe(2)
        const sum = kids.reduce((s, k) => s + Number(k.label!.split(/[:⊕]/).pop()), 0)
        expect(fresh!.label).toBe(`⊕${sum}`)
      }
    }
    expect(selects).toBe(4)
    expect(merges).toBe(4)
    // final frame: one tree, codes under leaves and in the code table, equal to the final result
    await expect(page.getByTestId('forest-count')).toHaveText(/森林 1 棵/)
    const codes = await page.evaluate(() =>
      Object.fromEntries(
        ['a', 'b', 'c', 'd', 'e'].map((s) => [
          s,
          [
            document.querySelector(`[data-testid="forest-code-${s}"]`)?.textContent,
            document.querySelector(`[data-testid="huffman-code-${s}"]`)?.textContent?.replace('=', ''),
          ],
        ]),
      ),
    )
    const banner = (await page.getByTestId('viz-banner-text').textContent()) ?? ''
    for (const [s, [leaf, table]] of Object.entries(codes)) {
      expect(leaf, `${s} leaf code == table code`).toBe(table)
      expect(banner, `${s} code matches the run's result message`).toContain(`${s}=${leaf}`)
    }
    const fin = await measureStageObjects(page, { codes: '[data-testid^="forest-code-"]', ...HUFFMAN_GROUPS })
    expect(notFullyVisible(fin.groups.codes!), 'final codes fully visible').toEqual([])
    await page.screenshot({ path: path.join(SHOTS, 'huffman-final-10of10-1366x768.png') })
    record('huffman-codes', codes)
  })
})

// ================================================================ V24-02 activity
async function activityLabels(page: Page) {
  return measureLabelText(page, '.array-view[data-array="activities"] .cell-val')
}
test.describe('V24 activity selection — interval labels never collide', () => {
  test('default 6 items start / 4/14 / end @1366x768, dark + light theme, larger page font', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'activitySelection')
    await run(page, 5)
    const n = await total(page)
    for (const [label, target] of [
      ['start', 0],
      ['4of14', 3],
      ['end', n - 1],
    ] as const) {
      while ((await stepIdx(page)) < target) await clickNext(page)
      await page.waitForTimeout(80)
      const lab = await activityLabels(page)
      expect(lab.count).toBe(6)
      expect(lab.overlaps, `${label} neighbour label overlap`).toEqual([])
      expect(lab.clipped, `${label} label text clipped`).toEqual([])
      for (const b of lab.boxes) expect(b.text, 'id + [start,finish) both present').toMatch(/^A\d\[\d+,\d+\)$/)
      record(`activity-${label}-1366`, { widths: lab.widths, overlaps: lab.overlaps.length })
      if (label === '4of14') await page.screenshot({ path: path.join(SHOTS, 'activity-4of14-1366x768.png') })
    }
    // light theme
    await page.getByLabel('主题').selectOption('lab-light')
    await page.waitForTimeout(200)
    let lab = await activityLabels(page)
    expect(lab.overlaps, 'light theme overlap').toEqual([])
    await page.screenshot({ path: path.join(SHOTS, 'activity-end-light-1366x768.png') })
    await page.getByLabel('主题').selectOption('lab-dark')
    // larger page font (user default font size 20px) + larger code font
    await page.addStyleTag({ content: 'html { font-size: 20px; }' })
    const codeFont = page.getByLabel('代码字号')
    if (await codeFont.count()) await codeFont.fill(String(await codeFont.getAttribute('max') ?? '20'))
    await page.waitForTimeout(250)
    lab = await activityLabels(page)
    expect(lab.overlaps, 'larger font overlap').toEqual([])
    expect(lab.clipped, 'larger font clipped').toEqual([])
    record('activity-large-font', { widths: lab.widths })
    await page.screenshot({ path: path.join(SHOTS, 'activity-end-largefont-1366x768.png') })
  })
})

test.describe('V24 large data — intentional scroll with locate + view restore', () => {
  test('Huffman 14 symbols @1366x768: forest pans, 定位当前 brings the selected pair back after a manual wheel away', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'huffman')
    await ensureInputEditing(page)
    const syms = 'a b c d e f g h i j k l m n'.split(' ')
    await page.getByTestId('input-panel-body').getByLabel('符号', { exact: true }).fill(syms.join(', '))
    await page.getByTestId('input-panel-body').getByLabel('频率', { exact: true }).fill('1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610')
    await run(page, 10)
    const n = await total(page)
    // walk to the last select frame (largest subtrees on the right side)
    let target = -1
    for (let i = 0; i < n; i++) {
      if (i > 0) await clickNext(page)
      const b = (await page.getByTestId('viz-banner-text').textContent()) ?? ''
      if (/^选取最小两棵/.test(b)) target = i
    }
    while ((await stepIdx(page)) > target) await clickPrev(page)
    const vp = page.getByTestId('forest-viewport')
    const dims = await vp.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }))
    const selected = { selected: '[data-forest-node][data-role="selected"][data-depth="0"]' }
    let m = await measureStageObjects(page, selected)
    expect(m.groups.selected!.length).toBe(2)
    expect(notFullyVisible(m.groups.selected!), 'auto-located on step change').toEqual([])
    // learner pans away with the wheel (normal input) ...
    await vp.hover()
    await page.mouse.wheel(0, -2000)
    await page.keyboard.down('Shift')
    await page.mouse.wheel(0, -2000)
    await page.keyboard.up('Shift')
    await page.waitForTimeout(200)
    const away = await measureStageObjects(page, selected)
    // ... then 定位当前 restores the current pair
    await page.getByTestId('forest-locate-btn').click()
    await page.waitForTimeout(150)
    m = await measureStageObjects(page, selected)
    expect(notFullyVisible(m.groups.selected!), 'locate restores the current pair').toEqual([])
    record('large-huffman-locate', { dims, awayFull: away.groups.selected!.filter((x) => x.full).length })
    await page.screenshot({ path: path.join(SHOTS, 'huffman-14sym-located-1366x768.png') })
  })

  test('merge 390x844 tabs round trip (demo → data → code → demo) keeps a readable and runId/cursor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 20)
    await showDemo(page)
    await assertArrayFrame(page, 'tabs start', 7)
    const s0 = await frameState(page)
    await page.getByTestId('workbench-tab-data').click()
    await expect(page.getByTestId('inspector-array-a')).toBeVisible()
    await page.getByTestId('workbench-tab-code').click()
    await page.getByTestId('workbench-tab-demo').click()
    await assertArrayFrame(page, 'tabs back', 7)
    expect(await frameState(page)).toEqual(s0)
  })
})

// ================================================================ viewports
for (const [w, h] of [
  [1920, 1080],
  [390, 844],
] as const) {
  test(`key primaries @${w}x${h}: merge 21/55 bars+cells, 4,1,3,2 13/25, Huffman 4/10, activity 4/14`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 20)
    await showDemo(page)
    for (const mode of ['bars', 'cells'] as const) {
      if (mode === 'cells') await setMode(page, 'cells')
      const m = await assertArrayFrame(page, `merge7 ${mode} ${w}x${h}`, 7)
      record(`merge7-21of55-${w}x${h}-${mode}`, brief(m))
      await page.screenshot({ path: path.join(SHOTS, `merge7-21of55-${mode}-${w}x${h}.png`) })
    }
    await openAlgo(page, 'mergeSort')
    await setArrayInput(page, '4,1,3,2')
    await run(page, 5)
    await nextN(page, 12)
    await showDemo(page)
    const m4 = await assertArrayFrame(page, `merge4 ${w}x${h}`, 4)
    record(`merge4-13of25-${w}x${h}-bars`, brief(m4))
    await page.screenshot({ path: path.join(SHOTS, `merge4132-13of25-bars-${w}x${h}.png`) })

    await openAlgo(page, 'huffman')
    await run(page, 5)
    await nextN(page, 3)
    await showDemo(page)
    const hm = await measureStageObjects(page, HUFFMAN_GROUPS)
    for (const g of ['forestNodes', 'forestLabels', 'inputSymbols', 'inputGlyphs'] as const) {
      expect(notFullyVisible(hm.groups[g]!), `huffman ${w}x${h} ${g}`).toEqual([])
    }
    expect(hm.groups.forestLeaves!.length).toBe(5)
    record(`huffman-4of10-${w}x${h}`, { visH: hm.groups.forestLabels!.map((x) => x.visH) })
    await page.screenshot({ path: path.join(SHOTS, `huffman-4of10-${w}x${h}.png`) })

    await openAlgo(page, 'activitySelection')
    await run(page, 5)
    await nextN(page, 3)
    await showDemo(page)
    const lab = await activityLabels(page)
    expect(lab.count).toBe(6)
    expect(lab.overlaps).toEqual([])
    expect(lab.clipped).toEqual([])
    record(`activity-4of14-${w}x${h}`, { widths: lab.widths })
    await page.screenshot({ path: path.join(SHOTS, `activity-4of14-${w}x${h}.png`) })
  })
}

for (const [w, h] of [
  [1024, 600],
  [844, 390],
] as const) {
  test(`low-height fallback @${w}x${h}: stage scroll reveals a; aux + mode + locate entries reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 20)
    await showDemo(page)
    const stage = page.getByTestId('viz-canvas')
    const before = await mainA(page)
    // explicit fallback: the STAGE is the scroll owner; a normal wheel reveals the rest of a
    const scroll = await stage.evaluate((s) => ({ sh: s.scrollHeight, ch: s.clientHeight }))
    if (mainArrayFailures(before, 7).length) {
      expect(scroll.sh, 'stage offers explicit scroll when a does not fit').toBeGreaterThan(scroll.ch)
      await stage.hover()
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(250)
    }
    // (at this height a and the companion strip cannot share one view — buffers are checked
    //  separately after scrolling back; they never stand in for a)
    const after = await assertArrayFrame(page, `fallback ${w}x${h}`, 7, { buffers: false })
    record(`fallback-merge7-${w}x${h}`, { before: brief(before), after: brief(after), scroll })
    await page.screenshot({ path: path.join(SHOTS, `fallback-merge7-21of55-${w}x${h}.png`) })
    await stage.hover()
    await page.mouse.wheel(0, -800)
    await page.waitForTimeout(250)
    const top = await mainA(page)
    expect(top.groups.bufferValues!.length).toBe(4)
    expect(notFullyVisible(top.groups.bufferValues!), 'companions reachable at the top of the stage').toEqual([])
    // action entries: mode toggle and recursion-tree toggle are real, clickable controls
    await stage.evaluate((s) => (s.scrollTop = 0))
    const toggle = page.getByTestId('aux-toggle-recursion-tree')
    await toggle.scrollIntoViewIfNeeded()
    const s0 = await frameState(page)
    await toggle.click()
    await expect(page.getByTestId('scene-aux-pane')).toBeVisible()
    await toggle.click()
    expect(await frameState(page)).toEqual(s0)
    await setMode(page, 'cells')
    await stage.hover()
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(200)
    await assertArrayFrame(page, `fallback cells ${w}x${h}`, 7, { buffers: false })
    // Huffman: forest viewport + locate entry
    await openAlgo(page, 'huffman')
    await run(page, 5)
    await nextN(page, 3)
    await showDemo(page)
    await page.getByTestId('forest-locate-btn').click()
    const hm = await measureStageObjects(page, { selected: '[data-forest-node][data-role="selected"][data-depth="0"]', inputSymbols: HUFFMAN_GROUPS.inputSymbols! })
    expect(hm.groups.selected!.length).toBe(2)
    expect(notFullyVisible(hm.groups.selected!), 'located selected subtrees visible').toEqual([])
    await page.screenshot({ path: path.join(SHOTS, `fallback-huffman-4of10-${w}x${h}.png`) })
  })
}

// ================================================================ positive regressions
test.describe('V24 positive regressions on the same detector', () => {
  test('insertion sort temp companion + quicksort main array @1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'insertionSort')
    await setArrayInput(page, '2,1')
    await run(page, 3)
    const n = await total(page)
    let sawTemp = false
    for (let i = 0; i < n; i++) {
      if (i > 0) await clickNext(page)
      await page.waitForTimeout(40)
      const m = await assertArrayFrame(page, 'insertion [2,1]', 2)
      if ((m.groups.bufferValues ?? []).length) sawTemp = true
    }
    expect(sawTemp, 'temp/key companion shown').toBe(true)
    expect(await dataTable(page, 'a')).toEqual(['1', '2'])
    await openAlgo(page, 'quickSort')
    await run(page, 5)
    const q = await total(page)
    for (const t of [1, Math.floor(q / 3), Math.floor((2 * q) / 3), q - 1]) {
      while ((await stepIdx(page)) < t) await clickNext(page)
      await page.waitForTimeout(320)
      const len = (await dataTable(page, 'a')).length
      await assertArrayFrame(page, `quicksort ${t}`, len)
    }
  })
})

// ================================================================ negative controls
test.describe('V24 negative controls — the SAME detector must fail while injected, pass after restore', () => {
  test('merge: a squeezed to 56px (overflow hidden) with data table intact → FAIL; restore → PASS', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 20)
    const table = await dataTable(page, 'a')
    const css = `.stage-primary-pane .array-view[data-array="a"]{flex:0 0 56px!important;height:56px!important;min-height:0!important;max-height:56px!important;overflow:hidden!important}`
    const handle = await page.addStyleTag({ content: css })
    await page.waitForTimeout(300)
    const bad = mainArrayFailures(await mainA(page), 7)
    expect(await dataTable(page, 'a'), 'data table still correct under the fault').toEqual(table)
    expect(bad.length, `squeezed a must fail: ${JSON.stringify(bad)}`).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(SHOTS, 'FAULT-INJECTED-merge-a-squeezed-56px-1366x768.png') })
    await handle.evaluate((el) => el.remove())
    await page.waitForTimeout(300)
    expect(mainArrayFailures(await mainA(page), 7)).toEqual([])
    record('neg-merge-squeeze', { failWhileInjected: bad })
  })

  test('merge: buffers + recursion tree kept, a hidden → FAIL (buffers/mainCount cannot pass it); restore → PASS', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'mergeSort')
    await run(page, 10)
    await nextN(page, 20)
    await page.getByTestId('aux-toggle-recursion-tree').click()
    await expect(page.getByTestId('scene-aux-pane')).toBeVisible()
    const handle = await page.addStyleTag({
      content: `.stage-primary-pane .array-view[data-array="a"] .bars-wrap, .stage-primary-pane .array-view[data-array="a"] .array-cells{visibility:hidden!important}`,
    })
    await page.waitForTimeout(200)
    const m = await mainA(page)
    const bad = mainArrayFailures(m, 7)
    expect(notFullyVisible(m.groups.bufferValues!), 'buffers still fully visible').toEqual([])
    expect(m.groups.slots!.length, 'mainCount unchanged (7) — not a valid pass signal').toBe(7)
    expect(bad.length, `hidden a must fail: ${JSON.stringify(bad)}`).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(SHOTS, 'FAULT-INJECTED-merge-a-hidden-buffers-tree-kept-1366x768.png') })
    await handle.evaluate((el) => el.remove())
    await page.waitForTimeout(200)
    expect(mainArrayFailures(await mainA(page), 7)).toEqual([])
    record('neg-merge-hidden', { failWhileInjected: bad })
  })

  test('huffman: symbol/freq cards squeezed to their tops → FAIL; restore → PASS', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'huffman')
    await run(page, 5)
    await nextN(page, 3)
    const check = async () => {
      const m = await measureStageObjects(page, HUFFMAN_GROUPS)
      return [
        ...notFullyVisible(m.groups.forestLabels!).map((x) => `forest:${x.text}`),
        ...notFullyVisible(m.groups.inputSymbols!).map((x) => `input:${x.text}`),
        ...notFullyVisible(m.groups.inputGlyphs!).map((x) => `glyph:${x.text}`),
      ]
    }
    const handle = await page.addStyleTag({
      content: `.forest-node{height:9px!important;overflow:hidden!important} .fh-sym{height:9px!important;overflow:hidden!important;display:inline-block!important}`,
    })
    await page.waitForTimeout(200)
    const bad = await check()
    expect(bad.length, `squeezed symbol cards must fail: ${JSON.stringify(bad)}`).toBeGreaterThan(0)
    expect(bad.some((b) => b.startsWith('forest:')), 'squeezed forest nodes must fail').toBe(true)
    expect(bad.some((b) => b.startsWith('glyph:')), 'squeezed input chips must fail on their glyphs').toBe(true)
    await page.screenshot({ path: path.join(SHOTS, 'FAULT-INJECTED-huffman-cards-squeezed-1366x768.png') })
    await handle.evaluate((el) => el.remove())
    await page.waitForTimeout(200)
    expect(await check()).toEqual([])
    record('neg-huffman-squeeze', { failWhileInjected: bad })
  })

  test('activity: cells forced to 52px single-line → label check FAILS; restore → PASS', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'activitySelection')
    await run(page, 5)
    await nextN(page, 3)
    const handle = await page.addStyleTag({
      content: `.cell.cell-interval{width:52px!important;min-width:52px!important;max-width:52px!important;padding:0!important} .cell-val-interval{flex-direction:row!important} .cell-val-interval .iv-id,.cell-val-interval .iv-range{font-size:0.9rem!important}`,
    })
    await page.waitForTimeout(200)
    const bad = await activityLabels(page)
    expect(bad.overlaps.length, `52px single-line labels must collide: ${JSON.stringify(bad.overlaps)}`).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(SHOTS, 'FAULT-INJECTED-activity-52px-single-line-1366x768.png') })
    await handle.evaluate((el) => el.remove())
    await page.waitForTimeout(200)
    const ok = await activityLabels(page)
    expect(ok.overlaps).toEqual([])
    expect(ok.clipped).toEqual([])
    record('neg-activity-52px', { overlapsWhileInjected: bad.overlaps })
  })
})

// ================================================================ ×3 zero-retry key paths live in --repeat-each
