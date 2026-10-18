import type { CodeDocument } from '../../../codeCatalog/types'

export type CatalogBundle = { typescript: CodeDocument; pseudocode?: CodeDocument }

/** One dynamic chunk per topic: nothing here is in the app shell / home bundle. */
export const CATALOG_LOADERS: Record<string, () => Promise<CatalogBundle>> = {
  dsu: () => import('../../../codeCatalog/dsu').then((m) => m.getDsuCatalog()),
  fenwick: () => import('../../../codeCatalog/fenwick').then((m) => m.getFenwickCatalog()),
  stl_bounds: () => import('../../../codeCatalog/stl_bounds').then((m) => m.getStlBoundsCatalog()),
  stl_priority_queue: () => import('../../../codeCatalog/stl_priority_queue').then((m) => m.getStlPriorityQueueCatalog()),
}
