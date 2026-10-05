/**
 * V28: multi-language code panel (TypeScript / Python / C++ / Java / Rust / Go) in the real app.
 *
 * Gap detector = tests/helpers/multiLangSemantics.ts (statement meaning + enclosing branch + weak
 * condition line per event and language — the same detector the unit tests use) plus
 * tests/e2e/helpers/codeExec.ts (object-level visibility of the highlighted line inside the
 * document's own scroll container). Real operations only: real clicks, real mouse wheel, keyboard
 * on native ranges. No force, no evaluate(click), no pre-emptive scrollIntoView, no viewport
 * enlarging, retries 0. Every assertion message carries input, viewport, runId and cursor.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureCodeExec, tagOf, type CodeExecState } from './helpers/codeExec'
import { getCatalog } from '../../src/codeCatalog'
import type { CodeDocument } from '../../src/codeCatalog/types'
import lcsLangs from '../../src/codeCatalog/lcs/langs.generated'
import kmpLangs from '../../src/codeCatalog/kmp/langs.generated'
import floydLangs from '../../src/codeCatalog/floyd/langs.generated'
import { execFailures, SEMANTICS, type Phase2Algo } from '../helpers/multiLangSemantics'

if (process.env.V28_BASE) test.use({ baseURL: process.env.V28_BASE })
test.describe.configure({ retries: 0 })

const LANGS = ['typescript', 'python', 'cpp', 'java', 'rust', 'go'] as const
type Lang = (typeof LANGS)[number]
const GEN = { lcs: lcsLangs, kmp: kmpLangs, floyd: floydLangs }
const DESKTOP = { width: 1366, height: 768 }
const INPUT: Record<Phase2Algo, string> = {
  lcs: 'page default X="ABCBDAB" Y="BDCABA"',
  kmp: 'page default text/pattern',
  floyd: 'page default matrix',
}

function docsFor(algo: Phase2Algo): CodeDocument[] {
  const cat = getCatalog(algo)!
  const out: CodeDocument[] = [cat.typescript, ...(GEN[algo] as unknown as CodeDocument[])]
  if (cat.pseudocode) out.push(cat.pseudocode)
  return out
}

/** The gap detector: [] only when the shown document locates the frame's event, visibly. */
function gaps(algo: Phase2Algo, s: CodeExecState, wantDoc?: string): string[] {
  const doc = docsFor(algo).find((d) => d.documentId === s.docId)
  if (!doc) return [`unknown document "${s.docId}"`]
  const f: string[] = []
  if (wantDoc && doc.documentId !== wantDoc) f.push(`shows ${doc.documentId}, expected ${wantDoc}`)
  const sem = SEMANTICS[algo]
  const execLine = s.execAttr && /^\d+$/.test(s.execAttr) ? Number(s.execAttr) : null
  f.push(
    ...execFailures(sem as never, doc, (sem.classify as (m: string) => string | null)(s.frame.banner) as never, {
      execLine,
      rangeEnd: s.execEnd,
      headerDocId: s.headerDocId,
      headerLine: s.headerLine,
      domText: s.domText,
      weakLines: s.weakLines,
      weakTexts: s.weakTexts,
    }),
  )
  if (s.frame.preview) f.push('page is still in preview')
  if (s.activeCount !== 1) f.push(`${s.activeCount} highlighted exec lines`)
  if (!s.full || !s.hit) f.push(`exec line not fully visible/topmost (full=${s.full}, hit=${s.hit})`)
  if (!s.inOwnScroller) f.push('exec line not inside its own document scroll container')
  if (s.gotoDisabled !== false) f.push('「回到执行行」disabled')
  if (s.noLocation) f.push(`no-location notice: ${s.noLocation.text}`)
  if (s.unmappedBanner) f.push('未映射 banner')
  return f
}

