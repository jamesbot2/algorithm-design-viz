/**
 * 高阶算法 — STL labs (C++ only, built-in operation model). Real mouse/keyboard, full HTTP app, retries 0.
 * Expected values are computed HERE by independent JS references and compared with the numbers painted in the main scene.
 */
import { test, expect, type Page } from '@playwright/test'
import { open, runAndEnd as runEnd, sceneAudit, cells } from './adv-helpers'

test.describe.configure({ retries: 0 })

/** run, jump to the last frame, and require every painted cell to be visibly inside the scene box */
async function runAndEnd(page: Page) {
  await runEnd(page)
  await sceneAudit(page, 'fam-cell', 1)
}
const demo = (id: string) => `#/advanced/stl/${id}?view=demo`
const NOTICE = '演示运行本站内置的操作模型；右侧为参考代码。本页不会执行用户任意编辑的 C++ 源码。'
const filled = (xs: string[]) => xs.filter((x) => x !== '' && x !== '░')
const scalar = async (page: Page, key: string) => await page.locator(`[data-testid="fam-scalar"][data-key="${key}"]`).getAttribute('data-value')
const banner = async (page: Page) => (await page.getByTestId('viz-banner-text').textContent()) ?? ''
async function edit(page: Page, key: string, value: string) {
  if (!(await page.getByTestId(`adv-input-${key}`).isVisible())) await page.getByTestId('input-edit-toggle').click()
  await page.getByTestId(`adv-input-${key}`).fill(value)
}
/** the final frame is the summary; the last operation's result is painted on the frame before it */
async function stepBack(page: Page) {
  await page.getByRole('slider', { name: '步骤进度' }).focus()
  await page.keyboard.press('ArrowLeft')
}
async function notice(page: Page) {
  await expect(page.getByTestId('stl-notice')).toHaveText(NOTICE)
}

