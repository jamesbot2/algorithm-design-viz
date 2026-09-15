import type { Step } from '../../types/step'

/** Deep-freeze a value for immutability (dev/history safety). */
export function deepFreeze<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value
  for (const key of Object.keys(value as object)) {
    const child = (value as Record<string, unknown>)[key]
    if (child && typeof child === 'object') deepFreeze(child)
  }
  return Object.freeze(value)
}

/** Shallow-copy arrays / matrices commonly mutated by algo generators. */
export function copyStepArrays(step: Step): Step {
  const arrays = step.arrays
    ? (Object.fromEntries(
        Object.entries(step.arrays).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]),
      ) as Step['arrays'])
    : undefined
  const matrices = step.matrices
    ? Object.fromEntries(
        Object.entries(step.matrices).map(([k, m]) => [
          k,
          m.map((row) => (Array.isArray(row) ? [...row] : row)),
        ]),
      )
    : undefined
  const highlights = step.highlights
    ? Object.fromEntries(Object.entries(step.highlights).map(([k, v]) => [k, [...v]]))
    : undefined
  const graph = step.graph
    ? {
        ...step.graph,
        nodes: step.graph.nodes.map((n) => ({ ...n })),
        edges: step.graph.edges.map((e) => ({ ...e })),
        highlightNodes: step.graph.highlightNodes ? [...step.graph.highlightNodes] : undefined,
        highlightEdges: step.graph.highlightEdges
          ? step.graph.highlightEdges.map((e) => [...e] as [string | number, string | number])
          : undefined,
        highlightEdgeIds: step.graph.highlightEdgeIds
          ? [...step.graph.highlightEdgeIds]
          : undefined,
        edgeRoles: step.graph.edgeRoles ? { ...step.graph.edgeRoles } : undefined,
      }
    : undefined
  return {
    ...step,
    arrays,
    matrices,
    highlights,
    graph,
    vars: step.vars ? { ...step.vars } : undefined,
    pointers: step.pointers ? { ...step.pointers } : undefined,
    arrayPointers: step.arrayPointers
      ? Object.fromEntries(
          Object.entries(step.arrayPointers).map(([k, v]) => [k, { ...v }]),
        )
      : undefined,
    matrixTargets: step.matrixTargets
      ? Object.fromEntries(
          Object.entries(step.matrixTargets).map(([k, t]) => [
            k,
            {
              current: t.current ? ([...t.current] as [number, number]) : undefined,
              reads: t.reads?.map((p) => [...p] as [number, number]),
              writes: t.writes?.map((p) => [...p] as [number, number]),
              path: t.path?.map((p) => [...p] as [number, number]),
            },
          ]),
        )
      : undefined,
    roles: step.roles
      ? Object.fromEntries(Object.entries(step.roles).map(([k, v]) => [k, { ...v }]))
      : undefined,
    stats: step.stats ? { ...step.stats } : undefined,
  }
}

/** Copy then freeze every step so later mutation cannot poison history. */
export function freezeSteps(steps: Step[]): readonly Step[] {
  return Object.freeze(steps.map((s) => deepFreeze(copyStepArrays(s))))
}
