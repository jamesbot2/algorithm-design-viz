import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getFavorites, getRecent, templateLanguages, templateStatus, toggleFavorite } from '../templates/prefs'
import { VALIDATION_LABEL } from '../templates/validation'
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
  const [favs, setFavs] = useState<string[]>(getFavorites)
  const [recent] = useState<string[]>(getRecent)
  const [cat, setCat] = useState('')
  const [lang, setLang] = useState('')
  const [status, setStatus] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const cats = [...new Set(TEMPLATES.map((t) => t.category))]
  const langs = [...new Set(TEMPLATES.flatMap((t) => templateLanguages(t.id)))]
  const shown = TEMPLATES.filter((t) => (!cat || t.category === cat) && (!lang || templateLanguages(t.id).includes(lang)) && (!status || templateStatus(t.id) === status) && (!onlyFav || favs.includes(t.id)))
  const card = (t: (typeof TEMPLATES)[number]) => (
    <li key={t.id} className="adv-tpl-item" data-testid={`tpl-item-${t.id}`}>
      <Link className="adv-card" to={`/advanced/templates/${t.id}`} data-testid={`tpl-${t.id}`}>
        <strong>{t.title}</strong>
        <span className="muted">
          {t.category} · {t.difficulty} · {VALIDATION_LABEL[templateStatus(t.id)]}
        </span>
        <span>
          {t.teachLanguages.length > 1 ? '教学版六语言 + ' : '教学版 C++ + '}竞赛版 C++（含 stdin/stdout 示例）
        </span>
      </Link>
      <button
        type="button"
        className="adv-fav"
        data-testid={`fav-${t.id}`}
        aria-pressed={favs.includes(t.id)}
        aria-label={`${favs.includes(t.id) ? '取消收藏' : '收藏'} ${t.title}`}
        onClick={() => setFavs(toggleFavorite(t.id))}
      >
        {favs.includes(t.id) ? '★ 已收藏' : '☆ 收藏'}
      </button>
    </li>
  )
  return (
    <div className="page adv-page" data-testid="adv-index-templates">
      <h1>模板库</h1>
      <p className="muted adv-sub">
        <Link to="/advanced">高阶算法</Link> / 模板
      </p>
      <p className="muted">收藏与最近查看只保存在本浏览器（localStorage），不会上传。</p>
      {recent.length > 0 && (
        <section data-testid="tpl-recent" aria-label="最近查看">
          <h2>最近查看</h2>
          <ul className="adv-cards">
            {recent.map((id) => TEMPLATES.find((t) => t.id === id)).filter((t): t is (typeof TEMPLATES)[number] => !!t).map((t) => (
              <li key={t.id}>
                <Link className="adv-card" to={`/advanced/templates/${t.id}`} data-testid={`recent-${t.id}`}>
                  <strong>{t.title}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="adv-filters" role="group" aria-label="筛选模板" data-testid="tpl-filters">
        <label>分类 <select data-testid="filter-category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">全部</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label>语言 <select data-testid="filter-language" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">全部</option>{langs.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label>验证状态 <select data-testid="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">全部</option>{(Object.keys(VALIDATION_LABEL) as (keyof typeof VALIDATION_LABEL)[]).map((c) => <option key={c} value={c}>{VALIDATION_LABEL[c]}</option>)}</select></label>
        <label><input type="checkbox" data-testid="filter-fav" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} /> 只看收藏</label>
        <span className="muted" data-testid="tpl-count">{shown.length} / {TEMPLATES.length}</span>
      </div>
      {shown.length === 0 ? <p data-testid="tpl-empty">没有符合条件的模板。</p> : <ul className="adv-cards">{shown.map(card)}</ul>}
    </div>
  )
}