async function open(page: Page, algo: string, vp = DESKTOP) {
  await page.setViewportSize(vp)
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
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

const pillId = (l: Lang) => (l === 'typescript' ? 'tab-ts' : `tab-lang-${l}`)

async function pickLang(page: Page, l: Lang) {
  await revealCode(page)
  await page.getByTestId(pillId(l)).click()
  const cb = page.getByTestId('code-browser')
  await expect(cb).toHaveAttribute('data-language', l)
  await expect(cb).toHaveAttribute('data-code-loading', '0', { timeout: 15_000 })
}

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

async function settle(page: Page, algo: Phase2Algo, timeout = 2_500) {
  await expect.poll(async () => gaps(algo, await measureCodeExec(page)).length, { timeout }).toBe(0).catch(() => {})
  return measureCodeExec(page)
}

const docIdOf = (algo: Phase2Algo, l: Lang) => docsFor(algo).find((d) => d.language === l)!.documentId

test.describe('V28 multi-language code panel', () => {
  for (const algo of ['lcs', 'kmp', 'floyd'] as const) {
    for (const lang of LANGS) {
      test(`V28-01 ${algo} every frame in ${lang} @1366x768 (auto-follow only)`, async ({ page }) => {
        test.setTimeout(300_000)
        await open(page, algo)
        const { runId, total, solveCount } = await run(page)
        await pickLang(page, lang)
        const want = docIdOf(algo, lang)
        const failures: string[] = []
        const log: string[] = []
        for (let k = 1; k <= total; k++) {
          await stepTo(page, k)
          const s = await settle(page, algo)
          const tag = tagOf(s, INPUT[algo])
          log.push(`${k}\t${s.headerAnchor}\t${s.docId}:${s.execAttr}\t${(s.domText ?? '').trim()}`)
          if (s.frame.runId !== runId) failures.push(`${tag}: runId changed from ${runId}`)
          if (s.frame.solveCount !== solveCount) failures.push(`${tag}: solveCount changed from ${solveCount}`)
          for (const g of gaps(algo, s, want)) failures.push(`frame ${k}/${total} ${tag}: ${g}`)
        }
        test.info().annotations.push({ type: 'summary', description: `${algo}/${lang}: ${total} frames, ${failures.length} failures, runId=${runId}, solveCount=${solveCount}` })
        test.info().annotations.push({ type: 'log', description: log.join('\n') })
        expect(failures, failures.slice(0, 20).join('\n')).toEqual([])
      })
    }
  }

  test('V28-02 LCS key frames 3/87/91/95: TS→Py→C++→Java→Rust→Go→pseudo→TS keeps run, cursor, solveCount, speed, pause @1366x768', async ({ page }) => {
    test.setTimeout(240_000)
    await open(page, 'lcs')
    const { runId, solveCount } = await run(page)
    const speed = page.getByRole('slider', { name: '播放速度' })
    await speed.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    const speedValue = await speed.inputValue()
    const records: string[] = []
    for (const k of [3, 87, 91, 95]) {
      await stepTo(page, k)
      for (const l of [...LANGS, 'pseudo', 'typescript'] as const) {
        if (l === 'pseudo') {
          await page.getByTestId('tab-pseudo').click()
          await expect(page.getByTestId('code-browser')).toHaveAttribute('data-tab', 'pseudo')
        } else await pickLang(page, l)
        const s = await settle(page, 'lcs')
        const tag = tagOf(s, INPUT.lcs)
        records.push(`${tag}, speed=${await speed.inputValue()}, playing=${s.frame.playing}`)
        expect(gaps('lcs', s), tag).toEqual([])
        expect(s.frame.runId, tag).toBe(runId)
        expect(s.frame.stepIndex, tag).toBe(k - 1)
        expect(s.frame.solveCount, tag).toBe(solveCount)
        expect(s.frame.playing, tag).toBe(false)
        expect(await speed.inputValue(), tag).toBe(speedValue)
      }
    }
    test.info().annotations.push({ type: 'records', description: records.join('\n') })
  })

  test('V28-03 real wheel browsing in Python pauses follow; reading memory per language; 回到执行行 locates @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page, 'lcs')
    const { runId } = await run(page)
    await pickLang(page, 'python')
    await page.getByRole('slider', { name: '代码字号' }).focus()
    await page.keyboard.press('End')
    await stepTo(page, 87)
    let s = await settle(page, 'lcs')
    expect(gaps('lcs', s), tagOf(s, INPUT.lcs)).toEqual([])
    expect(s.scroller!.scrollHeight, `${tagOf(s, INPUT.lcs)}: python overflows`).toBeGreaterThan(s.scroller!.clientHeight + 20)
    const box = (await page.getByTestId('code-mirror-wrap').boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -3000)
    await expect(page.getByTestId('follow-paused')).toBeVisible()
    s = await measureCodeExec(page)
    const readTop = s.scroller!.top
    const pageScroll = s.pageScroll
    expect(s.full, `${tagOf(s, INPUT.lcs)}: exec line scrolled away by the wheel`).toBe(false)
    await pickLang(page, 'java')
    await pickLang(page, 'python')
    await page.waitForTimeout(300)
    s = await measureCodeExec(page)
    let tag = tagOf(s, INPUT.lcs)
    expect(s.docId, tag).toBe('lcs.py')
    expect(s.scroller!.top, `${tag}: python reading position restored`).toBe(readTop)
    expect(s.frame.runId, tag).toBe(runId)
    await page.getByTestId('goto-exec-btn').click()
    s = await settle(page, 'lcs')
    tag = tagOf(s, INPUT.lcs)
    expect(gaps('lcs', s), tag).toEqual([])
    expect(s.pageScroll, `${tag}: locate scrolled the document, not the page`).toBe(pageScroll)
    test.info().annotations.push({ type: 'record', description: `${tag}, readTop=${readTop}` })
  })

  test('V28-04 copy copies the current language (real clipboard) @1366x768', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, 'kmp')
    await run(page)
    for (const l of ['rust', 'cpp', 'typescript'] as const) {
      await pickLang(page, l)
      await page.getByTestId('code-copy-btn').click()
      await expect(page.getByTestId('copy-feedback')).toHaveText('已复制')
      const text = await page.evaluate(() => navigator.clipboard.readText())
      const want = docsFor('kmp').find((d) => d.language === l)!.source
      expect(text, `copy in ${l}`).toBe(want)
    }
  })

  // Phase 3 gave every shipped algorithm six languages, so no real page is TypeScript-only any more:
  // the honest fallback is covered by the DOM suite (synthetic 'tsOnlyAlgorithm'); here the
  // preference must carry over to a Phase 3 algorithm (bubbleSort) instead of falling back.
  test('V28-05 preference persists across reload and algorithms (incl. a Phase 3 algorithm, no fallback) @1366x768', async ({ page }) => {
    await open(page, 'lcs')
    await run(page)
    await pickLang(page, 'go')
    await page.reload()
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-language', 'go', { timeout: 15_000 })
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-active-doc', 'lcs.go', { timeout: 15_000 })
    await page.goto('#/algo/floyd')
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-active-doc', 'floyd.go', { timeout: 15_000 })
    await run(page)
    const s = await settle(page, 'floyd')
    expect(gaps('floyd', s, 'floyd.go'), tagOf(s, INPUT.floyd)).toEqual([])
    await page.goto('#/algo/bubbleSort')
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-active-doc', 'bubbleSort.go', { timeout: 15_000 })
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-language', 'go')
    await expect(page.getByTestId('code-lang-fallback')).toHaveCount(0)
    await expect(page.getByTestId('tab-lang-go')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => localStorage.getItem('adv.codeLanguage.v1'))).toBe('go')
  })

  test('V28-06 switching language while playing keeps playing, run and speed; pause then switch keeps cursor @1366x768', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page, 'lcs')
    const { runId, solveCount } = await run(page)
    await pickLang(page, 'cpp')
    await page.getByTestId('play-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
    await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBeGreaterThan(1)
    await pickLang(page, 'rust')
    let s = await measureCodeExec(page)
    expect(s.frame.playing, tagOf(s, INPUT.lcs)).toBe(true)
    expect(s.frame.runId).toBe(runId)
    await page.getByTestId('play-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
    const paused = (await measureCodeExec(page)).frame.stepIndex
    await pickLang(page, 'go')
    await pickLang(page, 'java')
    s = await settle(page, 'lcs')
    const tag = tagOf(s, INPUT.lcs)
    test.info().annotations.push({ type: 'record', description: `${tag}, pausedAt=${paused}` })
    expect(s.frame.stepIndex, tag).toBe(paused)
    expect(s.frame.playing, tag).toBe(false)
    expect(s.frame.solveCount, tag).toBe(solveCount)
    expect(gaps('lcs', s, 'lcs.java'), tag).toEqual([])
  })

  test('V28-07 first load of a language shows a skeleton (goto disabled), a failed load offers retry @1366x768', async ({ page }) => {
    let mode: 'slow' | 'fail' = 'fail'
    await page.route(/langs\.generated(?:-[^/?]*\.js|\.ts)(\?.*)?$/, async (route) => {
      if (mode === 'fail') return route.abort()
      await new Promise((r) => setTimeout(r, 1500))
      return route.continue()
    })
    await open(page, 'lcs')
    await run(page)
    await stepTo(page, 3)
    await page.getByTestId('tab-lang-python').click()
    await expect(page.getByTestId('code-load-error')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('goto-exec-btn')).toBeDisabled()
    mode = 'slow'
    await page.getByTestId('code-load-error').getByRole('button').click()
    await expect(page.getByTestId('code-loading')).toBeVisible()
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-exec-state', 'loading')
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-code-loading', '0', { timeout: 15_000 })
    const s = await settle(page, 'lcs')
    expect(gaps('lcs', s, 'lcs.py'), tagOf(s, INPUT.lcs)).toEqual([])
  })

  for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`V28-08 mobile ${vp.width}x${vp.height}: pill row reachable with real wheel, ≥32px pills, every language locates frame 3`, async ({ page }) => {
      test.setTimeout(120_000)
      await open(page, 'lcs', vp)
      const { runId } = await run(page)
      await stepTo(page, 3)
      await revealCode(page)
      const row = page.getByTestId('code-lang-switch')
      const records: string[] = []
      for (const l of [...LANGS.slice(1), 'typescript'] as Lang[]) {
        const pill = page.getByTestId(pillId(l))
        const rb = (await row.boundingBox())!
        // bring the pill into the row's visible box with real horizontal wheel input only
        let wheels = 0
        for (let i = 0; i < 12; i++) {
          const pb = (await pill.boundingBox())!
          if (pb.x >= rb.x - 0.5 && pb.x + pb.width <= rb.x + rb.width + 0.5) break
          await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
          await page.mouse.wheel(pb.x < rb.x ? -120 : 120, 0)
          wheels++
          await page.waitForTimeout(100)
        }
        const pb = (await pill.boundingBox())!
        expect(pb.height, `${l} pill height @${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(32)
        expect(pb.width, `${l} pill width @${vp.width}x${vp.height}`).toBeGreaterThanOrEqual(32)
        await pill.click()
        await expect(page.getByTestId('code-browser')).toHaveAttribute('data-code-loading', '0', { timeout: 15_000 })
        const s = await settle(page, 'lcs')
        const tag = tagOf(s, INPUT.lcs)
        const ov = await row.evaluate((e) => `${e.scrollWidth}/${e.clientWidth}@${Math.round(e.scrollLeft)}`)
        records.push(`${tag}, pill=${Math.round(pb.width)}x${Math.round(pb.height)}, row scrollWidth/clientWidth@scrollLeft=${ov}, wheels=${wheels}`)
        expect(gaps('lcs', s, docIdOf('lcs', l)), tag).toEqual([])
        expect(s.frame.runId, tag).toBe(runId)
        expect(s.frame.stepIndex, tag).toBe(2)
      }
      test.info().annotations.push({ type: 'records', description: records.join('\n') })
    })
  }
  for (const vp of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 600 }]) {
    test(`V28-09 desktop ${vp.width}x${vp.height}: language row — every pill visible without scrolling, or an overflow cue + active pill kept in view`, async ({ page }) => {
      await open(page, 'lcs', vp)
      await run(page)
      const row = page.getByTestId('code-lang-switch')
      const measure = () =>
        row.evaluate((e) => {
          const r = e.getBoundingClientRect()
          const pills = [...e.querySelectorAll('button')].map((b) => {
            const q = b.getBoundingClientRect()
            return { id: b.getAttribute('data-testid'), full: q.left >= r.left - 0.5 && q.right <= r.right + 0.5, active: b.getAttribute('aria-pressed') === 'true' }
          })
          return { sw: e.scrollWidth, cw: e.clientWidth, ovf: e.getAttribute('data-ovf'), pills }
        })
      let m = await measure()
      const tag = `viewport=${vp.width}x${vp.height}, row ${m.sw}/${m.cw}, ovf=${m.ovf}`
      test.info().annotations.push({ type: 'record', description: `${tag}, hidden=${m.pills.filter((p) => !p.full).map((p) => p.id).join(',') || 'none'}` })
      if (vp.width >= 1280) {
        expect(m.pills.filter((p) => !p.full).map((p) => p.id), `${tag}: pills hidden behind row overflow`).toEqual([])
        expect(m.ovf, tag).toBe('none')
      } else {
        // narrow column: overflow must be signalled, and choosing a language keeps its pill in view
        expect(m.sw, `${tag}: expected an overflowing row at this width`).toBeGreaterThan(m.cw)
        expect(['end', 'both'], `${tag}: overflow cue`).toContain(m.ovf)
        for (const id of ['tab-pseudo', 'tab-lang-go']) {
          const pill = page.getByTestId(id)
          // reach it with real horizontal wheel input on the row, then click
          for (let i = 0; i < 12 && !(await measure()).pills.find((p) => p.id === id)!.full; i++) {
            const rb = (await row.boundingBox())!
            await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
            await page.mouse.wheel(120, 0)
            await page.waitForTimeout(80)
          }
          await pill.click()
          await expect(pill).toHaveAttribute('aria-pressed', 'true')
          m = await measure()
          expect(m.pills.find((p) => p.id === id)!.full, `${tag}: active ${id} kept in view`).toBe(true)
        }
      }
    })
  }
})
