/**
 * V23 learning-workbench acceptance (tasks A–E) against the REAL app.
 * No force clicks, no evaluate(click), no viewport swap after failure, no
 * toBeVisible/textContent as readability — geometry comes from helpers/v23Geometry.
 * retries: 0 (key joint-layout paths are also repeated in the "×N" block).
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { waitForRunReady } from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import { measureWorkbench, type WorkbenchMetrics } from './helpers/v23Geometry'
import { measureJoint, jointFailures } from './helpers/jointReadable'

const SHOTS = path.join(process.cwd(), 'docs/screenshots/v23/after')
const TRACES = path.join(process.cwd(), 'docs/traces/v23')
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(TRACES, { recursive: true })

const VIEWPORTS = [
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [1024, 600],
  [900, 500],
  [390, 844],
  [360, 640],
  [844, 390],
] as const

const trace: Record<string, unknown> = {}
function record(key: string, v: unknown) {
  trace[key] = v
}
test.afterAll(() => {
  const file = path.join(TRACES, `v23-e2e-${process.env.V23_TRACE_TAG ?? 'run'}.json`)
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  fs.writeFileSync(file, JSON.stringify({ ...prev, ...trace }, null, 2))
})

async function openAlgo(page: Page, algo: string) {
  // Leave the page first so re-opening the SAME algorithm really starts a fresh session
  // (a same-hash goto is a no-op in the SPA).
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
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
  const rid = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await waitForRunReady(page, { expectRunId: rid ?? undefined, minSteps })
  return rid!
}

async function stepIdx(page: Page) {
  return Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))
}
async function totalSteps(page: Page) {
  const t = (await page.getByTestId('step-counter').textContent()) ?? ''
  return Number(t.match(/\/\s*(\d+)/)?.[1] ?? 0)
}
async function next(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const b = page.getByTestId('next-step-btn')
    if (await b.isDisabled()) break
    await b.click()
  }
  await page.waitForTimeout(120)
}
async function seek(page: Page, idx: number) {
  await page.getByRole('slider', { name: '步骤进度' }).fill(String(idx))
  await page.waitForTimeout(150)
}

/** Demo view must be showing for graph checks in tabbed mode. */
async function showDemo(page: Page) {
  const tab = page.getByTestId('workbench-tab-demo')
  if (await tab.isVisible()) await tab.click()
}

function assertScene(m: WorkbenchMetrics, label: string, opts: { minPlotH?: number; nodes?: number } = {}) {
  const tag = `${label} ${m.vp.w}x${m.vp.h} ${m.mode}`
  expect(m.overlaps, `${tag} region overlaps`).toEqual([])
  expect(m.graph, `${tag} graph plot present`).not.toBeNull()
  const g = m.graph!
  expect(g.nodes, `${tag} nodes`).toBe(opts.nodes ?? 6)
  expect(g.outside, `${tag} graph parts outside plot`).toEqual([])
  expect(g.occluded, `${tag} graph parts occluded`).toEqual([])
  if (opts.minPlotH) expect(g.plot!.h, `${tag} plot height`).toBeGreaterThanOrEqual(opts.minPlotH)
  expect(g.minLabelPx, `${tag} label glyph px`).toBeGreaterThanOrEqual(9)
  if (m.regions.data && m.regions.scene) {
    // data is a sibling below or beside the scene — never on top of it
    const d = m.regions.data
    const s = m.regions.scene
    expect(d.y >= s.b - 1 || d.x >= s.r - 1, `${tag} data placed below/beside scene`).toBe(true)
  }
  for (const [id, ok] of m.transportBtns) expect(ok, `${tag} transport ${id} fully visible`).toBe(true)
  expect(m.stepTextFully, `${tag} step text fully visible`).toBe(true)
  expect(m.visualizers, `${tag} one visualizer`).toBe(1)
  expect(m.transports, `${tag} one transport`).toBe(1)
  expect(m.code.editors, `${tag} at most one CodeMirror`).toBeLessThanOrEqual(1)
  if (m.mode !== 'tabbed') {
    expect(m.code.width, `${tag} code readable width`).toBeGreaterThanOrEqual(340)
    for (const [id, ok] of m.toolbarBtns) expect(ok, `${tag} toolbar ${id} fully visible`).toBe(true)
  }
}

