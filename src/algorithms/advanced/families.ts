import type { FamSpec } from './famTypes'
import { spec as prefixDiff } from './prefixDiff'

/** Registered generic families (each file exports `spec`). */
export const FAMILIES: FamSpec[] = [prefixDiff]
