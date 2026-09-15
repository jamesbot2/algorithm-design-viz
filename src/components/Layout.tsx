import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algorithms } from '../algorithms'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isAlgo = location.pathname.startsWith('/algo/')
  const title = (() => {
    if (location.pathname === '/' || location.pathname === '') return '全部算法'
    const chMatch = location.pathname.match(/\/chapter\/([^/]+)/)
    if (chMatch) return chapters.find((c) => c.id === chMatch[1])?.title ?? '章节'
    const aMatch = location.pathname.match(/\/algo\/([^/]+)/)
    if (aMatch) return algorithms[aMatch[1]]?.meta.title ?? '算法'
    return '算法设计与分析'
  })()

  const sidebarCls = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop${mobileOpen ? ' visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <aside className={sidebarCls}>
        <div className="sidebar-top">
          <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
            <span className="brand-mark">Σ</span>
            <span className="brand-text">
              <strong>算法设计与分析</strong>
              <small>交互可视化教程</small>
            </span>
          </Link>
          <button
            type="button"
            className="ghost icon-btn sidebar-toggle"
            title={collapsed ? '展开侧栏' : '折叠侧栏'}
            aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="nav-scroll">
          <div className="nav-group">章节</div>
          {chapters.map((ch) => (
            <div key={ch.id}>
              <NavLink
                to={`/chapter/${ch.id}`}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-dot" />
                <span className="nav-item-label">{ch.title}</span>
              </NavLink>
              {!collapsed && ch.algos.length > 0 && (
                <div className="nav-algos">
                  {ch.algos.map((aid) => {
                    const a = algorithms[aid]
                    if (!a) return null
                    return (
                      <NavLink
                        key={aid}
                        to={`/algo/${aid}`}
                        className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')}
                        onClick={() => setMobileOpen(false)}
                      >
                        {a.meta.title}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="nav-group">导航</div>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-dot" />
            <span className="nav-item-label">全部算法</span>
          </NavLink>
        </nav>
        <footer className="side-foot">GitHub Pages · 本地可视化</footer>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button
            type="button"
            className="ghost icon-btn"
            aria-label="打开菜单"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
          <span className="topbar-title">{title}</span>
        </header>
        <main className={`main${isAlgo ? ' wide' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
