import { Link } from 'react-router-dom'
import { TOPICS } from '../catalog/topics'
import { DIFFICULTY_LABEL } from '../catalog/types'
import { TEMPLATES } from '../templates/meta'
import '../components/advanced.css'

export function SectionIndex({ section }: { section: 'stl' | 'algorithms' }) {
  const items = TOPICS.filter((t) => t.section === section).sort((a, b) => a.routeOrder - b.routeOrder)
  return (
    <div className="page adv-page" data-testid={`adv-index-${section}`}>
      <h1>{section === 'stl' ? 'STL 专题' : '高阶算法'}</h1>
      <p className="muted adv-sub">
        <Link to="/advanced">高阶算法</Link> / {section === 'stl' ? 'STL 专题' : '算法'}
      </p>
      <ul className="adv-cards">
        {items.map((t) => (
          <li key={t.id}>
            <Link className="adv-card" to={`/advanced/${t.section}/${t.id}`} data-testid={`topic-${t.id}`}>
              <strong>{t.titleZh}</strong>
              <span className="muted">
                {t.titleEn} · {DIFFICULTY_LABEL[t.difficulty]}
              </span>
              <span>{t.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TemplateIndex() {
  return (
    <div className="page adv-page" data-testid="adv-index-templates">
      <h1>模板库</h1>
      <p className="muted adv-sub">
        <Link to="/advanced">高阶算法</Link> / 模板
      </p>
      <ul className="adv-cards">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <Link className="adv-card" to={`/advanced/templates/${t.id}`} data-testid={`tpl-${t.id}`}>
              <strong>{t.title}</strong>
              <span className="muted">
                {t.category} · {t.difficulty}
              </span>
              <span>
                {t.teachLanguages.length > 1 ? '教学版六语言 + ' : '教学版 C++ + '}竞赛版 C++（含 stdin/stdout 示例）
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
