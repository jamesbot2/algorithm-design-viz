import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algorithms } from '../algorithms'
import { byDesignThought, byProblemType, completionLabel } from '../data/curriculum'
import { useMotion } from '../theme/MotionContext'
import { useLabTheme, type LabThemeId } from '../theme/LabThemeContext'

export default function Layout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [heightFallback, setHeightFallback] = useState<'fill' | 'scroll'>('fill')
  const [navMode, setNavMode] = useState<'design' | 'problem'>('design')
  const [algoFilter, setAlgoFilter] = useState('')
  const { userPref, setUserPref, density, setDensity } = useMotion()
  const { theme, setTheme } = useLabTheme()
  const location = useLocation()
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const prevBodyOverflow = useRef<string | null>(null)
  const navModules = useMemo(
    () => (navMode === 'design' ? byDesignThought.modules : byProblemType.modules),
    [navMode],
  )

  /** Modal drawer only when both mobile breakpoint and open flag hold */
  const mobileModalOpen = isMobile && mobileDrawerOpen

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)')
    const apply = () => {
      const mobile = mq.matches
      setIsMobile(mobile)
      // Leaving mobile breakpoint must close drawer + release lock
      if (!mobile) setMobileDrawerOpen(false)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileModalOpen) {
        setMobileDrawerOpen(false)
        menuBtnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileModalOpen])

  // Body scroll lock — save/restore previous overflow; only while mobile modal open
  useEffect(() => {
    if (!mobileModalOpen) {
      if (prevBodyOverflow.current !== null) {
        document.body.style.overflow = prevBodyOverflow.current
        prevBodyOverflow.current = null
      }
      return
    }
    if (prevBodyOverflow.current === null) {
      prevBodyOverflow.current = document.body.style.overflow
    }
    document.body.style.overflow = 'hidden'
    drawerCloseRef.current?.focus()
    return () => {
      if (prevBodyOverflow.current !== null) {
        document.body.style.overflow = prevBodyOverflow.current
        prevBodyOverflow.current = null
      }
    }
  }, [mobileModalOpen])


  // V10-03: single height-budget owner — visualViewport + chrome + edit state
  useEffect(() => {
    const apply = () => {
      const vv = window.visualViewport
      const h = vv?.height ?? window.innerHeight
      const w = vv?.width ?? window.innerWidth
      const editing = !!document.querySelector('.algo-page[data-input-editing="1"]')
      const topbar = document.querySelector('.topbar') as HTMLElement | null
      const chrome = (topbar?.getBoundingClientRect().height ?? 48) + 24
      const remain = h - chrome
      // Soft keyboard / tiny portrait / expanded input on short view → scroll escape.
      // Demo (collapsed input) on moderate short landscape stays fill+compact.
      const scroll =
        h < 360 ||
        (h < 560 && w < 700) ||
        (editing && remain < 420) ||
        remain < 280
      setHeightFallback(scroll ? 'scroll' : 'fill')
      document.documentElement.dataset.heightBudget = scroll ? 'scroll' : 'fill'
    }
    apply()
    window.visualViewport?.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    const mo = new MutationObserver(apply)
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-input-editing'],
    })
    return () => {
      window.visualViewport?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
      mo.disconnect()
    }
  }, [])

  // Unmount: always release lock
  useEffect(() => {
    return () => {
      if (prevBodyOverflow.current !== null) {
        document.body.style.overflow = prevBodyOverflow.current
        prevBodyOverflow.current = null
      } else if (document.body.style.overflow === 'hidden') {
        // Only clear if we likely set it (best-effort without overwriting other owners blindly)
        document.body.style.overflow = ''
      }
    }
  }, [])

  const isAlgo = location.pathname.startsWith('/algo/')
  const isTeach = location.pathname.startsWith('/teach/')
  const isWide =
    isAlgo ||
    isTeach ||
    location.pathname.startsWith('/practice') ||
    location.pathname.startsWith('/experiment')

  const title = (() => {
    if (location.pathname === '/' || location.pathname === '') return '全部算法'
    if (location.pathname.startsWith('/teach/knapsack')) return '背包多策略教学'
    if (location.pathname.startsWith('/practice')) return '练习台'
    if (location.pathname.startsWith('/experiment')) return '实验台'
    if (location.pathname.startsWith('/lab/')) return '实验讲义'
    const chMatch = location.pathname.match(/\/chapter\/([^/]+)/)
    if (chMatch) return chapters.find((c) => c.id === chMatch[1])?.title ?? '章节'
    const aMatch = location.pathname.match(/\/algo\/([^/]+)/)
    if (aMatch) return algorithms[aMatch[1]]?.meta.title ?? '算法'
    return '算法设计与分析'
  })()

  const filterLower = algoFilter.trim().toLowerCase()
  const matchFilter = (label: string) => !filterLower || label.toLowerCase().includes(filterLower)

  const sidebarCls = [
    'sidebar',
    desktopCollapsed ? 'collapsed' : '',
    mobileDrawerOpen ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderAlgoLinks = (aids: string[]) =>
    aids.map((aid) => {
      const a = algorithms[aid]
      if (!a) return null
      if (!matchFilter(a.meta.title)) return null
      return (
        <NavLink
          key={aid}
          to={`/algo/${aid}`}
          className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')}
          onClick={() => setMobileDrawerOpen(false)}
          title={a.meta.title}
        >
          {a.meta.title}
        </NavLink>
      )
    })

  /** Catalog always rendered in DOM for mobile drawer; desktopCollapsed only hides labels on desktop */
  const showExpandedLabels = !desktopCollapsed || mobileDrawerOpen
  const sidebarInert = isMobile && !mobileDrawerOpen

  return (
    <div
      className="app-shell"
      data-desktop-collapsed={desktopCollapsed ? '1' : '0'}
      data-mobile-drawer={mobileDrawerOpen ? '1' : '0'}
      data-mobile={isMobile ? '1' : '0'}
      data-mobile-modal={mobileModalOpen ? '1' : '0'}
    >
      <div
        className={`sidebar-backdrop${mobileModalOpen ? ' visible' : ''}`}
        onClick={() => {
          if (!mobileModalOpen) return
          setMobileDrawerOpen(false)
          menuBtnRef.current?.focus()
        }}
        aria-hidden={!mobileModalOpen}
        hidden={!mobileModalOpen}
      />
      <aside
        className={sidebarCls}
        id="app-sidebar"
        aria-hidden={sidebarInert ? true : false}
        aria-label={mobileModalOpen ? '导航菜单' : undefined}
        data-testid="app-sidebar"
        // Entire offscreen sidebar (brand + close + nav) not tabbable when closed on mobile
        inert={sidebarInert ? true : undefined}
      >
        <div className="sidebar-top">
          <Link to="/" className="brand" onClick={() => setMobileDrawerOpen(false)} tabIndex={sidebarInert ? -1 : undefined}>
            <span className="brand-mark">Σ</span>
            <span className="brand-text">
              <strong>算法设计与分析</strong>
              <small>交互可视化教程</small>
            </span>
          </Link>
          <button
            type="button"
            className="ghost icon-btn sidebar-toggle desktop-collapse-btn"
            title={desktopCollapsed ? '展开侧栏' : '折叠侧栏'}
            aria-label={desktopCollapsed ? '展开侧栏' : '折叠侧栏'}
            data-testid="desktop-collapse-btn"
            tabIndex={sidebarInert ? -1 : undefined}
            onClick={() => setDesktopCollapsed((c) => !c)}
          >
            {desktopCollapsed ? '»' : '«'}
          </button>
          <button
            type="button"
            className="ghost icon-btn mobile-drawer-close"
            ref={drawerCloseRef}
            aria-label="关闭菜单"
            data-testid="mobile-drawer-close"
            tabIndex={sidebarInert ? -1 : undefined}
            onClick={() => {
              setMobileDrawerOpen(false)
              menuBtnRef.current?.focus()
            }}
          >
            ×
          </button>
        </div>

        <nav className="nav-scroll" data-testid="nav-scroll">
          <div className="nav-group">导航视图</div>
          {showExpandedLabels && (
            <label className="nav-search">
              <span className="sr-only">搜索算法</span>
              <input
                type="search"
                placeholder="搜索算法…"
                value={algoFilter}
                onChange={(e) => setAlgoFilter(e.target.value)}
                aria-label="搜索算法"
                data-testid="algo-search"
                tabIndex={sidebarInert ? -1 : undefined}
              />
            </label>
          )}
          <div className="nav-mode-toggle compact">
            <button
              type="button"
              className={navMode === 'design' ? 'active' : ''}
              onClick={() => setNavMode('design')}
              tabIndex={sidebarInert ? -1 : undefined}
            >
              按设计思想
            </button>
            <button
              type="button"
              className={navMode === 'problem' ? 'active' : ''}
              onClick={() => setNavMode('problem')}
              tabIndex={sidebarInert ? -1 : undefined}
            >
              按问题类型
            </button>
          </div>
          {navModules.map((m) => (
            <div key={m.id}>
              <div className="nav-item nav-mod-label" title={m.title}>
                <span className="nav-dot" aria-hidden />
                <span className="nav-item-label">
                  {m.title}
                  {m.planned ? ' · 规划' : ''}
                </span>
              </div>
              <div className={`nav-algos${desktopCollapsed && !mobileDrawerOpen ? ' nav-algos-compact' : ''}`}>
                {showExpandedLabels && (
                  <span className="nav-completion muted">{completionLabel(m.completion)}</span>
                )}
                {renderAlgoLinks(m.items)}
                {(m.id === 'knapsack-family' || m.id === 'dp' || m.id === 'backtrack') &&
                  matchFilter('背包多策略') && (
                    <NavLink
                      to="/teach/knapsack"
                      className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')}
                      onClick={() => setMobileDrawerOpen(false)}
                      title="背包多策略"
                      tabIndex={sidebarInert ? -1 : undefined}
                    >
                      背包多策略
                    </NavLink>
                  )}
              </div>
            </div>
          ))}
          <div className="nav-group">章节讲义</div>
          {chapters.map((ch) => (
            <div key={ch.id}>
              <NavLink
                to={`/chapter/${ch.id}`}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                onClick={() => setMobileDrawerOpen(false)}
                title={ch.title}
                tabIndex={sidebarInert ? -1 : undefined}
              >
                <span className="nav-dot" aria-hidden />
                <span className="nav-item-label">{ch.title}</span>
              </NavLink>
              <div className={`nav-algos${desktopCollapsed && !mobileDrawerOpen ? ' nav-algos-compact' : ''}`}>
                {renderAlgoLinks(ch.algos)}
              </div>
            </div>
          ))}
          <div className="nav-group">导航</div>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={() => setMobileDrawerOpen(false)}
            title="全部算法"
            tabIndex={sidebarInert ? -1 : undefined}
          >
            <span className="nav-dot" aria-hidden />
            <span className="nav-item-label">全部算法</span>
          </NavLink>
          <NavLink
            to="/practice"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={() => setMobileDrawerOpen(false)}
            title="练习台"
            tabIndex={sidebarInert ? -1 : undefined}
          >
            <span className="nav-dot" aria-hidden />
            <span className="nav-item-label">练习台</span>
          </NavLink>
          <NavLink
            to="/experiment"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={() => setMobileDrawerOpen(false)}
            title="实验台"
            tabIndex={sidebarInert ? -1 : undefined}
          >
            <span className="nav-dot" aria-hidden />
            <span className="nav-item-label">实验台</span>
          </NavLink>
          <NavLink
            to="/lab/core"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={() => setMobileDrawerOpen(false)}
            title="实验讲义"
            tabIndex={sidebarInert ? -1 : undefined}
          >
            <span className="nav-dot" aria-hidden />
            <span className="nav-item-label">实验讲义</span>
          </NavLink>
        </nav>
        <footer className="side-foot">GitHub Pages · 本地可视化</footer>
      </aside>

      <div className="main-wrap" data-lab-fill={isAlgo ? '1' : '0'} data-height-fallback={isAlgo ? heightFallback : undefined}>
        <header className="topbar">
          <button
            type="button"
            className="ghost icon-btn"
            aria-label={mobileModalOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileModalOpen}
            aria-controls="app-sidebar"
            data-testid="menu-btn"
            ref={menuBtnRef}
            onClick={() => {
              if (isMobile) setMobileDrawerOpen((o) => !o)
              else setDesktopCollapsed((c) => !c)
            }}
          >
            ☰
          </button>
          <span className="topbar-title">{title}</span>
          <span className="spacer" style={{ flex: 1 }} />
          <label className="topbar-motion desktop-only-controls" title="Lab 主题">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>
              主题
            </span>
            <select aria-label="主题" value={theme} onChange={(e) => setTheme(e.target.value as LabThemeId)}>
              <option value="lab-dark">Lab 深色</option>
              <option value="lab-light">Lab 浅色</option>
              <option value="legacy">经典</option>
            </select>
          </label>
          <label className="topbar-motion" title="动画模式：跟随系统 / 减弱 / 标准">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>
              动效
            </span>
            <select
              aria-label="动画模式"
              value={userPref === null ? 'system' : userPref}
              onChange={(e) => {
                const v = e.target.value
                setUserPref(v === 'system' ? null : (v as 'standard' | 'reduced'))
              }}
            >
              <option value="system">跟随系统</option>
              <option value="standard">标准</option>
              <option value="reduced">减弱</option>
            </select>
          </label>
          <button
            type="button"
            className="ghost icon-btn"
            title={density === 'projection' ? '切换普通密度' : '投影友好密度'}
            aria-label="投影密度"
            onClick={() => setDensity(density === 'projection' ? 'normal' : 'projection')}
          >
            {density === 'projection' ? '密' : '投'}
          </button>
        </header>
        <main className={`main${isWide ? ' wide' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
