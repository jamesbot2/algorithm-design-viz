import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algorithms } from '../algorithms'
import { byDesignThought, byProblemType, completionLabel } from '../data/curriculum'
import { useMotion } from '../theme/MotionContext'
import { useLabTheme, type LabThemeId } from '../theme/LabThemeContext'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navMode, setNavMode] = useState<'design' | 'problem'>('design')
  const { userPref, setUserPref, density, setDensity } = useMotion()
  const { theme, setTheme } = useLabTheme()
  const location = useLocation()
  const navModules = useMemo(
    () => (navMode === 'design' ? byDesignThought.modules : byProblemType.modules),
    [navMode],
  )

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
          <div className="nav-group">导航视图</div>
          <div className="nav-mode-toggle compact">
            <button type="button" className={navMode === 'design' ? 'active' : ''} onClick={() => setNavMode('design')}>按设计思想</button>
            <button type="button" className={navMode === 'problem' ? 'active' : ''} onClick={() => setNavMode('problem')}>按问题类型</button>
          </div>
          {navModules.map((m) => (
            <div key={m.id}>
              <div className="nav-item nav-mod-label">
                <span className="nav-dot" />
                <span className="nav-item-label">{m.title}{m.planned ? ' · 规划' : ''}</span>
              </div>
              {!collapsed && (
                <div className="nav-algos">
                  <span className="nav-completion muted">{completionLabel(m.completion)}</span>
                  {m.items.map((aid) => {
                    const a = algorithms[aid]
                    if (!a) return null
                    return (
                      <NavLink key={aid} to={`/algo/${aid}`} className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')} onClick={() => setMobileOpen(false)}>
                        {a.meta.title}
                      </NavLink>
                    )
                  })}
                  {(m.id === 'knapsack-family' || m.id === 'dp' || m.id === 'backtrack') && (
                    <NavLink to="/teach/knapsack" className={({ isActive }) => (isActive ? 'nav-algo active' : 'nav-algo')} onClick={() => setMobileOpen(false)}>
                      背包多策略
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="nav-group">章节讲义</div>
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
          <NavLink to="/practice" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={() => setMobileOpen(false)}>
            <span className="nav-dot" />
            <span className="nav-item-label">练习台</span>
          </NavLink>
          <NavLink to="/experiment" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={() => setMobileOpen(false)}>
            <span className="nav-dot" />
            <span className="nav-item-label">实验台</span>
          </NavLink>
          <NavLink to="/lab/core" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')} onClick={() => setMobileOpen(false)}>
            <span className="nav-dot" />
            <span className="nav-item-label">实验讲义</span>
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
          <span className="spacer" style={{ flex: 1 }} />
          <label className="topbar-motion desktop-only-controls" title="Lab 主题">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>主题</span>
            <select
              aria-label="主题"
              value={theme}
              onChange={(e) => setTheme(e.target.value as LabThemeId)}
            >
              <option value="lab-dark">Lab 深色</option>
              <option value="lab-light">Lab 浅色</option>
              <option value="legacy">经典</option>
            </select>
          </label>
          <label className="topbar-motion" title="动画模式：跟随系统 / 减弱 / 标准">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>动效</span>
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
        <main className={`main${isAlgo ? ' wide' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
