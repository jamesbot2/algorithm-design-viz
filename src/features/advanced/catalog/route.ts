export type AdvancedPageKind = 'home' | 'index' | 'topic' | 'demo' | 'template' | null

/** Page type of a 高阶算法 route (used by Layout for size-budget / wide / lab-fill decisions). Pure; no catalog import. */
export function advancedPageKind(pathname: string, search: string): AdvancedPageKind {
  if (!pathname.startsWith('/advanced')) return null
  const seg = pathname.split('/').filter(Boolean) // ['advanced', 'stl', 'topic']
  if (seg.length === 1) return 'home'
  if (seg[1] === 'templates') return seg.length >= 3 ? 'template' : 'index'
  if (seg[1] === 'stl' || seg[1] === 'algorithms') {
    if (seg.length === 2) return 'index'
    return new URLSearchParams(search).get('view') === 'demo' ? 'demo' : 'topic'
  }
  return 'home'
}
