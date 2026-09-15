import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { algoList } from '../algorithms'

export default function Home() {
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
        <h2>课程章节</h2>
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
        </div>
      </section>
    </div>
  )
}
