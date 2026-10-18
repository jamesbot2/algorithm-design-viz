/** Pure geometry for the advanced main scenes (unit-tested; no React). */
import type { DsuView } from '../../../types/advancedView'

export const lowbit = (x: number) => x & -x
export const levelsFor = (n: number) => Math.floor(Math.log2(Math.max(1, n))) + 1

export interface Pos {
  x: number
  y: number
}

/** Forest layout: leaves take consecutive slots (DFS order), parents are centred over their children. */
export function dsuLayout(v: Pick<DsuView, 'n' | 'parent'>, w: number, areaTop: number, areaBottom: number, r: number): { pos: Pos[]; depth: number[]; slots: number } {
  const n = v.n
  const children: number[][] = Array.from({ length: n }, () => [])
  const roots: number[] = []
  for (let i = 0; i < n; i++) {
    const p = v.parent[i]!
    if (p === i) roots.push(i)
    else children[p]!.push(i)
  }
  const xs = new Array<number>(n).fill(0)
  const depth = new Array<number>(n).fill(0)
  let slot = 0
  const walk = (u: number, d: number) => {
    depth[u] = d
    const ch = children[u]!
    if (ch.length === 0) {
      xs[u] = slot++
      return
    }
    for (const c of ch) walk(c, d + 1)
    xs[u] = (xs[ch[0]!]! + xs[ch[ch.length - 1]!]!) / 2
  }
  for (const rt of roots) walk(rt, 0)
  const levels = levelsFor(n)
  const padX = r + 4
  const dx = slot > 1 ? (w - 2 * padX) / (slot - 1) : 0
  const gapY = levels > 1 ? Math.min(54, (areaBottom - areaTop - 2 * r) / (levels - 1)) : 0
  const pos = xs.map((s, i) => ({ x: slot > 1 ? padX + s * dx : w / 2, y: areaTop + r + depth[i]! * gapY }))
  return { pos, depth, slots: slot }
}

/** Fenwick node i (1-based) covers 1-based (i-lowbit(i), i] = 0-based [i-lowbit(i), i). */
export const fenwickCover = (i: number): [number, number] => [i - lowbit(i), i]

/** Heap tree slot for array index i in a tree sized for `cap` slots: stable regardless of current size. */
export function heapSlot(i: number, cap: number, w: number, top: number, gapY: number): Pos {
  const d = Math.floor(Math.log2(i + 1))
  const j = i + 1 - 2 ** d
  return { x: ((j + 0.5) / 2 ** d) * w, y: top + d * gapY + 0 * cap }
}
