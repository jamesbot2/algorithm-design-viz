/** Stable edge id helpers. Directed u→v and v→u are distinct. */
export function directedEdgeId(u: string | number, v: string | number): string {
  return `${u}->${v}`
}

export function undirectedEdgeId(u: string | number, v: string | number): string {
  const a = String(u)
  const b = String(v)
  return a <= b ? `${a}-${b}` : `${b}-${a}`
}

export function edgeIdFromPair(
  u: string | number,
  v: string | number,
  directed?: boolean,
): string {
  return directed ? directedEdgeId(u, v) : undirectedEdgeId(u, v)
}
