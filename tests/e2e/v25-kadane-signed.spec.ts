/**
 * V25 acceptance: V25-01 Kadane executed-statement mapping + V25-02 signed chart
 * annotation layering. Full app at a normal local URL; real clicks / keyboard /
 * sliders only; no force, no evaluate(click), no "恢复/定位" rescue. retries: 0.
 *
 * Expected statements come from the CodeDocument itself (getCatalog('kadane')) and
 * the frames from the real generator — not from a hard-coded line number list.
 * Set V25_BASE to run the same spec against another server (negative control on the
 * V24 build: it must FAIL).
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { waitForRunReady } from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import {
  measureStageObjects,
  MAIN_ARRAY_GROUPS,
  mainArrayFailures,
  measureSignedAnnotations,
  signedAnnotationFailures,
  stageArrayValues,
} from './helpers/primaryObjects'
import { getCatalog } from '../../src/codeCatalog'
import { generateSteps as kadaneSteps } from '../../src/algorithms/kadane'
import { pickPrimaryCodeRef } from '../../src/utils/codeRefs'

if (process.env.V25_BASE) test.use({ baseURL: process.env.V25_BASE })
test.describe.configure({ retries: 0 })

const TRACES = path.join(process.cwd(), 'docs/traces/v25')
fs.mkdirSync(TRACES, { recursive: true })
const trace: Record<string, unknown> = {}
const record = (k: string, v: unknown) => {
  trace[k] = v
}
test.afterAll(() => {
  const file = path.join(TRACES, `v25-e2e-${process.env.V25_TRACE_TAG ?? 'run'}.json`)
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...trace }, null, 2))
})

const DOC = getCatalog('kadane')!.typescript
const DOC_LINES = DOC.source.split('\n')
const DEFAULT = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
/** Expected arrow statement for a generator frame, read through its anchor. */
function expectedStatement(step: ReturnType<typeof kadaneSteps>[number]) {
  const id = pickPrimaryCodeRef(step)!.anchorId
  const a = DOC.anchors.find((x) => x.id === id)!
  return { id, line: a.range.startLine, text: DOC_LINES[a.range.startLine - 1]!.trim() }
}

// ---------------------------------------------------------------- page helpers
async function openAlgo(page: Page, algo: string) {
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
}
async function setArrayInput(page: Page, value: string) {
  await ensureInputEditing(page)
  await page.getByTestId('array-input').fill(value)
}
async function run(page: Page, minSteps = 1) {
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
  const panel = page.getByTestId('input-panel')
  if ((await panel.getAttribute('data-editing')) === '1') {
    const t = page.getByTestId('input-edit-toggle')
    if (await t.isVisible()) await t.click()
  }
  return rid
}
const stepIdx = async (page: Page) => Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))
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
async function settle(page: Page) {
  await landed(page)
  await page.waitForTimeout(320) // height transitions (220ms) land
}
async function showDemo(page: Page) {
  const tab = page.getByTestId('workbench-tab-demo')
  if (await tab.isVisible()) await tab.click()
}
/** Real editor state: exec line attribute + the decorated CodeMirror line's text. */
async function execState(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="code-mirror-wrap"]')
    const deco = [...document.querySelectorAll('.cm-exec-line')]
    return {
      line: Number(wrap?.getAttribute('data-exec-line') || 0),
      decorated: deco.map((d) => (d.textContent ?? '').trim()),
      banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim() ?? '',
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent?.trim() ?? '',
      unmapped: !!document.querySelector('[data-testid="code-unmapped"]'),
      runId: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-run-id'),
      cursor: Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')),
      speed: (document.querySelector('input[aria-label="播放速度"]') as HTMLInputElement | null)?.value ?? null,
    }
  })
}
async function varChip(page: Page, k: string) {
  return page.evaluate((k) => {
    const chips = [...document.querySelectorAll(`[data-var="${k}"] .var-val`)]
    return chips.map((c) => (c.textContent ?? '').trim())[0] ?? null
  }, k)
}
function assertExec(e: Awaited<ReturnType<typeof execState>>, exp: { line: number; text: string }, tag: string) {
  expect(e.unmapped, `${tag} unmapped`).toBe(false)
  expect(e.line, `${tag} exec line`).toBe(exp.line)
  expect(DOC_LINES[e.line - 1]!.trim(), `${tag} document statement`).toBe(exp.text)
  // the real editor decoration (not a DOM index) shows that same statement
  expect(e.decorated, `${tag} decorated line`).toEqual([exp.text])
  expect(exp.text.startsWith('export function'), `${tag} not the declaration`).toBe(false)
}

