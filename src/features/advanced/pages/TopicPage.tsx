import '../components/advanced.css'
import { lazy, Suspense } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TOPICS } from '../catalog/topics'
import { DIFFICULTY_LABEL } from '../catalog/types'
import { templateById } from '../templates/meta'
import { CapChips } from './CapChips'
import { CONTENT_LOADERS } from '../content/loaders'
import { useAsync } from './useAsync'

const AdvancedDemo = lazy(() => import('./AdvancedDemo'))

export default function TopicPage({ section }: { section: 'stl' | 'algorithms' }) {
  const { topicId } = useParams()
  const [sp] = useSearchParams()
  const topic = TOPICS.find((t) => t.id === topicId && t.section === section)
  if (!topic) {
    return (
      <div className="page adv-page" data-testid="adv-notfound">
        <h1>没有这个主题</h1>
        <p>
          「{topicId}」不在已交付的高阶算法中。<Link to="/advanced">回到高阶算法</Link>
        </p>
      </div>
    )
  }
  const base = `/advanced/${section}/${topic.id}`
  const view = sp.get('view') === 'demo' ? 'demo' : 'explain'
  return (
    <>
      {view === 'demo' ? (
        <Suspense fallback={<div className="page adv-page muted">加载演示…</div>}>
          <div className="adv-demo-wrap" data-testid="adv-topic-demo">
            <TopicTabs base={base} view="demo" templateId={topic.templateId} />
            <AdvancedDemo topic={topic} />
          </div>
        </Suspense>
      ) : (
        <div className="page adv-page adv-topic" data-testid="adv-topic" data-topic-id={topic.id}>
          <TopicTabs base={base} view="explain" templateId={topic.templateId} />
          <h1>{topic.titleZh}</h1>
          <p className="muted adv-sub">
            {topic.titleEn} · {DIFFICULTY_LABEL[topic.difficulty]}
            {topic.standard ? ` · ${topic.standard}` : ''}
          </p>
          <CapChips caps={topic.caps} />
          <Explanation topicId={topic.id} templateId={topic.templateId} base={base} />
        </div>
      )}
    </>
  )
}

function TopicTabs({ base, view, templateId }: { base: string; view: 'explain' | 'demo'; templateId?: string }) {
  return (
    <nav className="adv-tabs" aria-label="主题视图" data-testid="adv-tabs">
      <Link to={base} aria-current={view === 'explain' ? 'page' : undefined} className={view === 'explain' ? 'active' : ''} data-testid="tab-explain">
        讲解
      </Link>
      <Link to={`${base}?view=demo`} aria-current={view === 'demo' ? 'page' : undefined} className={view === 'demo' ? 'active' : ''} data-testid="tab-demo">
        演示
      </Link>
      {templateId && (
        <Link to={`/advanced/templates/${templateId}`} data-testid="tab-template">
          模板
        </Link>
      )}
    </nav>
  )
}

function Explanation({ topicId, templateId, base }: { topicId: string; templateId?: string; base: string }) {
  const { value, error } = useAsync(() => CONTENT_LOADERS[topicId]!(), [topicId])
  if (error) return <p role="alert">讲解内容加载失败：{error}</p>
  if (!value) return <p className="muted" data-testid="adv-content-loading">加载讲解…</p>
  const tpl = templateById(templateId)
  return (
    <div className="adv-prose" data-testid="adv-content">
      <aside className="adv-notice" data-testid="adv-boundary" aria-label="边界说明">
        <strong>标准保证 vs 本页模型</strong>
        <ul>
          {value.boundary.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </aside>
      {value.sections.map((s) => (
        <section key={s.id} id={s.id} data-testid={`sec-${s.id}`}>
          <h2>{s.title}</h2>
          {s.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.bullets && (
            <ul>
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {s.table && (
            <div className="adv-table-wrap">
              <table>
                <thead>
                  <tr>
                    {s.table.head.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.code && (
            <pre className="adv-code" tabIndex={0} aria-label={s.code.label ?? '代码示例'}>
              <code>{s.code.text}</code>
            </pre>
          )}
        </section>
      ))}
      <section id="template" data-testid="sec-template">
        <h2>可复制模板</h2>
        <p>
          {tpl ? `${tpl.title}：教学版（含执行映射）与竞赛版（含 stdin/stdout 示例），带头注释、复杂度、样例与反例。` : '暂无模板。'}{' '}
          {templateId && <Link to={`/advanced/templates/${templateId}`}>打开模板页</Link>}
        </p>
        <p>
          <Link to={`${base}?view=demo`} className="primary-link">
            进入逐步演示
          </Link>
        </p>
      </section>
    </div>
  )
}
