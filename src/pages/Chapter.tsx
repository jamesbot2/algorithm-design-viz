import { Link, useParams } from 'react-router-dom'
import { getChapter } from '../data/chapters'
import { algorithms } from '../algorithms'

function renderMd(text: string) {
  return text.split('\n').map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
    if (line.startsWith('- ')) {
      return <li key={i} dangerouslySetInnerHTML={{ __html: html.slice(2) }} />
    }
    if (/^\d+\.\s/.test(line)) {
      return <li key={i} dangerouslySetInnerHTML={{ __html: html.replace(/^\d+\.\s/, '') }} />
    }
    if (!line.trim()) return <br key={i} />
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
  })
}

export default function Chapter() {
  const { id } = useParams()
  const ch = getChapter(id ?? '')
  if (!ch) {
    return (
      <div className="page">
        <p>未找到章节。</p>
        <Link to="/">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="page chapter-page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>{ch.title}</h1>
        <p className="subtitle">{ch.subtitle}</p>
      </div>

      {ch.algos.length > 0 && (
        <div className="related-algos">
          <h3>相关可视化</h3>
          <div className="algo-chips">
            {ch.algos.map((aid) => {
              const a = algorithms[aid]
              if (!a) return null
              return (
                <Link key={aid} to={`/algo/${aid}`} className="chip">
                  {a.meta.title}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {ch.sections.map((sec) => (
        <article key={sec.id} className="theory-block" id={sec.id}>
          <h2>{sec.title}</h2>
          <div className="theory-body">{renderMd(sec.content)}</div>
        </article>
      ))}
    </div>
  )
}
