import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algoList } from '../algorithms'
import { availableLanguages, CODE_LANGUAGES } from '../codeCatalog/languages'
import {
  byDesignThought,
  byProblemType,
  completionLabel,
  EXTENDED_PLANNED,
  type NavGroup,
} from '../data/curriculum'

function NavGroupView({ group }: { group: NavGroup }) {
  return (
    <div className="nav-dual-group">
      {group.modules.map((m) => (
        <div key={m.id} className={`nav-mod-card${m.planned ? ' planned' : ''}`}>
          <h3>
            {m.title}
            {m.planned && <span className="badge-planned">规划中</span>}
          </h3>
          <p className="completion">完成标记：{completionLabel(m.completion)}</p>
          {m.prereqs && m.prereqs.length > 0 && (
            <p className="hint">先修：{m.prereqs.join(', ')}</p>
          )}
          {m.note && <p className="hint muted">{m.note}</p>}
          <div className="algo-chips">
            {m.items.map((aid) => (
              <Link key={aid} to={`/algo/${aid}`} className="chip">
                {aid}
              </Link>
            ))}
            {m.id === 'knapsack-family' || m.id === 'backtrack' || m.id === 'dp' ? (
              <Link to="/teach/knapsack" className="chip chip-teach">
                背包多策略
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}


/* —— V28 P4 algorithm library: search + category filter + cards —— */
type LibCategory = { id: string; title: string; glyph: string; gradient: string }
/** categories = the shipped (non-planned) design-paradigm modules of the course navigation */
const CATEGORY_STYLE: Record<string, { glyph: string; gradient: string }> = {
  intro: { glyph: 'O(n)', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
  divide: { glyph: 'D&C', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
  dp: { glyph: 'DP', gradient: 'linear-gradient(135deg,#8b5cf6,#d946ef)' },
  greedy: { glyph: 'GR', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  backtrack: { glyph: 'BT', gradient: 'linear-gradient(135deg,#14b8a6,#0ea5e9)' },
  graph: { glyph: 'G', gradient: 'linear-gradient(135deg,#22c55e,#0ea5e9)' },
  string: { glyph: 'STR', gradient: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
}
const LIB_CATEGORIES: LibCategory[] = byDesignThought.modules
  .filter((m) => !m.planned && CATEGORY_STYLE[m.id])
  .map((m) => ({ id: m.id, title: m.title, ...CATEGORY_STYLE[m.id]! }))
/** algorithms shipped as pages but not listed in a navigation module */
const EXTRA_MEMBERSHIP: Record<string, string[]> = { dijkstraHeap: ['graph'] }
const TEACH_ID = 'teach-knapsack'

type LibEntry = {
  id: string
  to: string
  title: string
  description: string
  complexity: string
  categories: string[]
  langs: number
  teach?: boolean
}

function categoriesOf(id: string): string[] {
  const own = byDesignThought.modules.filter((m) => !m.planned && CATEGORY_STYLE[m.id] && m.items.includes(id)).map((m) => m.id)
  return [...new Set([...own, ...(EXTRA_MEMBERSHIP[id] ?? [])])]
}

const LIB_ENTRIES: LibEntry[] = [
  ...algoList.map((a) => ({
    id: a.meta.id,
    to: `/algo/${a.meta.id}`,
    title: a.meta.title,
    description: a.meta.description,
    complexity: a.meta.complexity,
    categories: categoriesOf(a.meta.id),
    langs: availableLanguages(a.meta.id).length,
  })),
  {
    id: TEACH_ID,
    to: '/teach/knapsack',
    title: '背包多策略教学',
    description: '同一实例对比暴力、二维/一维 DP、回溯、分支限界与贪心反例，逐策略回放。',
    complexity: '7 种策略',
    categories: ['dp', 'backtrack'],
    langs: availableLanguages('knapsack.dp2d').length,
    teach: true,
  },
]

function matches(e: LibEntry, q: string): boolean {
  if (!q) return true
  const cats = e.categories.map((c) => LIB_CATEGORIES.find((x) => x.id === c)?.title ?? '').join(' ')
  return `${e.title} ${e.id} ${e.description} ${e.complexity} ${cats}`.toLowerCase().includes(q)
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function AlgorithmLibrary() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>('all')
  const q = query.trim().toLowerCase()
  const bySearch = useMemo(() => LIB_ENTRIES.filter((e) => matches(e, q)), [q])
  const shown = cat === 'all' ? bySearch : bySearch.filter((e) => e.categories.includes(cat))
  const countIn = (c: string) => (c === 'all' ? bySearch.length : bySearch.filter((e) => e.categories.includes(c)).length)
  const style = (e: LibEntry) => CATEGORY_STYLE[e.categories[0] ?? ''] ?? CATEGORY_STYLE.intro!
  return (
    <section className="section lib" aria-labelledby="lib-title">
      <div className="section-head-row">
        <h2 id="lib-title">算法库</h2>
        <span className="lib-count" data-testid="home-result-count" role="status">
          共 {shown.length} 个
        </span>
      </div>
      <div className="lib-toolbar">
        <label className="lib-search">
          <SearchIcon />
          <input
            type="search"
            aria-label="在算法库中搜索"
            placeholder="搜索算法名称、英文 id、复杂度或描述…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="home-search"
          />
        </label>
        <div className="lib-filters" role="group" aria-label="算法分类" data-testid="home-filter">
          {[{ id: 'all', title: '全部' }, ...LIB_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              className="lib-filter"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
            >
              {c.title}
              <span className="n">{countIn(c.id)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="lib-grid" data-testid="algo-card-grid">
        {shown.map((e) => (
          <Link key={e.id} to={e.to} className={`lib-card${e.teach ? ' teach' : ''}`} data-testid={`algo-card-${e.id}`}>
            <div className="lib-card-top">
              <span className="lib-glyph" style={{ ['--glyph' as string]: style(e).gradient }} aria-hidden>
                {style(e).glyph}
              </span>
              <div>
                <h3>{e.title}</h3>
                <span className="lib-id">{e.teach ? '/teach/knapsack' : e.id}</span>
              </div>
            </div>
            <p>{e.description}</p>
            <div className="lib-card-foot">
              <span className="lib-tag mono lib-cx" title={e.complexity}>
                {e.complexity}
              </span>
              {e.categories.map((c) => (
                <span key={c} className="lib-tag">
                  {LIB_CATEGORIES.find((x) => x.id === c)?.title}
                </span>
              ))}
              <span className="lib-tag langs" data-testid="algo-card-langs" title="代码面板可切换的语言数">
                {e.langs} 种语言
              </span>
            </div>
          </Link>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="lib-empty" data-testid="home-empty" role="status">
          <span>没有匹配「{query.trim()}」的算法{cat !== 'all' ? '（当前分类内）' : ''}。</span>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setCat('all')
            }}
          >
            清除筛选
          </button>
        </div>
      )}
    </section>
  )
}

export default function Home() {
  const [navMode, setNavMode] = useState<'design' | 'problem'>('design')

  return (
    <div className="home">
      <header className="hero">
        <p className="eyebrow">算法设计与分析 · 交互学习</p>
        <h1>用可视化理解每一个步骤</h1>
        <p className="hero-desc">
          覆盖复杂度分析、分治、动态规划、贪心、图算法、网络流、字符串与复杂性理论。
          每个可视化器展示数组 / 矩阵 / 图状态与变量面板，支持逐步回放、进度拖拽与键盘控制。
        </p>
        <ul className="hero-stats" aria-label="概览">
          <li>
            <b>{algoList.length}</b>
            <span>交互算法</span>
          </li>
          <li>
            <b>{CODE_LANGUAGES.length}</b>
            <span>代码语言</span>
          </li>
          <li>
            <b>{chapters.length}</b>
            <span>讲义章节</span>
          </li>
          <li>
            <b>7</b>
            <span>背包策略</span>
          </li>
        </ul>
      </header>

      <AlgorithmLibrary />

      <section className="section">
        <div className="section-head-row">
          <h2>课程导航</h2>
          <div className="nav-mode-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={navMode === 'design'}
              className={navMode === 'design' ? 'active' : ''}
              onClick={() => setNavMode('design')}
            >
              按设计思想
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={navMode === 'problem'}
              className={navMode === 'problem' ? 'active' : ''}
              onClick={() => setNavMode('problem')}
            >
              按问题类型
            </button>
          </div>
        </div>
        <NavGroupView group={navMode === 'design' ? byDesignThought : byProblemType} />
      </section>

      <section className="section">
        <h2>课程章节（讲义）</h2>
        <div className="card-grid">
          {chapters.map((ch, i) => (
            <Link key={ch.id} to={`/chapter/${ch.id}`} className="card">
              <span className="card-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{ch.title}</h3>
              <p>{ch.subtitle}</p>
              <span className="card-meta">
                {ch.sections.length} 节 · {ch.algos.length} 个可视化
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>拓展规划</h2>
        <ul className="muted">
          {EXTENDED_PLANNED.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
