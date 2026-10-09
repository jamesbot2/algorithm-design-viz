/**
 * V30 targeted motion fixes — acceptance promoted to CI.
 *  V30-01 autoplay → manual Next takeover must PLAY the new transition (not freeze at t=0).
 *  V30-02 Prev must travel back (real from→to by element identity), bars and cells.
 *  V30-03 companion buffer appear/disappear must not move the main array card (≤1 CSS px).
 * Real mouse/keyboard only; state waits; continuous rAF sampling. Key cases ×3, retries 0.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  prep,
  realClick,
  startSampler,
  stopSampler,
  waitIdx,
  waitSettled,
  snap,
  midMotionFrames,
  frozenAtStart,
  rectPP,
  maxVerticalDrift,
  boxOf,
  clickBox,
  waitRunning,
  maxFrameJump,
} from './helpers/v30Motion.mjs'

test.describe.configure({ retries: 0 })
test.use({ viewport: { width: 1366, height: 768 } })

type Sample = Awaited<ReturnType<typeof snap>>

const next = (page: Page) => page.getByTestId('next-step-btn')
const prev = (page: Page) => page.getByTestId('prev-step-btn')
const play = (page: Page) => page.getByTestId('play-btn')

async function takeover(page: Page, mode: 'bars' | 'cells') {
  await prep(page, 'bubbleSort', '2,1', { mode })
  await startSampler(page)
  await realClick(page, play(page))
  await waitIdx(page, 2, '1')
  await realClick(page, next(page))
  await waitIdx(page, 3)
  const settled = await waitSettled(page, 1500)
  const samples: Sample[] = await stopSampler(page)
  const last: Sample = await snap(page)
  const from = Math.max(0, samples.findIndex((s) => s.idx === 3) - 1)
  return { settled, samples, last, mm: midMotionFrames(samples, from) }
}

for (const rep of [1, 2, 3]) {
  test(`V30-01 auto→manual Next takeover plays the swap (bars) rep ${rep}`, async ({ page }) => {
    const r = await takeover(page, 'bars')
    expect(r.last.idx).toBe(3)
    expect(r.last.playing).toBe('0')
    expect(frozenAtStart(r.last), 'no WAAPI frozen at currentTime 0').toEqual([])
    expect(r.settled, 'takeover transition settles').toBe(true)
    expect(r.last.visOrder, 'screen order (spatial) = data a=[1,2]').toEqual(['1', '2'])
    expect(r.mm.frames, 'swap travels with mid-motion frames').toBeGreaterThan(3)
    expect(r.last.runFlips).toBe(0)
    expect(maxVerticalDrift(r.samples), 'same-row swap is pure horizontal').toBeLessThanOrEqual(0.5)
  })
}

test('V30-01 auto→manual Next takeover plays the swap (cells)', async ({ page }) => {
  const r = await takeover(page, 'cells')
  expect(frozenAtStart(r.last)).toEqual([])
  expect(r.settled).toBe(true)
  expect(r.last.visOrder).toEqual(['1', '2'])
  expect(r.mm.frames).toBeGreaterThan(3)
})

async function reverse(page: Page, mode: 'bars' | 'cells') {
  await prep(page, 'bubbleSort', '2,1', { mode })
  for (const i of [1, 2, 3]) {
    await realClick(page, next(page))
    await waitIdx(page, i)
    await waitSettled(page)
  }
  await startSampler(page)
  await realClick(page, prev(page))
  await waitIdx(page, 2)
  const settled = await waitSettled(page, 1500)
  const back: Sample[] = await stopSampler(page)
  return { settled, back, mm: midMotionFrames(back) }
}

for (const mode of ['bars', 'cells'] as const) {
  for (const rep of [1, 2, 3]) {
    test(`V30-02 Prev travels back by identity (${mode}) rep ${rep}`, async ({ page }) => {
      const r = await reverse(page, mode)
      expect(r.back[0]!.visOrder, 'starts from displayed swap result').toEqual(['1', '2'])
      expect(r.back.at(-1)!.visOrder, 'ends at compare frame order').toEqual(['2', '1'])
      expect(r.mm.moved.sort(), 'the same two display instances move back').toEqual(['b0', 'b1'])
      expect(r.mm.frames, 'reverse has real mid-motion frames').toBeGreaterThan(3)
      expect(r.settled).toBe(true)
      // values / heights travel with their element
      const h0 = new Map(r.back[0]!.els.map((e: { id: string; h: number; v: string }) => [e.id, `${e.v}:${Math.round(e.h)}`]))
      for (const s of r.back) for (const e of s.els) expect(`${e.v}:${Math.round(e.h)}`).toBe(h0.get(e.id))
      if (mode === 'bars') expect(maxVerticalDrift(r.back)).toBeLessThanOrEqual(0.5)
    })
  }
}

test('V30-03 merge [4,1,3,2] buffers appear/disappear: main card fixed (≤1px)', async ({ page }) => {
  await prep(page, 'mergeSort', '4,1,3,2')
  const frames: Sample[] = [await snap(page)]
  for (let i = 1; i < 60; i++) {
    if (await next(page).isDisabled()) break
    await realClick(page, next(page))
    await waitIdx(page, i)
    await waitSettled(page)
    frames.push(await snap(page))
  }
  const kinds = new Set(frames.map((f) => f.compKind))
  expect(kinds.has('real') && kinds.has('ghost'), 'run covers empty and real buffers').toBe(true)
  const pp = rectPP(frames, 'main')
  expect(pp.x!, `main x p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
  expect(pp.y!, `main y p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
  expect(pp.w!, `main w p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
  expect(pp.h!, `main h p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
})

async function stepAllMain(page: Page) {
  const frames: Sample[] = [await snap(page)]
  await startSampler(page)
  for (let i = 1; i < 120; i++) {
    if (await next(page).isDisabled()) break
    await realClick(page, next(page))
    await waitIdx(page, i)
    await waitSettled(page)
    frames.push(await snap(page))
  }
  const cont: Sample[] = await stopSampler(page)
  return { frames, cont }
}

test('V30-03 merge tree open: call-stack wrap does not move the main card', async ({ page }) => {
  await prep(page, 'mergeSort', '4,1,3,2')
  await realClick(page, page.getByTestId('aux-toggle-recursion-tree'))
  await expect(page.getByTestId('scene-aux-pane')).toBeVisible()
  await waitSettled(page)
  const { frames, cont } = await stepAllMain(page)
  for (const set of [frames, cont]) {
    const pp = rectPP(set, 'main')
    expect(Math.max(pp.x!, pp.y!, pp.w!, pp.h!), JSON.stringify(pp)).toBeLessThanOrEqual(1)
  }
})

test('V30-03 fit guard: run-max strip never pushes the main array out of the stage (merge 7, tree open)', async ({ page }) => {
  await prep(page, 'mergeSort', '5,2,8,1,9,3,7')
  for (const i of [1, 2, 3]) {
    await realClick(page, next(page))
    await waitIdx(page, i)
    await waitSettled(page)
  }
  const comp = page.getByTestId('scene-companions')
  await expect(comp).toHaveAttribute('data-budget', 'run-max')
  await realClick(page, page.getByTestId('aux-toggle-recursion-tree'))
  await expect(page.getByTestId('scene-aux-pane')).toBeVisible()
  await waitSettled(page)
  await expect(comp, 'budget does not fit next to the main floor → per-frame fallback').toHaveAttribute('data-budget', 'frame')
  const r = await page.evaluate(() => {
    const st = document.querySelector('[data-testid="viz-canvas"]')!.getBoundingClientRect()
    const m = document.querySelector('[data-testid="viz-canvas"] .array-view:not(.array-view-compact)')!.getBoundingClientRect()
    return { stTop: st.top, stBottom: st.bottom, mTop: m.top, mBottom: m.bottom }
  })
  expect(r.mBottom, JSON.stringify(r)).toBeLessThanOrEqual(r.stBottom + 1)
  await realClick(page, page.getByTestId('aux-toggle-recursion-tree'))
  await expect(page.getByTestId('scene-aux-pane')).toHaveCount(0)
  await expect(comp).toHaveAttribute('data-budget', 'run-max')
})

test.describe('390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  for (const c of [
    { id: 'insertion [1,-1] temp', algo: 'insertionSort', arr: '1,-1' },
    { id: 'merge multi-digit', algo: 'mergeSort', arr: '100,7,35,2048,9,13' },
  ]) {
    test(`V30-03 ${c.id}: buffers appear/disappear, main card fixed`, async ({ page }) => {
      await prep(page, c.algo, c.arr)
      const { frames, cont } = await stepAllMain(page)
      expect(new Set(frames.map((f) => f.compKind)).size).toBeGreaterThan(1)
      for (const set of [frames, cont]) {
        const pp = rectPP(set, 'main')
        expect(Math.max(pp.x!, pp.y!, pp.w!, pp.h!), JSON.stringify(pp)).toBeLessThanOrEqual(1)
      }
    })
  }
})

test('V30-03b merge [4,1,3,2] bars: plot baseline fixed when the tallest element is parked in a buffer', async ({ page }) => {
  await prep(page, 'mergeSort', '4,1,3,2')
  const { frames, cont } = await stepAllMain(page)
  const rows = new Set(frames.flatMap((f) => f.els.map((e: { row: number }) => e.row)))
  expect([...rows], 'one baseline over the whole run').toHaveLength(1)
  expect(maxVerticalDrift(cont.filter((s) => s.els?.length === 4)), 'no in-card vertical shake').toBeLessThanOrEqual(1)
})

test.describe('390x844 pointer track', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('V30-03b cells: wrapped rows do not move when pointers appear / stack', async ({ page }) => {
    await prep(page, 'bubbleSort', '9,8,7,6,5,4,3,2,1,0,11,10', { mode: 'cells' })
    const frames: Sample[] = [await snap(page)]
    for (const i of [1, 2]) {
      await realClick(page, next(page))
      await waitIdx(page, i)
      await waitSettled(page)
      frames.push(await snap(page))
    }
    expect(new Set(frames[0]!.els.map((e: { row: number }) => e.row)).size, 'really wraps').toBeGreaterThan(1)
    const y = (f: Sample, id: string) => f.els.find((e: { id: string }) => e.id === id)!.y
    for (const id of ['b5', 'b10']) for (const f of frames) expect(Math.abs(y(f, id) - y(frames[0]!, id)), id).toBeLessThanOrEqual(1)
  })
})

test('V30 pure autoplay [2,1]: swap travels, nothing paused, frame fixed', async ({ page }) => {
  await prep(page, 'bubbleSort', '2,1')
  await startSampler(page)
  await realClick(page, play(page))
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-playing') === '0', null, { polling: 'raf', timeout: 15_000 })
  await waitSettled(page)
  const s: Sample[] = await stopSampler(page)
  const last: Sample = await snap(page)
  expect(last.visOrder).toEqual(['1', '2'])
  expect(s.some((x) => x.pausedAnims > 0), 'autoplay never pauses its own transitions').toBe(false)
  expect(midMotionFrames(s).frames).toBeGreaterThan(3)
  const outer = rectPP(s, 'outer')
  expect(Math.max(outer.x!, outer.y!, outer.w!, outer.h!), 'outer frame drift').toBeLessThanOrEqual(0.5)
})

test('V30 active pause mid-swap freezes progress; resume continues (no jump, no replay)', async ({ page }) => {
  await prep(page, 'bubbleSort', '2,1')
  const playAt = await boxOf(page, play(page))
  await clickBox(page, playAt)
  await waitRunning(page, 20)
  await clickBox(page, playAt)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-playing') === '0' &&
      [...document.querySelectorAll('[data-testid="viz-canvas"] [data-flip-layer]')].some((l) => (l.getAnimations?.() || []).some((a) => a.playState === 'paused')),
    null,
    { polling: 'raf', timeout: 1000 },
  ).catch(() => {})
  const p1: Sample = await snap(page)
  expect(p1.playing).toBe('0')
  expect(p1.pausedAnims, 'pause freezes in-flight transition').toBeGreaterThan(0)
  const ct1 = Math.max(...p1.els.flatMap((e: { a: { ct: number }[] }) => e.a.map((a) => a.ct ?? 0)))
  expect(ct1).toBeGreaterThan(0)
  await page.waitForTimeout(300)
  const p2: Sample = await snap(page)
  for (const e of p2.els) {
    const e1 = p1.els.find((x: { id: string }) => x.id === e.id)
    expect(Math.abs(e.x - e1.x), 'frozen while paused').toBeLessThanOrEqual(0.5)
  }
  await startSampler(page)
  await realClick(page, play(page))
  await waitSettled(page, 2000)
  const s: Sample[] = await stopSampler(page)
  const firstRunning = s.find((x) => x.activeAnims > 0)
  expect(firstRunning, 'resume plays the frozen transition').toBeTruthy()
  const ctR = Math.min(...firstRunning!.els.flatMap((e: { a: { ct: number; ps: string }[] }) => e.a.filter((a) => a.ps === 'running').map((a) => a.ct ?? 0)))
  expect(ctR, 'resume continues from frozen progress (no replay)').toBeGreaterThanOrEqual(ct1 - 1)
})

test('V30 seek/reset mid-motion = clean snapshot jump', async ({ page }) => {
  await prep(page, 'bubbleSort', '2,1')
  const resetAt = await boxOf(page, page.getByTestId('reset-playback-btn'))
  await realClick(page, play(page))
  await waitRunning(page, 20)
  await clickBox(page, resetAt)
  await waitIdx(page, 0, '0')
  const s: Sample = await snap(page)
  expect(s.activeAnims + s.pausedAnims).toBe(0)
  expect(s.runFlips).toBe(0)
  expect(s.visOrder).toEqual(['2', '1'])
})

test('V30 rapid Next ×4 from paused lands correctly (no frozen, no swallowed clicks)', async ({ page }) => {
  await prep(page, 'bubbleSort', '2,1')
  for (let i = 0; i < 4; i++) await realClick(page, next(page))
  await waitIdx(page, 4)
  expect(await waitSettled(page, 2000)).toBe(true)
  const s: Sample = await snap(page)
  expect(s.visOrder).toEqual(['1', '2'])
  expect(frozenAtStart(s)).toEqual([])
})

for (const rep of [1, 2, 3]) {
  test(`V30 auto→Prev mid-swap reverses from the current visible position rep ${rep}`, async ({ page }) => {
    await prep(page, 'bubbleSort', '2,1')
    const prevAt = await boxOf(page, prev(page))
    await startSampler(page)
    await realClick(page, play(page))
    await waitRunning(page, 60)
    await clickBox(page, prevAt)
    await waitIdx(page, 2, '0')
    expect(await waitSettled(page, 1500)).toBe(true)
    const s: Sample[] = await stopSampler(page)
    const last = s.at(-1)!
    expect(last.visOrder).toEqual(['2', '1'])
    expect(frozenAtStart(last)).toEqual([])
    // distance between the two slots ≈ one column pitch; a snap would jump ≈ full pitch in one frame
    const pitch = Math.abs(last.els[0].x - last.els[1].x)
    expect(maxFrameJump(s), `no snap (pitch ${pitch})`).toBeLessThan(pitch * 0.5)
    const backward = s.filter((x) => x.idx === 2 && x.els.some((e: { intent: string | null }) => e.intent === 'manualPrev'))
    expect(backward.length, 'reverse transition tagged manualPrev actually runs').toBeGreaterThan(3)
  })
}

test('V30 rapid Next during a swap continues motion (no snap, no freeze)', async ({ page }) => {
  await prep(page, 'bubbleSort', '2,1')
  for (const i of [1, 2]) {
    await realClick(page, next(page))
    await waitIdx(page, i)
    await waitSettled(page)
  }
  const nextAt = await boxOf(page, next(page))
  await startSampler(page)
  await clickBox(page, nextAt)
  await waitRunning(page, 30)
  await clickBox(page, nextAt)
  await waitIdx(page, 4)
  expect(await waitSettled(page, 1500)).toBe(true)
  const s: Sample[] = await stopSampler(page)
  const last = s.at(-1)!
  const pitch = Math.abs(last.els[0].x - last.els[1].x)
  expect(last.visOrder).toEqual(['1', '2'])
  expect(maxFrameJump(s)).toBeLessThan(pitch * 0.5)
  expect(midMotionFrames(s).frames).toBeGreaterThan(3)
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('V30 reduced: takeover + Prev land instantly with correct order', async ({ page }) => {
    const r = await takeover(page, 'bars')
    expect(r.last.visOrder).toEqual(['1', '2'])
    expect(r.samples.some((x: Sample) => x.activeAnims > 0 || x.pausedAnims > 0)).toBe(false)
    await realClick(page, prev(page))
    await waitIdx(page, 2)
    await waitSettled(page)
    expect((await snap(page)).visOrder).toEqual(['2', '1'])
  })
  for (const c of [
    { algo: 'bubbleSort', arr: '2,1', id: 'unsigned strut' },
    { algo: 'insertionSort', arr: '1,-1', id: 'signed plot' },
  ])
  test(`V30 reduced: first frame lands on the same geometry as after Next→Prev (${c.id})`, async ({ page }) => {
    await prep(page, c.algo, c.arr)
    const f0: Sample = await snap(page)
    await realClick(page, next(page))
    await waitIdx(page, 1)
    await waitSettled(page)
    await realClick(page, prev(page))
    await waitIdx(page, 0)
    await waitSettled(page)
    const b0: Sample = await snap(page)
    for (const e of f0.els) {
      const o = b0.els.find((x: { id: string }) => x.id === e.id)
      expect(Math.hypot(o.x - e.x, o.y - e.y), e.id).toBeLessThanOrEqual(1)
    }
  })
})
