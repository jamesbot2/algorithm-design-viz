import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CodeBrowser from '../../../components/codeBrowser/CodeBrowser'
import { useCodeLanguage } from '../../../codeCatalog/languagePreference'
import { peekLanguageDoc, loadAlgoLanguages, LANGUAGE_LABEL } from '../../../codeCatalog/languages'
import type { CodeDocument, CodeLanguage } from '../../../codeCatalog/types'
import { TOPICS } from '../catalog/topics'
import { templateById } from '../templates/meta'
import { SOURCE_HASHES, VALIDATION_LABEL, validationState, toolchainInfo } from '../templates/validation'
import { CATALOG_LOADERS, type CatalogBundle } from '../components/catalogLoaders'
import { useAsync } from './useAsync'
import '../components/advanced.css'

const EXT: Record<string, string> = { typescript: 'ts', python: 'py', cpp: 'cpp', java: 'java', rust: 'rs', go: 'go' }

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function TemplatePage() {
  const { templateId } = useParams()
  const tpl = templateById(templateId)
  const topic = TOPICS.find((t) => t.templateId === tpl?.id)
  const [variant, setVariant] = useState<'teach' | 'contest'>('teach')
  const [form, setForm] = useState<'core' | 'full'>('core')
  const [pref] = useCodeLanguage()
  const [msg, setMsg] = useState('')
  const teach = useAsync<CatalogBundle>(() => CATALOG_LOADERS[tpl?.id.replace(/-/g, '_') ?? '']!(), [tpl?.id])
  const contest = useAsync(() => import('../templates/sources.generated').then((m) => m.default), [])
  const cppOnly = tpl ? tpl.teachLanguages.length === 1 : true
  const teachLang: CodeLanguage = cppOnly ? 'cpp' : pref
  const [extra, setExtra] = useState<CodeDocument | null>(null)

  useEffect(() => {
    setMsg('')
  }, [variant, form, teachLang, tpl?.id])
  useEffect(() => {
    let live = true
    setExtra(null)
    if (!tpl || cppOnly || teachLang === 'typescript') return
    void loadAlgoLanguages(tpl.id, teach.value?.typescript.anchors ?? []).then((m) => live && setExtra(m.get(teachLang as Exclude<CodeLanguage, 'typescript'>) ?? null))
    return () => {
      live = false
    }
  }, [tpl, cppOnly, teachLang, teach.value])

  const cs = tpl ? contest.value?.[tpl.id] : undefined
  const shown: { name: string; text: string; hash?: string; key: string } | null = useMemo(() => {
    if (!tpl) return null
    if (variant === 'contest') {
      if (!cs) return null
      const part = cs[form]
      return { name: `${tpl.id}_contest_${form}.cpp`, text: part.source, hash: part.hash, key: `${tpl.id}|contest-${form}|cpp|run` }
    }
    const doc = cppOnly || teachLang === 'typescript' ? teach.value?.typescript : (extra ?? peekLanguageDoc(tpl.id, teachLang))
    if (!doc) return null
    return { name: `${tpl.id}_teach.${EXT[teachLang] ?? 'txt'}`, text: doc.source, hash: doc.sourceHash, key: `${tpl.id}|teach|${teachLang}|run` }
  }, [tpl, variant, form, cs, cppOnly, teachLang, teach.value, extra])

  if (!tpl) {
    return (
      <div className="page adv-page" data-testid="adv-notfound">
        <h1>没有这个模板</h1>
        <p>
          <Link to="/advanced/templates">回到模板库</Link>
        </p>
      </div>
    )
  }
  const base = topic ? `/advanced/${topic.section}/${topic.id}` : '/advanced'
  const h = tpl.header
  // The hash shown is the hash of the exact text displayed AND copied/exported.
  const v = shown ? validationState(shown.key, shown.hash) : { state: 'unverified' as const }
  const expected = variant === 'contest' ? SOURCE_HASHES[tpl.id]?.contest?.[form] : SOURCE_HASHES[tpl.id]?.teach?.[teachLang]
  const hashDrift = !!shown?.hash && !!expected && shown.hash !== expected

  return (
    <div className="page adv-page adv-template" data-testid="adv-template" data-template-id={tpl.id}>
      <nav className="adv-tabs" aria-label="模板导航">
        <Link to={`${base}?view=demo`} data-testid="back-to-demo">
          返回演示
        </Link>
        <Link to={base}>讲解</Link>
        <Link to="/advanced/templates">模板库</Link>
      </nav>
      <h1>{tpl.title} 模板</h1>
      <p className="muted adv-sub">
        {tpl.category} · {tpl.difficulty}
      </p>
      <div className="adv-tabs" role="group" aria-label="模板版本" data-testid="variant-toggle">
        <button type="button" className={variant === 'teach' ? 'active' : ''} aria-pressed={variant === 'teach'} onClick={() => setVariant('teach')} data-testid="variant-teach">
          教学版
        </button>
        <button type="button" className={variant === 'contest' ? 'active' : ''} aria-pressed={variant === 'contest'} onClick={() => setVariant('contest')} data-testid="variant-contest">
          竞赛版
        </button>
      </div>
      {variant === 'contest' && (
        <div className="adv-tabs" role="group" aria-label="竞赛版形式" data-testid="form-toggle">
          <button type="button" className={form === 'core' ? 'active' : ''} aria-pressed={form === 'core'} onClick={() => setForm('core')} data-testid="form-core">
            仅核心
          </button>
          <button type="button" className={form === 'full' ? 'active' : ''} aria-pressed={form === 'full'} onClick={() => setForm('full')} data-testid="form-full">
            含 stdin/stdout 示例
          </button>
        </div>
      )}
      <section className="tpl-header" aria-label="头注释与约束" data-testid="tpl-header">
        <h2>头注释 / 约束 / 复杂度</h2>
        <dl>
          <dt>标准</dt>
          <dd>{h.standard}</dd>
          <dt>头文件</dt>
          <dd>{h.headers.join(' ') || '—'}</dd>
          <dt>依赖</dt>
          <dd>{h.depends.join('、') || '无'}</dd>
          <dt>索引</dt>
          <dd>{h.indexing}</dd>
          <dt>区间</dt>
          <dd>{h.interval}</dd>
          <dt>数值范围</dt>
          <dd>{h.limits}</dd>
          <dt>时间</dt>
          <dd>{h.timeComplexity}</dd>
          <dt>空间</dt>
          <dd>{h.spaceComplexity}</dd>
        </dl>
      </section>
      <p className="adv-notice" data-testid="variant-note">
        {variant === 'teach'
          ? cppOnly
            ? '教学版：C++ 参考代码，语义映射仅用于本站演示的操作模型；本页不会执行用户编辑的源码。'
            : '教学版：六语言代码，与演示共用同一份语义映射（演示页会高亮正在执行的语句）。'
          : tpl.contestNote}
      </p>
      <section aria-label="模板代码" data-testid="tpl-code-section">
        {variant === 'teach' ? (
          teach.value ? (
            <div className="tpl-teach-code">
              <CodeBrowser algoId={cppOnly ? undefined : tpl.id} documents={teach.value} singleLanguage={cppOnly ? 'cpp' : undefined} unmapped={false} numericFallback="forbidden" />
            </div>
          ) : (
            <p className="muted">加载模板…</p>
          )
        ) : cs ? (
          <ContestCode text={cs[form].source} label={`${tpl.title} 竞赛版（${form === 'core' ? '核心' : '含 stdin/stdout 示例'}）`} />
        ) : (
          <p className="muted">加载模板…</p>
        )}
      </section>
      <div className="tpl-actions" data-testid="tpl-actions">
        <span data-testid="tpl-shown" data-variant={variant} data-lang={variant === 'contest' ? 'cpp' : teachLang} data-form={variant === 'contest' ? form : ''} className="muted">
          当前：{variant === 'teach' ? '教学版' : '竞赛版'} · {LANGUAGE_LABEL[variant === 'contest' ? 'cpp' : teachLang]}
          {variant === 'contest' ? ` · ${form === 'core' ? '核心' : '含示例'}` : ''}
        </span>
        <button
          type="button"
          disabled={!shown}
          data-testid="tpl-copy"
          onClick={async () => setMsg(shown && (await copyText(shown.text)) ? '已复制' : '复制失败：请手动选择文本')}
        >
          复制当前
        </button>
        <button type="button" disabled={!shown} data-testid="tpl-export" onClick={() => shown && (download(shown.name, shown.text), setMsg(`已导出 ${shown.name}`))}>
          导出文件
        </button>
        <span role="status" data-testid="tpl-msg">
          {msg}
        </span>
      </div>
      <p className="tpl-validation" data-testid="tpl-validation" data-state={hashDrift ? 'stale' : v.state}>
        验证状态：<strong>{hashDrift ? VALIDATION_LABEL.stale : VALIDATION_LABEL[v.state]}</strong>
        {shown?.hash && <span className="muted"> · 源码 SHA-256 {shown.hash.slice(0, 12)}…</span>}
        {v.entry && <span className="muted"> · {v.entry.checks}（{v.entry.tests} 项）· {v.entry.toolchain}</span>}
        <span className="muted"> · 测试集 adv-tests-v1 · 工具链：{Object.values(toolchainInfo()).join('；') || '—'}</span>
      </p>
      {variant === 'contest' && form === 'full' && (
        <section data-testid="tpl-sample">
          <h2>stdin / stdout 样例</h2>
          <p className="muted">{tpl.ioProtocol}</p>
          <div className="tpl-sample">
            <div>
              <h3>输入</h3>
              <pre tabIndex={0}>{tpl.sample.input}</pre>
            </div>
            <div>
              <h3>输出</h3>
              <pre tabIndex={0}>{tpl.sample.output}</pre>
            </div>
          </div>
          <p>{tpl.sample.note}</p>
        </section>
      )}
      <section data-testid="tpl-counter">
        <h2>反例：{tpl.counterexample.title}</h2>
        <p>{tpl.counterexample.explanation}</p>
        <ul>
          <li>输入：<code>{tpl.counterexample.input}</code></li>
          <li>错误做法的结果：{tpl.counterexample.wrong}</li>
          <li>正确结果：{tpl.counterexample.correct}</li>
        </ul>
      </section>
      <section data-testid="tpl-source">
        <h2>来源与许可</h2>
        <p>{tpl.source}</p>
        <p>{tpl.license}</p>
      </section>
    </div>
  )
}

/** Contest code: line-numbered, read-only; no execution arrow (no isomorphic trace). */
function ContestCode({ text, label }: { text: string; label: string }) {
  const lines = text.replace(/\n$/, '').split('\n')
  return (
    <div className="tpl-code" data-testid="tpl-contest-code" data-exec-state="reference" role="region" aria-label={label} tabIndex={0}>
      <table>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="ln" aria-hidden="true">
                {i + 1}
              </td>
              <td>
                <pre>{l || ' '}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
