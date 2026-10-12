import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { chapters } from '../../data/chapters'
import { algorithms } from '../../algorithms'
import { byDesignThought, byProblemType, completionLabel } from '../../data/curriculum'

export type NavMode = 'design' | 'problem' | 'chapter'

const MODES: { id: NavMode; label: string }[] = [
  { id: 'design', label: '按设计思想' },
  { id: 'problem', label: '按问题类型' },
  { id: 'chapter', label: '按章节' },
]

const KNAPSACK_TEACH_MODULES = new Set(['knapsack-family', 'dp', 'backtrack'])

interface Group {
  id: string
  title: string
  note?: string
  /** chapter groups carry their own lecture-notes page link */
  chapterHref?: string
  links: { to: string; title: string }[]
}

/**
 * V32: one catalog, one list at a time. The three groupings are tabs of a single
 * segmented control, so the course list is never rendered twice (V31 rendered the
 * by-idea list AND the by-chapter list → 100 links in one scroll column).
 */
export function NavCatalog(props: {
  mode: NavMode
  setMode: (m: NavMode) => void
  filter: string
  setFilter: (s: string) => void
  folded: ReadonlySet<string>
  toggleFold: (id: string) => void
  onNavigate: () => void
  /** focus the search box on mount (popover catalog) */
  autoFocusSearch?: boolean
  idPrefix: string
}) {
  const { mode, setMode, filter, setFilter, folded, toggleFold, onNavigate, autoFocusSearch, idPrefix } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const q = filter.trim().toLowerCase()
  const match = (s: string) => !q || s.toLowerCase().includes(q)

  const groups: Group[] =
    mode === 'chapter'
      ? chapters.map((ch) => ({
          id: `ch-${ch.id}`,
          title: ch.title,
          chapterHref: `/chapter/${ch.id}`,
          links: ch.algos.filter((a) => algorithms[a]).map((a) => ({ to: `/algo/${a}`, title: algorithms[a].meta.title })),
        }))
      : (mode === 'design' ? byDesignThought.modules : byProblemType.modules).map((m) => ({
          id: `${mode}-${m.id}`,
          title: m.title + (m.planned ? ' · 规划' : ''),
          note: completionLabel(m.completion),
          links: [
            ...m.items.filter((a) => algorithms[a]).map((a) => ({ to: `/algo/${a}`, title: algorithms[a].meta.title })),
            ...(KNAPSACK_TEACH_MODULES.has(m.id) ? [{ to: '/teach/knapsack', title: '背包多策略' }] : []),
          ],
        }))

  const visible = groups
    .map((g) => ({ ...g, links: g.links.filter((l) => match(l.title)) }))
    .filter((g) => g.links.length > 0 || (!q && g.chapterHref) || (q && g.chapterHref && match(g.title)))

  useEffect(() => {
    if (!autoFocusSearch) return
    searchRef.current?.focus({ preventScroll: true })
    // bring the current selection into view inside the catalog's own scroller
    rootRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [autoFocusSearch])

  return (
    <div className="nav-catalog" ref={rootRef}>
      <h2 className="nav-catalog-title" id={`${idPrefix}-title`}>
        算法目录
      </h2>
      <label className="nav-search">
        <span className="sr-only">搜索算法</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="搜索算法…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="搜索算法"
          data-testid="algo-search"
        />
      </label>
      <div className="nav-seg" role="group" aria-label="目录分组方式" data-testid="nav-mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} className={mode === m.id ? 'active' : ''} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="nav-empty">没有匹配“{filter.trim()}”的算法</p>}
      {visible.map((g) => {
        const isFolded = !q && folded.has(g.id)
        const listId = `${idPrefix}-${g.id}`
        return (
          <section className="nav-sec" key={g.id}>
            <div className="nav-sec-head">
              <button type="button" className="nav-sec-toggle" aria-expanded={!isFolded} aria-controls={listId} onClick={() => toggleFold(g.id)}>
                <svg className="nav-chev" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{g.title}</span>
              </button>
              {g.note && <span className="nav-sec-note">{g.note}</span>}
            </div>
            {!isFolded && (
              <ul className="nav-list" id={listId}>
                {g.chapterHref && (
                  <li>
                    <NavLink to={g.chapterHref} className={({ isActive }) => (isActive ? 'nav-algo is-notes active' : 'nav-algo is-notes')} onClick={onNavigate}>
                      本章讲义
                    </NavLink>
                  </li>
                )}
                {g.links.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')} onClick={onNavigate}>
                      {l.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
