/**
 * 高阶算法 — discretization, binary search on the answer, monotonic stack/queue, topological sort, LCA, LIS, number theory.
 * Real mouse/keyboard, full HTTP app, retries 0. Every expected value is computed HERE by an independent reference
 * (brute force / closure / dp) and compared with the numbers actually painted in the scene.
 */
import { test, expect, type Page } from '@playwright/test'
import { open, runAndEnd, sceneAudit, cells, nums } from './adv-helpers'

test.describe.configure({ retries: 0 })

const demo = (id: string) => `#/advanced/algorithms/${id}?view=demo`
const resultOf = async (page: Page) => (await page.getByTestId('fam-result').getAttribute('data-value'))!.split(',').filter(Boolean).map(Number)
async function nextUntil(page: Page, pred: () => Promise<boolean>, max = 300) {
  for (let i = 0; i < max; i++) {
    await page.getByTestId('next-step-btn').click()
    if (await pred()) return true
  }
  return false
}
async function edit(page: Page, key: string, value: string) {
  const t = page.getByTestId('input-edit-toggle')
  if ((await page.getByTestId(`adv-input-${key}`).count()) === 0) await t.click()
  await page.getByTestId(`adv-input-${key}`).fill(value)
}

test.describe('ADV-14 discretization', () => {
  test('1366: unique row, rank row and the "smaller distinct values" answers in the scene equal the reference', async ({ page }) => {
    await open(page, demo('discretize'))
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
    await sceneAudit(page, 'fam-cell', 7)
    await runAndEnd(page)
    const a = [90, 15, 90, -7, 15, 1000, 42]
    const qs = [15, 16, -100, 2000]
    const u = [...new Set(a)].sort((x, y) => x - y)
    expect(nums(await cells(page, 'u'))).toEqual(u)
    expect(nums(await cells(page, 'r'))).toEqual(a.map((x) => u.filter((y) => y < x).length))
    expect(nums(await cells(page, 'qr'))).toEqual(qs.map((x) => u.filter((y) => y < x).length))
  })
  test('empty sequence is rejected (min length) and no solve happens', async ({ page }) => {
    await open(page, demo('discretize'))
    await edit(page, 'arr', '')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-15 binary search on the answer', () => {
  test('1366: final answer equals the brute-force min-max partition', async ({ page }) => {
    await open(page, demo('bs-answer'))
    await sceneAudit(page, 'fam-cell', 7)
    await runAndEnd(page)
    const a = [7, 2, 5, 10, 8, 3, 6]
    const k = 3
    // brute force: try every way to place k-1 cuts
    let best = Infinity
    const rec = (i: number, parts: number, cur: number, mx: number) => {
      if (i === a.length) return void (best = Math.min(best, Math.max(mx, cur)))
      rec(i + 1, parts, cur + a[i]!, mx)
      if (parts < k && cur > 0) rec(i + 1, parts + 1, a[i]!, Math.max(mx, cur))
    }
    rec(0, 1, 0, 0)
    expect(await resultOf(page)).toEqual([best])
  })
  test('k larger than n is rejected or handled without a crash: k = 0 is rejected', async ({ page }) => {
    await open(page, demo('bs-answer'))
    await edit(page, 'k', '0')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-16 monotonic stack', () => {
  test('1366: largest rectangle shown equals the O(n²) reference; area row maximum agrees', async ({ page }) => {
    await open(page, demo('mono-stack'))
    await sceneAudit(page, 'fam-cell', 8)
    await runAndEnd(page)
    const h = [2, 1, 5, 6, 2, 3, 6, 6]
    let best = 0
    for (let i = 0; i < h.length; i++) for (let j = i; j < h.length; j++) best = Math.max(best, Math.min(...h.slice(i, j + 1)) * (j - i + 1))
    expect(await resultOf(page)).toEqual([best])
    const area = (await cells(page, 'area')).map(Number).filter((x) => !Number.isNaN(x))
    expect(Math.max(...area)).toBe(best)
  })
  test('part 1 result: next-greater indices equal the reference (found by stepping to the end of part 1)', async ({ page }) => {
    await open(page, demo('mono-stack'))
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    const ok = await nextUntil(page, async () => (await page.getByTestId('fam-op').textContent()) === '下一个更大' && (await page.getByTestId('fam-result').count()) > 0)
    expect(ok).toBe(true)
    const a = [2, 1, 5, 6, 2, 3, 6, 6]
    const want = a.map((x, i) => {
      for (let j = i + 1; j < a.length; j++) if (a[j]! > x) return j
      return -1
    })
    expect(await resultOf(page)).toEqual(want)
  })
})

test.describe('ADV-17 monotonic queue', () => {
  test('1366: window maxima row in the scene equals the brute-force sliding maximum', async ({ page }) => {
    await open(page, demo('mono-queue'))
    await sceneAudit(page, 'fam-cell', 10)
    await runAndEnd(page)
    const a = [1, 3, -1, -3, 5, 3, 6, 7, 2, 2]
    const k = 3
    const want: number[] = []
    for (let i = 0; i + k <= a.length; i++) want.push(Math.max(...a.slice(i, i + k)))
    expect(nums(await cells(page, 'out'))).toEqual(want)
  })
  test('k > n is rejected', async ({ page }) => {
    await open(page, demo('mono-queue'))
    await edit(page, 'k', '99')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-18 topological sort', () => {
  test('1366: default DAG — painted order is a permutation with every edge forward, status 1', async ({ page }) => {
    await open(page, demo('topo'))
    await sceneAudit(page, 'fam-node', 6)
    await runAndEnd(page)
    const [status, ...order] = await resultOf(page)
    expect(status).toBe(1)
    expect([...order].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5])
    const pos = new Map(order.map((v, i) => [v, i]))
    for (const [u, v] of [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]] as const) expect(pos.get(u)!, `${u}->${v}`).toBeLessThan(pos.get(v)!)
    await expect(page.locator('[data-testid="fam-node"][data-mark="warn"]')).toHaveCount(0)
  })
  test('a cycle is reported honestly: status 0, only node 0 processed, nodes 1 and 2 flagged as stuck', async ({ page }) => {
    await open(page, demo('topo'))
    await edit(page, 'n', '3')
    await edit(page, 'edges', '0 1, 1 2, 2 1')
    await runAndEnd(page)
    expect(await resultOf(page)).toEqual([0, 0])
    const stuck = await page.locator('[data-testid="fam-node"][data-mark="warn"]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-node')!))
    expect(stuck.sort()).toEqual([1, 2])
    await expect(page.getByTestId('viz-banner-text')).toContainText('有环')
  })
  test('edge endpoint out of range is rejected', async ({ page }) => {
    await open(page, demo('topo'))
    await edit(page, 'edges', '0 9')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('超出')
  })
})

test.describe('ADV-19 LCA (binary lifting)', () => {
  test('1366: answers equal the parent-walk reference', async ({ page }) => {
    await open(page, demo('lca'))
    await sceneAudit(page, 'fam-node', 8)
    await runAndEnd(page)
    const par = [0, 0, 1, 1, 2, 2, 4]
    const chain = (x: number) => {
      const s = [x]
      while (x !== 0) s.push((x = par[x - 1]!))
      return s
    }
    const qs: [number, number][] = [[3, 6], [5, 7], [3, 4], [7, 7]]
    const want = qs.map(([u, v]) => {
      const cu = new Set(chain(u))
      return chain(v).find((x) => cu.has(x))!
    })
    expect(await resultOf(page)).toEqual(want)
  })
  test('parent not smaller than child is rejected with the reason', async ({ page }) => {
    await open(page, demo('lca'))
    await edit(page, 'par', '0 5 1')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('必须小于')
  })
})

test.describe('ADV-20 LIS', () => {
  test('1366: recovered sequence is a strictly increasing subsequence whose length equals the O(n²) dp', async ({ page }) => {
    await open(page, demo('lis'))
    await sceneAudit(page, 'fam-cell', 8)
    await runAndEnd(page)
    const a = [10, 9, 2, 5, 3, 7, 101, 18]
    const d = a.map(() => 1)
    for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j]! < a[i]!) d[i] = Math.max(d[i]!, d[j]! + 1)
    const [len, ...seq] = await resultOf(page)
    expect(len).toBe(Math.max(...d))
    expect(seq).toHaveLength(len!)
    for (let i = 1; i < seq.length; i++) expect(seq[i - 1]!).toBeLessThan(seq[i]!)
    let p = 0
    for (const x of a) if (p < seq.length && x === seq[p]) p++
    expect(p).toBe(seq.length)
  })
  test('equal elements do not extend: [2 2 2] has length 1', async ({ page }) => {
    await open(page, demo('lis'))
    await edit(page, 'arr', '2 2 2')
    await runAndEnd(page)
    expect(await resultOf(page)).toEqual([1, 2])
  })
})

