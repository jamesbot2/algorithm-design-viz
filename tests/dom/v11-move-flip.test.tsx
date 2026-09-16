import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import ArrayView from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'

afterEach(() => cleanup())

describe('V11-09 move/copy FLIP', () => {
  it('insertion-style move applies translate mid-state without duplicate keys', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container, rerender } = render(
      <MotionProvider>
        <ArrayView
          name="a"
          values={[2, 1]}
          elementIds={['ins0', 'vacant:0:1']}
          defaultMode="cells"
        />
      </MotionProvider>,
    )

    const slots = [...container.querySelectorAll('[data-slot-index]')] as HTMLElement[]
    slots.forEach((el, i) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: i * 40,
        y: 10,
        width: 36,
        height: 36,
        top: 10,
        left: i * 40,
        bottom: 46,
        right: i * 40 + 36,
        toJSON() {
          return {}
        },
      } as DOMRect)
    })

    await act(async () => {
      rerender(
        <MotionProvider>
          <ArrayView
            name="a"
            values={[2, 1]}
            elementIds={['ins0', 'vacant:0:1']}
            defaultMode="cells"
          />
        </MotionProvider>,
      )
    })

    await act(async () => {
      rerender(
        <MotionProvider>
          <ArrayView
            name="a"
            values={[2, 2]}
            elementIds={['vacant:1:0', 'ins0']}
            prevValues={[2, 1]}
            prevElementIds={['ins0', 'vacant:0:1']}
            arrayOps={[{ type: 'move', indices: [0, 1], elementIds: ['ins0'] }]}
            defaultMode="cells"
          />
        </MotionProvider>,
      )
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })

    const layers = [...container.querySelectorAll('[data-flip-layer]')] as HTMLElement[]
    const mid = layers.find((el) => el.dataset.runFlip === '1' || /translate\(/.test(el.style.transform))
    expect(mid, 'expected move FLIP invert/settle transform').toBeTruthy()
    const dup = err.mock.calls.some(
      (c) => String(c[0]).includes('same key') || String(c[0]).toLowerCase().includes('unique'),
    )
    expect(dup).toBe(false)
    err.mockRestore()

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
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

  it('copy/write without same-array relocation stays transform-free (buffer viz path)', async () => {
    const { container, rerender } = render(
      <MotionProvider>
        <ArrayView
          name="a"
          values={[0, 0]}
          elementIds={['pending:0:0', 'pending:0:1']}
          defaultMode="cells"
        />
      </MotionProvider>,
    )
    await act(async () => {
      rerender(
        <MotionProvider>
          <ArrayView
            name="a"
            values={[1, 0]}
            elementIds={['m1', 'pending:0:1']}
            prevValues={[0, 0]}
            prevElementIds={['pending:0:0', 'pending:0:1']}
            arrayOps={[{ type: 'write', indices: [0], elementIds: ['m1'] }]}
            defaultMode="cells"
          />
        </MotionProvider>,
      )
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    const flipping = [...container.querySelectorAll('[data-flip-layer][data-run-flip="1"]')]
    expect(flipping.length).toBe(0)
  })
})
