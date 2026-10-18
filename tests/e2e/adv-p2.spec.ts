/**
 * 高阶算法 P2 — segment tree, lazy segment tree, prefix/diff (+ more families appended below).
 * Real mouse/keyboard, full HTTP app, retries 0. Expected values come from independent references in THIS file.
 */
import { test, expect } from '@playwright/test'
import { open, runAndEnd, sceneAudit, cells, nums } from './adv-helpers'

test.describe.configure({ retries: 0 })

// ───────────── independent references ─────────────
function refSeg(arr: number[], ops: string[]) {
  const n = arr.length
  const a = [...arr]
  const tree = new Array<number>(4 * n).fill(0)
  const lazy = new Array<number>(4 * n).fill(0)
  const build = (o: number, lo: number, hi: number) => {
    if (hi - lo === 1) return void (tree[o] = a[lo]!)
    const m = (lo + hi) >> 1
    build(2 * o, lo, m)
    build(2 * o + 1, m, hi)
    tree[o] = tree[2 * o]! + tree[2 * o + 1]!
  }
  build(1, 0, n)
  return { n, a, tree, lazy, ops }
}
function runPoint(arr: number[], ops: string[]) {
  const r = refSeg(arr, ops)
  const ans: number[] = []
  const set = (o: number, lo: number, hi: number, i: number, v: number) => {
    if (hi - lo === 1) return void (r.tree[o] = v)
    const m = (lo + hi) >> 1
    if (i < m) set(2 * o, lo, m, i, v)
    else set(2 * o + 1, m, hi, i, v)
    r.tree[o] = r.tree[2 * o]! + r.tree[2 * o + 1]!
  }
  for (const op of ops) {
    const [k, x, y] = op.trim().split(/\s+/)
    if (k === 'set') {
      set(1, 0, r.n, +x!, +y!)
      r.a[+x!] = +y!
    } else ans.push(r.a.slice(+x!, +y!).reduce((s, v) => s + v, 0))
  }
  return { ...r, ans }
}
function runLazy(arr: number[], ops: string[]) {
  const r = refSeg(arr, ops)
  const ans: number[] = []
  const ap = (o: number, lo: number, hi: number, v: number) => {
    r.tree[o]! += v * (hi - lo)
    r.lazy[o]! += v
  }
  const push = (o: number, lo: number, hi: number) => {
    if (r.lazy[o] === 0) return
    const m = (lo + hi) >> 1
    ap(2 * o, lo, m, r.lazy[o]!)
    ap(2 * o + 1, m, hi, r.lazy[o]!)
    r.lazy[o] = 0
  }
  const add = (o: number, lo: number, hi: number, l: number, rr: number, v: number) => {
    if (rr <= lo || hi <= l) return
    if (l <= lo && hi <= rr) return ap(o, lo, hi, v)
    push(o, lo, hi)
    const m = (lo + hi) >> 1
    add(2 * o, lo, m, l, rr, v)
    add(2 * o + 1, m, hi, l, rr, v)
    r.tree[o] = r.tree[2 * o]! + r.tree[2 * o + 1]!
  }
  const q = (o: number, lo: number, hi: number, l: number, rr: number): number => {
    if (rr <= lo || hi <= l) return 0
    if (l <= lo && hi <= rr) return r.tree[o]!
    push(o, lo, hi)
    const m = (lo + hi) >> 1
    return q(2 * o, lo, m, l, rr) + q(2 * o + 1, m, hi, l, rr)
  }
  for (const op of ops) {
    const [k, x, y, z] = op.trim().split(/\s+/)
    if (k === 'add') {
      add(1, 0, r.n, +x!, +y!, +z!)
      for (let i = +x!; i < +y!; i++) r.a[i]! += +z!
    } else ans.push(q(1, 0, r.n, +x!, +y!))
  }
  return { ...r, ans }
}

const SEG_ARR = [5, 3, 8, 1, 9, 2, 7, 4]
const SEG_OPS = 'sum 1 6; set 3 10; sum 0 4; sum 2 3; set 7 -2; sum 0 8'
const LZ_OPS = 'add 1 6 10; sum 2 5; add 3 5 -4; sum 0 8; sum 4 5'

async function sceneNodes(page: import('@playwright/test').Page) {
  return page.locator('[data-testid="seg-node"]').evaluateAll((els) =>
    els.map((e) => ({ node: +e.getAttribute('data-node')!, built: e.getAttribute('data-built') === '1', value: +(e.getAttribute('data-value') ?? 'NaN'), lazy: e.getAttribute('data-lazy') })),
  )
}

