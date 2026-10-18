import type { CodeDocument } from '../../../codeCatalog/types'

export type CatalogBundle = { typescript: CodeDocument; pseudocode?: CodeDocument }

/** One dynamic chunk per topic: nothing here is in the app shell / home bundle. */
export const CATALOG_LOADERS: Record<string, () => Promise<CatalogBundle>> = {
  dsu: () => import('../../../codeCatalog/dsu').then((m) => m.getDsuCatalog()),
  fenwick: () => import('../../../codeCatalog/fenwick').then((m) => m.getFenwickCatalog()),
  segtree: () => import('../../../codeCatalog/segtree').then((m) => m.getSegtreeCatalog()),
  segtree_lazy: () => import('../../../codeCatalog/segtree_lazy').then((m) => m.getSegtreeLazyCatalog()),
  prefix_diff: () => import('../../../codeCatalog/prefix_diff').then((m) => m.getPrefixDiffCatalog()),
  discretize: () => import('../../../codeCatalog/discretize').then((m) => m.getDiscretizeCatalog()),
  bs_answer: () => import('../../../codeCatalog/bs_answer').then((m) => m.getBsAnswerCatalog()),
  mono_stack: () => import('../../../codeCatalog/mono_stack').then((m) => m.getMonoStackCatalog()),
  mono_queue: () => import('../../../codeCatalog/mono_queue').then((m) => m.getMonoQueueCatalog()),
  stl_bounds: () => import('../../../codeCatalog/stl_bounds').then((m) => m.getStlBoundsCatalog()),
  stl_priority_queue: () => import('../../../codeCatalog/stl_priority_queue').then((m) => m.getStlPriorityQueueCatalog()),
}
