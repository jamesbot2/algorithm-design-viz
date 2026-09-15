import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PlaybackTransport from '../../src/components/workbench/PlaybackTransport'
import { generateSteps as bubble } from '../../src/algorithms/bubbleSort'
import { eventPhaseSegments, teachableStages, segmentGeometry } from '../../src/utils/teachableStages'

describe('UI-01 PlaybackTransport phase jump bound', () => {
  it('does not render one jump button per compare/swap segment', () => {
    const steps = bubble([5, 2, 8, 1, 9, 3, 7])
    const events = eventPhaseSegments(steps)
    const { direct } = teachableStages(steps, 8)
    const n = steps.length
    const trackSegs = direct.map((s) => {
      const g = segmentGeometry(s.start, s.end, n)
      return { ...s, leftPct: g.leftPct, widthPct: g.widthPct }
    })

    render(
      <PlaybackTransport
        idx={0}
        max={n - 1}
        stepsLen={n}
        playing={false}
        playPulse={false}
        speed={600}
        phase="init"
        progress={0}
        segments={trackSegs}
        teachableStages={direct}
        scrubPreview={null}
        onReset={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onTogglePlay={vi.fn()}
        onSpeed={vi.fn()}
        onSeek={vi.fn()}
        onScrubPreview={vi.fn()}
      />,
    )

    const jump = screen.getByTestId('phase-jump')
    const buttons = within(jump).getAllByRole('button')
    expect(buttons.length).toBeLessThanOrEqual(8)
    expect(buttons.length).toBeLessThan(events.length)
    expect(buttons.length).toBe(direct.length)

    // Track last segment must not overflow
    const track = screen.getByTestId('phase-track')
    const segs = track.querySelectorAll('[data-phase]')
    segs.forEach((el) => {
      const left = parseFloat((el as HTMLElement).style.left)
      const width = parseFloat((el as HTMLElement).style.width)
      expect(left + width).toBeLessThanOrEqual(100.01)
    })
  })
})
