/**
 * A1 regression: parent onStepIndexChange must NOT feed seek/init and auto-pause playback.
 * Mount parent + Visualizer, play, advance ≥5 steps without auto-pause.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import { useCallback, useState } from 'react'
// V23: Visualizer no longer owns the player — mount the production composition.
import Visualizer, { type SeekCommand } from './helpers/PlayerHarness'
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

/**
 * Parent mirrors the FIXED contract:
 * - onStepIndexChange is notify-only (updates cursor, never seekCommand)
 * - seekCommand only on explicit external seek / new run
 */
function ParentFixed({ steps }: { steps: Step[] }) {
  const [cursor, setCursor] = useState(0)
  const [seekCommand] = useState<SeekCommand | null>(null)
  const [runId] = useState('run-test-1')
  const onStep = useCallback((idx: number) => {
    setCursor(idx)
    // Intentionally do NOT set seekCommand here — that was the bug
  }, [])
  return (
    <div>
      <span data-testid="parent-cursor">{cursor}</span>
      <Visualizer
        steps={steps}
        seekCommand={seekCommand}
        runId={runId}
        onStepIndexChange={onStep}
      />
    </div>
  )
}

describe('A1 credible playback — no auto-pause from cursor feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('plays and advances at least 5 steps without auto-pause', () => {
    const steps = makeSteps(20)
    render(
      <MotionProvider>
        <ParentFixed steps={steps} />
      </MotionProvider>,
    )

    const play = screen.getByTestId('play-btn')
    // V6 UI-10: idle primary is「开始演示」; keep pause assertion
    expect(play.textContent).toMatch(/开始演示|播放|继续/)
    fireEvent.click(play)
    expect(play.textContent).toMatch(/暂停/)
    expect(document.querySelector('.visualizer')?.getAttribute('data-playing')).toBe('1')

    // Advance simulated playback: speed default ~600ms feel
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(800)
      })
    }

    const playing = document.querySelector('.visualizer')?.getAttribute('data-playing')
    const idx = Number(document.querySelector('.visualizer')?.getAttribute('data-step-index'))
    expect(playing).toBe('1')
    expect(idx).toBeGreaterThanOrEqual(5)
    expect(Number(screen.getByTestId('parent-cursor').textContent)).toBeGreaterThanOrEqual(5)
  })

  it('notify-only parent does not pause when cursor updates', () => {
    const steps = makeSteps(12)
    render(
      <MotionProvider>
        <ParentFixed steps={steps} />
      </MotionProvider>,
    )
    fireEvent.click(screen.getByTestId('play-btn'))
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(document.querySelector('.visualizer')?.getAttribute('data-playing')).toBe('1')
  })
})
