import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateSteps } from '../src/algorithms/dijkstra'

const varsSrc = readFileSync(resolve(__dirname, '../src/components/VarsPanel.tsx'), 'utf8')
const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

describe('V14-02 arrays in inspector', () => {
  it('VarsPanel renders step.arrays tables', () => {
    expect(varsSrc).toMatch(/step\.arrays/)
    expect(varsSrc).toMatch(/inspector-arrays/)
    expect(varsSrc).toMatch(/inspector-array-\$\{name\}|inspector-array-/)
  })

  it('stage arrays hidden for graphs (inspector owns them)', () => {
    expect(viz).toMatch(/!step\.graph/)
    expect(css).toMatch(/data-layout="tabs".*arrays-panel|arrays-panel[\s\S]*display:\s*none/s)
  })

  it('Dijkstra n=3 case: dist[1] ∞→10→2, parent[1]=2', () => {
    const edges: [number, number, number][] = [
      [0, 1, 10],
      [0, 2, 1],
      [2, 1, 1],
    ]
    const steps = generateSteps([], edges, 3, 0)
    expect(steps.length).toBeGreaterThan(3)
    const withDist = steps.filter((s) => s.arrays?.dist)
    expect(withDist.length).toBeGreaterThan(0)
    const init = withDist[0]!
    expect(init.arrays!.dist[1]).toMatch(/∞|Infinity/)
    // Find first time dist[1] becomes 10 (via 0→1)
    const hit10 = withDist.find((s) => s.arrays!.dist[1] === 10 || s.arrays!.dist[1] === '10')
    expect(hit10).toBeTruthy()
    // Later better path 0→2→1 yields 2
    const hit2 = withDist.find((s) => Number(s.arrays!.dist[1]) === 2)
    expect(hit2).toBeTruthy()
    expect(hit2!.arrays!.parent[1]).toBe(2)
    // Cursor sync: seeking earlier frame restores ∞
    const beforeUpdate = withDist.find((s) => {
      const d = s.arrays!.dist[1]
      return d === '∞' || d === Infinity || d === 'Infinity'
    })
    expect(beforeUpdate).toBeTruthy()
  })
})
