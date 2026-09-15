import type { SearchTreeNode } from '../types/step'

/** Deep clone a search tree so step snapshots do not share mutable nodes. */
export function cloneTree(n: SearchTreeNode): SearchTreeNode {
  return {
    ...n,
    children: n.children?.map(cloneTree),
    meta: n.meta ? { ...n.meta } : undefined,
  }
}

/** Prefer structuredClone when available; fall back to cloneTree. */
export function snapshotTree(n: SearchTreeNode): SearchTreeNode {
  try {
    return structuredClone(n)
  } catch {
    return cloneTree(n)
  }
}