test.describe('ADV-21 number theory', () => {
  test('1366: primes, and (stepping) the exgcd identity, fast power and inverse shown in the scene equal brute force', async ({ page }) => {
    await open(page, demo('number-theory'))
    await sceneAudit(page, 'fam-cell', 5)
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    const at = async (op: string) => nextUntil(page, async () => (await page.getByTestId('fam-op').textContent()) === op && (await page.getByTestId('viz-banner-text').textContent())!.includes('返回'))
    expect(await at('扩展欧几里得')).toBe(true)
    const [g, x, y] = nums(await cells(page, 'r')) as number[]
    expect(g).toBe(1)
    expect(7 * x! + 40 * y!).toBe(g)
    expect(await nextUntil(page, async () => (await page.getByTestId('viz-banner-text').textContent())!.includes('7^13 mod 1000'))).toBe(true)
    let p = 1
    for (let i = 0; i < 13; i++) p = (p * 7) % 1000
    await expect(page.locator('[data-testid="fam-scalar"][data-key="pow"]')).toHaveAttribute('data-value', String(p))
    expect(await nextUntil(page, async () => (await page.locator('[data-testid="fam-scalar"][data-key="inv"]').count()) > 0)).toBe(true)
    const inv = Number(await page.locator('[data-testid="fam-scalar"][data-key="inv"]').getAttribute('data-value'))
    expect((7 * inv) % 40).toBe(1)
    const end = page.getByRole('slider', { name: '步骤进度' })
    await end.focus()
    await page.keyboard.press('End')
    const primes = [...Array(29).keys()].map((k) => k + 2).filter((q) => [...Array(q).keys()].slice(2).every((dv) => q % dv))
    expect(await resultOf(page)).toEqual(primes)
  })
  test('no inverse exists: a=6, b=9 reports −1, never a fake number', async ({ page }) => {
    await open(page, demo('number-theory'))
    await edit(page, 'a', '6')
    await edit(page, 'b', '9')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    expect(await nextUntil(page, async () => (await page.locator('[data-testid="fam-scalar"][data-key="inv"]').count()) > 0)).toBe(true)
    await expect(page.locator('[data-testid="fam-scalar"][data-key="inv"]')).toHaveAttribute('data-value', '-1')
    await expect(page.getByTestId('viz-banner-text')).toContainText('逆元不存在')
  })
  test('b = 0 (modulus) is rejected', async ({ page }) => {
    await open(page, demo('number-theory'))
    await edit(page, 'b', '0')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})
