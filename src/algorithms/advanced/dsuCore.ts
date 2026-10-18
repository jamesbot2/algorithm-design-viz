/**
 * Shared DSU core (no tracing). `findCompress` is the exact path-compression primitive that
 * Kruskal also uses (src/algorithms/kruskal.ts) so both stay behaviourally identical.
 */
/** find with full path compression (every node on the path ends up pointing at the root). */
export function findCompress(parent: number[], x: number): number {
  let root = x
  while (parent[root] !== root) root = parent[root]!
  while (parent[x] !== root) {
    const next = parent[x]!
    parent[x] = root
    x = next
  }
  return root
}

/** Union by size + path compression; the reference model used by tests and by the traced demo. */
export class DsuCore {
  parent: number[]
  size: number[]
  count: number
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.size = new Array<number>(n).fill(1)
    this.count = n
  }
  find(x: number): number {
    return findCompress(this.parent, x)
  }
  /** returns true when two different sets were merged; ties attach b's root under a's root */
  union(a: number, b: number): boolean {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return false
    if (this.size[ra]! < this.size[rb]!) [ra, rb] = [rb, ra]
    this.parent[rb] = ra
    this.size[ra]! += this.size[rb]!
    this.count--
    return true
  }
  same(a: number, b: number): boolean {
    return this.find(a) === this.find(b)
  }
}
