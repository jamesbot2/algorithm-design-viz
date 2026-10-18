/**
 * V32 — rail + catalog popover contract (happy-dom default viewport 1024px → desktop rail).
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { chapters } from '../../src/data/chapters'
import { algorithms } from '../../src/algorithms'

function renderApp(hash: string) {
  window.history.replaceState(null, '', '/algorithm-design-viz/')
  window.location.hash = hash
  return render(<App />)
}

describe('V32 nav rail', () => {
  afterEach(() => cleanup())

  it('collapsed rail renders only named entries; no algorithm links or dot labels in the rail', async () => {
    renderApp('#/algo/lcs')
    const aside = await screen.findByTestId('app-sidebar')
    expect(aside.querySelectorAll('.nav-algo').length).toBe(0)
    expect(aside.querySelectorAll('.nav-dot, .nav-mod-label').length).toBe(0)
    const named = [...aside.querySelectorAll('a,button')].map((e) => e.getAttribute('aria-label'))
    // not a pinned icon count: every entry has a name, is a real link/button, and the required entries exist once each
    expect(named.every((n) => !!n && n.trim().length > 0)).toBe(true)
    for (const n of ['全部算法', '算法目录', '高阶算法', '练习台', '实验台', '实验讲义']) expect(named.filter((x) => x === n), n).toHaveLength(1)
    expect(named.indexOf('全部算法')).toBeLessThan(named.indexOf('算法目录'))
    expect(named.indexOf('算法目录')).toBeLessThan(named.indexOf('高阶算法'))
  })

  it('catalog entry opens a dialog with search focused, current page marked; Esc returns focus', async () => {
    const user = userEvent.setup()
    renderApp('#/algo/lcs')
    const entry = await screen.findByTestId('catalog-entry')
    await user.click(entry)
    const pop = screen.getByRole('dialog', { name: '算法目录' })
    expect(document.activeElement).toBe(screen.getAllByTestId('algo-search').at(-1))
    expect(pop.querySelector('[aria-current="page"]')?.textContent).toBe('最长公共子序列 (LCS)')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(entry)
  })

  it('groupings are exclusive tabs (no duplicated course list) and search filters', async () => {
    const user = userEvent.setup()
    renderApp('#/algo/lcs')
    await user.click(await screen.findByTestId('catalog-entry'))
    const pop = screen.getByRole('dialog')
    const chapterTab = screen.getByRole('button', { name: '按章节' })
    await user.click(chapterTab)
    expect(chapterTab.getAttribute('aria-pressed')).toBe('true')
    // exactly the chapter list — the by-idea list is not rendered alongside it (V31 rendered both)
    const links = pop.querySelectorAll('a.nav-algo:not(.is-notes):not([href*="/advanced"])').length
    expect(links).toBe(chapters.reduce((n, c) => n + c.algos.filter((a) => algorithms[a]).length, 0))
    expect(pop.querySelectorAll('a.nav-algo.is-notes').length).toBe(chapters.length)
    await user.type(screen.getByTestId('algo-search'), '归并')
    expect([...pop.querySelectorAll('a.nav-algo')].map((a) => a.textContent)).toContain('归并排序')
    expect(pop.querySelectorAll('a.nav-algo').length).toBeLessThan(5)
  })
})
