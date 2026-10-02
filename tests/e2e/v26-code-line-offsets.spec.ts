/**
 * V26: code-line references in the full app (1366×768, page default inputs).
 * For every frame whose banner matches a defect's message, the code panel's highlighted
 * line (data-exec-line + the CodeMirror .cm-exec-line) must be the statement the frame
 * reports — line numbers are looked up in the displayed CodeDocument by statement text,
 * never hard-coded offsets. Real clicks on「下一步」only; no force, no evaluate(click), no
 * pre-emptive scrollIntoView, no viewport enlarging, retries 0. Frame identity (runId /
 * cursor / banner / exec line) comes from the V24 object-level detector (measureStageObjects).
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureStageObjects } from './helpers/primaryObjects'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import { getCatalog } from '../../src/codeCatalog'

if (process.env.V26_BASE) test.use({ baseURL: process.env.V26_BASE })
test.describe.configure({ retries: 0 })

const VP = { width: 1366, height: 768 }

/** 1-based line of `stmt` in the TS document the page shows for `algoId`. */
function lineOf(algoId: string, stmt: string | RegExp) {
  const L = getCatalog(algoId)!.typescript.source.split('\n')
  const i = L.findIndex((l) => (typeof stmt === 'string' ? l.trim() === stmt : stmt.test(l.trim())))
  if (i < 0) throw new Error(`${algoId}: statement ${stmt} not in document`)
  return i + 1
}

async function frame(page: Page) {
  const m = await measureStageObjects(page, {})
  const code = await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="code-mirror-wrap"]')
    const el = wrap?.querySelector('.cm-exec-line') as HTMLElement | null
    const unmapped = !!document.querySelector('[data-testid="code-unmapped"]')
    if (!el) return { unmapped, text: null as string | null, full: false }
    const a = el.getBoundingClientRect()
    let t = a.top, b = a.bottom
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
        const r = n.getBoundingClientRect()
        t = Math.max(t, r.top)
        b = Math.min(b, r.bottom)
      }
    }
    t = Math.max(t, 0)
    b = Math.min(b, window.innerHeight)
    return { unmapped, text: (el.textContent ?? '').trim(), full: a.height > 0 && b - t >= a.height - 0.75 }
  })
  return { ...m.frame, code }
}

async function openAndRun(page: Page, algoId: string) {
  await page.setViewportSize(VP)
  await page.goto('#/')
  await page.goto(`#/algo/${algoId}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('run-btn').click()
  await waitForRunReady(page)
  const f = await frame(page)
  const total = Number(f.counter.match(/\/\s*(\d+)/)![1])
  return { runId: f.runId, total }
}

const CASES: { algoId: string; match: RegExp; stmt: string | RegExp }[] = [
  { algoId: 'quickSort', match: /无需划分/, stmt: 'if (L >= R) return' },
  { algoId: 'mergeSort', match: /抽出 left\/right 缓冲/, stmt: 'const left = a.slice(L, mid + 1)' },
  { algoId: 'lcs', match: /开始回溯/, stmt: 'let i = m' },
  { algoId: 'lcs', match: /^LCS 长度 =/, stmt: /^return \{ length: dp\[m\]!\[n\]!/ },
  { algoId: 'knapsack01', match: /更优：dp/, stmt: 'if (take > dp[i]![w]!) dp[i]![w] = take' },
  { algoId: 'floyd', match: /^初始化距离矩阵/, stmt: 'const d = dist.map((r) => r.slice())' },
]

for (const c of CASES) {
  test(`${c.algoId} "${c.match.source}" highlights ${c.stmt} @1366x768 (page default input)`, async ({ page }) => {
    const want = lineOf(c.algoId, c.stmt)
    const { runId, total } = await openAndRun(page, c.algoId)
    const results: string[] = []
    let hits = 0
    for (let k = 0; k < total; k++) {
      if (k > 0) {
        await page.getByTestId('next-step-btn').click()
        await expect.poll(async () => (await frame(page)).stepIndex).toBe(k)
      }
      const f0 = await frame(page)
      if (!c.match.test(f0.banner)) continue
      hits++
      // follow-exec scrolls the code panel to the exec line; wait for it to settle
      await expect.poll(async () => (await frame(page)).code.full, { timeout: 5_000 }).toBe(true).catch(() => {})
      const f = await frame(page)
      const tag = `input=page default ${c.algoId}, viewport=${f.vp.w}x${f.vp.h}, runId=${f.runId}, cursor=${f.stepIndex} (${f.counter}), banner="${f.banner}", execLine=${f.execLine}, want=${want}`
      results.push(tag)
      expect(f.runId, tag).toBe(runId)
      expect(f.code.unmapped, `${tag}: 未映射`).toBe(false)
      expect(f.execLine, tag).toBe(want)
      expect(f.code.text, `${tag}: highlighted text`).toBe(getCatalog(c.algoId)!.typescript.source.split('\n')[want - 1]!.trim())
      expect(f.code.full, `${tag}: highlighted line fully visible in the code panel`).toBe(true)
    }
    test.info().annotations.push({ type: 'frames', description: results.join('\n') })
    expect(hits, `input=page default ${c.algoId}, viewport=1366x768, runId=${runId}: frames matching ${c.match}`).toBeGreaterThan(0)
  })
}

/**
 * #6 decision evidence: knapsack01.generateSteps has an「非法输入」frame, but the page's own
 * parser rejects every input that would reach it, so that frame is never shown; the run
 * that was on screen stays (same runId) and no solver frame for the bad input appears.
 */
test('knapsack01 invalid input never reaches the solver frame @1366x768 (keyboard entry)', async ({ page }) => {
  const { runId } = await openAndRun(page, 'knapsack01')
  const BAD: [string, string, string, string][] = [
    ['zero weight', '0, 3', '3, 4', '5'],
    ['fractional weight', '1.5', '1', '3'],
    ['negative value', '1', '-1', '3'],
    ['fractional W', '1', '1', '2.5'],
    ['length mismatch', '1, 2', '1', '3'],
  ]
  const type = async (label: RegExp, cls: string, v: string) => {
    const input = page.locator(`label.${cls}`, { hasText: label }).locator('input')
    await input.click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.type(v)
    await expect(input).toHaveValue(v)
  }
  for (const [name, w, v, W] of BAD) {
    await ensureInputEditing(page)
    await type(/重量/, 'field-array', w)
    await type(/价值/, 'field-array', v)
    await type(/容量/, 'field-target', W)
    await page.getByTestId('run-btn').click()
    await expect(page.locator('.input-errors').first()).toBeVisible()
    await page.waitForTimeout(400)
    const f = await frame(page)
    const tag = `input=${name} weights="${w}" values="${v}" W="${W}", viewport=${f.vp.w}x${f.vp.h}, runId=${f.runId}, cursor=${f.stepIndex} (${f.counter}), banner="${f.banner}"`
    test.info().annotations.push({ type: 'invalid', description: tag })
    expect(f.banner.startsWith('非法输入'), tag).toBe(false)
    expect(f.runId, `${tag}: no new run`).toBe(runId)
  }
})