// ============================================================ V25-01
test.describe('V25-01 Kadane executed statement', () => {
  test('default 22 frames @1366x768: banner, real vars, semantic statement per frame', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'kadane')
    await run(page, 22)
    const frames = kadaneSteps(DEFAULT)
    expect(frames).toHaveLength(22)
    const log: unknown[] = []
    for (let k = 0; k < 22; k++) {
      if (k > 0) await clickNext(page)
      await page.waitForTimeout(60)
      const e = await execState(page)
      const exp = expectedStatement(frames[k]!)
      expect(e.counter.startsWith(`${k + 1} / 22`), `counter ${e.counter}`).toBe(true)
      expect(e.banner, `frame ${k + 1} banner`).toBe(frames[k]!.message)
      assertExec(e, exp, `frame ${k + 1}`)
      // current-data region shows the generator's real variables (same names as the code)
      const vars = frames[k]!.vars as Record<string, unknown>
      for (const name of ['i', 'cur', 'best'] as const) {
        if (vars[name] === undefined) continue
        expect(await varChip(page, name), `frame ${k + 1} var ${name}`).toBe(String(vars[name]))
      }
      log.push({ frame: k + 1, banner: e.banner, anchor: exp.id, line: e.line, statement: exp.text, vars })
    }
    record('kadane-default-22', log)
    // frame 7 explicitly
    const f7 = (log as { frame: number; banner: string; statement: string; vars: Record<string, unknown> }[])[6]!
    expect(f7.banner).toBe('考察 a[3] = 4')
    expect(f7.vars.i).toBe(3)
    expect(f7.statement).toBe('for (let i = 1; i < a.length; i++) {')
  })

  test('frame 7 stays on the same statement after back, replay, seek, font size and soft-wrap changes', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'kadane')
    const rid = await run(page, 22)
    const exp = expectedStatement(kadaneSteps(DEFAULT)[6]!)
    for (let k = 0; k < 6; k++) await clickNext(page)
    assertExec(await execState(page), exp, 'forward')
    // back one, forward one
    await clickPrev(page)
    const back = await execState(page)
    expect(back.decorated[0]).not.toBe(exp.text) // frame 6 is a different statement (延伸)
    await clickNext(page)
    assertExec(await execState(page), exp, 'back+forward')
    // replay from the start (reset) and step again
    await page.getByTestId('reset-playback-btn').click()
    await expect.poll(() => stepIdx(page)).toBe(0)
    for (let k = 0; k < 6; k++) await clickNext(page)
    assertExec(await execState(page), exp, 'replay')
    // progress jump (seek far, then to frame 7)
    await page.getByRole('slider', { name: '步骤进度' }).fill('18')
    await expect.poll(() => stepIdx(page)).toBe(18)
    await page.getByRole('slider', { name: '步骤进度' }).fill('6')
    await expect.poll(() => stepIdx(page)).toBe(6)
    assertExec(await execState(page), exp, 'seek')
    // code font size + soft wrap
    await page.getByRole('slider', { name: '代码字号' }).fill('18')
    await page.waitForTimeout(150)
    assertExec(await execState(page), exp, 'font 18')
    await page.getByTestId('line-wrap-checkbox').click()
    await page.waitForTimeout(150)
    assertExec(await execState(page), exp, 'no-wrap')
    await page.getByTestId('line-wrap-checkbox').click()
    await page.getByRole('slider', { name: '代码字号' }).fill('11')
    await page.waitForTimeout(150)
    const e = await execState(page)
    assertExec(e, exp, 'font 11 + wrap')
    expect(e.runId).toBe(rid)
    record('kadane-f7-robust', e)
  })

  for (const c of [
    { input: '1,-1', best: 1, range: [0, 0] },
    { input: '-4,-2,-5', best: -2, range: [1, 1] },
    { input: '0,0', best: 0, range: [0, 0] },
  ]) {
    test(`small input [${c.input}]: every frame's statement + non-empty result`, async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 })
      await openAlgo(page, 'kadane')
      await setArrayInput(page, c.input)
      const arr = c.input.split(',').map(Number)
      const frames = kadaneSteps(arr)
      await run(page, frames.length)
      for (let k = 0; k < frames.length; k++) {
        if (k > 0) await clickNext(page)
        await page.waitForTimeout(40)
        const e = await execState(page)
        expect(e.banner).toBe(frames[k]!.message)
        assertExec(e, expectedStatement(frames[k]!), `[${c.input}] frame ${k + 1}`)
      }
      expect(frames.at(-1)!.result).toMatchObject({ hasSubarray: true, best: c.best, range: c.range })
      const e = await execState(page)
      expect(e.banner).toContain(`最大和=${c.best}`)
      expect(e.banner).toContain(`区间[${c.range[0]},${c.range[1]}]`)
    })
  }

  test('empty input: the page contract rejects it (non-empty demo); no run, no fake sum-0 answer', async ({ page }) => {
    // Page contract (AlgoPage validation): demo input must be non-empty → 「数组不能为空」.
    // Solver/registry contract (allowEmpty): empty → hasSubarray=false, best=null — unit-tested.
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'kadane')
    const rid = await run(page, 22) // a real run first, so we can prove it is kept
    await setArrayInput(page, '')
    await page.getByTestId('run-btn').click()
    await expect(page.getByText('数组不能为空')).toBeVisible()
    await page.waitForTimeout(400)
    const e = await execState(page)
    expect(e.runId, 'no new run was started').toBe(rid)
    expect(e.banner).not.toContain('最大和=0')
    const f = kadaneSteps([])
    expect(f).toHaveLength(1)
    expect(f[0]!.result).toEqual({ ok: true, hasSubarray: false, best: null, range: null })
    expect(expectedStatement(f[0]!).text.startsWith('if (a.length === 0) return null')).toBe(true)
  })
})

