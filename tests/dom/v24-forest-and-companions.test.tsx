import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ForestView, { forestMaxDepth } from '../../src/components/forest/ForestView'
import { ArraysFromStep } from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'
import { solveHuffman } from '../../src/algorithms/huffman'
import { generateSteps as mergeSteps, presentation as mergePres } from '../../src/algorithms/mergeSort'
import { generateSteps as actSteps, presentation as actPres } from '../../src/algorithms/activitySelection'

describe('V24 ForestView — roles derived structurally from the immutable trace', () => {
  const steps = solveHuffman(['a', 'b', 'c', 'd', 'e'], [5, 9, 12, 13, 16]).steps
  const depth = forestMaxDepth(steps)
  const roleMap = (i: number) => {
    const { container, unmount } = render(
      <ForestView step={steps[i]!} prevStep={steps[i - 1]} nextStep={steps[i + 1]} inputTable={['symbols', 'freqs']} runMaxDepth={depth} />,
    )
    const out = [...container.querySelectorAll('[data-forest-node]')].map((n) => ({
      label: n.querySelector('.fn-label')?.textContent,
      role: n.getAttribute('data-role'),
      leaf: n.getAttribute('data-leaf'),
    }))
    const inputs = container.querySelectorAll('[data-sym]').length
    unmount()
    return { out, inputs }
  }
  it('run max depth = final tree depth (3)', () => expect(depth).toBe(3))
  it('select frame (4/10) marks exactly the two min trees c:12, d:13', () => {
    const { out, inputs } = roleMap(3)
    expect(steps[3]!.message).toMatch(/选取最小两棵/)
    expect(out.filter((n) => n.role === 'selected').map((n) => n.label).sort()).toEqual(['c:12', 'd:13'])
    expect(inputs).toBe(5)
  })
  it('merge frame marks the new parent and its two children', () => {
    const { out } = roleMap(2)
    expect(steps[2]!.message).toMatch(/^合并/)
    expect(out.find((n) => n.role === 'new')?.label).toBe('⊕14')
    expect(out.filter((n) => n.role === 'merged').map((n) => n.label).sort()).toEqual(['a:5', 'b:9'])
  })
  it('every frame keeps all 5 input leaves', () => {
    for (let i = 0; i < steps.length; i++) {
      const leaves = roleMap(i).out.filter((n) => n.leaf === '1').map((n) => n.label).sort()
      expect(leaves).toEqual(['a:5', 'b:9', 'c:12', 'd:13', 'e:16'])
    }
  })
})

describe('V24 declared array scene — companions / placeholder / interval cards', () => {
  it('merge: placeholder companion strip on frames without buffers, real buffers otherwise; tree NOT inline', () => {
    const steps = mergeSteps([4, 1, 3, 2])
    const init = render(
      <MotionProvider>
        <ArraysFromStep step={steps[0]!} presentation={mergePres} />
      </MotionProvider>,
    )
    expect(init.getByTestId('scene-companions-empty')).toBeTruthy()
    expect(init.queryByTestId('array-buffers')).toBeNull()
    expect(init.container.querySelector('.search-tree-view')).toBeNull()
    init.unmount()
    const withBuf = steps.find((s) => s.arrays?.left)!
    const r = render(
      <MotionProvider>
        <ArraysFromStep step={withBuf} presentation={mergePres} />
      </MotionProvider>,
    )
    expect(r.getByTestId('array-buffers').querySelectorAll('.array-view[data-array]').length).toBe(2)
    expect(r.container.querySelectorAll('.arrays-panel > .array-view[data-array="a"]').length).toBe(1)
  })
  it('activity: two-line interval cards with id and endpoints', () => {
    const steps = actSteps([])
    const r = render(
      <MotionProvider>
        <ArraysFromStep step={steps[3]!} presentation={actPres} />
      </MotionProvider>,
    )
    const cards = [...r.container.querySelectorAll('.array-view[data-array="activities"] .cell-val-interval')]
    expect(cards.length).toBe(6)
    for (const c of cards) {
      expect(c.querySelector('.iv-id')?.textContent).toMatch(/^A\d$/)
      expect(c.querySelector('.iv-range')?.textContent).toMatch(/^\[\d+,\d+\)$/)
    }
  })
})
