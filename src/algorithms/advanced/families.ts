import type { FamSpec } from './famTypes'
import { spec as prefixDiff } from './prefixDiff'
import { spec as discretize } from './discretize'

/** Registered generic families (each file exports `spec`). */
export const FAMILIES: FamSpec[] = [prefixDiff, discretize]