// ============================================================ V25-02
type Case = { key: string; algo: string; input: string | null; frame: number; total?: number; target?: string }
const FIXED: Case[] = [
  { key: 'kadane-default-7of22', algo: 'kadane', input: null, frame: 7, total: 22 },
  { key: 'insertion-1_-1-3of6', algo: 'insertionSort', input: '1,-1', frame: 3, total: 6 },
  { key: 'quick-5_-5_0-3of10', algo: 'quickSort', input: '5,-5,0', frame: 3, total: 10 },
]
async function openCase(page: Page, c: Case) {
  await openAlgo(page, c.algo)
  if (c.input !== null) await setArrayInput(page, c.input)
  if (c.target !== undefined) {
    await ensureInputEditing(page)
    await page.locator('label.field-target input').first().fill(c.target)
  }
  const rid = await run(page, 1)
  const total = Number(((await page.getByTestId('step-counter').textContent()) ?? '').match(/\/\s*(\d+)/)?.[1] ?? 0)
  if (c.total) expect(total).toBe(c.total)
  for (let k = 1; k < c.frame; k++) await clickNext(page)
  await settle(page)
  return { rid, total }
}
async function checkSigned(page: Page, tag: string, opts: { visibility?: boolean } = {}) {
  await showDemo(page)
  const r = await measureSignedAnnotations(page)
  const f = signedAnnotationFailures(r)
  if (opts.visibility !== false) {
    const m = await measureStageObjects(page, MAIN_ARRAY_GROUPS())
    f.push(...mainArrayFailures(m, r.slots.length))
  }
  record(tag, { slots: r.slots, conflicts: r.conflicts, zeroLineY: r.zeroLineY, failures: f })
  expect(f, `${tag}: ${f.join(' | ')}`).toEqual([])
  return r
}

