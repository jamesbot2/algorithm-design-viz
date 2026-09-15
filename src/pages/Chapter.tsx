import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChapter } from '../data/chapters'
import { algorithms } from '../algorithms'

/**
 * Inline markdown for trusted static chapter text only (**bold**, `code`).
 * No HTML passthrough — avoids dangerouslySetInnerHTML on any content.
 */
function inlineMd(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] != null) parts.push(<strong key={key++}>{m[2]}</strong>)
    else if (m[3] != null) parts.push(<code key={key++}>{m[3]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderMd(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('- ')) {
      return <li key={i}>{inlineMd(line.slice(2))}</li>
    }
    if (/^\d+\.\s/.test(line)) {
      return <li key={i}>{inlineMd(line.replace(/^\d+\.\s/, ''))}</li>
    }
    if (!line.trim()) return <br key={i} />
    return <p key={i}>{inlineMd(line)}</p>
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
