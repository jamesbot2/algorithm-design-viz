import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, cleanup, act } from '@testing-library/react'
import ArrayView from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'
// V23: mount the production player composition (controller + Visualizer + transport).
import Visualizer from './helpers/PlayerHarness'
import type { Step } from '../../src/types/step'

afterEach(() => cleanup())

describe('V10-04 manual next must not kill new FLIP', () => {
  it('ArrayView no longer clears transforms in a post-layout useEffect on transitionEpoch', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/ArrayView.tsx'), 'utf8')
    // Old bug: useEffect([transitionEpoch]) clearTransforms after useLayoutEffect created FLIP
    expect(src).not.toMatch(
      /useEffect\(\(\)\s*=>\s*\{[^}]*animToken\.current\s*\+=\s*1[^}]*clearTransforms\(\)[^}]*\}\s*,\s*\[[^\]]*transitionEpoch/,
    )
    // New: cancel-old vs create-new gated inside useLayoutEffect
    expect(src).toMatch(/epochChanged && !geometryChanged/)
    expect(src).toMatch(/lastCancelEpoch/)
  })

  it('Visualizer goNext/goPrev do not bump transitionEpoch (cancel reserved for pause/seek/run)', () => {
    // V23: the single controller moved out of Visualizer into usePlaybackController.
    const src = readFileSync(join(process.cwd(), 'src/components/workbench/usePlaybackController.ts'), 'utf8')
    // …and Visualizer must not keep a second cursor/timer.
    const viz = readFileSync(join(process.cwd(), 'src/components/Visualizer.tsx'), 'utf8')
    expect(viz).not.toMatch(/setInterval|setTimeout\(|useState\(\s*0\s*\)|setPlaying/)
    const goNextBlock = src.slice(src.indexOf('const goNext'), src.indexOf('const togglePlay'))
    const goPrevBlock = src.slice(src.indexOf('const goPrev'), src.indexOf('const goNext'))
    expect(goNextBlock).not.toMatch(/bumpTransitionEpoch/)
    expect(goPrevBlock).not.toMatch(/bumpTransitionEpoch/)
    // pause / seek / runId still cancel
    expect(src).toMatch(/if \(playing\) \{\s*setPlaying\(false\)\s*bumpTransitionEpoch/s)
  })

  it('swap layout still settles without leftover transform residue', async () => {
    const { container, rerender } = render(
      <MotionProvider>
        <ArrayView name="a" values={[1, 2]} elementIds={['a', 'b']} defaultMode="bars" />
      </MotionProvider>,
    )
    await act(async () => {
      rerender(
        <MotionProvider>
          <ArrayView
            name="a"
            values={[2, 1]}
            elementIds={['b', 'a']}
            prevValues={[1, 2]}
            arrayOps={[{ type: 'swap', indices: [0, 1] }]}
            roles={{ 0: 'swap', 1: 'swap' }}
            defaultMode="bars"
          />
        </MotionProvider>,
      )
      await new Promise((r) => setTimeout(r, 400))
    })
    const layers = [...container.querySelectorAll('[data-flip-layer]')] as HTMLElement[]
    expect(layers.length).toBeGreaterThan(0)
    for (const el of layers) {
      const inline = el.style.transform
      const ok =
        !inline ||
        inline === 'none' ||
        inline === '' ||
        inline === 'translate(0px, 0px)' ||
        inline === 'translateX(0px)'
      expect(ok, `residue ${inline}`).toBe(true)
    }
  })

  it('Visualizer next button advances without throwing', async () => {
    const steps: Step[] = [
      { id: 0, message: 'a', arrays: { a: [2, 1] }, roles: { a: { 0: 'swap', 1: 'swap' } }, arrayOps: { a: [{ type: 'swap', indices: [0, 1] }] } },
      { id: 1, message: 'b', arrays: { a: [1, 2] }, roles: { a: { 0: 'swap', 1: 'swap' } }, arrayOps: { a: [{ type: 'swap', indices: [0, 1] }] } },
    ]
    const { getByRole } = render(
      <MotionProvider>
        <Visualizer steps={steps} runId="t1" />
      </MotionProvider>,
    )
    await act(async () => {
      getByRole('button', { name: /下一步/ }).click()
    })
    expect(getByRole('button', { name: /下一步/ })).toBeTruthy()
  })
})