test.describe('ADV-22 STL labs: defaults, real scene values', () => {
  test('vector: default draft ends in an honest stop; size / cap in the scene follow the doubling rule', async ({ page }) => {
    await open(page, demo('stl-vector'))
    await notice(page)
    await sceneAudit(page, 'fam-cell', 3)
    await runAndEnd(page)
    // it 1; use; push 4 (size 3 == cap 3 → reallocate, cap 6); use → stopped BEFORE the call
    expect(await scalar(page, 'size')).toBe('4')
    expect(await scalar(page, 'cap')).toBe('6')
    expect(await banner(page)).toContain('未定义行为')
    expect(filled(await cells(page, 'slots')).slice(0, 4)).toEqual(['1', '2', '3', '4'])
  })
  test('vector: reserve first keeps the iterator valid → no stop, final size / cap match the reference', async ({ page }) => {
    await open(page, demo('stl-vector'))
    await edit(page, 'ops', 'reserve 8; it 1; push 4; use; resize 7; shrink')
    await runAndEnd(page)
    expect(await banner(page)).not.toContain('未定义行为')
    // arr [1,2,3] → reserve 8 → push 4 → size 4 cap 8 → resize 7 (≤ cap, no realloc) → shrink: cap = size = 7
    expect(await scalar(page, 'size')).toBe('7')
    expect(await scalar(page, 'cap')).toBe('7')
    expect(filled(await cells(page, 'slots'))).toEqual(['1', '2', '3', '4', '0', '0', '0'])
  })
  test('deque: final slots equal an array reference; popping an empty deque stops before the call', async ({ page }) => {
    await open(page, demo('stl-deque'))
    await notice(page)
    await runAndEnd(page)
    const d = [1, 2, 3]
    d.push(4)
    d.unshift(0)
    d.shift()
    d.pop()
    d.pop()
    d.unshift(9)
    expect(filled(await cells(page, 'slots'))).toEqual(d.map(String))
    expect(await scalar(page, 'size')).toBe(String(d.length))
    await edit(page, 'arr', '')
    await edit(page, 'ops', 'popf')
    await runAndEnd(page)
    expect(await banner(page)).toContain('未定义行为')
    expect(filled(await cells(page, 'slots'))).toEqual([])
  })
  test('unique: sort + unique + erase leaves the distinct values; size() only shrinks at the erase step', async ({ page }) => {
    await open(page, demo('stl-unique'))
    await notice(page)
    await runAndEnd(page)
    const a = [1, 1, 2, 2, 2, 3, 1, 1]
    const want = [...new Set(a)].sort((x, y) => x - y)
    expect(filled(await cells(page, 'a'))).toEqual(want.map(String))
    // the frame before the last (the unique result, before erase) still shows the full size
    await page.getByRole('slider', { name: '步骤进度' }).focus()
    await page.keyboard.press('ArrowLeft')
    expect(await page.getByTestId('viz-banner-text').textContent()).toContain('size() 仍然是 8')
  })
  test('set / multiset / map: map[] inserts on read, multiset erase(value) removes all copies', async ({ page }) => {
    await open(page, demo('stl-set-map'))
    await notice(page)
    await runAndEnd(page)
    // reference of the default ops
    const S = new Set<number>()
    let M: number[] = []
    const P = new Map<number, number>()
    for (const o of 'sins 5; sins 5; sins 9; mins 3; mins 3; mdel1 3; mapget 7; mapinc 7; mapfind 8; mdel 3'.split('; ')) {
      const [t, x] = [o.split(' ')[0]!, Number(o.split(' ')[1])]
      if (t === 'sins') S.add(x)
      else if (t === 'mins') M.push(x)
      else if (t === 'mdel1') M.splice(M.indexOf(x), 1)
      else if (t === 'mdel') M = M.filter((y) => y !== x)
      else if (t === 'mapget') P.set(x, P.get(x) ?? 0)
      else if (t === 'mapinc') P.set(x, (P.get(x) ?? 0) + 1)
    }
    expect(filled(await cells(page, 'S'))).toEqual([...S].sort((a, b) => a - b).map(String))
    expect(filled(await cells(page, 'M'))).toEqual(M.length ? M.map(String) : ['空'])
    expect(filled(await cells(page, 'P'))).toEqual([...P].map(([k, v]) => `${k}→${v}`))
    expect(await scalar(page, 'np')).toBe('1')
  })
  test('string / pair / tuple: final string, size and the npos report equal the reference', async ({ page }) => {
    await open(page, demo('stl-string'))
    await notice(page)
    await runAndEnd(page)
    let s = 'abcab' + 'ab'
    s = s.slice(2)
    s = s.slice(0, 2) + 'xy' + s.slice(2)
    expect(filled(await cells(page, 'chars')).join('')).toBe(s)
    expect(await scalar(page, 'size')).toBe(String(s.length))
    await edit(page, 'ops', 'find zz')
    await runAndEnd(page)
    await stepBack(page)
    expect(await scalar(page, 'r')).toBe('npos')
    await edit(page, 'ops', 'sub 9 1')
    await runAndEnd(page)
    expect(await banner(page)).toContain('out_of_range')
  })
  test('algorithms: final array and last result equal the reference (next_permutation, srt, rotate, greater sort)', async ({ page }) => {
    await open(page, demo('stl-algo'))
    await notice(page)
    await runAndEnd(page)
    // [3,1,2] → rsrt = [3,2,1]; mx → index of the first maximum
    const v = [3, 2, 1]
    expect(filled(await cells(page, 'v'))).toEqual(v.map(String))
    await stepBack(page)
    expect(await scalar(page, 'r')).toBe(String(v.indexOf(Math.max(...v))))
    await edit(page, 'ops', 'lbd 2')
    await runAndEnd(page)
    expect(await banner(page)).toContain('未定义行为') // lower_bound on an unsorted array is refused, not simulated
  })
  test('numeric / bitset: array and the 16 painted bits equal the reference', async ({ page }) => {
    await open(page, demo('stl-numeric'))
    await notice(page)
    await runAndEnd(page)
    expect(filled(await cells(page, 'v'))).toEqual(['5', '6', '7', '8'])
    let bits = 0
    bits |= 1 << 3
    bits ^= 1
    bits = (bits << 2) & 0xffff
    expect((await cells(page, 'b')).join('')).toBe(bits.toString(2).padStart(16, '0'))
  })
  test('comparators: first/second rows equal a reference lexicographic descending sort', async ({ page }) => {
    await open(page, demo('stl-comparator'))
    await notice(page)
    await runAndEnd(page)
    const p: [number, number][] = [[2, 5], [1, 5], [2, 3], [1, 9]]
    p.sort((a, b) => b[0] - a[0] || b[1] - a[1])
    expect(filled(await cells(page, 'f'))).toEqual(p.map((x) => String(x[0])))
    expect(filled(await cells(page, 's'))).toEqual(p.map((x) => String(x[1])))
    await edit(page, 'ops', 'sfirst; ssecd')
    await runAndEnd(page)
    const q: [number, number][] = [[2, 5], [1, 5], [2, 3], [1, 9]]
    q.sort((a, b) => a[0] - b[0]) // stable
    q.sort((a, b) => b[1] - a[1]) // stable
    expect(filled(await cells(page, 's'))).toEqual(q.map((x) => String(x[1])))
    expect(filled(await cells(page, 'f'))).toEqual(q.map((x) => String(x[0])))
  })
})

test.describe('ADV-23 STL labs: contract', () => {
  for (const id of ['stl-vector', 'stl-deque', 'stl-unique', 'stl-set-map', 'stl-string', 'stl-algo', 'stl-numeric', 'stl-comparator']) {
    test(`${id}: only C++ is offered, unknown ops are rejected with a field error and no solve happens`, async ({ page }) => {
      await open(page, demo(id))
      await notice(page)
      const opts = page.getByTestId('language-select')
      if (await opts.count()) await expect(opts.locator('option')).toHaveCount(1)
      await edit(page, id === 'stl-unique' ? 'mode' : 'ops', 'system ls')
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('adv-errors')).toBeVisible()
      await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
    })
  }
})
