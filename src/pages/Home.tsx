import { useState } from 'react'
import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algoList } from '../algorithms'
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
      </header>

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
        <h2>算法可视化</h2>
        <div className="algo-chips">
          {algoList.map((a) => (
            <Link key={a.meta.id} to={`/algo/${a.meta.id}`} className="chip">
              {a.meta.title}
            </Link>
          ))}
          <Link to="/teach/knapsack" className="chip chip-teach">
            背包多策略教学
          </Link>
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