test.describe('V25-02 signed bars: plot area vs annotation tracks', () => {
  for (const motion of ['standard', 'reduced'] as const) {
    for (const c of FIXED) {
      test(`${c.key} @1366x768 ${motion}: no value/bar/index/pointer collisions, aligned, same zero line`, async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 768 })
        await openAlgo(page, c.algo)
        await page.getByLabel('动画模式').selectOption(motion)
        const { rid } = await openCase(page, c)
        const r = await checkSigned(page, `${c.key}-${motion}`)
        expect(r.signed).toBe(true)
        expect(r.slots.some((s) => s.ptrs.length > 0), 'a pointer is shown').toBe(true)
        // stage values are the data (the current-data table cannot stand in for them)
        const vals = await stageArrayValues(page, 'a')
        expect(vals.length).toBe(r.slots.length)
        expect((await execState(page)).runId).toBe(rid)
        // one more real step, landed → still clean (post-motion settle)
        await clickNext(page)
        await settle(page)
        await checkSigned(page, `${c.key}-${motion}-next`)
      })
    }
  }

  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 390, h: 844 },
    { w: 844, h: 390 },
  ]) {
    test(`fixed cases @${vp.w}x${vp.h}: no collisions (small windows may scroll)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      for (const c of FIXED) {
        await openCase(page, c)
        // 1920 must be fully visible; small windows: collisions only (scrollable reading path allowed)
        await checkSigned(page, `${c.key}-${vp.w}x${vp.h}`, { visibility: vp.w >= 1366 && vp.h >= 768 })
      }
    })
  }

  const EXTRA: { key: string; algo: string; input: string; target?: string }[] = [
    { key: 'quick-5_-5_0', algo: 'quickSort', input: '5,-5,0' },
    { key: 'insertion-100_1_-100_0', algo: 'insertionSort', input: '100,1,-100,0' },
    { key: 'bubble-all-negative', algo: 'bubbleSort', input: '-3,-1,-4,-2' },
    { key: 'insertion-all-zero', algo: 'insertionSort', input: '0,0,0' },
    { key: 'binary-negative-sorted', algo: 'binarySearch', input: '-7,-3,0,2,5', target: '5' },
    { key: 'kadane-default', algo: 'kadane', input: '-2,1,-3,4,-1,2,1,-5,4' },
  ]
  for (const c of EXTRA) {
    test(`every landed frame of ${c.key} @1366x768 is collision-free`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width: 1366, height: 768 })
      const { total } = await openCase(page, { key: c.key, algo: c.algo, input: c.input, frame: 1, target: c.target })
      let multi = 0
      for (let k = 0; k < total; k++) {
        if (k > 0) await clickNext(page)
        await settle(page)
        const r = await checkSigned(page, `${c.key}-f${k + 1}`, { visibility: true })
        multi = Math.max(multi, ...r.slots.map((s) => s.ptrs.length))
        const nums = r.slots.map((s) => Number(s.value))
        // equal magnitude, opposite sign → equal drawn length; zero → data height 0
        for (const a of r.slots) {
          if (a.value === '0') expect(a.dataH, `zero @${a.i}`).toBe(0)
          for (const b of r.slots) if (Number(a.value) === -Number(b.value) && Number(a.value) !== 0) expect(Math.abs(a.barH - b.barH)).toBeLessThan(1)
        }
        void nums
      }
      if (c.key === 'binary-negative-sorted') expect(multi, 'same-slot pointers seen').toBeGreaterThanOrEqual(2)
      record(`${c.key}-maxPtrsPerSlot`, multi)
    })
  }

  test('same value keeps the same drawn height across frames of one run (Kadane)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openCase(page, { key: 'k', algo: 'kadane', input: null, frame: 1 })
    const h0 = (await measureSignedAnnotations(page)).slots.map((s) => s.barH)
    for (let k = 0; k < 10; k++) await clickNext(page)
    await settle(page)
    const h1 = (await measureSignedAnnotations(page)).slots.map((s) => s.barH)
    h0.forEach((h, i) => expect(Math.abs(h - h1[i]!), `slot ${i}`).toBeLessThan(1))
  })

  test('bars↔cells, data collapse, narrower window and code-size changes re-measure; cursor/run/speed unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const { rid } = await openCase(page, FIXED[0]!)
    const s0 = await execState(page)
    const view = page.locator('[data-testid="viz-canvas"] .array-view[data-array="a"]').first()
    await view.getByRole('button', { name: '单元格' }).click()
    await settle(page)
    await view.getByRole('button', { name: '柱状' }).click()
    await settle(page)
    await checkSigned(page, 'toggle-bars-cells')
    // collapse / expand current data (changes the scene's height)
    const dt = page.getByTestId('data-toggle')
    if (await dt.isVisible()) {
      await dt.click()
      await settle(page)
      await checkSigned(page, 'data-collapsed')
      await dt.click()
      await settle(page)
      await checkSigned(page, 'data-expanded')
    }
    // narrower window → narrower scene partition
    for (const w of [1180, 1024]) {
      await page.setViewportSize({ width: w, height: 768 })
      await settle(page)
      await checkSigned(page, `narrow-${w}`, { visibility: false })
    }
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.getByRole('slider', { name: '代码字号' }).fill('17')
    await settle(page)
    await checkSigned(page, 'code-font-17')
    const s1 = await execState(page)
    expect(s1.runId).toBe(rid)
    expect(s1.cursor).toBe(s0.cursor)
    expect(s1.speed).toBe(s0.speed)
    expect(s1.line).toBe(s0.line)
  })

  test('declared-primary branch (mergeSort, signed input) with recursion tree open/closed', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openCase(page, { key: 'merge-signed', algo: 'mergeSort', input: '3,-1,2,-4,0', frame: 6 })
    const s0 = await execState(page)
    await checkSigned(page, 'merge-signed-f6')
    const tog = page.getByTestId('aux-toggle-recursion-tree')
    if (await tog.isVisible()) {
      await tog.click()
      await settle(page)
      await checkSigned(page, 'merge-signed-tree-toggled')
      await tog.click()
      await settle(page)
      await checkSigned(page, 'merge-signed-tree-restored')
    }
    const s1 = await execState(page)
    expect(s1.cursor).toBe(s0.cursor)
    expect(s1.runId).toBe(s0.runId)
  })

  test('negative controls: injected layout faults are caught, restore passes', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openCase(page, FIXED[0]!)
    await checkSigned(page, 'nc-baseline')
    const faults: Record<string, string> = {
      // V24-like: annotation row laid over the top of the plot
      'pointer-row-over-plot': '.bars-wrap.signed .pointer-row{position:absolute!important;top:0!important;left:0;right:0}',
      // plot squeezed: bars spill onto the index / pointer tracks
      'plot-squeezed': '.bars-wrap.signed .bar-plot{height:24px!important}',
      // zero line moved away from where bars start
      'zero-line-shifted': '.bars-wrap.signed .bar-baseline{margin-top:14px!important}',
    }
    const caught: Record<string, string[]> = {}
    for (const [name, css] of Object.entries(faults)) {
      const handle = await page.addStyleTag({ content: css })
      await page.waitForTimeout(350)
      const r = await measureSignedAnnotations(page)
      caught[name] = signedAnnotationFailures(r)
      expect(caught[name]!.length, `fault ${name} must be detected`).toBeGreaterThan(0)
      await handle.evaluate((el) => el.remove())
      await page.waitForTimeout(350)
      await checkSigned(page, `nc-restored-${name}`)
    }
    record('negative-controls', caught)
  })
})