test.describe('V23 workbench layout', () => {
  test.describe.configure({ retries: 0 })

  test('A: six-node graph (BFS + Dijkstra) preview→run→mid→data→+10→end→replay across viewports', async ({ page }) => {
    test.setTimeout(600_000)
    const metrics: Record<string, unknown> = {}
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h })
      for (const algo of ['bfs', 'dijkstra']) {
        await openAlgo(page, algo)
        const vp = `${w}x${h}`
        const solve0 = (await measureWorkbench(page)).solveCount
        // preview: config summary, no config pills, graph fully inside its plot
        let m = await measureWorkbench(page)
        const minPlotH = w === 1366 && h === 768 ? 300 : h >= 900 && w >= 1400 ? 360 : undefined
        assertScene(m, `${algo} preview`, { minPlotH })
        for (const k of ['ready', 'n', 'start', 'directed']) expect(m.data.pills, `${vp} ${algo} no ${k} pill`).not.toContain(k)
        metrics[`${algo}-${vp}-preview`] = m
        if (algo === 'bfs') await page.screenshot({ path: path.join(SHOTS, `v23-A-bfs-${vp}-preview.png`) })

        await run(page, 10)
        expect((await measureWorkbench(page)).solveCount).toBe(solve0 + 1)
        await next(page, 5)
        m = await measureWorkbench(page)
        assertScene(m, `${algo} mid`, { minPlotH })
        expect(m.code.visible ? m.code.execFully : true, `${vp} ${algo} exec line visible`).not.toBe(false)
        metrics[`${algo}-${vp}-mid`] = m
        if (algo === 'bfs') await page.screenshot({ path: path.join(SHOTS, `v23-A-bfs-${vp}-mid.png`) })

        // open data: docked/wide collapse+expand; tabbed switch to 数据 then back
        if (m.mode === 'tabbed') {
          await page.getByTestId('workbench-tab-data').click()
          const md = await measureWorkbench(page)
          expect(md.regions.data, `${vp} data tab visible`).not.toBeNull()
          expect(md.regions.scene, `${vp} scene hidden (not covered)`).toBeNull()
          expect(md.overlaps).toEqual([])
          if (algo === 'bfs') await page.screenshot({ path: path.join(SHOTS, `v23-A-bfs-${vp}-dataopen.png`) })
          await showDemo(page)
        } else {
          await page.getByTestId('data-toggle').click()
          const collapsed = await measureWorkbench(page)
          assertScene(collapsed, `${algo} data collapsed`)
          expect(collapsed.graph!.plot!.h).toBeGreaterThanOrEqual(m.graph!.plot!.h)
          await page.getByTestId('data-toggle').click()
          const reopened = await measureWorkbench(page)
          assertScene(reopened, `${algo} data reopened`)
          if (algo === 'bfs') await page.screenshot({ path: path.join(SHOTS, `v23-A-bfs-${vp}-dataopen.png`) })
        }

        await next(page, 10)
        assertScene(await measureWorkbench(page), `${algo} +10`)
        const total = await totalSteps(page)
        await seek(page, total - 1)
        m = await measureWorkbench(page)
        assertScene(m, `${algo} end`)
        await expect(page.getByTestId('final-answer-panel')).toHaveAttribute('open', '')
        if (algo === 'bfs') await page.screenshot({ path: path.join(SHOTS, `v23-A-bfs-${vp}-end.png`) })

        await expect(page.getByTestId('play-btn')).toHaveText(/重新播放/)
        await page.getByTestId('play-btn').click()
        await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
        await page.getByTestId('play-btn').click()
        assertScene(await measureWorkbench(page), `${algo} replay`)
        expect((await measureWorkbench(page)).solveCount, `${vp} ${algo} replay does not re-solve`).toBe(solve0 + 1)
      }
    }
    record('A', metrics)
  })

  test('A2: edit open keeps the scene intact (page scrolls, nothing crushed) @1366 / 390', async ({ page }) => {
    for (const [w, h] of [
      [1366, 768],
      [1920, 1080],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width: w, height: h })
      await openAlgo(page, 'bfs')
      await run(page, 10)
      await next(page, 8)
      await ensureInputEditing(page)
      await page.getByTestId('workbench-layout').scrollIntoViewIfNeeded()
      const m = await measureWorkbench(page)
      expect(m.overlaps).toEqual([])
      expect(m.graph).not.toBeNull()
      expect(m.graph!.outside).toEqual([])
      expect(m.graph!.plot!.h, `${w}x${h} edit-open plot height`).toBeGreaterThanOrEqual(140)
      await page.screenshot({ path: path.join(SHOTS, `v23-A2-bfs-${w}x${h}-editopen.png`) })
      record(`A2-${w}x${h}`, m)
    }
  })

  test('B: 3-node directed Dijkstra dist[1] ∞→10→2; final dist=[0,2,1] parent=[-,2,0]', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'dijkstra')
    await ensureInputEditing(page)
    await page.getByTestId('graph-n').fill('3')
    await page.getByTestId('graph-start').fill('0')
    await page.getByTestId('graph-edges').fill('0 1 10\n0 2 1\n2 1 1')
    const directed = page.getByLabel('有向图')
    if (!(await directed.isChecked())) await directed.check()
    await expect(page.getByTestId('graph-input')).toHaveAttribute('data-can-run', '1')
    await run(page, 3)
    const total = await totalSteps(page)
    const seq: string[] = []
    const readArr = (name: string) =>
      page.evaluate(
        (n) => [...document.querySelectorAll(`[data-testid="inspector-array-${n}"] tbody td`)].map((td) => (td.textContent || '').trim()),
        name,
      )
    for (let i = 0; i < total; i++) {
      const dist = await readArr('dist')
      if (dist.length === 3 && seq[seq.length - 1] !== dist[1]) seq.push(dist[1]!)
      if (i === 0) {
        // the process must not show the end state at the start
        expect(dist).not.toEqual(['0', '2', '1'])
      }
      const m = await measureWorkbench(page)
      expect(m.overlaps).toEqual([])
      expect(m.graph?.outside ?? []).toEqual([])
      if (i < total - 1) await page.getByTestId('next-step-btn').click()
    }
    expect(seq.filter((v) => ['∞', '10', '2'].includes(v))).toEqual(['∞', '10', '2'])
    expect(await readArr('dist')).toEqual(['0', '2', '1'])
    expect(await readArr('parent')).toEqual(['-', '2', '0'])
    const tree = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="graph-plot"] [data-edge-role="tree"]')].map((e) => e.getAttribute('data-edge-id')),
    )
    expect(new Set(tree)).toEqual(new Set(['0->2', '2->1']))
    const m = await measureWorkbench(page)
    expect(m.graph!.arrows, 'directed edges draw arrows').toBeGreaterThanOrEqual(3)
    expect(m.graph!.edgeLabels, 'weights drawn').toBeGreaterThanOrEqual(3)
    await page.screenshot({ path: path.join(SHOTS, 'v23-B-dijkstra3-end-1366x768.png') })
    record('B', { seq, tree, total })
  })

  test('C: LCS frames 1/14/31/74/75/94/95 joint (input strip, cell, buttons, data, code, step text)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'lcs')
    await run(page, 90)
    expect(await totalSteps(page)).toBe(95)
    const rows: unknown[] = []
    for (const frame of [1, 14, 31, 74, 75, 94, 95]) {
      await seek(page, frame - 1)
      await page.waitForTimeout(200)
      const j = await page.evaluate(() => {
        const vis = (el: Element | null) => {
          if (!el) return { ok: false, h: 0, v: 0, w: 0, vw: 0 }
          const a = el.getBoundingClientRect()
          let t = a.top, b = a.bottom, l = a.left, r = a.right
          for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
            const cs = getComputedStyle(n)
            if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
              const q = n.getBoundingClientRect()
              t = Math.max(t, q.top); b = Math.min(b, q.bottom); l = Math.max(l, q.left); r = Math.min(r, q.right)
            }
          }
          t = Math.max(t, 0); b = Math.min(b, innerHeight); l = Math.max(l, 0); r = Math.min(r, innerWidth)
          const v = Math.max(0, b - t), vw = Math.max(0, r - l)
          return { ok: a.height > 0 && v >= a.height - 1.5 && vw >= a.width - 1.5, h: a.height, v, w: a.width, vw }
        }
        const chars = [...document.querySelectorAll('[data-testid="array-labels"] .compact-ch')]
        const cell = document.querySelector('.matrix-table td.hl-focus, .matrix-table td.hl-write')
        const chips = [...document.querySelectorAll('[data-testid="var-chip"]')]
        return {
          counter: document.querySelector('[data-testid="step-counter"]')?.textContent,
          chars: chars.length,
          charsFull: chars.filter((c) => vis(c).ok).length,
          cell: cell ? vis(cell).ok : null,
          locate: vis(document.querySelector('[data-testid="matrix-locate-btn"]')).ok,
          resume: vis(document.querySelector('[data-testid="matrix-resume-follow-btn"]')).ok,
          chipsFull: chips.filter((c) => vis(c).ok).length,
          chips: chips.length,
          exec: vis(document.querySelector('.cm-exec-line')).ok,
          step: vis(document.querySelector('[data-testid="viz-banner-text"]')).ok,
          codeW: document.querySelector('[data-testid="workbench-code-slot"]')?.getBoundingClientRect().width ?? 0,
        }
      })
      rows.push(j)
      expect(j.counter).toMatch(new RegExp(`^${frame}\\s*/\\s*95`))
      expect(j.chars, `frame ${frame} strip chars`).toBe(13)
      expect(j.charsFull, `frame ${frame} strip glyphs fully readable`).toBe(13)
      if (j.cell !== null) expect(j.cell, `frame ${frame} current cell`).toBe(true)
      expect(j.locate && j.resume, `frame ${frame} locate/resume`).toBe(true)
      expect(j.chipsFull, `frame ${frame} data chips`).toBe(j.chips)
      expect(j.exec, `frame ${frame} exec line`).toBe(true)
      expect(j.step, `frame ${frame} step text`).toBe(true)
      expect(j.codeW).toBeGreaterThanOrEqual(340)
      if ([1, 31, 95].includes(frame)) await page.screenshot({ path: path.join(SHOTS, `v23-C-lcs-f${frame}-1366x768.png`) })
    }
    const fin = (await page.getByTestId('final-answer-panel').textContent()) ?? ''
    expect(fin).toMatch(/4/)
    record('C', rows)
  })

  test('F: V22 joint detector vs the four fault injections (same detector; fail while injected, pass after restore)', async ({ page }) => {
    const out: Record<string, unknown> = {}
    for (const [w, h] of [
      [1366, 768],
      [1024, 600],
    ] as const) {
      await page.setViewportSize({ width: w, height: h })
      await openAlgo(page, 'lcs')
      await run(page, 90)
      await next(page, 13)
      const vp = `${w}x${h}`
      const clean = jointFailures(await measureJoint(page))
      expect(clean, `${vp} clean page passes the joint detector`).toEqual([])
      const faults: Record<string, { apply: string; expect: RegExp }> = {
        'strip-10px': {
          apply: `(() => { const e = document.querySelector('[data-testid="array-labels"]'); e.style.maxHeight = '10px'; e.style.minHeight = '10px'; e.style.overflow = 'hidden' })()`,
          expect: /^glyphs:/,
        },
        'toolbar-6px': {
          apply: `(() => { const e = document.querySelector('[data-testid="matrix-follow-bar"]'); e.style.maxHeight = '6px'; e.style.minHeight = '6px'; e.style.overflow = 'hidden' })()`,
          expect: /^(locate|resume):/,
        },
        'matrix-overhang': {
          apply: `(() => { const e = document.querySelector('.matrix-scroll'); e.style.maxHeight = 'none'; e.style.minHeight = '0'; e.style.flex = '0 0 auto'; e.style.height = '2000px' })()`,
          expect: /^matrix:overhang/,
        },
        'code-w0': {
          apply: `(() => { const e = document.querySelector('[data-testid="code-mirror-wrap"]'); e.style.width = '0px' })()`,
          expect: /^code:width/,
        },
      }
      const restore = `(() => {
        for (const sel of ['[data-testid="array-labels"]', '[data-testid="matrix-follow-bar"]', '.matrix-scroll', '[data-testid="code-mirror-wrap"]']) {
          const e = document.querySelector(sel); if (!e) continue
          for (const p of ['max-height', 'min-height', 'overflow', 'flex', 'height', 'width']) e.style.removeProperty(p)
        }
      })()`
      for (const [name, fault] of Object.entries(faults)) {
        await page.evaluate(fault.apply)
        await page.waitForTimeout(80)
        const bad = jointFailures(await measureJoint(page))
        // Visible label painted AFTER measuring (fixed, pointer-events none), removed before restore
        await page.evaluate((txt) => {
          const d = document.createElement('div')
          d.id = 'v23-fault-label'
          d.textContent = txt
          Object.assign(d.style, { position: 'fixed', left: '8px', bottom: '8px', zIndex: '99', padding: '4px 10px', background: '#b91c1c', color: '#fff', font: '600 14px sans-serif', borderRadius: '4px', pointerEvents: 'none' })
          document.body.appendChild(d)
        }, `FAULT INJECTED: ${name} (${vp}) — detector: ${bad.join(', ')}`)
        await page.screenshot({ path: path.join(SHOTS, `v23-F-FAULT-INJECTED-${name}-${vp}.png`) })
        await page.evaluate(() => document.getElementById('v23-fault-label')?.remove())
        expect(bad.some((x) => fault.expect.test(x)), `${vp} ${name} must fail the detector: ${JSON.stringify(bad)}`).toBe(true)
        await page.evaluate(restore)
        await page.waitForTimeout(120)
        const ok = jointFailures(await measureJoint(page))
        expect(ok, `${vp} ${name} restored page passes`).toEqual([])
        out[`${vp}-${name}`] = { whileInjected: bad, afterRestore: ok }
      }
    }
    record('F', out)
  })

  test('D: merge [4,1,3,2] + insertion [2,1] — main array, buffers, duplicates kept', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    for (const [algo, input, final, buf] of [
      ['mergeSort', '4,1,3,2', ['1', '2', '3', '4'], /left|right/],
      ['insertionSort', '2,1', ['1', '2'], /temp|key/],
    ] as const) {
      await openAlgo(page, algo)
      await ensureInputEditing(page)
      await page.getByTestId('array-input').fill(input)
      await run(page, 3)
      const total = await totalSteps(page)
      let sawDup = false
      let sawBuf = false
      for (let i = 0; i < total; i++) {
        const s = await page.evaluate(() => {
          const stage = document.querySelector('[data-testid="viz-canvas"]')!.getBoundingClientRect()
          const main = [...document.querySelectorAll('[data-testid="viz-canvas"] .array-view[data-array="a"] [data-el-id]')]
          const vals = [...document.querySelectorAll('[data-testid="inspector-array-a"] tbody td')].map((t) => (t.textContent || '').trim())
          const bufs = [...document.querySelectorAll('[data-testid="viz-canvas"] [data-testid="array-buffers"] .array-view')]
          const bufInStage = bufs.every((b) => {
            const r = b.getBoundingClientRect()
            return r.top >= stage.top - 1 && r.bottom <= stage.bottom + 1
          })
          return { mainCount: main.length, vals, bufNames: bufs.map((b) => b.getAttribute('data-array')), bufInStage }
        })
        expect(s.vals.length, `${algo} frame ${i} main array keeps length`).toBe(final.length)
        if (new Set(s.vals).size < s.vals.length) sawDup = true
        if (s.bufNames.some((n) => buf.test(n || ''))) sawBuf = true
        expect(s.bufInStage, `${algo} frame ${i} buffers inside stage`).toBe(true)
        expect((await measureWorkbench(page)).overlaps).toEqual([])
        if (i === Math.floor(total / 2)) await page.screenshot({ path: path.join(SHOTS, `v23-D-${algo}-mid-1366x768.png`) })
        if (i < total - 1) await page.getByTestId('next-step-btn').click()
      }
      const end = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="inspector-array-a"] tbody td')].map((t) => (t.textContent || '').trim()),
      )
      expect(end).toEqual(final)
      expect(sawBuf, `${algo} buffer shown`).toBe(true)
      if (algo === 'mergeSort') expect(sawDup, 'merge copy-back shows a transient duplicate (never deduped)').toBe(true)
      record(`D-${algo}`, { total, sawDup, sawBuf })
    }
  })

  test('E: reading & adjusting keeps runId/cursor/speed/reading/query; no extra solve', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'dijkstra')
    const rid = await run(page, 10)
    await next(page, 6)
    // speed change (a user preference that must survive)
    await page.getByLabel('播放速度', { exact: true }).fill('900')
    const speedVal = await page.getByLabel('播放速度', { exact: true }).inputValue()
    const cursor = await stepIdx(page)
    const solve = (await measureWorkbench(page)).solveCount
    const target = page.getByTestId('graph-result-target')
    const hasTarget = (await target.count()) > 0 && (await target.isVisible())
    if (hasTarget) await target.fill('3')

    // manual read position #1 in TS
    const scroller = page.locator('.cm-scroller')
    await scroller.hover()
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(250)
    const read1 = await scroller.evaluate((e) => e.scrollTop)
    expect(read1).toBeGreaterThan(0)

    const same = async (label: string, readExpect?: number) => {
      const m = await measureWorkbench(page)
      expect(m.runId, `${label} runId`).toBe(rid)
      expect(Number(m.stepIndex), `${label} cursor`).toBe(cursor)
      expect(m.solveCount, `${label} no extra solve`).toBe(solve)
      expect(m.code.editors, `${label} one editor`).toBeLessThanOrEqual(1)
      if (hasTarget && (await target.isVisible())) expect(await target.inputValue(), `${label} query`).toBe('3')
      const sp = page.getByLabel('播放速度', { exact: true })
      if (await sp.isVisible()) expect(await sp.inputValue(), `${label} speed`).toBe(speedVal)
      if (readExpect !== undefined && (await scroller.isVisible())) {
        const st = await scroller.evaluate((e) => e.scrollTop)
        expect(Math.abs(st - readExpect), `${label} reading position (${st} vs ${readExpect})`).toBeLessThanOrEqual(4)
      }
      return m
    }

    await page.getByTestId('data-toggle').click()
    await same('data collapsed', read1)
    await page.getByTestId('data-toggle').click()
    await same('data reopened', read1)

    await page.setViewportSize({ width: 1366, height: 680 })
    await page.waitForTimeout(250)
    await same('height 680')
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.waitForTimeout(250)

    // manual read position #2 (different place), then TS → pseudo → TS round trip
    // (wheel UP: read #1 may already sit at the end of a short file)
    await scroller.hover()
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(250)
    const read2 = await scroller.evaluate((e) => e.scrollTop)
    expect(read2).not.toBe(read1)
    const pseudoTab = page.getByRole('button', { name: '伪代码' })
    if (await pseudoTab.count()) {
      await pseudoTab.click()
      await page.getByRole('button', { name: 'TypeScript' }).click()
      await page.waitForTimeout(250)
      await same('TS→pseudo→TS', read2)
    }

    // split drag (pointer) — code wider by 60px
    const split = page.getByTestId('workbench-split-code')
    const sb = (await split.boundingBox())!
    const codeW0 = (await measureWorkbench(page)).code.width
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
    await page.mouse.down()
    await page.mouse.move(sb.x + sb.width / 2 - 60, sb.y + sb.height / 2, { steps: 6 })
    await page.mouse.up()
    const codeW1 = (await measureWorkbench(page)).code.width
    expect(codeW1).toBeGreaterThan(codeW0 + 40)
    await same('split drag')

    // narrow (tabs) and back
    await page.setViewportSize({ width: 700, height: 820 })
    await page.waitForTimeout(300)
    const nm = await same('narrow')
    expect(nm.mode).toBe('tabbed')
    await page.getByTestId('workbench-tab-code').click()
    await same('narrow code tab')
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.waitForTimeout(300)
    const back = await same('back to desktop')
    expect(back.mode).toBe('docked')
    expect(back.code.width, 'split preference survives the round trip').toBeGreaterThanOrEqual(codeW1 - 2)
    await page.screenshot({ path: path.join(SHOTS, 'v23-E-dijkstra-back-1366x768.png') })
    record('E', { rid, cursor, read1, read2, codeW0, codeW1 })
  })

  test('theory is a real modal: focus in, Escape closes, focus restored, cursor unchanged', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await openAlgo(page, 'bfs')
    await run(page, 5)
    await next(page, 3)
    const cur = await stepIdx(page)
    const toggle = page.getByRole('button', { name: '说明 / 理论' })
    await toggle.click()
    await expect(page.getByTestId('theory-close')).toBeFocused()
    await page.keyboard.press('ArrowRight')
    expect(await stepIdx(page)).toBe(cur)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('theory-drawer')).toHaveCount(0)
    await expect(toggle).toBeFocused()
    expect(await stepIdx(page)).toBe(cur)
  })

  test('build-info entry shows version + short SHA', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('#/')
    const bi = page.getByTestId('build-info')
    await expect(bi).toHaveText(/V23 · [0-9a-f]{7}/)
    expect(await bi.getAttribute('data-build-time')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

test.describe('V23 key joint-layout paths ×3 (retries 0)', () => {
  test.describe.configure({ retries: 0 })
  for (let rep = 1; rep <= 3; rep++) {
    test(`six-node graph + data + code joint @1366x768 / 1024x600 / 390x844 rep ${rep}`, async ({ page }) => {
      for (const [w, h] of [
        [1366, 768],
        [1024, 600],
        [390, 844],
      ] as const) {
        await page.setViewportSize({ width: w, height: h })
        await openAlgo(page, 'bfs')
        await run(page, 10)
        await next(page, 8)
        const m = await measureWorkbench(page)
        assertScene(m, `rep${rep}`, { minPlotH: w === 1366 ? 300 : undefined })
        if (m.mode !== 'tabbed') {
          expect(m.regions.data, 'data visible alongside scene').not.toBeNull()
          expect(m.code.visible, 'code visible alongside scene').toBe(true)
        }
      }
    })
  }
})
