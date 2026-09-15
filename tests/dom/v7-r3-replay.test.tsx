/**
 * V7 R3 — replay seeks 0 and plays; pause+continue does not; no re-solve.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import Visualizer from '../../src/components/Visualizer'
import type { Step } from '../../src/types/step'
import { MotionProvider } from '../../src/theme/MotionContext'

function makeSteps(n: number): Step[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    message: `step ${i}`,
    vars: { i },
    phase: i === 0 ? 'init' : i === n - 1 ? 'done' : 'work',
  }))
}

describe('V7 R3 replay', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('multi-step to end → replay → first at 0 then advances', () => {
    const steps = makeSteps(5)
    render(
      <MotionProvider>
        <Visualizer steps={steps} runId="r1" />
      </MotionProvider>,
    )
    const root = () => document.querySelector('.visualizer')!
    // Jump to end
    fireEvent.change(screen.getByRole('slider', { name: /步骤进度/ }), { target: { value: '4' } })
    expect(root().getAttribute('data-step-index')).toBe('4')
    const play = screen.getByTestId('play-btn')
    expect(play.textContent).toMatch(/重新播放/)
    fireEvent.click(play)
    expect(root().getAttribute('data-step-index')).toBe('0')
    expect(root().getAttribute('data-playing')).toBe('1')
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(Number(root().getAttribute('data-step-index'))).toBeGreaterThan(0)
  })

  it('pause + continue does not seek 0', () => {
    const steps = makeSteps(10)
    render(
      <MotionProvider>
        <Visualizer steps={steps} runId="r2" />
      </MotionProvider>,
    )
    fireEvent.change(screen.getByRole('slider', { name: /步骤进度/ }), { target: { value: '4' } })
    fireEvent.click(screen.getByTestId('play-btn')) // 继续 from 4
    expect(document.querySelector('.visualizer')!.getAttribute('data-step-index')).toBe('4')
    expect(document.querySelector('.visualizer')!.getAttribute('data-playing')).toBe('1')
  })

  it('0-frame / empty does not spin; 1-frame completes', () => {
    const { rerender } = render(
      <MotionProvider>
        <Visualizer steps={[]} runId="empty" />
      </MotionProvider>,
    )
    fireEvent.click(screen.getByTestId('play-btn'))
    expect(document.querySelector('.visualizer')!.getAttribute('data-playing')).toBe('0')

    rerender(
      <MotionProvider>
        <Visualizer steps={makeSteps(1)} runId="one" />
      </MotionProvider>,
    )
    fireEvent.click(screen.getByTestId('play-btn'))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(document.querySelector('.visualizer')!.getAttribute('data-playing')).toBe('0')
  })

  it('preview button does not claim 生成并演示', () => {
    const preview: Step[] = [
      { id: -1, message: 'preview', phase: 'preview', vars: { ready: true } },
    ]
    render(
      <MotionProvider>
        <Visualizer steps={preview} runId="preview" />
      </MotionProvider>,
    )
    expect(screen.getByTestId('play-btn').textContent).not.toMatch(/生成并演示/)
    expect(screen.getByTestId('play-btn').textContent).toMatch(/请先运行/)
  })
})
