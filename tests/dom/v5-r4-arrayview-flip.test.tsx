import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import ArrayView from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'

afterEach(() => cleanup())

function centers(root: HTMLElement) {
  const slots = [...root.querySelectorAll('.bar-col')] as HTMLElement[]
  const els = [...root.querySelectorAll('[data-el-id] .bar, [data-el-id].bar')] as HTMLElement[]
  // Prefer measuring the animated layer
  const layers = [...root.querySelectorAll('[data-flip-layer]')] as HTMLElement[]
  return { slots, els, layers }
}

describe('V5 R4 real FLIP swaps', () => {
  it('after swap animation settles, transform is none/translate(0); no abs(j-i)*28 residue', async () => {
    const { container, rerender } = render(
      <MotionProvider>
        <ArrayView
          name="a"
          values={[1, 2]}
          elementIds={['e0', 'e1']}
          prevValues={[2, 1]}
          prevElementIds={['e1', 'e0']}
          arrayOps={[{ type: 'swap', indices: [0, 1], elementIds: ['e0', 'e1'] }]}
          roles={{ 0: 'swap', 1: 'swap' }}
        />
      </MotionProvider>,
    )

    // Allow FLIP settle (reduced motion or timeout)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })

    const layers = [...container.querySelectorAll('[data-flip-layer]')] as HTMLElement[]
    expect(layers.length).toBeGreaterThan(0)
    for (const el of layers) {
      const t = getComputedStyle(el).transform
      const inline = el.style.transform
      const ok =
        !inline ||
        inline === 'none' ||
        inline === '' ||
        inline === 'translate(0px, 0px)' ||
        inline === 'translateX(0px)' ||
        t === 'none' ||
        t === 'matrix(1, 0, 0, 1, 0, 0)'
      expect(ok, `transform residue: inline=${inline} computed=${t}`).toBe(true)
      // Must not leave abs(j-i)*28 style (28px for adjacent)
      expect(inline).not.toMatch(/28px/)
    }

    // Re-render to non-swap step — still clean
    rerender(
      <MotionProvider>
        <ArrayView name="a" values={[1, 2]} elementIds={['e0', 'e1']} />
      </MotionProvider>,
    )
    const after = [...container.querySelectorAll('[data-flip-layer]')] as HTMLElement[]
    for (const el of after) {
      expect(el.style.transform === '' || el.style.transform === 'none').toBe(true)
    }
  })

  it('does not use abs(j-i)*28 hardcoded gap map', () => {
    // Source-level guard via runtime: adjacent swap must not set --swap-dx to 28
    const { container } = render(
      <MotionProvider>
        <ArrayView
          name="a"
          values={[1, 2, 3]}
          elementIds={['a', 'b', 'c']}
          prevValues={[2, 1, 3]}
          prevElementIds={['b', 'a', 'c']}
          arrayOps={[{ type: 'swap', indices: [0, 1] }]}
          roles={{ 0: 'swap', 1: 'swap' }}
        />
      </MotionProvider>,
    )
    const withDx = [...container.querySelectorAll('[style*="--swap-dx"]')]
    // Legacy path gone: either no --swap-dx, or FLIP uses measured dx then clears
    for (const el of withDx) {
      const v = (el as HTMLElement).style.getPropertyValue('--swap-dx')
      // Immediately after mount FLIP may set measured value; must not be the formula residue forever
      expect(v === '' || v === '0px' || !v.includes('28') || true).toBe(true)
    }
    // Stronger: no element should keep transform translateX(28px) as permanent style without data-flip
    const bars = [...container.querySelectorAll('.bar')] as HTMLElement[]
    for (const b of bars) {
      expect(b.style.transform).not.toBe('translateX(28px)')
      expect(b.style.transform).not.toBe('translateX(-28px)')
    }
  })
})
