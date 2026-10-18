import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TOPICS } from '../catalog/topics'
import { ROADMAP } from '../catalog/roadmap'
import { searchRoadmap, searchTopics } from '../catalog/search'
import { DIFFICULTY_LABEL } from '../catalog/types'
import '../components/advanced.css'

const topicHref = (t: (typeof TOPICS)[number]) => `/advanced/${t.section}/${t.id}`

export default function AdvancedHome() {
  const [q, setQ] = useState('')
  const found = searchTopics({ q })
  const road = q.trim() ? searchRoadmap(q) : ROADMAP
  return (
    <div className="page adv-page" data-testid="adv-home">
      <h1>高阶算法</h1>
      <p className="muted adv-sub">竞赛与进阶：STL 专题与高阶数据结构/算法。每一项都带讲解、逐步演示与可复制模板；只列出已交付的内容。</p>
      <nav className="adv-entries" aria-label="高阶算法入口">
        <Link className="adv-card" to="/advanced/stl" data-testid="entry-stl">
          <strong>STL 专题</strong>
          <span>lower_bound / priority_queue：接口、复杂度、陷阱与演示</span>
        </Link>
        <Link className="adv-card" to="/advanced/algorithms" data-testid="entry-algorithms">
          <strong>高阶算法</strong>
          <span>并查集、树状数组：核心想法、演示与六语言代码</span>
        </Link>
        <Link className="adv-card" to="/advanced/templates" data-testid="entry-templates">
          <strong>模板库</strong>
          <span>教学版与竞赛版，含头注释、样例、反例与导出</span>
        </Link>
      </nav>
      <section aria-labelledby="adv-find-h">
        <h2 id="adv-find-h">查找主题</h2>
        <label className="adv-search">
          <span className="sr-only">搜索高阶算法主题</span>
          <input type="search" placeholder="中文名 / 英文名 / 缩写，如 BIT、DSU、lower_bound" value={q} onChange={(e) => setQ(e.target.value)} data-testid="adv-search" />
        </label>
        {found.length === 0 ? (
          <p className="muted" data-testid="adv-no-result">
            没有已交付的匹配主题。{road.length > 0 && '下方路线图里有相关的计划项，尚不可学习。'}
          </p>
        ) : (
          <ul className="adv-cards" data-testid="adv-results">
            {found.map((t) => (
              <li key={t.id}>
                <Link className="adv-card" to={topicHref(t)} data-testid={`topic-${t.id}`}>
                  <strong>{t.titleZh}</strong>
                  <span className="muted">
                    {t.titleEn} · {DIFFICULTY_LABEL[t.difficulty]}
                  </span>
                  <span>{t.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="adv-road-h" data-testid="adv-roadmap">
        <h2 id="adv-road-h">路线图（计划中，尚不可学习）</h2>
        {road.length === 0 ? (
          <p className="muted">没有匹配的计划项。</p>
        ) : (
          <ul className="adv-road">
            {road.map((r) => (
              <li key={r.id} data-testid={`road-${r.id}`}>
                {r.titleZh} <span className="muted">/ {r.titleEn}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
