/**
 * 高阶算法 — discriminated union of main-scene states carried by `Step.advanced`.
 * Each view is a COMPLETE committed frame of one structure (not parsed back from messages).
 * Index conventions are explicit per view (see field docs).
 */
export interface DsuView {
  kind: 'dsu'
  /** number of elements (0-based ids 0..n-1) */
  n: number
  parent: number[]
  size: number[]
  components: number
  op: string
  /** nodes visited by the current find, in climb order (ends at the root once reached) */
  findPath?: number[]
  root?: number
  /** nodes whose parent was just rewritten to the root (path compression) */
  compressed?: number[]
  /** the link just made: child root attached under parent root */
  link?: { child: number; parent: number }
  /** roots being compared by union/same */
  compare?: [number, number]
}

export interface FenwickView {
  kind: 'fenwick'
  /** logical array length; internal Fenwick indices are 1-based 1..n */
  n: number
  /** tree[i-1] = T[i] (1-based internal node i) */
  tree: number[]
  /** logical values a[0..n) (derived from point adds; used for the array strip) */
  values: number[]
  op: string
  /** current internal node (1-based) */
  node?: number
  /** nodes visited so far in this walk (1-based, in order) */
  path: number[]
  /** public half-open query [l,r) in 0-based logical indices */
  query?: [number, number]
  accum?: number
  result?: number
  /** 'up' (update walk p += lowbit) | 'down' (prefix walk p -= lowbit) */
  direction?: 'up' | 'down'
}

export interface HeapView {
  kind: 'heap'
  /** max-heap array (0-based storage; children of i are 2i+1, 2i+2) */
  heap: number[]
  /** layout capacity for the whole run (stable slots) */
  cap: number
  op: string
  /** indices being compared */
  compare?: [number, number]
  /** indices swapped in this frame */
  swapped?: [number, number]
  /** index being sifted */
  cursor?: number
  /** value removed by the last pop (and returned by top) */
  popped?: number
  top?: number
  /** logical size excluded tail (during pop, the tail slot is parked before shrink) */
  parked?: number
  /** run stopped before an undefined-behaviour operation */
  stopped?: boolean
}

export interface BoundsView {
  kind: 'bounds'
  arr: number[]
  target: number
  mode: 'lower' | 'upper'
  /** half-open search range [first,last) */
  first: number
  last: number
  mid?: number
  /** final position in [0,n]; n means end() */
  result?: number
  /** comparison shown for the current mid */
  cmp?: { index: number; text: string; goRight: boolean }
}

export interface SegView {
  kind: 'seg'
  /** logical array length; leaves cover [i,i+1) */
  n: number
  /** tree[node] for heap-numbered nodes (node 1 = root = [0,n); children 2k, 2k+1); null = not built yet */
  tree: (number | null)[]
  op: string
  /** node of the current call frame */
  node?: number
  /** nodes touched by the current operation so far, with the role each played (query: outside / inside / split; set: descend) */
  visited: { node: number; role: 'outside' | 'inside' | 'split' | 'path' | 'leaf' }[]
  /** public half-open query [l,r) */
  query?: [number, number]
  /** point-assign target */
  target?: { index: number; value: number }
  /** running sum of the 'inside' nodes of the current query */
  accum?: number
  result?: number
  /** lazy segment tree only: pending tag per heap node (amount still to add to EACH element below) */
  lazy?: number[]
  /** nodes whose tag was just written / pushed in this frame */
  tagged?: number[]
  /** range-add in progress: [l,r) and v */
  adding?: { l: number; r: number; v: number }
}

export type AdvancedView = DsuView | FenwickView | HeapView | BoundsView | SegView
