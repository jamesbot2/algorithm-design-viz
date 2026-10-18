/**
 * 高阶算法 P1 — real mouse/keyboard on the full HTTP app. No force/evaluate(click)/pre-scroll/retries.
 * Expected values come from independent references written in THIS file (not read back from the app).
 * page.evaluate is READ-ONLY (state probes).
 */
import { test, expect, type Page } from '@playwright/test'

test.describe.configure({ retries: 0 })

async function open(page: Page, hash: string, vp = { width: 1366, height: 768 }) {
  await page.setViewportSize(vp)
  await page.addInitScript(() => {
    localStorage.setItem('adv-lab-theme', 'lab-dark')
  })
  await page.goto(hash)
  await expect(page.getByTestId('app-sidebar')).toBeAttached()
  await injectFault(page)
}

/**
 * [FI] fault injection (env ADV_FAULT) — the SAME detectors run against a deliberately broken page so each
 * detector is proven to fail:  hide-tree (main scene hidden, data kept) | nav-keys (nav keystrokes forwarded to the player).
 */
async function injectFault(page: Page) {
  const f = process.env.ADV_FAULT
  if (!f) return
  await page.evaluate((fault) => {
    if (fault === 'hide-tree') {
      const st = document.createElement('style')
      st.textContent = '[data-testid="adv-scene"]{visibility:hidden!important} [data-testid="dsu-forest"],[data-testid="fw-tree"],[data-testid="heap-tree"]{display:none!important}'
      document.head.appendChild(st)
    }
    if (fault === 'nav-keys') {
      document.addEventListener(
        'keydown',
        (e) => {
          const t = e.target as HTMLElement | null
          if (t?.closest('#app-sidebar')) {
            const viz = document.querySelector('[data-testid="visualizer"]')
            viz?.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, code: e.code, bubbles: true }))
            window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, code: e.code, bubbles: true }))
          }
        },
        true,
      )
    }
  }, f)
}

/** The main scene must be PAINTED and carry the structure: every node visible and inside the scene box (not just present in the DOM). */
async function sceneAudit(page: Page, nodeTestId: string, expectedCount: number) {
  const scene = page.getByTestId('adv-scene')
  await expect(scene).toBeVisible()
  const nodes = page.getByTestId(nodeTestId)
  await expect(nodes).toHaveCount(expectedCount)
  for (let i = 0; i < expectedCount; i++) await expect(nodes.nth(i)).toBeVisible()
  const sb = (await scene.boundingBox())!
  const bad = await nodes.evaluateAll(
    (els, box) =>
      els.filter((e) => {
        const r = e.getBoundingClientRect()
        return !(r.width > 2 && r.height > 2 && r.left >= box.x - 1 && r.right <= box.x + box.w + 1 && r.top >= box.y - 1 && r.bottom <= box.y + box.h + 1)
      }).length,
    { x: sb.x, y: sb.y, w: sb.width, h: sb.height },
  )
  expect(bad, `${nodeTestId}: nodes painted inside the scene`).toBe(0)
}

const attr = (page: Page, sel: string, a: string) => page.locator(sel).evaluateAll((els, name) => els.map((e) => e.getAttribute(name as string)), a)

async function runAndEnd(page: Page) {
  const before = Number((await page.getByTestId('adv-demo').getAttribute('data-solve-count')) ?? '0')
  await page.getByTestId('run-btn').click()
  await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', String(before + 1), { timeout: 20_000 })
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
  const slider = page.getByRole('slider', { name: '步骤进度' })
  await slider.focus()
  await page.keyboard.press('End')
}

