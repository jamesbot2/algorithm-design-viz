import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algorithms } from '../algorithms'
import { NavCatalog, type NavMode } from './nav/NavCatalog'
import { NavIcon, type NavIconName } from './nav/NavIcons'
import { useMotion } from '../theme/MotionContext'
import { useLabTheme, type LabThemeId } from '../theme/LabThemeContext'
import { BUILD_INFO, buildInfoLabel } from '../buildInfo'
import { WorkspaceBudgetContext, type WorkspaceBudget } from './workbench/WorkspaceBudget'

export default function Layout() {
  // V23: compact nav rail by default when the desktop is too narrow for nav + demo + code
  // (the user never has to collapse nav / shrink the browser); the toggle still wins.
  const [desktopCollapsed, setDesktopCollapsed] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 961px) and (max-width: 1439px)').matches,
  )
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 960px)').matches,
  )
  /** V32: desktop rail → non-modal catalog popover (does not change workbench width) */
  const [catalogOpen, setCatalogOpen] = useState(false)
  const catalogBtnRef = useRef<HTMLButtonElement>(null)
  const catalogPopRef = useRef<HTMLDivElement>(null)
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())
  const mainRef = useRef<HTMLElement>(null)
  const [budget, setBudget] = useState<WorkspaceBudget>({ viewportHeight: 0, viewportWidth: 0 })
  const [navMode, setNavMode] = useState<NavMode>('design')
  const [algoFilter, setAlgoFilter] = useState('')
  const { userPref, setUserPref, density, setDensity } = useMotion()
  const { theme, setTheme } = useLabTheme()
  const location = useLocation()
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const prevBodyOverflow = useRef<string | null>(null)

  /** Modal drawer only when both mobile breakpoint and open flag hold */
  const mobileModalOpen = isMobile && mobileDrawerOpen

  useEffect(() => {
    setMobileDrawerOpen(false)
    setCatalogOpen(false)
  }, [location.pathname])

  const rail = desktopCollapsed && !isMobile
  const popOpen = rail && catalogOpen
  const closeCatalog = (restoreFocus: boolean) => {
    setCatalogOpen(false)
    if (restoreFocus) catalogBtnRef.current?.focus()
  }

  // V32: popover catalog — ESC and outside pointer close it; focus returns to the rail entry.
  useEffect(() => {
    if (!popOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeCatalog(true)
      }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (catalogPopRef.current?.contains(t) || catalogBtnRef.current?.contains(t)) return
      setCatalogOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [popOpen])

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


  // V23: measure the REAL page scroll viewport (ResizeObserver) and publish it.
  // Replaces the V10 visualViewport + body MutationObserver height guess.
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    const read = () => {
      // Lab pages: <main> is the scroll viewport (fixed height). Document pages: the window scrolls.
      const own = el.clientHeight
      const scrolls = getComputedStyle(el).overflowY !== 'visible'
      const h = scrolls ? own : document.documentElement.clientHeight - el.offsetTop
      setBudget((b) => (b.viewportHeight === h && b.viewportWidth === el.clientWidth ? b : { viewportHeight: h, viewportWidth: el.clientWidth }))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [location.pathname])

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

  const sidebarCls = ['sidebar', rail ? 'collapsed' : '', mobileDrawerOpen ? 'open' : ''].filter(Boolean).join(' ')
  const sidebarInert = isMobile && !mobileDrawerOpen
  const closeDrawer = () => setMobileDrawerOpen(false)
  const toggleFold = (id: string) =>
    setFolded((f) => {
      const n = new Set(f)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const catalogProps = {
    mode: navMode,
    setMode: setNavMode,
    filter: algoFilter,
    setFilter: setAlgoFilter,
    folded,
    toggleFold,
  }
  const primaryNav: { to: string; label: string; icon: NavIconName; end?: boolean; match?: string }[] = [
    { to: '/', label: '全部算法', icon: 'home', end: true },
    { to: '/practice', label: '练习台', icon: 'practice' },
    { to: '/experiment', label: '实验台', icon: 'lab' },
    { to: '/lab/core', label: '实验讲义', icon: 'notes', match: '/lab/' },
  ]
  const onAlgoPage = isAlgo || isTeach

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
        // Entire offscreen sidebar not tabbable when the mobile drawer is closed (inert covers all descendants)
        inert={sidebarInert ? true : undefined}
      >
        <div className="sidebar-top">
          <Link
            to="/"
            className="brand"
            onClick={closeDrawer}
            aria-label={rail ? '算法设计与分析 · 首页' : undefined}
            title={rail ? '算法设计与分析 · 首页' : undefined}
          >
            <span className="brand-mark" aria-hidden={rail ? true : undefined}>Σ</span>
            {!rail && (
              <span className="brand-text">
                <strong>算法设计与分析</strong>
                <small>交互可视化教程</small>
              </span>
            )}
          </Link>
          {!isMobile && (
            <button
              type="button"
              className="ghost icon-btn sidebar-toggle desktop-collapse-btn"
              title={desktopCollapsed ? '展开侧栏' : '折叠侧栏'}
              aria-label={desktopCollapsed ? '展开侧栏' : '折叠侧栏'}
              aria-expanded={!desktopCollapsed}
              aria-controls="app-sidebar"
              data-testid="desktop-collapse-btn"
              onClick={() => {
                setCatalogOpen(false)
                setDesktopCollapsed((c) => !c)
              }}
            >
              <NavIcon name={desktopCollapsed ? 'expand' : 'collapse'} />
            </button>
          )}
          {isMobile && (
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
          )}
        </div>

        <nav className="nav-scroll" data-testid="nav-scroll" aria-label="主导航">
          <ul className="nav-primary">
            {primaryNav.slice(0, 1).map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={closeDrawer} title={rail ? n.label : undefined} aria-label={rail ? n.label : undefined}>
                  <NavIcon name={n.icon} />
                  {!rail && <span className="nav-item-label">{n.label}</span>}
                </NavLink>
              </li>
            ))}
            {rail && (
              <li>
                <button
                  type="button"
                  ref={catalogBtnRef}
                  className={`nav-item nav-catalog-entry${onAlgoPage ? ' has-current' : ''}`}
                  aria-label="算法目录"
                  title="算法目录（搜索 / 分组）"
                  aria-expanded={popOpen}
                  aria-controls="nav-catalog-pop"
                  aria-haspopup="dialog"
                  data-testid="catalog-entry"
                  onClick={() => setCatalogOpen((o) => !o)}
                >
                  <NavIcon name="catalog" />
                </button>
              </li>
            )}
            {primaryNav.slice(1).map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => (isActive || (n.match && location.pathname.startsWith(n.match)) ? 'nav-item active' : 'nav-item')}
                  onClick={closeDrawer}
                  title={rail ? n.label : undefined}
                  aria-label={rail ? n.label : undefined}
                >
                  <NavIcon name={n.icon} />
                  {!rail && <span className="nav-item-label">{n.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          {!rail && <NavCatalog {...catalogProps} onNavigate={closeDrawer} idPrefix="nav-side" />}
        </nav>
        {!rail && (
          <footer className="side-foot">
          GitHub Pages · 本地可视化
          <div
            className="build-info muted"
            data-testid="build-info"
            data-build-sha={BUILD_INFO.sha}
            data-build-time={BUILD_INFO.time}
            title={`构建时间 ${BUILD_INFO.time}`}
          >
            {buildInfoLabel()}
          </div>
        </footer>
        )}
      </aside>
      {popOpen && (
        <div className="nav-pop" id="nav-catalog-pop" role="dialog" aria-labelledby="nav-pop-title" ref={catalogPopRef} data-testid="catalog-pop">
          <NavCatalog {...catalogProps} onNavigate={() => setCatalogOpen(false)} autoFocusSearch idPrefix="nav-pop" />
        </div>
      )}

      <div className="main-wrap" data-lab-fill={isAlgo ? '1' : '0'}>
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
        <main className={`main${isWide ? ' wide' : ''}`} ref={mainRef}>
          <WorkspaceBudgetContext.Provider value={budget}>
            <Outlet />
          </WorkspaceBudgetContext.Provider>
        </main>
      </div>
    </div>
  )
}
