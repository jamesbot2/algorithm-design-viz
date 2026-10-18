import type { FamSpec } from './famTypes'
import { spec as prefixDiff } from './prefixDiff'
import { spec as discretize } from './discretize'
import { spec as bsAnswer } from './bsAnswer'
import { spec as monoStack } from './monoStack'
import { spec as monoQueue } from './monoQueue'
import { spec as topo } from './topo'
import { spec as lca } from './lca'
import { spec as lis } from './lis'

/** Registered generic families (each file exports `spec`). */
export const FAMILIES: FamSpec[] = [prefixDiff, discretize, bsAnswer, monoStack, monoQueue, topo, lca, lis]
