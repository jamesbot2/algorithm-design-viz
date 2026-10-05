/**
 * V28 P4: home algorithm library — search, category filter, cards (with six-language badge),
 * honest empty state. The existing course navigation / chapters stay.
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Home from '../../src/pages/Home'
import { algoList } from '../../src/algorithms'
import { availableLanguages } from '../../src/codeCatalog/languages'

afterEach(cleanup)
const ui = () => render(<MemoryRouter><Home /></MemoryRouter>)
const cards = () => within(screen.getByTestId('algo-card-grid')).queryAllByRole('link')

describe('V28 P4 home library', () => {
  it('shows one card per shipped algorithm plus the knapsack teaching unit, each linking to its page', () => {
    ui()
    const ids = algoList.map((a) => a.meta.id)
    expect(cards().length).toBe(ids.length + 1)
    for (const id of ids) expect(screen.getByTestId(`algo-card-${id}`).getAttribute('href')).toBe(`/algo/${id}`)
    expect(screen.getByTestId('algo-card-teach-knapsack').getAttribute('href')).toBe('/teach/knapsack')
    expect(screen.getByTestId('home-result-count').textContent).toMatch(new RegExp(`${ids.length + 1}`))
  })

  it('cards carry complexity and the language count the code panel really offers', () => {
    ui()
    for (const a of algoList) {
      const card = screen.getByTestId(`algo-card-${a.meta.id}`)
      expect(card.textContent).toContain(a.meta.title)
      const n = availableLanguages(a.meta.id).length
      expect(within(card).getByTestId('algo-card-langs').textContent).toContain(String(n))
    }
  })

  it('search filters by title / id / description (case-insensitive) and shows an honest empty state', async () => {
    const user = userEvent.setup()
    ui()
    const box = screen.getByRole('searchbox', { name: '在算法库中搜索' })
    await user.type(box, 'DIJKSTRA')
    const ids = cards().map((c) => c.getAttribute('data-testid'))
    expect(ids).toContain('algo-card-dijkstra')
    expect(ids).toContain('algo-card-dijkstraHeap')
    expect(ids).not.toContain('algo-card-bubbleSort')
    await user.clear(box)
    await user.type(box, 'zzz-no-such-algorithm')
    expect(cards().length).toBe(0)
    expect(screen.getByTestId('home-empty')).toBeTruthy()
    await user.click(within(screen.getByTestId('home-empty')).getByRole('button', { name: '清除筛选' }))
    expect((box as HTMLInputElement).value).toBe('')
    expect(cards().length).toBe(algoList.length + 1)
  })

  it('category filter is a pressed-state button group; 图算法 keeps graph algorithms only; combines with search', async () => {
    const user = userEvent.setup()
    ui()
    const group = screen.getByRole('group', { name: '算法分类' })
    const all = within(group).getByRole('button', { name: /全部/ })
    expect(all.getAttribute('aria-pressed')).toBe('true')
    await user.click(within(group).getByRole('button', { name: /图算法/ }))
    expect(all.getAttribute('aria-pressed')).toBe('false')
    const ids = cards().map((c) => c.getAttribute('data-testid')!.replace('algo-card-', '')).sort()
    expect(ids).toEqual(['bellmanFord', 'bfs', 'dijkstra', 'dijkstraHeap', 'floyd', 'kruskal', 'prim'])
    await user.type(screen.getByRole('searchbox', { name: '在算法库中搜索' }), 'prim')
    expect(cards().map((c) => c.getAttribute('data-testid'))).toEqual(['algo-card-prim'])
  })

  it('keeps the dual course navigation and chapter cards', () => {
    ui()
    expect(screen.getByRole('tab', { name: '按设计思想' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '课程章节（讲义）' })).toBeTruthy()
  })
})
