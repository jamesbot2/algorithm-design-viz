/**
 * V28 Phase 3: six-language code panel for every remaining shipped algorithm, in the real app.
 *
 * Gap detector = the Phase 3 statement-signature table (tests/helpers/langSigTables.ts, the same
 * table the unit tests and the mutation scan use) applied to the line range the page actually
 * highlights, plus the expected primary anchor of the frame (computed from the app's own solver
 * on the page's default input) and the object-level visibility probe (tests/e2e/helpers/codeExec.ts).
 * Sample = for each page algorithm, the FIRST frame of every distinct primary anchor of the default
 * trace plus the last (done) frame; at each, all six languages. Real clicks only; no force, no
 * evaluate(click), no pre-emptive scrollIntoView, no viewport enlarging, retries 0. Every message
 * carries input, viewport, runId and cursor.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureCodeExec, tagOf, type CodeExecState } from './helpers/codeExec'
import { getCatalog } from '../../src/codeCatalog'
import type { CodeDocument } from '../../src/codeCatalog/types'
import { pickPrimaryCodeRef } from '../../src/utils/codeRefs'
import { P3 } from '../helpers/langSigTables'
import { norm, sigFor, type Lang as SigLang } from '../helpers/langSignatures'
import G_activitySelection from '../../src/codeCatalog/activitySelection/langs.generated'
import G_bellmanFord from '../../src/codeCatalog/bellmanFord/langs.generated'
import G_bfs from '../../src/codeCatalog/bfs/langs.generated'
import G_binarySearch from '../../src/codeCatalog/binarySearch/langs.generated'
import G_bubbleSort from '../../src/codeCatalog/bubbleSort/langs.generated'
import G_dijkstra from '../../src/codeCatalog/dijkstra/langs.generated'
import G_dijkstraHeap from '../../src/codeCatalog/dijkstraHeap/langs.generated'
import G_editDistance from '../../src/codeCatalog/editDistance/langs.generated'
import G_huffman from '../../src/codeCatalog/huffman/langs.generated'
import G_insertionSort from '../../src/codeCatalog/insertionSort/langs.generated'
import G_kadane from '../../src/codeCatalog/kadane/langs.generated'
import G_knapsack_backtracking from '../../src/codeCatalog/knapsack/backtracking/langs.generated'
import G_knapsack_branchAndBound from '../../src/codeCatalog/knapsack/branchAndBound/langs.generated'
import G_knapsack_brute from '../../src/codeCatalog/knapsack/brute/langs.generated'
import G_knapsack_dp1dCorrect from '../../src/codeCatalog/knapsack/dp1dCorrect/langs.generated'
import G_knapsack_dp1dWrong from '../../src/codeCatalog/knapsack/dp1dWrong/langs.generated'
import G_knapsack_dp2d from '../../src/codeCatalog/knapsack/dp2d/langs.generated'
import G_knapsack_greedy from '../../src/codeCatalog/knapsack/greedy/langs.generated'
import G_kruskal from '../../src/codeCatalog/kruskal/langs.generated'
import G_matrixChain from '../../src/codeCatalog/matrixChain/langs.generated'
import G_maxSubarrayDC from '../../src/codeCatalog/maxSubarrayDC/langs.generated'
import G_mergeSort from '../../src/codeCatalog/mergeSort/langs.generated'
import G_nQueens from '../../src/codeCatalog/nQueens/langs.generated'
import G_prim from '../../src/codeCatalog/prim/langs.generated'
import G_quickSort from '../../src/codeCatalog/quickSort/langs.generated'

if (process.env.V28_BASE) test.use({ baseURL: process.env.V28_BASE })
test.describe.configure({ retries: 0 })

const LANGS = ['typescript', 'python', 'cpp', 'java', 'rust', 'go'] as const
type Lang = (typeof LANGS)[number]
const DESKTOP = { width: 1366, height: 768 }
const MOBILE = { width: 390, height: 844 }
const GEN: Record<string, CodeDocument[]> = {
  'activitySelection': G_activitySelection as unknown as CodeDocument[],
  'bellmanFord': G_bellmanFord as unknown as CodeDocument[],
  'bfs': G_bfs as unknown as CodeDocument[],
  'binarySearch': G_binarySearch as unknown as CodeDocument[],
  'bubbleSort': G_bubbleSort as unknown as CodeDocument[],
  'dijkstra': G_dijkstra as unknown as CodeDocument[],
  'dijkstraHeap': G_dijkstraHeap as unknown as CodeDocument[],
  'editDistance': G_editDistance as unknown as CodeDocument[],
  'huffman': G_huffman as unknown as CodeDocument[],
  'insertionSort': G_insertionSort as unknown as CodeDocument[],
  'kadane': G_kadane as unknown as CodeDocument[],
  'knapsack/backtracking': G_knapsack_backtracking as unknown as CodeDocument[],
  'knapsack/branchAndBound': G_knapsack_branchAndBound as unknown as CodeDocument[],
  'knapsack/brute': G_knapsack_brute as unknown as CodeDocument[],
  'knapsack/dp1dCorrect': G_knapsack_dp1dCorrect as unknown as CodeDocument[],
  'knapsack/dp1dWrong': G_knapsack_dp1dWrong as unknown as CodeDocument[],
  'knapsack/dp2d': G_knapsack_dp2d as unknown as CodeDocument[],
  'knapsack/greedy': G_knapsack_greedy as unknown as CodeDocument[],
  'kruskal': G_kruskal as unknown as CodeDocument[],
  'matrixChain': G_matrixChain as unknown as CodeDocument[],
  'maxSubarrayDC': G_maxSubarrayDC as unknown as CodeDocument[],
  'mergeSort': G_mergeSort as unknown as CodeDocument[],
  'nQueens': G_nQueens as unknown as CodeDocument[],
  'prim': G_prim as unknown as CodeDocument[],
  'quickSort': G_quickSort as unknown as CodeDocument[],
}
/** page id → Phase 3 directory */
const PAGES: [string, string][] = [
  ['bubbleSort', 'bubbleSort'], ['insertionSort', 'insertionSort'], ['mergeSort', 'mergeSort'], ['quickSort', 'quickSort'],
  ['binarySearch', 'binarySearch'], ['kadane', 'kadane'], ['maxSubarrayDC', 'maxSubarrayDC'], ['nQueens', 'nQueens'],
  ['editDistance', 'editDistance'], ['matrixChain', 'matrixChain'], ['huffman', 'huffman'], ['activitySelection', 'activitySelection'],
  ['knapsack01', 'knapsack/dp2d'], ['dijkstra', 'dijkstra'], ['dijkstraHeap', 'dijkstraHeap'], ['bfs', 'bfs'],
  ['kruskal', 'kruskal'], ['prim', 'prim'], ['bellmanFord', 'bellmanFord'],
]

