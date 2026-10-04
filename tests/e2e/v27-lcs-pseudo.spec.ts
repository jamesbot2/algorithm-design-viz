/**
 * V27: LCS pseudocode execution locations in the real app.
 *
 * Gap detector = tests/helpers/lcsCodeSemantics.ts (statement meaning per event, same as the
 * unit tests) + tests/e2e/helpers/codeExec.ts (object-level visibility of the highlighted line
 * inside the document's OWN scroll container). A frame with data-exec-line="", header ":—",
 * no anchor, a wrong statement, or a line that is not actually on screen FAILS — the check
 * never looks for the text「未映射」alone.
 *
 * Real operations only: real clicks on「下一步」/tabs/checkboxes, real mouse wheel, keyboard on
 * native range inputs. No force, no evaluate(click), no pre-emptive scrollIntoView, no viewport
 * enlarging, no skipped frames, retries 0. Every assertion message carries input, viewport,
 * runId and cursor.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import { measureCodeExec, tagOf, type CodeExecState } from './helpers/codeExec'
import { getCatalog } from '../../src/codeCatalog'
import { classifyLcsMessage, lcsExecFailures } from '../helpers/lcsCodeSemantics'

if (process.env.V27_BASE) test.use({ baseURL: process.env.V27_BASE })
test.describe.configure({ retries: 0 })

const cat = getCatalog('lcs')!
const DEFAULT_INPUT = 'page default X="ABCBDAB" Y="BDCABA"'

/** The gap detector for the LCS page: [] only when the shown doc locates the frame's event. */
function lcsGaps(s: CodeExecState): string[] {
  const doc = s.docId === cat.pseudocode!.documentId ? cat.pseudocode! : s.docId === cat.typescript.documentId ? cat.typescript : null
  if (!doc) return [`unknown document "${s.docId}"`]
  const execLine = s.execAttr && /^\d+$/.test(s.execAttr) ? Number(s.execAttr) : null
  const f = lcsExecFailures(doc, classifyLcsMessage(s.frame.banner), {
    execLine,
    headerDocId: s.headerDocId,
    headerLine: s.headerLine,
    domText: s.domText,
    weakLines: s.weakLines,
    weakTexts: s.weakTexts,
  })
  if (s.frame.preview) f.push('page is still in preview (not a run step)')
  if (!s.headerAnchor) f.push(`header has no exec anchor ("${s.header}")`)
  else {
    const a = doc.anchors.find((x) => x.id === s.headerAnchor)
    if (!a) f.push(`anchor "${s.headerAnchor}" does not exist in ${doc.documentId}`)
    else if (execLine && (execLine < a.range.startLine || execLine > a.range.endLine)) f.push(`exec line ${execLine} outside anchor range ${JSON.stringify(a.range)}`)
  }
  if (s.activeCount !== 1) f.push(`${s.activeCount} highlighted exec lines`)
  if (!s.full || !s.hit) f.push(`exec line not fully visible/topmost (full=${s.full}, hit=${s.hit})`)
  if (!s.inOwnScroller) f.push('exec line not inside its own document scroll container')
  if (s.gotoDisabled !== false) f.push('「回到执行行」disabled')
  if (s.noLocation) f.push(`no-location notice: ${s.noLocation.text}`)
  if (s.unmappedBanner) f.push('未映射 banner')
  return f
}

async function openLcs(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp)
  await page.goto('#/')
  await page.goto('#/algo/lcs')
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
}

async function run(page: Page) {
  const before = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await page.getByTestId('run-btn').click()
  await waitForRunReady(page)
  await expect.poll(() => page.getByTestId('visualizer').getAttribute('data-run-id')).not.toBe(before)
  const s = await measureCodeExec(page)
  return { runId: s.frame.runId, total: Number(s.frame.counter.match(/\/\s*(\d+)/)![1]), solveCount: s.frame.solveCount }
}

async function revealCode(page: Page) {
  if ((await page.getByTestId('workbench-layout').getAttribute('data-layout')) === 'tabs') {
    await page.getByTestId('workbench-tab-code').click()
    await expect(page.getByTestId('workbench-code-slot')).toBeVisible()
  }
}

async function showDoc(page: Page, tab: 'ts' | 'pseudo') {
  await revealCode(page)
  await page.getByTestId(tab === 'ts' ? 'tab-ts' : 'tab-pseudo').click()
  await expect(page.getByTestId('code-browser')).toHaveAttribute('data-tab', tab)
}

