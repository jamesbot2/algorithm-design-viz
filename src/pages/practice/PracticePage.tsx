import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPracticeItems, pickPracticeItem } from '../../practice/bank'
import { judgeByKey, judgeChoices } from '../../practice/judges'
import type { PracticeItem } from '../../practice/types'
import { algorithms } from '../../algorithms'
import {
  exportLocalLearningJson,
  loadLocalLearning,
  recordPracticeResult,
  clearLocalLearningConfirmed,
} from '../../scene/storage'

const TYPE_LABEL: Record<string, string> = {
  predict_next: '预测下一步',
  explain_choice: '解释选择',
  counterexample: '构造反例',
}

type Verdict = { ok: boolean; message: string; note?: string | null; forAnswersKey: string }

function answersKey(selected: string[], fields: Record<string, string>) {
  return JSON.stringify({ selected: [...selected].sort(), fields })
}

export default function PracticePage() {
  const [editSeed, setEditSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [loadedSeed, setLoadedSeed] = useState(() => editSeed)
  const [filter, setFilter] = useState('')
  const [item, setItem] = useState<PracticeItem>(() => pickPracticeItem(loadedSeed))
  const [selected, setSelected] = useState<string[]>([])
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({})
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [progressTick, setProgressTick] = useState(0)
  const [showDebug, setShowDebug] = useState(false)

  const progress = useMemo(() => loadLocalLearning().progress, [progressTick])

  const choiceMode =
    item.type === 'predict_next' || item.type === 'explain_choice'
      ? (item.judgeMode ?? 'single')
      : 'single'
  const isMultiExact = choiceMode === 'multiExact'
  const algoTitle = algorithms[item.algoId]?.meta.title ?? item.algoId

  const currentKey = answersKey(selected, fieldAnswers)
  const verdictStale = verdict != null && verdict.forAnswersKey !== currentKey

  const loadSeed = (s: number) => {
    setEditSeed(s)
    setLoadedSeed(s)
    setItem(pickPracticeItem(s, filter || undefined))
    setSelected([])
    setFieldAnswers({})
    setVerdict(null)
  }

  const onSubmit = () => {
    let result
    if (item.type === 'counterexample') {
      result = judgeByKey(item.judgeKey, fieldAnswers, item.judgePayload)
    } else {
      result = judgeChoices(selected, item.acceptIds, item.judgeMode ?? 'single')
    }
    setVerdict({
      ok: result.ok,
      message: result.message,
      note: result.note ?? null,
      forAnswersKey: answersKey(selected, fieldAnswers),
    })
    recordPracticeResult(item.id, result.ok, { seed: loadedSeed, selected, fieldAnswers })
    setProgressTick((t) => t + 1)
  }

  // Changing answers after submit marks old verdict stale (UI-11)
  useEffect(() => {
    /* verdictStale derived */
  }, [currentKey])

  const progressEntries = Object.entries(progress ?? {})
  const completed = progressEntries.length
  const correct = progressEntries.reduce((acc, [, v]) => acc + (v?.correct ?? 0), 0)
  const wrong = progressEntries.reduce((acc, [, v]) => acc + (v?.wrong ?? 0), 0)
  const recent = progressEntries
    .map(([id, v]) => ({ id, lastAt: v?.lastAt ?? '' }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))[0]?.id ?? null

  return (
    <div className="page practice-page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>练习台</h1>
        <p className="subtitle">
          本地判定（非 AI）：预测下一步 / 解释选择 / 构造反例。进度存于浏览器 localStorage，
          <strong>非 LMS 成绩</strong>。
        </p>
      </div>

      <div className="input-panel">
        <label>
          算法过滤
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">全部</option>
            {[...new Set(listPracticeItems().map((x) => x.algoId))].map((a) => (
              <option key={a} value={a}>
                {algorithms[a]?.meta.title ?? a}
              </option>
            ))}
          </select>
        </label>
        <div className="input-actions">
          <button type="button" className="primary" onClick={() => loadSeed(Math.floor(Math.random() * 1e9))}>
            随机一题
          </button>
          <button type="button" onClick={() => loadSeed(loadedSeed)}>
            重新加载本题
          </button>
        </div>
        <details className="debug-details muted">
          <summary>高级：随机种子</summary>
          <label>
            编辑种子
            <input
              type="number"
              value={editSeed}
              onChange={(e) => setEditSeed(Number(e.target.value) || 0)}
            />
          </label>
          <p className="hint">已加载种子：{loadedSeed}（作答记录使用已加载种子，非编辑框草稿）</p>
          <button type="button" onClick={() => loadSeed(editSeed)}>
            按种子加载
          </button>
        </details>
      </div>

      <div className="practice-card">
        <p className="practice-meta">
          <strong>{TYPE_LABEL[item.type] ?? item.type}</strong>
          {' · '}
          {algoTitle}
        </p>
        <details className="debug-details muted">
          <summary>调试详情</summary>
          <p>
            id={item.id} · judgeMode={item.judgeMode ?? '—'} · algoId={item.algoId} · loadedSeed=
            {loadedSeed}
          </p>
          <button type="button" className="ghost" onClick={() => setShowDebug((s) => !s)}>
            {showDebug ? '隐藏 JSON' : '显示 JSON'}
          </button>
          {showDebug && <pre className="code-block">{JSON.stringify(item, null, 2)}</pre>}
        </details>
        <h3>{item.prompt}</h3>

        {(item.type === 'predict_next' || item.type === 'explain_choice') && (
          <div className="practice-choices">
            {isMultiExact && <p className="hint">多选：须选中全部正确项（完整命中）。</p>}
            {!isMultiExact && <p className="hint">单选：请只选一项。</p>}
            {item.choices.map((c) => (
              <label key={c.id} className="checkbox-label checkbox-field">
                <input
                  type={isMultiExact ? 'checkbox' : 'radio'}
                  name={`practice-${item.id}`}
                  checked={selected.includes(c.id)}
                  onChange={(e) => {
                    if (isMultiExact) {
                      setSelected((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                      )
                    } else {
                      setSelected([c.id])
                    }
                  }}
                />
                {c.label}
              </label>
            ))}
          </div>
        )}

        {item.type === 'counterexample' &&
          item.fields.map((f) => (
            <label key={f.id}>
              {f.label}
              {item.judgeKey === 'greedy_ce' && f.id !== 'capacity' ? (
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={fieldAnswers[f.id] ?? ''}
                  onChange={(e) => setFieldAnswers((m) => ({ ...m, [f.id]: e.target.value }))}
                />
              ) : item.judgeKey === 'greedy_ce' && f.id === 'capacity' ? (
                <input
                  type="number"
                  min={0}
                  placeholder={f.placeholder}
                  value={fieldAnswers[f.id] ?? ''}
                  onChange={(e) => setFieldAnswers((m) => ({ ...m, [f.id]: e.target.value }))}
                />
              ) : (
                <textarea
                  rows={3}
                  placeholder={f.placeholder}
                  value={fieldAnswers[f.id] ?? ''}
                  onChange={(e) => setFieldAnswers((m) => ({ ...m, [f.id]: e.target.value }))}
                />
              )}
            </label>
          ))}

        <div className="input-actions">
          <button type="button" className="primary" onClick={onSubmit} data-testid="practice-submit">
            提交判定
          </button>
        </div>

        {verdict && (
          <div
            className={`practice-feedback${verdict.ok ? ' is-correct' : ' is-wrong'}${verdictStale ? ' is-stale' : ''}`}
            data-testid="practice-feedback"
            data-ok={verdict.ok ? '1' : '0'}
            data-stale={verdictStale ? '1' : '0'}
          >
            {verdictStale && (
              <p className="dirty-banner" role="status">
                以下判定针对上一次提交；答案已修改，请重新提交。
              </p>
            )}
            <p className={verdict.ok ? 'ok-text' : 'err-text'}>{verdict.message}</p>
            {verdict.note && <p className="hint">{verdict.note}</p>}
            <p className="hint">{item.explanation}</p>
            {item.stepLink && (
              <p>
                对照：
                <Link to={`/algo/${item.stepLink.algoId}`}>
                  {algorithms[item.stepLink.algoId]?.meta.title ?? item.stepLink.algoId}
                </Link>
                {item.stepLink.algoId === 'knapsack01' && (
                  <>
                    {' · '}
                    <Link to="/teach/knapsack">背包教学单元</Link>
                  </>
                )}
                <span className="muted"> — {item.stepLink.hint}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="input-panel">
        <h3>本地进度</h3>
        <ul className="practice-progress-summary" data-testid="practice-progress">
          <li>已练题数：{completed}</li>
          <li>正确次数：{correct}</li>
          <li>错误次数：{wrong}</li>
          <li>最近题目：{recent != null ? String(recent) : '—'}</li>
        </ul>
        <details className="debug-details muted">
          <summary>原始 JSON</summary>
          <pre className="code-block">{JSON.stringify(progress, null, 2)}</pre>
        </details>
        <div className="input-actions">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([exportLocalLearningJson()], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'adviz-local-learning.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            导出 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确认清空本地练习进度？此操作不可恢复。')) {
                clearLocalLearningConfirmed()
                setVerdict({
                  ok: true,
                  message: '已清空本地进度',
                  note: null,
                  forAnswersKey: currentKey,
                })
                setProgressTick((t) => t + 1)
              }
            }}
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  )
}
