import { Link, NavLink, Outlet } from 'react-router-dom'
import { chapters } from '../data/chapters'

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">Σ</span>
          <span>
            <strong>算法设计与分析</strong>
            <small>交互可视化教程</small>
          </span>
        </Link>
        <nav>
          <div className="nav-group">章节</div>
          {chapters.map((ch) => (
            <NavLink key={ch.id} to={`/chapter/${ch.id}`} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              {ch.title}
            </NavLink>
          ))}
          <div className="nav-group">可视化入口</div>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            全部算法
          </NavLink>
        </nav>
        <footer className="side-foot">GitHub Pages 就绪</footer>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