/** Advance with real「下一步」clicks until 1-based frame `k` is shown. */
async function stepTo(page: Page, k: number) {
  for (;;) {
    const cur = (await measureCodeExec(page)).frame.stepIndex
    if (cur + 1 >= k) {
      expect(cur + 1, `stepTo(${k}) overshoot`).toBe(k)
      return
    }
    await page.getByTestId('next-step-btn').click()
    await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBe(cur + 1)
  }
}

/** Measure after follow-exec settles (bounded wait; a gap stays a gap). */
async function settle(page: Page, gaps: (s: CodeExecState) => string[] = lcsGaps, timeout = 2_500) {
  await expect.poll(async () => gaps(await measureCodeExec(page)).length, { timeout }).toBe(0).catch(() => {})
  return measureCodeExec(page)
}

async function walk(page: Page, doc: 'ts' | 'pseudo', input: string) {
  const { runId, total, solveCount } = await run(page)
  await showDoc(page, doc)
  const failures: string[] = []
  const log: string[] = []
  for (let k = 1; k <= total; k++) {
    await stepTo(page, k)
    const s = await settle(page)
    const tag = tagOf(s, input)
    log.push(`${k}\t${classifyLcsMessage(s.frame.banner)}\t${s.headerAnchor}\t${s.docId}:${s.execAttr}\t${(s.domText ?? '').trim()}`)
    if (s.frame.runId !== runId) failures.push(`${tag}: runId changed from ${runId}`)
    if (s.frame.solveCount !== solveCount) failures.push(`${tag}: solveCount changed from ${solveCount}`)
    for (const g of lcsGaps(s)) failures.push(`frame ${k}/${total} ${tag}: ${g}`)
  }
  return { runId, total, failures, log }
}