// ---- independent references -------------------------------------------------------------
function refDsu(n: number, ops: string[]) {
  const p = Array.from({ length: n }, (_, i) => i)
  const sz = new Array<number>(n).fill(1)
  let comps = n
  const find = (x: number) => {
    let r = x
    while (p[r] !== r) r = p[r]!
    while (p[x] !== r) {
      const nx = p[x]!
      p[x] = r
      x = nx
    }
    return r
  }
  for (const op of ops) {
    const [k, a, b] = op.trim().split(/\s+/)
    if (k === 'find') find(+a!)
    else if (k === 'same') {
      find(+a!)
      find(+b!)
    } else {
      const ra = find(+a!)
      const rb = find(+b!)
      if (ra !== rb) {
        const [big, small] = sz[ra]! >= sz[rb]! ? [ra, rb] : [rb, ra]
        p[small] = big
        sz[big]! += sz[small]!
        comps--
      }
    }
  }
  return { parent: p, size: sz, comps }
}
function refBit(n: number, ops: string[]) {
  const t = new Array<number>(n + 1).fill(0)
  const a = new Array<number>(n).fill(0)
  const last: number[] = []
  const pre = (r: number) => {
    let s = 0
    for (let i = r; i > 0; i -= i & -i) s += t[i]!
    return s
  }
  for (const op of ops) {
    const [k, x, y] = op.trim().split(/\s+/)
    if (k === 'add') {
      a[+x!]! += +y!
      for (let i = +x! + 1; i <= n; i += i & -i) t[i]! += +y!
    } else if (k === 'prefix') last.push(pre(+x!))
    else last.push(pre(+y!) - pre(+x!))
  }
  return { tree: t, a, last }
}
function refHeap(ops: string[]) {
  const h: number[] = []
  for (const op of ops) {
    const m = /^(push|pop|top)\((-?\d*)\)$/.exec(op.trim())!
    if (m[1] === 'push') {
      h.push(+m[2]!)
      let i = h.length - 1
      while (i > 0 && h[(i - 1) >> 1]! < h[i]!) {
        ;[h[(i - 1) >> 1], h[i]] = [h[i]!, h[(i - 1) >> 1]!]
        i = (i - 1) >> 1
      }
    } else if (m[1] === 'pop') {
      const n = h.length
      ;[h[0], h[n - 1]] = [h[n - 1]!, h[0]!]
      h.pop()
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let c = l
        if (l >= h.length) break
        if (r < h.length && h[l]! < h[r]!) c = r
        if (h[i]! < h[c]!) {
          ;[h[i], h[c]] = [h[c]!, h[i]!]
          i = c
        } else break
      }
    }
  }
  return h
}
const DSU_OPS = 'union 0 1; union 2 3; union 0 2; find 3; union 4 5; union 6 7; union 4 6; union 0 4; same 3 7; union 1 7'
const FW_OPS = 'add 0 3; add 2 5; add 5 2; add 6 -1; prefix 6; range 2 6; add 3 4; range 0 8'
const PQ_OPS = 'push(5); push(9); push(3); push(9); push(12); top(); pop(); pop(); push(7); pop()'

