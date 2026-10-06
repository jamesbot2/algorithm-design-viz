/**
 * V30-03: ghost placeholder, real compact companion and run-budget sizers share ONE card template.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import ArrayView, { ArraysFromStep, CompactCellsCard } from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'
import { generateSteps as mergeSteps, presentation as mergePres } from '../../src/algorithms/mergeSort'

afterEach(() => cleanup())

/** Class skeleton of a compact card: element tag + class list, depth-first, text ignored. */
function skeleton(root: Element): string[] {
  const out: string[] = []
  const walk = (el: Element, d: number) => {
    const cls = [...el.classList].filter((c) => !/^hl-|^anim-|^cell-ghost|^muted$/.test(c)).sort().join('.')
    out.push(`${d}:${el.tagName}.${cls}`)
    for (const c of el.children) walk(c, d + 1)
  }
  walk(root, 0)
  return out
}

describe('V30-03 one geometry template for companion cards', () => {
  it('real compact ArrayView (cells) and CompactCellsCard produce the same skeleton', () => {
    const real = render(
      <MotionProvider>
        <ArrayView name="left" label="left" values={[4, 1]} pointers={{ i: 0 }} compact defaultMode="cells" />
      </MotionProvider>,
    )
    const card = render(<CompactCellsCard label="left" values={[4, 1]} pointers={{ i: 0 }} />)
    const a = skeleton(real.container.querySelector('.array-view-compact')!)
    const b = skeleton(card.container.querySelector('.array-view-compact')!)
    expect(b).toEqual(a)
  })

  it('placeholder uses the same value class (.cell-val) and an index track', () => {
    const r = render(<CompactCellsCard label="left" values={[]} placeholder />)
    const val = r.container.querySelector('.cell .cell-val')!
    expect(val.classList.contains('cell-ghost-val')).toBe(true)
    expect(r.container.querySelector('.cell .cell-idx')).toBeTruthy()
    expect(r.container.querySelector('.cell-slot > .cell-flip-layer > .cell')).toBeTruthy()
    expect(r.container.querySelector('.cell-slot > .pointer-row.cell-ptrs')).toBeTruthy()
  })

  it('ghost value CSS only tints (no font / line-height override), no global !important added', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/scene.css'), 'utf8')
    const block = css.match(/\.cell-ghost-val\s*\{[^}]*\}/)?.[0] ?? ''
    expect(block).not.toMatch(/line-height|font-size|font-family/)
    expect(css).toMatch(/\.scene-companions > \.scene-companions-row \{[^}]*grid-area: 1 \/ 1/)
  })

  it('merge: run-budget sizers are inert, hidden, test-id free; live row keeps its test ids', () => {
    const steps = mergeSteps([4, 1, 3, 2])
    const r = render(
      <MotionProvider>
        <ArraysFromStep step={steps[0]!} presentation={mergePres} runSteps={steps} />
      </MotionProvider>,
    )
    const strip = r.getByTestId('scene-companions')
    expect(strip.getAttribute('data-budget')).toBe('run-max')
    const sizers = [...strip.querySelectorAll('.scene-companions-sizer')]
    expect(sizers.length).toBeGreaterThan(1)
    for (const s of sizers) {
      expect(s.getAttribute('aria-hidden')).toBe('true')
      expect(s.hasAttribute('inert')).toBe(true)
      expect(s.querySelector('[data-testid]')).toBeNull()
      expect(s.querySelector('.array-view[data-array]')).toBeNull()
    }
    expect(r.getAllByTestId('scene-companions-empty')).toHaveLength(1)
    // trace is untouched: rendering sizers never mutates steps
    expect(JSON.stringify(mergeSteps([4, 1, 3, 2]))).toBe(JSON.stringify(steps))
  })
})
