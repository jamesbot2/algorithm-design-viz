import type { TopicContent } from './types'

/** One lazy chunk per topic explanation. */
export const CONTENT_LOADERS: Record<string, () => Promise<TopicContent>> = {
  'stl-bounds': () => import('./stl-bounds').then((m) => m.default),
  'stl-priority-queue': () => import('./stl-priority-queue').then((m) => m.default),
  dsu: () => import('./dsu').then((m) => m.default),
  segtree: () => import('./segtree').then((m) => m.default),
  'segtree-lazy': () => import('./segtree-lazy').then((m) => m.default),
  'prefix-diff': () => import('./prefix-diff').then((m) => m.default),
  'discretize': () => import('./discretize').then((m) => m.default),
  'bs-answer': () => import('./bs-answer').then((m) => m.default),
  'mono-stack': () => import('./mono-stack').then((m) => m.default),
  'mono-queue': () => import('./mono-queue').then((m) => m.default),
  'topo': () => import('./topo').then((m) => m.default),
  'lca': () => import('./lca').then((m) => m.default),
  'lis': () => import('./lis').then((m) => m.default),
  'number-theory': () => import('./number-theory').then((m) => m.default),
  'stl-vector': () => import('./stl-vector').then((m) => m.default),
  fenwick: () => import('./fenwick').then((m) => m.default),
}