test.describe('V27 LCS pseudocode locations', () => {
  test('V27-01 default LCS frames 1..95 on the pseudocode tab @1366x768 (auto-follow, no resume clicks)', async ({ page }) => {
    test.setTimeout(400_000)
    await openLcs(page, { width: 1366, height: 768 })
    const r = await walk(page, 'pseudo', DEFAULT_INPUT)
    test.info().annotations.push({ type: 'frames', description: r.log.join('\n') })
    expect(r.total).toBe(95)
    expect(r.failures, `${r.failures.length} gap(s)`).toEqual([])
  })

  test('V27-02 default LCS frames 1..95 on the TypeScript tab @1366x768', async ({ page }) => {
    test.setTimeout(400_000)
    await openLcs(page, { width: 1366, height: 768 })
    const r = await walk(page, 'ts', DEFAULT_INPUT)
    test.info().annotations.push({ type: 'frames', description: r.log.join('\n') })
    expect(r.total).toBe(95)
    expect(r.failures, `${r.failures.length} gap(s)`).toEqual([])
  })

  test('V27-03 key frames 3/87/89/91/93/95: TS↔pseudo round trips keep run, cursor, speed, pause @1366x768', async ({ page }) => {
    test.setTimeout(240_000)
    await openLcs(page, { width: 1366, height: 768 })
    const { runId, solveCount } = await run(page)
    // non-default speed via the native range's keyboard
    const speed = page.getByRole('slider', { name: '播放速度' })
    await speed.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    const speedValue = await speed.inputValue()
    const records: string[] = []
    const expectEvent: Record<number, string> = { 3: 'elseWrite', 87: 'up', 89: 'up', 91: 'left', 93: 'left', 95: 'done' }
    for (const k of [3, 87, 89, 91, 93, 95]) {
      await stepTo(page, k)
      for (const doc of ['pseudo', 'ts', 'pseudo', 'ts'] as const) {
        await showDoc(page, doc)
        const s = await settle(page)
        const tag = tagOf(s, DEFAULT_INPUT)
        records.push(`${tag}, speed=${await speed.inputValue()}, playing=${s.frame.playing}`)
        expect(classifyLcsMessage(s.frame.banner), tag).toBe(expectEvent[k])
        expect(lcsGaps(s), tag).toEqual([])
        expect(s.frame.runId, tag).toBe(runId)
        expect(s.frame.stepIndex, tag).toBe(k - 1)
        expect(s.frame.solveCount, tag).toBe(solveCount)
        expect(s.frame.playing, tag).toBe(false)
        expect(await speed.inputValue(), tag).toBe(speedValue)
        expect(s.gotoDisabled, `${tag}: 回到执行行 enabled`).toBe(false)
      }
    }
    test.info().annotations.push({ type: 'records', description: records.join('\n') })
  })

  test('V27-04 tab switch while playing does not re-solve or pause; pausing then switching keeps the cursor @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await openLcs(page, { width: 1366, height: 768 })
    const { runId, solveCount } = await run(page)
    await showDoc(page, 'pseudo')
    await page.getByTestId('play-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
    await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBeGreaterThan(1)
    await showDoc(page, 'ts')
    let s = await measureCodeExec(page)
    expect(s.frame.playing, tagOf(s, DEFAULT_INPUT)).toBe(true)
    expect(s.frame.runId).toBe(runId)
    await showDoc(page, 'pseudo')
    await page.getByTestId('play-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
    const paused = (await measureCodeExec(page)).frame.stepIndex
    await showDoc(page, 'ts')
    await showDoc(page, 'pseudo')
    s = await settle(page)
    const tag = tagOf(s, DEFAULT_INPUT)
    test.info().annotations.push({ type: 'record', description: `${tag}, pausedAt=${paused}` })
    expect(s.frame.stepIndex, tag).toBe(paused)
    expect(s.frame.playing, tag).toBe(false)
    expect(s.frame.runId, tag).toBe(runId)
    expect(s.frame.solveCount, tag).toBe(solveCount)
    expect(lcsGaps(s), tag).toEqual([])
  })

  test('V27-05 manual browsing via mouse wheel pauses follow; reading position kept across steps and tabs @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await openLcs(page, { width: 1366, height: 768 })
    const { runId } = await run(page)
    await showDoc(page, 'pseudo')
    // larger code font so the pseudocode overflows its own scroll container
    await page.getByRole('slider', { name: '代码字号' }).focus()
    await page.keyboard.press('End')
    await stepTo(page, 87)
    let s = await settle(page)
    expect(s.scroller!.scrollHeight, `${tagOf(s, DEFAULT_INPUT)}: pseudocode overflows`).toBeGreaterThan(s.scroller!.clientHeight + 20)
    expect(lcsGaps(s), tagOf(s, DEFAULT_INPUT)).toEqual([])
    const pre = page.getByTestId('pseudo-pre')
    const box = (await pre.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -2000)
    await expect(page.getByTestId('follow-paused')).toBeVisible()
    s = await measureCodeExec(page)
    const readTop = s.scroller!.top
    const pageScroll = s.pageScroll
    await page.getByTestId('next-step-btn').click()
    await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBe(87)
    await page.waitForTimeout(400)
    s = await measureCodeExec(page)
    let tag = tagOf(s, DEFAULT_INPUT)
    expect(s.scroller!.top, `${tag}: reading position kept`).toBe(readTop)
    expect(s.followPaused, tag).toBe(true)
    expect(s.pageScroll, tag).toBe(pageScroll)
    // exec state still names the right statement for the new frame (frame 88: match)
    expect(lcsExecFailures(cat.pseudocode!, classifyLcsMessage(s.frame.banner), { execLine: Number(s.execAttr), domText: s.domText }), tag).toEqual([])
    // reading memory survives a TS round trip
    await showDoc(page, 'ts')
    await showDoc(page, 'pseudo')
    await page.waitForTimeout(300)
    s = await measureCodeExec(page)
    tag = tagOf(s, DEFAULT_INPUT)
    expect(s.scroller!.top, `${tag}: pseudo reading position restored`).toBe(readTop)
    expect(s.frame.runId, tag).toBe(runId)
    // normal locate entry
    await page.getByTestId('goto-exec-btn').click()
    s = await settle(page)
    tag = tagOf(s, DEFAULT_INPUT)
    expect(lcsGaps(s), tag).toEqual([])
    expect(s.pageScroll, `${tag}: locate scrolled the document, not the page`).toBe(pageScroll)
    test.info().annotations.push({ type: 'record', description: `${tag}, readTop=${readTop}` })
  })

  test('V27-06 resume-follow (separately): re-enable 跟随执行 then the next step is located @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await openLcs(page, { width: 1366, height: 768 })
    await run(page)
    await showDoc(page, 'pseudo')
    await page.getByRole('slider', { name: '代码字号' }).focus()
    await page.keyboard.press('End')
    await stepTo(page, 3)
    const box = (await page.getByTestId('pseudo-pre').boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 2000)
    await expect(page.getByTestId('follow-paused')).toBeVisible()
    await page.getByLabel('跟随执行').check()
    await expect(page.getByTestId('follow-paused')).toHaveCount(0)
    await stepTo(page, 86)
    await stepTo(page, 87)
    const s = await settle(page)
    expect(lcsGaps(s), tagOf(s, DEFAULT_INPUT)).toEqual([])
  })

  test('V27-07 data panel / font size / soft wrap toggles: locating stays in the pseudocode scroller @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await openLcs(page, { width: 1366, height: 768 })
    await run(page)
    await showDoc(page, 'pseudo')
    const ops: [string, () => Promise<void>][] = [
      ['data panel toggle', () => page.getByTestId('data-toggle').click()],
      ['font size max', async () => { await page.getByRole('slider', { name: '代码字号' }).focus(); await page.keyboard.press('End') }],
      ['soft wrap off', () => page.getByTestId('line-wrap-checkbox').uncheck()],
      ['data panel toggle back', () => page.getByTestId('data-toggle').click()],
      ['soft wrap on', () => page.getByTestId('line-wrap-checkbox').check()],
    ]
    const frames = [3, 87, 89, 91, 95]
    for (let i = 0; i < ops.length; i++) {
      const [name, op] = ops[i]!
      await op()
      await stepTo(page, frames[i]!)
      const s = await settle(page)
      const tag = `${tagOf(s, DEFAULT_INPUT)}, after ${name}`
      expect(lcsGaps(s), tag).toEqual([])
      expect(s.pageScroll, `${tag}: page not scrolled`).toBe(0)
    }
  })

  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`V27-08 workbench tabs @${vp.width}x${vp.height}: code reachable, pseudo locates key frames, data/cursor preserved`, async ({ page }) => {
      test.setTimeout(240_000)
      await openLcs(page, vp)
      const { runId, solveCount } = await run(page)
      await showDoc(page, 'pseudo')
      for (const k of [3, 87, 91, 95]) {
        await stepTo(page, k)
        let s = await settle(page)
        let tag = tagOf(s, DEFAULT_INPUT)
        expect(lcsGaps(s), tag).toEqual([])
        if (s.layout === 'tabs') {
          await page.getByTestId('workbench-tab-data').click()
          await expect(page.getByTestId('workbench-data-body')).toBeVisible()
          expect((await page.getByTestId('workbench-data-body').textContent())!.trim().length, tag).toBeGreaterThan(0)
          await page.getByTestId('workbench-tab-demo').click()
          await revealCode(page)
          s = await settle(page)
          tag = tagOf(s, DEFAULT_INPUT)
          expect(s.tab, tag).toBe('pseudo')
          expect(lcsGaps(s), `${tag} (after data/demo tabs)`).toEqual([])
        }
        expect(s.frame.runId, tag).toBe(runId)
        expect(s.frame.stepIndex, tag).toBe(k - 1)
        expect(s.frame.solveCount, tag).toBe(solveCount)
      }
    })
  }

  test('V27-09 responsive switch 1366x768 → 390x844 mid-run: same run, pseudo still locates via its own scroller', async ({ page }) => {
    test.setTimeout(120_000)
    await openLcs(page, { width: 1366, height: 768 })
    const { runId, solveCount } = await run(page)
    await showDoc(page, 'pseudo')
    await stepTo(page, 3)
    const s0 = await settle(page)
    expect(lcsGaps(s0), tagOf(s0, DEFAULT_INPUT)).toEqual([])
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId('workbench-layout')).toHaveAttribute('data-layout', 'tabs')
    await revealCode(page)
    await stepTo(page, 87)
    const s = await settle(page)
    const tag = tagOf(s, DEFAULT_INPUT)
    expect(s.tab, tag).toBe('pseudo')
    expect(lcsGaps(s), tag).toEqual([])
    expect(s.frame.runId, tag).toBe(runId)
    expect(s.frame.solveCount, tag).toBe(solveCount)
  })

  test('V27-10 initial preview (no exec line) is distinguished from a run step', async ({ page }) => {
    await openLcs(page, { width: 1366, height: 768 })
    await showDoc(page, 'pseudo')
    let s = await measureCodeExec(page)
    const tag0 = tagOf(s, DEFAULT_INPUT)
    expect(s.frame.preview, tag0).toBe(true)
    expect(s.headerAnchor, `${tag0}: preview has no exec anchor`).toBeNull()
    expect(s.activeCount, tag0).toBe(0)
    expect(s.noLocation, `${tag0}: preview is not a missing location`).toBeNull()
    await run(page)
    await stepTo(page, 3)
    s = await settle(page)
    expect(s.frame.preview).toBe(false)
    expect(lcsGaps(s), tagOf(s, DEFAULT_INPUT)).toEqual([])
  })

  const SMALL: [string, string, string][] = [
    ['all-equal', 'AAA', 'AAA'],
    ['totally unequal', 'ABC', 'XYZ'],
    ['only up', 'ABC', 'A'],
    ['only left', 'A', 'ABC'],
    ['single char', 'A', 'A'],
    ['empty X (supported empty input)', '', 'AB'],
  ]
  for (const [name, x, y] of SMALL) {
    test(`V27-11 small input ${name} X="${x}" Y="${y}": every frame located on pseudo and TS @1366x768`, async ({ page }) => {
      test.setTimeout(180_000)
      await openLcs(page, { width: 1366, height: 768 })
      await ensureInputEditing(page)
      for (const [label, v] of [['串 X', x], ['串 Y', y]] as const) {
        const input = page.locator('label.field-array', { hasText: label }).locator('input')
        await input.click()
        await page.keyboard.press('ControlOrMeta+A')
        if (v) await page.keyboard.type(v)
        else await page.keyboard.press('Backspace')
        await expect(input).toHaveValue(v)
      }
      const input = `${name} X="${x}" Y="${y}"`
      const p = await walk(page, 'pseudo', input)
      expect(p.failures, `${p.failures.length} pseudo gap(s)`).toEqual([])
      // TS on the same run: back to frame 1 is not possible with next only → re-walk TS by stepping back
      await showDoc(page, 'ts')
      const fails: string[] = []
      for (let k = p.total; k >= 1; k--) {
        if (k < p.total) {
          await page.getByTestId('prev-step-btn').click()
          await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBe(k - 1)
        }
        const s = await settle(page)
        if (s.frame.runId !== p.runId) fails.push(`${tagOf(s, input)}: runId changed`)
        for (const g of lcsGaps(s)) fails.push(`frame ${k} ${tagOf(s, input)}: ${g}`)
      }
      test.info().annotations.push({ type: 'frames', description: p.log.join('\n') })
      expect(fails).toEqual([])
    })
  }

  test('V27-12 honest missing location: bubbleSort pseudocode has no `done` anchor → explicit notice + entry to TS @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/')
    await page.goto('#/algo/bubbleSort')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    const { runId, total } = await run(page)
    await showDoc(page, 'pseudo')
    await stepTo(page, total)
    const s = await measureCodeExec(page)
    const tag = tagOf(s, 'bubbleSort page default')
    // the generic part of the gap detector flags this frame (control: unsupported op is a gap)
    expect(s.headerLine, tag).toBe('—')
    expect(s.execAttr, tag).toBe('')
    expect(s.activeCount, `${tag}: no stale primary arrow`).toBe(0)
    expect(s.gotoDisabled, tag).toBe(true)
    expect(s.noLocation, `${tag}: explicit no-location notice`).not.toBeNull()
    expect(s.noLocation!.full, `${tag}: notice visible`).toBe(true)
    expect(s.noLocation!.text, tag).toMatch(/当前文档.*没有.*执行位置/)
    await page.getByTestId('code-doc-open-ts').click()
    const t = await settle(page, (x) => (x.full && x.activeCount === 1 ? [] : ['ts not located']))
    const tag2 = tagOf(t, 'bubbleSort page default')
    expect(t.tab, tag2).toBe('ts')
    expect(t.activeCount, tag2).toBe(1)
    expect(t.full && t.hit, tag2).toBe(true)
    expect(t.noLocation, tag2).toBeNull()
    expect(t.frame.runId, tag2).toBe(runId)
    expect(t.frame.stepIndex, tag2).toBe(total - 1)
  })
})