function docsFor(catalogId: string, dir: string): CodeDocument[] {
  return [getCatalog(catalogId)!.typescript, ...GEN[dir]!]
}

/** gap detector: [] only when the shown document locates `want` (or any signed anchor), visibly */
function gaps(catalogId: string, dir: string, s: CodeExecState, lang: Lang, want: string | null): string[] {
  const f: string[] = []
  const doc = docsFor(catalogId, dir).find((d) => d.documentId === s.docId)
  if (!doc) return [`unknown document "${s.docId}"`]
  if (doc.language !== lang) f.push(`shows ${doc.documentId} (${doc.language}), expected ${lang}`)
  if (want && s.headerAnchor !== want) f.push(`header anchor ${s.headerAnchor} ≠ expected primary ${want}`)
  const anchor = s.headerAnchor ?? ''
  const sig = P3[dir]!.sig.anchors[anchor]
  const execLine = s.execAttr && /^\d+$/.test(s.execAttr) ? Number(s.execAttr) : null
  if (!sig) f.push(`no signature for header anchor "${anchor}"`)
  if (execLine == null) f.push('no exec line')
  else {
    const lines = doc.source.split('\n')
    const text = norm(lang as SigLang, lines.slice(execLine - 1, s.execEnd ?? execLine).join('\n'))
    const re = sig ? sigFor(sig, lang as SigLang) : null
    if (re && !re.test(text)) f.push(`line ${execLine}-${s.execEnd} "${text}" does not match ${re}`)
    if (s.domText != null && s.domText !== lines[execLine - 1]) f.push(`DOM exec text "${s.domText}" ≠ doc line ${execLine}`)
    if (s.headerLine !== String(execLine)) f.push(`header line ${s.headerLine} ≠ exec ${execLine}`)
  }
  if (s.headerDocId !== s.docId) f.push(`header doc ${s.headerDocId} ≠ ${s.docId}`)
  if (s.frame.preview) f.push('page is still in preview')
  if (s.activeCount !== 1) f.push(`${s.activeCount} highlighted exec lines`)
  if (!s.full || !s.hit) f.push(`exec line not fully visible/topmost (full=${s.full}, hit=${s.hit})`)
  if (!s.inOwnScroller) f.push('exec line not inside its own document scroll container')
  if (s.gotoDisabled !== false) f.push('「回到执行行」disabled')
  if (s.noLocation) f.push(`no-location notice: ${s.noLocation.text}`)
  if (s.unmappedBanner) f.push('未映射 banner')
  return f
}