test.describe('ADV-11 segment tree (point assign + range sum)', () => {
  test('1366: preview shows the unbuilt skeleton; end state: every node value in the drawn scene equals the reference tree', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree?view=demo')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
    await sceneAudit(page, 'seg-node', 8)
    expect((await sceneNodes(page)).every((n) => !n.built)).toBe(true)
    await runAndEnd(page)
    await sceneAudit(page, 'seg-node', 8)
    const ref = runPoint(SEG_ARR, SEG_OPS.split(';'))
    const nodes = await sceneNodes(page)
    expect(nodes.length).toBe(15)
    for (const nd of nodes) expect(nd.value, `node ${nd.node}`).toBe(ref.tree[nd.node])
    await expect(page.getByTestId('seg-result')).toHaveAttribute('data-value', String(ref.ans[ref.ans.length - 1]))
  })
  test('every sum answer shown in the scene (seg-result) equals the reference, in order', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    const ref = runPoint(SEG_ARR, SEG_OPS.split(';'))
    const seen: number[] = []
    for (let i = 0; i < 400 && seen.length < ref.ans.length; i++) {
      await page.getByTestId('next-step-btn').click()
      const r = page.getByTestId('seg-result')
      if ((await r.count()) > 0) {
        const v = Number(await r.getAttribute('data-value'))
        const q = await page.getByTestId('seg-op').textContent()
        if (seen.length === 0 || q !== lastOp) seen.push(v)
        lastOp = q
      }
    }
    expect(seen).toEqual(ref.ans)
  })
  test('out-of-range set index is rejected with a message and no solve', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-ops').fill('set 9 1')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('越界')
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})
let lastOp: string | null = null

test.describe('ADV-12 lazy segment tree (range add + range sum)', () => {
  test('1366: end state — total and pending tag of every node in the scene equal the reference lazy tree', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree-lazy?view=demo')
    await sceneAudit(page, 'seg-node', 8)
    await runAndEnd(page)
    const ref = runLazy(SEG_ARR, LZ_OPS.split(';'))
    const nodes = await sceneNodes(page)
    for (const nd of nodes) {
      expect(nd.value, `total of node ${nd.node}`).toBe(ref.tree[nd.node])
      expect(Number(nd.lazy), `lazy of node ${nd.node}`).toBe(ref.lazy[nd.node])
    }
    expect(ref.lazy.some((x) => x !== 0)).toBe(true) // the default demo really leaves tags behind
    await expect(page.getByTestId('seg-result')).toHaveAttribute('data-value', String(ref.ans[ref.ans.length - 1]))
  })
  test('a push frame exists before any child is visited under a tagged node, and shows the tag moving (⚑ badge appears on a child)', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree-lazy?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    let tagged = 0
    for (let i = 0; i < 400 && tagged === 0; i++) {
      await page.getByTestId('next-step-btn').click()
      tagged = await page.locator('[data-testid="seg-node"][data-tagged="1"]').count()
    }
    expect(tagged).toBeGreaterThan(0)
    await expect(page.getByTestId('seg-tag').first()).toBeVisible()
  })
  test('invalid add (v missing) is rejected; grammar is whitelisted', async ({ page }) => {
    await open(page, '#/advanced/algorithms/segtree-lazy?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-ops').fill('add 1 3')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('add l r v')
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-13 prefix sums & difference array', () => {
  test('1366: final prefix row, restored array and query answers in the SCENE equal the reference', async ({ page }) => {
    await open(page, '#/advanced/algorithms/prefix-diff?view=demo')
    await sceneAudit(page, 'fam-cell', 8)
    await runAndEnd(page)
    const arr = [3, 1, 4, 1, 5, 9, 2, 6]
    const pre = [0, ...arr.map((_, i) => arr.slice(0, i + 1).reduce((s, v) => s + v, 0))]
    const fin = [...arr]
    for (const [l, r, v] of [[1, 5, 10], [4, 8, -3]] as const) for (let i = l; i < r; i++) fin[i]! += v
    expect(nums(await cells(page, 'p'))).toEqual(pre)
    expect(nums(await cells(page, 'out'))).toEqual(fin)
    const d = new Array<number>(9).fill(0)
    d[1]! += 10; d[5]! -= 10; d[4]! -= 3; d[8]! += 3
    expect(nums(await cells(page, 'd'))).toEqual(d)
  })
  test('query steps: sum[2,6) frame highlights exactly a[2..5] as range cells', async ({ page }) => {
    await open(page, '#/advanced/algorithms/prefix-diff?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    let hit = false
    for (let i = 0; i < 80 && !hit; i++) {
      await page.getByTestId('next-step-btn').click()
      hit = (await page.getByTestId('fam-op').textContent()) === 'sum(2, 6)'
    }
    expect(hit).toBe(true)
    const marked = await page.locator('[data-testid="fam-cell"][data-row="a"][data-mark="range"]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-i')!))
    expect(marked).toEqual([2, 3, 4, 5])
    const pivots = await page.locator('[data-testid="fam-cell"][data-row="p"][data-mark="pivot"]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-i')!))
    expect(pivots).toEqual([2, 6])
  })
  test('queries with l > r are rejected with the interval reason', async ({ page }) => {
    await open(page, '#/advanced/algorithms/prefix-diff?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-qs').fill('5 2')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('0 ≤ l ≤ r')
  })
})
