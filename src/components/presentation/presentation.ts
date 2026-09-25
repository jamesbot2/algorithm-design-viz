import type { Step } from '../../types/step'
import type { PresentationDescriptor, PrimaryKind } from '../../types/presentation'
import { algorithms } from '../../algorithms'

/**
 * V24: descriptors for pages that are not a registry module (knapsack teaching
 * strategies). Registry modules declare `export const presentation` themselves.
 */
const EXTRA: Record<string, PresentationDescriptor> = {
  'knapsack:backtracking': { primaryKind: 'search-tree' },
  'knapsack:branchAndBound': { primaryKind: 'search-tree' },
}

export function getPresentation(algoId?: string): PresentationDescriptor | undefined {
  if (!algoId) return undefined
  return algorithms[algoId]?.presentation ?? EXTRA[algoId]
}

/** Stage `data-primary-scene` value (V18 names kept; forest/search-tree added). */
export type PrimaryScene = 'graph' | 'board' | 'matrix' | 'array' | 'tree' | 'forest' | 'empty'

export interface ResolvedPresentation {
  scene: PrimaryScene
  kind: PrimaryKind | 'legacy'
  descriptor?: PresentationDescriptor
}

/**
 * Legacy inference ("whichever optional field exists first") — kept verbatim for
 * modules without a descriptor.
 */
export function inferLegacyScene(step: Step | undefined, hasBoard: boolean, hasOtherMatrix: boolean): PrimaryScene {
  if (step?.graph) return 'graph'
  if (hasBoard) return 'board'
  if (hasOtherMatrix) return 'matrix'
  if (step?.arrays && Object.keys(step.arrays).length > 0) return 'array'
  if (step?.searchTree) return 'tree'
  return 'empty'
}

const KIND_TO_SCENE: Record<PrimaryKind, PrimaryScene> = {
  array: 'array',
  matrix: 'matrix',
  graph: 'graph',
  board: 'board',
  forest: 'forest',
  'search-tree': 'tree',
}

/**
 * A declared primary is stable for the whole run: a frame with or without a given
 * optional field never flips the stage to another view.
 */
export function resolvePresentation(
  algoId: string | undefined,
  step: Step | undefined,
  hasBoard: boolean,
  hasOtherMatrix: boolean,
): ResolvedPresentation {
  const descriptor = getPresentation(algoId)
  if (!descriptor) return { scene: inferLegacyScene(step, hasBoard, hasOtherMatrix), kind: 'legacy' }
  return { scene: step ? KIND_TO_SCENE[descriptor.primaryKind] : 'empty', kind: descriptor.primaryKind, descriptor }
}