async function open(page: Page, path: string, vp = DESKTOP) {
  await page.setViewportSize(vp)
  await page.goto('#/')
  await page.goto(path)
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
    const slot = page.getByTestId('workbench-code-slot')
    if (!(await slot.isVisible())) {
      await page.getByTestId('workbench-tab-code').click()
      await expect(slot).toBeVisible()
    }
  }
}

async function revealStage(page: Page) {
  if ((await page.getByTestId('workbench-layout').getAttribute('data-layout')) === 'tabs') {
    const btn = page.getByTestId('next-step-btn')
    if (!(await btn.isVisible())) await page.getByTestId('workbench-tab-demo').click()
    await expect(btn).toBeVisible()
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
  await revealStage(page)
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

/**
 * The teaching unit is a normal scrolling page (data-fill="section", workbench 630px tall below the
 * strategy form at 1366x768 — same on the V27 baseline). A reader scrolls the page down to the
 * workbench; we do exactly that with a real mouse wheel over the top bar (never scrollIntoView).
 */
async function wheelWorkbenchIntoView(page: Page) {
  const top = (await page.locator('.topbar').boundingBox())!
  for (let i = 0; i < 4; i++) {
    const wb = (await page.getByTestId('workbench-layout').boundingBox())!
    const vh = page.viewportSize()!.height
    if (wb.y >= top.y + top.height - 1 && wb.y + wb.height <= vh + 0.5) return
    await page.mouse.move(top.x + top.width / 2, top.y + top.height / 2)
    await page.mouse.wheel(0, Math.round(wb.y - (top.y + top.height) - 6))
    await page.waitForTimeout(150)
  }
}

async function settle(page: Page, catalogId: string, dir: string, lang: Lang, want: string | null, timeout = 2_500) {
  await expect.poll(async () => gaps(catalogId, dir, await measureCodeExec(page), lang, want).length, { timeout }).toBe(0).catch(() => {})
  return measureCodeExec(page)
}

/** expected primary per frame + sample frames (first of each primary, plus last) from the app solver */
function plan(dir: string) {
  const t = P3[dir]!.traces()[0]!
  const prim = t.steps.map((s) => pickPrimaryCodeRef(s)?.anchorId ?? null)
  const firsts = new Map<string, number>()
  prim.forEach((p, i) => {
    if (p && !firsts.has(p)) firsts.set(p, i + 1)
  })
  const frames = [...new Set([...firsts.values(), t.steps.length])].sort((a, b) => a - b)
  return { input: `page default (${t.name})`, prim, frames }
}

async function sweep(page: Page, catalogId: string, dir: string, vp: { width: number; height: number }, framesOverride?: number[]) {
  const { input, prim, frames: allFrames } = plan(dir)
  const frames = framesOverride ?? allFrames
  const { runId, total, solveCount } = await run(page)
  const failures: string[] = []
  const log: string[] = []
  expect(total, `input=${input}, viewport=${vp.width}x${vp.height}, runId=${runId}: page trace length ≠ app solver default trace`).toBe(prim.length)
  let checks = 0
  for (const k of frames) {
    await stepTo(page, k)
    for (const lang of LANGS) {
      await pickLang(page, lang)
      const s = await settle(page, catalogId, dir, lang, prim[k - 1] ?? null)
      const tag = tagOf(s, input)
      checks++
      log.push(`${k}/${total}\t${lang}\t${s.headerAnchor}\t${s.docId}:${s.execAttr}-${s.execEnd}\t${(s.domText ?? '').trim()}`)
      if (s.frame.runId !== runId) failures.push(`${tag}: runId changed from ${runId}`)
      if (s.frame.solveCount !== solveCount) failures.push(`${tag}: solveCount changed from ${solveCount}`)
      if (s.frame.stepIndex !== k - 1) failures.push(`${tag}: cursor moved from ${k - 1}`)
      for (const g of gaps(catalogId, dir, s, lang, prim[k - 1] ?? null)) failures.push(`frame ${k}/${total} ${lang} ${tag}: ${g}`)
    }
  }
  test.info().annotations.push({ type: 'summary', description: `${catalogId} @${vp.width}x${vp.height}: frames [${frames.join(',')}] × 6 languages = ${checks} checks, ${failures.length} failures, runId=${runId}, solveCount=${solveCount}` })
  test.info().annotations.push({ type: 'log', description: log.join('\n') })
  expect(failures, failures.slice(0, 20).join('\n')).toEqual([])
}

test.describe('V28 P3 six-language code panel', () => {
  for (const [pageId, dir] of PAGES) {
    test(`V28-P3-01 ${pageId}: first frame of every primary anchor + done, all six languages @1366x768`, async ({ page }) => {
      test.setTimeout(300_000)
      await open(page, `#/algo/${pageId}`)
      await sweep(page, pageId, dir, DESKTOP)
    })
  }

  for (const [pageId, dir] of [['dijkstra', 'dijkstra'], ['knapsack01', 'knapsack/dp2d'], ['mergeSort', 'mergeSort']] as const) {
    test(`V28-P3-02 ${pageId}: mobile tabs sample (first two primaries + done), all six languages @390x844`, async ({ page }) => {
      test.setTimeout(300_000)
      await open(page, `#/algo/${pageId}`, MOBILE)
      await expect(page.getByTestId('workbench-layout')).toHaveAttribute('data-layout', 'tabs')
      const p = plan(dir)
      await sweep(page, pageId, dir, MOBILE, [...p.frames.slice(0, 2), p.frames.at(-1)!])
    })
  }

  test('V28-P3-03 knapsack teaching unit: every strategy, first + last frame, all six languages @1366x768', async ({ page }) => {
    test.setTimeout(300_000)
    await open(page, '#/teach/knapsack')
    const STRATS: [string, string, string][] = [
      ['bruteForce', 'knapsack.brute', 'knapsack/brute'],
      ['dp2d', 'knapsack.dp2d', 'knapsack/dp2d'],
      ['dp1dCorrect', 'knapsack.dp1dCorrect', 'knapsack/dp1dCorrect'],
      ['dp1dWrong', 'knapsack.dp1dWrong', 'knapsack/dp1dWrong'],
      ['backtracking', 'knapsack.backtracking', 'knapsack/backtracking'],
      ['branchAndBound', 'knapsack.branchAndBound', 'knapsack/branchAndBound'],
      ['greedy', 'knapsack.greedy', 'knapsack/greedy'],
    ]
    const failures: string[] = []
    const log: string[] = []
    for (const [strategy, catalogId, dir] of STRATS) {
      await page.getByTestId('knapsack-strategy').selectOption(strategy)
      const { runId, total } = await run(page)
      for (const k of [...new Set([1, total])]) {
        await stepTo(page, k)
        await wheelWorkbenchIntoView(page)
        for (const lang of LANGS) {
          await pickLang(page, lang)
          const s = await settle(page, catalogId, dir, lang, null)
          const tag = tagOf(s, `teach/knapsack strategy=${strategy} preset=default`)
          log.push(`${strategy}\t${k}/${total}\t${lang}\t${s.headerAnchor}\t${s.docId}:${s.execAttr}\t${(s.domText ?? '').trim()}`)
          if (s.frame.runId !== runId) failures.push(`${tag}: runId changed from ${runId}`)
          if (s.frame.stepIndex !== k - 1) failures.push(`${tag}: cursor moved`)
          for (const g of gaps(catalogId, dir, s, lang, null)) failures.push(`${strategy} frame ${k}/${total} ${lang} ${tag}: ${g}`)
        }
      }
    }
    test.info().annotations.push({ type: 'log', description: log.join('\n') })
    test.info().annotations.push({ type: 'summary', description: `${log.length} checks, ${failures.length} failures` })
    expect(failures, failures.slice(0, 20).join('\n')).toEqual([])
  })
})
