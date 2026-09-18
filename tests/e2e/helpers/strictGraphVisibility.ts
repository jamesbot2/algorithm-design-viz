/**
 * V16-03: Do NOT duplicate detector logic here.
 * DOM/unit tests: import from `src/utils/strictGraphVisibility.ts`
 * E2E: use `assertStrictGraphVisible.ts` → `window.__algoVizStrictVisibility`
 */
export {
  isTopmostTarget,
  isOpaqueOverlay,
  geometryVisible,
  textReadable,
  evaluateTargetVisibility,
  sampleHitAtCenter,
  sampleHitsMulti,
  measurePageGraphVisibility,
  findPaintOccluders,
  multiSamplePoints,
  overlapFraction,
} from '../../../src/utils/strictGraphVisibility'
export type {
  HitSample,
  StrictVisibilityIssue,
  StrictVisibilityFields,
  StrictVisibilityResult,
  PageGraphVisibilityReport,
} from '../../../src/utils/strictGraphVisibility'
