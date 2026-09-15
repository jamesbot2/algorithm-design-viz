/** Shared circular layout for n nodes. Algorithms may omit x,y; GraphView fills via this. */
export function layoutGraph(n: number, opts?: { width?: number; height?: number; cx?: number; cy?: number; r?: number }) {
  const width = opts?.width ?? 520
  const height = opts?.height ?? 280
  const cx = opts?.cx ?? width / 2
  const cy = opts?.cy ?? height / 2
  const r = opts?.r ?? Math.min(width, height) * 0.36
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1)
    return {
      id: i,
      label: String(i),
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  })
}

export function ensureNodeLayout(
  nodes: { id: string | number; label?: string; x?: number; y?: number }[],
): { id: string | number; label?: string; x: number; y: number }[] {
  const missing = nodes.some((n) => n.x === undefined || n.y === undefined)
  if (!missing) {
    return nodes.map((n) => ({ ...n, x: n.x!, y: n.y! }))
  }
  const laid = layoutGraph(nodes.length)
  return nodes.map((n, i) => ({
    ...n,
    x: n.x ?? laid[i]?.x ?? 0,
    y: n.y ?? laid[i]?.y ?? 0,
  }))
}