test.describe('ADV-01 routes and entry', () => {
  for (const [name, vp] of [
    ['1366 rail', { width: 1366, height: 768 }],
    ['1920 expanded', { width: 1920, height: 1080 }],
  ] as const) {
    test(`${name}: single named 高阶算法 entry → /advanced, selected state, no second entry`, async ({ page }) => {
      await open(page, '#/', vp)
      const sb = page.getByTestId('app-sidebar')
      const entry = sb.getByRole('link', { name: '高阶算法', exact: true })
      await expect(entry).toHaveCount(1)
      await entry.click()
      await expect(page).toHaveURL(/#\/advanced$/)
      await expect(page.getByTestId('adv-home')).toBeVisible()
      await expect(sb.getByRole('link', { name: '高阶算法', exact: true })).toHaveAttribute('aria-current', 'page')
    })
  }

  test('390 mobile drawer: entry reachable, closes drawer on navigate', async ({ page }) => {
    await open(page, '#/', { width: 390, height: 844 })
    await page.getByTestId('menu-btn').click()
    await expect(page.locator('.app-shell')).toHaveAttribute('data-mobile-drawer', '1')
    await page.getByTestId('app-sidebar').getByRole('link', { name: '高阶算法', exact: true }).click()
    await expect(page).toHaveURL(/#\/advanced$/)
    await expect(page.locator('.app-shell')).toHaveAttribute('data-mobile-drawer', '0')
    await expect(page.getByTestId('adv-home')).toBeVisible()
  })

  test('home carries one compact entry; algorithm library count unchanged by it', async ({ page }) => {
    await open(page, '#/')
    await expect(page.getByTestId('home-advanced')).toBeVisible()
    await page.getByTestId('home-advanced-link').click()
    await expect(page).toHaveURL(/#\/advanced$/)
  })

  test('all seven routes render; unknown topic is a real not-found, not a blank page', async ({ page }) => {
    await open(page, '#/advanced')
    for (const [h, id] of [
      ['#/advanced/stl', 'adv-index-stl'],
      ['#/advanced/stl/stl-bounds', 'adv-topic'],
      ['#/advanced/algorithms', 'adv-index-algorithms'],
      ['#/advanced/algorithms/dsu', 'adv-topic'],
      ['#/advanced/templates', 'adv-index-templates'],
      ['#/advanced/templates/fenwick', 'adv-template'],
    ] as const) {
      await page.goto(h)
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await page.goto('#/advanced/algorithms/segtree')
    await expect(page.getByTestId('adv-notfound')).toBeVisible()
    await page.goto('#/advanced/stl/dsu') // wrong section
    await expect(page.getByTestId('adv-notfound')).toBeVisible()
  })

  test('old /algo/:id still works', async ({ page }) => {
    await open(page, '#/algo/lcs')
    await expect(page.getByTestId('run-btn')).toBeVisible()
  })
})

test.describe('ADV-02 search and catalog honesty', () => {
  for (const [q, id] of [
    ['树状数组', 'fenwick'],
    ['Fenwick', 'fenwick'],
    ['BIT', 'fenwick'],
    ['并查集', 'dsu'],
    ['dsu', 'dsu'],
    ['Union-Find', 'dsu'],
    ['lower_bound', 'stl-bounds'],
    ['堆', 'stl-priority-queue'],
  ] as const) {
    test(`module search "${q}" → ${id}`, async ({ page }) => {
      await open(page, '#/advanced')
      await page.getByTestId('adv-search').fill(q)
      await expect(page.getByTestId(`topic-${id}`)).toBeVisible()
    })
  }

  test('planned-only query shows no learnable card; roadmap lists it separately', async ({ page }) => {
    await open(page, '#/advanced')
    await page.getByTestId('adv-search').fill('强连通')
    await expect(page.getByTestId('adv-no-result')).toBeVisible()
    await expect(page.getByTestId('adv-results')).toHaveCount(0)
    await expect(page.getByTestId('adv-roadmap').getByText('强连通')).toBeVisible()
  })

  test('nav catalog search finds delivered advanced topics by alias (BIT) and by module word', async ({ page }) => {
    await open(page, '#/algo/lcs', { width: 1920, height: 1080 })
    const sb = page.getByTestId('app-sidebar')
    await sb.getByTestId('algo-search').fill('BIT')
    await expect(sb.getByRole('link', { name: '树状数组' })).toBeVisible()
    await sb.getByTestId('algo-search').fill('SCC')
    await expect(sb.getByRole('link', { name: '树状数组' })).toHaveCount(0)
  })

  test('every card on index pages is a delivered topic with capability chips', async ({ page }) => {
    await open(page, '#/advanced/algorithms')
    await expect(page.locator('[data-testid^="topic-"]')).toHaveCount(2)
    await page.getByTestId('topic-dsu').click()
    await expect(page.getByTestId('adv-caps')).toContainText('六语言')
  })
})

test.describe('ADV-03 DSU demo (main scene, real values)', () => {
  test('1366: run → end: forest nodes/parents/sizes/components match independent reference', async ({ page }) => {
    await open(page, '#/advanced/algorithms/dsu?view=demo')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
    await sceneAudit(page, 'dsu-node', 8) // preview already shows the 8 singleton trees, painted
    await runAndEnd(page)
    await sceneAudit(page, 'dsu-node', 8)
    const ref = refDsu(8, DSU_OPS.split(';'))
    const nodes = await page.locator('[data-testid="dsu-node"]').evaluateAll((els) => els.map((e) => ({ n: +e.getAttribute('data-node')!, p: +e.getAttribute('data-parent')!, s: +e.getAttribute('data-size')! })).sort((a, b) => a.n - b.n))
    expect(nodes.map((x) => x.p)).toEqual(ref.parent)
    expect(nodes.filter((x) => x.p === x.n).map((x) => x.s)).toEqual([ref.size[0]])
    await expect(page.getByTestId('dsu-components')).toHaveText(String(ref.comps))
    // the edges drawn in the SCENE are exactly the non-root parent links
    const edges = (await attr(page, '[data-testid="dsu-edge"]', 'data-child')).map(Number).sort((a, b) => a - b)
    expect(edges).toEqual(ref.parent.map((p, i) => (p === i ? -1 : i)).filter((i) => i >= 0))
  })

  test('step-by-step: after "union 0 1" step, node 1 hangs under 0 in the drawn scene (tie → second under first)', async ({ page }) => {
    await open(page, '#/advanced/algorithms/dsu?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    let linked = false
    for (let i = 0; i < 40 && !linked; i++) {
      await page.getByTestId('next-step-btn').click()
      linked = (await page.getByTestId('dsu-link').count()) > 0
    }
    expect(linked).toBe(true)
    await expect(page.getByTestId('dsu-link')).toHaveAttribute('data-child', '1')
    await expect(page.getByTestId('dsu-link')).toHaveAttribute('data-parent', '0')
  })

  test('invalid op is rejected with a position-bearing message; no extra solve; previous result not shown as new', async ({ page }) => {
    await open(page, '#/advanced/algorithms/dsu?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-ops').fill('union 0 1; frob 2 3')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('frob')
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
    await page.getByTestId('adv-input-ops').fill('union 0 9')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })

  test('language switch and pause do not re-solve; code anchors follow the step in every language', async ({ page }) => {
    await open(page, '#/advanced/algorithms/dsu?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    await page.getByTestId('next-step-btn').click()
    await page.getByTestId('next-step-btn').click()
    const idx = await page.getByTestId('visualizer').getAttribute('data-step-index')
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
    for (const l of ['python', 'cpp', 'java', 'rust', 'go', 'typescript']) {
      await page.getByTestId(l === 'typescript' ? 'tab-ts' : `tab-lang-${l}`).click()
      await expect(page.getByTestId('code-browser')).toHaveAttribute('data-language', l)
      await expect(page.getByTestId('code-browser')).toHaveAttribute('data-exec-state', 'mapped', { timeout: 15_000 })
      await expect(page.locator('.cm-exec-line')).toHaveCount(1)
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', idx!)
    }
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
  })
})

test.describe('ADV-04 Fenwick demo', () => {
  test('1366: tree nodes carry lowbit coverage; final tree and array equal the reference BIT', async ({ page }) => {
    await open(page, '#/advanced/algorithms/fenwick?view=demo')
    await sceneAudit(page, 'fw-node', 8)
    await runAndEnd(page)
    await sceneAudit(page, 'fw-node', 8)
    const ref = refBit(8, FW_OPS.split(';'))
    const nodes = await page.locator('[data-testid="fw-node"]').evaluateAll((els) => els.map((e) => ({ i: +e.getAttribute('data-i')!, v: +e.getAttribute('data-value')!, a: +e.getAttribute('data-from')!, b: +e.getAttribute('data-to')!, lb: +e.getAttribute('data-lowbit')! })).sort((x, y) => x.i - y.i))
    expect(nodes.map((x) => x.v)).toEqual(ref.tree.slice(1))
    for (const x of nodes) {
      expect(x.lb).toBe(x.i & -x.i)
      expect([x.a, x.b]).toEqual([x.i - (x.i & -x.i), x.i]) // 0-based half-open [i-lowbit, i)
    }
    const cells = (await attr(page, '[data-testid="fw-cell"]', 'data-value')).map(Number)
    expect(cells).toEqual(ref.a)
    await expect(page.getByTestId('fw-accum')).toHaveText(String(ref.last[ref.last.length - 1]))
  })

  test('half-open public range: "range 2 6" step highlights exactly array cells 2..5', async ({ page }) => {
    await open(page, '#/advanced/algorithms/fenwick?view=demo')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
    let hit = false
    for (let i = 0; i < 80 && !hit; i++) {
      await page.getByTestId('next-step-btn').click()
      hit = (await page.getByTestId('fw-query').count()) > 0 && (await page.getByTestId('fw-query').getAttribute('data-l')) === '2'
    }
    expect(hit).toBe(true)
    await expect(page.getByTestId('fw-query')).toHaveAttribute('data-r', '6')
    const inq = (await page.locator('[data-testid="fw-cell"][data-in-query="1"]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-index')!))).sort((a, b) => a - b)
    expect(inq).toEqual([2, 3, 4, 5])
  })
})

test.describe('ADV-05 priority_queue lab (C++ only, simulator notice)', () => {
  test('notice shown; final heap array/tree/top equal reference; languages are C++ only', async ({ page }) => {
    await open(page, '#/advanced/stl/stl-priority-queue?view=demo')
    await expect(page.getByTestId('stl-notice')).toHaveText('演示运行本站内置的操作模型；右侧为参考代码。本页不会执行用户任意编辑的 C++ 源码。')
    await expect(page.getByTestId('code-lang-switch').locator('button')).toHaveCount(1)
    await expect(page.getByTestId('tab-lang-cpp')).toHaveAttribute('aria-pressed', 'true')
    await runAndEnd(page)
    const ref = refHeap(PQ_OPS.split(';'))
    const cells = (await page.locator('[data-testid="heap-cell"][data-filled="1"]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-value')!)))
    expect(cells).toEqual(ref)
    await sceneAudit(page, 'heap-node', ref.length)
    const nodes = await page.locator('[data-testid="heap-node"]').evaluateAll((els) => els.map((e) => ({ i: +e.getAttribute('data-index')!, v: +e.getAttribute('data-value')! })).sort((a, b) => a.i - b.i))
    expect(nodes.map((x) => x.v)).toEqual(ref)
    await expect(page.getByTestId('heap-top')).toHaveAttribute('data-value', String(ref[0]))
    await expect(page.getByTestId('heap-size')).toHaveText(String(ref.length))
  })

  test('pop() on empty: run stops BEFORE the undefined operation with an explanation, no exec arrow on it', async ({ page }) => {
    await open(page, '#/advanced/stl/stl-priority-queue?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-ops').fill('push(1); pop(); pop(); push(2)')
    await runAndEnd(page)
    await expect(page.getByTestId('heap-stopped')).toBeVisible()
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-exec-state', 'preview')
    await expect(page.locator('.cm-exec-line')).toHaveCount(0)
    await expect(page.getByTestId('heap-size')).toHaveText('0')
  })

  test('only whitelisted ops: an expression is rejected, never evaluated', async ({ page }) => {
    await open(page, '#/advanced/stl/stl-priority-queue?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-ops').fill('push(1+2); alert(1)')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toBeVisible()
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-06 lower_bound / upper_bound lab', () => {
  test('lower → index 1 (first of the 2s); upper → 4; target beyond the end → end() = 8', async ({ page }) => {
    await open(page, '#/advanced/stl/stl-bounds?view=demo')
    await runAndEnd(page)
    await expect(page.getByTestId('bd-result')).toHaveAttribute('data-index', '1')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-mode').selectOption('upper')
    await runAndEnd(page)
    await expect(page.getByTestId('bd-result')).toHaveAttribute('data-index', '4')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-target').fill('14')
    await runAndEnd(page)
    await expect(page.getByTestId('bd-result')).toHaveAttribute('data-index', '8')
    await expect(page.getByTestId('bd-result')).toHaveAttribute('data-end', '1')
  })

  test('unsorted input is rejected with the precondition (no result drawn)', async ({ page }) => {
    await open(page, '#/advanced/stl/stl-bounds?view=demo')
    await page.getByTestId('input-edit-toggle').click()
    await page.getByTestId('adv-input-arr').fill('1, 5, 3, 4')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('adv-errors')).toContainText('非降序')
    await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '0')
  })
})

test.describe('ADV-07 template pages', () => {
  test('dsu: teach/contest, core/full, header, sample, counterexample, validation label, copy/export of what is shown', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, '#/advanced/templates/dsu')
    await expect(page.getByTestId('tpl-header')).toContainText('复杂度'.slice(0, 2))
    await expect(page.getByTestId('tpl-header')).toContainText('O(')
    await expect(page.getByTestId('tpl-counter')).toBeVisible()
    await expect(page.getByTestId('tpl-source')).toContainText('许可')
    // teach (six-language): switch to Rust, copy → clipboard equals displayed doc
    await page.getByTestId('tab-lang-rust').click()
    await expect(page.getByTestId('tpl-shown')).toHaveAttribute('data-lang', 'rust')
    await page.getByTestId('tpl-copy').click()
    await expect(page.getByTestId('tpl-msg')).toHaveText('已复制')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('fn ')
    expect(copied).not.toContain('@a:')
    // contest variant, core → full
    await page.getByTestId('variant-contest').click()
    await expect(page.getByTestId('tpl-contest-code')).toHaveAttribute('data-exec-state', 'reference')
    await expect(page.getByTestId('tpl-shown')).toHaveAttribute('data-lang', 'cpp')
    await expect(page.getByTestId('tpl-sample')).toHaveCount(0)
    await page.getByTestId('form-full').click()
    await expect(page.getByTestId('tpl-sample')).toBeVisible()
    await page.getByTestId('tpl-copy').click()
    const full = await page.evaluate(() => navigator.clipboard.readText())
    expect(full).toContain('int main')
    const dl = page.waitForEvent('download')
    await page.getByTestId('tpl-export').click()
    const d = await dl
    expect(d.suggestedFilename()).toBe('dsu_contest_full.cpp')
    await page.getByTestId('form-core').click()
    await page.getByTestId('tpl-copy').click()
    const core = await page.evaluate(() => navigator.clipboard.readText())
    expect(core).not.toContain('int main')
    expect(full.length).toBeGreaterThan(core.length)
  })

  test('stl templates are C++ only and keep the simulator-not-a-compiler honesty', async ({ page }) => {
    await open(page, '#/advanced/templates/stl-bounds')
    await expect(page.getByTestId('code-lang-switch').locator('button')).toHaveCount(1)
    await expect(page.getByTestId('variant-note')).toContainText('不会执行用户编辑')
  })

  test('back to demo from template returns to the topic demo', async ({ page }) => {
    await open(page, '#/advanced/templates/fenwick')
    await page.getByTestId('back-to-demo').click()
    await expect(page).toHaveURL(/#\/advanced\/algorithms\/fenwick\?view=demo$/)
    await expect(page.getByTestId('adv-demo')).toBeVisible()
  })
})

test.describe('ADV-08 representative flow, five viewports', () => {
  for (const vp of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1024, height: 600 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`${vp.width}x${vp.height}: enter → search → explain → demo → run/step → language → pause → back → template → demo`, async ({ page }) => {
      await open(page, '#/', vp)
      const narrow = vp.width <= 960
      if (narrow) {
        await page.getByTestId('menu-btn').click()
      }
      await page.getByTestId('app-sidebar').getByRole('link', { name: '高阶算法', exact: true }).click()
      await expect(page.getByTestId('adv-home')).toBeVisible()
      await page.getByTestId('adv-search').fill('BIT')
      await page.getByTestId('topic-fenwick').click()
      await expect(page.getByTestId('adv-content')).toBeVisible()
      await page.getByTestId('tab-demo').click()
      await expect(page.getByTestId('adv-demo')).toBeVisible()
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
      await page.getByTestId('next-step-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
      const scene = page.getByTestId('adv-scene')
      await expect(scene).toBeVisible()
      const box = await scene.boundingBox()
      expect(box!.width).toBeGreaterThan(150)
      expect(box!.height).toBeGreaterThan(60)
      await expect(page.getByTestId('fw-node').first()).toBeVisible()
      await page.getByTestId('play-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
      await page.getByTestId('play-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
      await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
      await page.goBack()
      await expect(page.getByTestId('adv-content')).toBeVisible()
      await page.getByTestId('tab-template').click()
      await expect(page.getByTestId('adv-template')).toBeVisible()
      await page.getByTestId('back-to-demo').click()
      await expect(page.getByTestId('adv-demo')).toBeVisible()
    })
  }
})

test.describe('ADV-09 keyboard ownership on the advanced demo page', () => {
  for (const vp of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    test(`${vp.width}: keys on a focused nav link / nav search do not drive the player`, async ({ page }) => {
      await open(page, '#/advanced/algorithms/dsu?view=demo', vp)
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
      await page.getByTestId('next-step-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
      const sb = page.getByTestId('app-sidebar')
      const link = sb.getByRole('link', { name: '全部算法', exact: true })
      await link.focus()
      await expect(link).toBeFocused()
      for (const k of ['ArrowRight', 'ArrowRight', ' ', 'ArrowLeft']) await page.keyboard.press(k)
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
      if (vp.width >= 1440) {
        const search = sb.getByTestId('algo-search')
        await search.click()
        await page.keyboard.type('  kk ')
        await page.keyboard.press('ArrowRight')
        await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
        await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
      }
    })
  }
})

test.describe('ADV-10 template headers are complete for every template', () => {
  for (const id of ['stl-bounds', 'stl-priority-queue', 'dsu', 'fenwick']) {
    test(`${id}: eight header fields, all non-empty, plus sample/counterexample/source`, async ({ page }) => {
      await open(page, `#/advanced/templates/${id}`)
      const dd = page.locator('[data-testid="tpl-header"] dd')
      await expect(dd).toHaveCount(8)
      const texts = await dd.allTextContents()
      expect(texts.every((t) => t.trim().length > 0), JSON.stringify(texts)).toBe(true)
      await expect(page.getByTestId('tpl-header')).toContainText('O(')
      await expect(page.getByTestId('tpl-counter')).toBeVisible()
      await expect(page.getByTestId('tpl-source')).toBeVisible()
      await page.getByTestId('variant-contest').click()
      await page.getByTestId('form-full').click()
      await expect(page.getByTestId('tpl-sample')).toBeVisible()
      await expect(page.getByTestId('tpl-contest-code')).toBeVisible()
    })
  }
})
