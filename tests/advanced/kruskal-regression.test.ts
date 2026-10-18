import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import * as kruskal from '../../src/algorithms/kruskal'

/**
 * Kruskal now shares `findCompress` with the DSU module. The golden hashes below were computed from the
 * PRE-refactor implementation (recursive find) over the default graph and fixed-seed random graphs;
 * the refactor must not change a single step.
 */
const sha = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex')
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const cases = () => {
  const r = rng(424242)
  const out: { n: number; edges: [number, number, number][] }[] = []
  for (let c = 0; c < 12; c++) {
    const n = 3 + Math.floor(r() * 7)
    const m = 2 + Math.floor(r() * 12)
    const edges: [number, number, number][] = []
    for (let i = 0; i < m; i++) edges.push([Math.floor(r() * n), Math.floor(r() * n), 1 + Math.floor(r() * 9)])
    out.push({ n, edges })
  }
  return out
}
const GOLD_PATH = 'tests/advanced/kruskal.golden.json'
describe('Kruskal regression after sharing findCompress', () => {
  it('default graph and 12 fixed-seed random graphs produce byte-identical steps', async () => {
    const { readFileSync, existsSync, writeFileSync } = await import('node:fs')
    const got = [sha(kruskal.generateSteps([])), ...cases().map((c) => sha(kruskal.generateSteps([], c.edges as never, c.n)))]
    if (!existsSync(GOLD_PATH)) {
      writeFileSync(GOLD_PATH, JSON.stringify(got, null, 1))
      throw new Error('golden written (pre-refactor); re-run')
    }
    expect(got).toEqual(JSON.parse(readFileSync(GOLD_PATH, 'utf8')))
  })
})
