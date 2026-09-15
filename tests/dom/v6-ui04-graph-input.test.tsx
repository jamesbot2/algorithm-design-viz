import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GraphInput from '../../src/components/graph/GraphInput'
import type { GraphDraft } from '../../src/core/graph/types'

const base: GraphDraft = {
  n: 3,
  start: 0,
  directed: true,
  edges: [
    [0, 1, 1],
    [1, 2, 2],
  ],
}

describe('UI-04 GraphInput controlled draft', () => {
  it('illegal edge text does not keep previous edges runnable', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onValidity = vi.fn()
    render(
      <GraphInput algoId="dijkstra" value={base} onChange={onChange} onValidityChange={onValidity} />,
    )
    expect(screen.getByText(/图校验通过/)).toBeTruthy()

    const ta = screen.getByRole('textbox', { name: /边列表/ })
    await user.clear(ta)
    await user.type(ta, 'not valid edges')

    const lastValidity = onValidity.mock.calls.at(-1)?.[0]
    expect(lastValidity?.parseOk).toBe(false)
    expect(lastValidity?.canRun).toBe(false)
    expect(screen.queryByText(/图校验通过/)).toBeNull()
    expect(screen.getByRole('alert')).toBeTruthy()

    const lastDraft = onChange.mock.calls.at(-1)?.[0] as GraphDraft
    expect(lastDraft.edges).toEqual([])
  })

  it('emptying n while typing does not snap back to 1', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<GraphInput algoId="dijkstra" value={base} onChange={onChange} />)
    const nInput = screen.getByLabelText(/顶点数/) as HTMLInputElement
    await user.clear(nInput)
    expect(nInput.value).toBe('')
    expect(nInput.value).not.toBe('1')
  })

  it('external restore defaults syncs edge textarea via syncKey', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <GraphInput algoId="dijkstra" value={base} onChange={onChange} syncKey="k0" />,
    )
    const ta = screen.getByRole('textbox', { name: /边列表/ }) as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: '0 1 9' } })

    const restored: GraphDraft = {
      n: 4,
      start: 0,
      directed: true,
      edges: [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
      ],
    }
    rerender(
      <GraphInput algoId="dijkstra" value={restored} onChange={onChange} syncKey="restore-1" />,
    )
    const ta2 = screen.getByRole('textbox', { name: /边列表/ }) as HTMLTextAreaElement
    expect(ta2.value).toContain('0 1 1')
    expect(ta2.value).toContain('2 3 1')
  })
})
