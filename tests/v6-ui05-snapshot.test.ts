import { describe, expect, it } from 'vitest'

/**
 * UI-05: export filename must come from completed experiment snapshot identity,
 * not the current draft selector.
 */
describe('UI-05 experiment export snapshot identity', () => {
  it('export name uses result.experimentId / snapshot which, not live draft which', async () => {
    const { exportBasename } = await import('../src/pages/experiment/exportIdentity')
    const completed = { which: 'dijkstra' as const, title: '朴素 vs 堆 Dijkstra' }
    const draftWhich = 'knapsack' as const
    expect(exportBasename(completed, draftWhich)).toBe('experiment-dijkstra')
    expect(exportBasename(completed, draftWhich)).not.toContain('knapsack')
  })
})
