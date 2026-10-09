/**
 * V30-03b: the main view's pointer track is a fixed run-budget template (live tags + hidden
 * copy of the run's worst stack in one grid cell); a strut keeps the unsigned plot baseline.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import ArrayView from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'

afterEach(() => cleanup())

const wrap = (ui: React.ReactNode) => render(<MotionProvider>{ui}</MotionProvider>)

describe('V30-03b pointer track run budget', () => {
  it('bars: every column carries the budget sizer; live tags are the only .ptr-tag', () => {
    const r = wrap(<ArrayView name="a" values={[3, 1, 2]} pointers={{ i: 0 }} pointerBudget={{ labels: ['i', 'j', 'k'] }} defaultMode="bars" />)
    const rows = r.container.querySelectorAll('.bars-wrap .pointer-row')
    expect(rows.length).toBe(3)
    for (const row of rows) {
      expect(row.getAttribute('data-ptr-budget')).toBe('3')
      expect(row.querySelector(':scope > .ptr-sizer')?.getAttribute('aria-hidden')).toBe('true')
      expect(row.querySelectorAll('.ptr-tag-sizer').length).toBe(3)
    }
    expect([...r.container.querySelectorAll('.ptr-tag')].map((t) => t.textContent)).toEqual(['i'])
    expect(r.container.querySelector('.bars-wrap > .bars-strut')).toBeTruthy()
  })

  it('cells: the pointer track exists even on a frame with no pointers when the run has some', () => {
    const r = wrap(<ArrayView name="a" values={[3, 1]} pointers={{}} pointerBudget={{ labels: ['j', 'j+1'] }} defaultMode="cells" />)
    expect(r.container.querySelectorAll('.cell-slot > .pointer-row.cell-ptrs').length).toBe(2)
    expect(r.container.querySelectorAll('.ptr-tag').length).toBe(0)
  })

  it('no budget → legacy markup (no sizer, no track on pointer-free cells)', () => {
    const r = wrap(<ArrayView name="a" values={[3, 1]} pointers={{}} defaultMode="cells" />)
    expect(r.container.querySelector('.ptr-sizer')).toBeNull()
    expect(r.container.querySelector('.cell-ptrs')).toBeNull()
  })

  it('sizer tags share typography with live tags; track is one grid cell', () => {
    const css = readFileSync(resolve(__dirname, '../../src/styles.css'), 'utf8')
    expect(css).toMatch(/\.ptr-tag,\s*\n\.ptr-tag-sizer \{\s*\n\s*font-size: 0\.65rem;/)
    const scene = readFileSync(resolve(__dirname, '../../src/styles/scene.css'), 'utf8')
    expect(scene).toMatch(/\.cell-ptrs \.ptr-tag,\s*\n\.cell-ptrs \.ptr-tag-sizer \{/)
    expect(scene).toMatch(/\.pointer-row\[data-ptr-budget\] > \.ptr-live,\s*\n\.pointer-row\[data-ptr-budget\] > \.ptr-sizer \{\s*\n\s*grid-area: 1 \/ 1;/)
  })
})
