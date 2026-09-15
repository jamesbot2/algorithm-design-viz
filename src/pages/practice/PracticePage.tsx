import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPracticeItems, pickPracticeItem } from '../../practice/bank'
import { judgeByKey, judgeChoices } from '../../practice/judges'
import type { PracticeItem } from '../../practice/types'
import { exportLocalLearningJson, loadLocalLearning, recordPracticeResult, clearLocalLearningConfirmed } from '../../scene/storage'

export default function PracticePage() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [filter, setFilter] = useState('')
  const [item, setItem] = useState<PracticeItem>(() => pickPracticeItem(seed))
  const [selected, setSelected] = useState<string[]>([])
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const progress = useMemo(() => loadLocalLearning().progress, [feedback])

  const loadSeed = (s: number) => {
    setSeed(s)
    setItem(pickPracticeItem(s, filter || undefined))
    setSelected([])
    setFieldAnswers({})
    setFeedback(null)
    setNote(null)
  }

  const onSubmit = () => {
    let result
    if (item.type === 'counterexample') {
      result = judgeByKey(item.judgeKey, fieldAnswers, item.judgePayload)
    } else {
      result = judgeChoices(selected, item.acceptIds)
    }
    setFeedback(result.message)
    setNote(result.note ?? null)
    recordPracticeResult(item.id, result.ok, { seed, selected, fieldAnswers })
  }

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
          种子（可复现）
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
        </label>
        <label>
          算法过滤
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">全部</option>
            {[...new Set(listPracticeItems().map((x) => x.algoId))].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <div className="input-actions">
          <button type="button" className="primary" onClick={() => loadSeed(seed)}>
            按种子加载
          </button>
          <button
            type="button"
            onClick={() => loadSeed(Math.floor(Math.random() * 1e9))}
          >
            随机一题
          </button>
        </div>
      </div>

      <div className="practice-card">
        <p className="muted">
          #{item.id} · {item.type} · algo={item.algoId} · seed={item.seed ?? seed}
        </p>
        <h3>{item.prompt}</h3>

        {(item.type === 'predict_next' || item.type === 'explain_choice') && (
          <div className="practice-choices">
            {item.choices.map((c) => (
              <label key={c.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                    )
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
              <textarea
                rows={3}
                placeholder={f.placeholder}
                value={fieldAnswers[f.id] ?? ''}
                onChange={(e) => setFieldAnswers((m) => ({ ...m, [f.id]: e.target.value }))}
              />
            </label>
          ))}

        <div className="input-actions">
          <button type="button" className="primary" onClick={onSubmit}>
            提交判定
          </button>
        </div>

        {feedback && (
          <div className="practice-feedback">
            <p>{feedback}</p>
            {note && <p className="hint">{note}</p>}
            <p className="hint">{item.explanation}</p>
            {item.stepLink && (
              <p>
                对照：
                <Link to={`/algo/${item.stepLink.algoId}`}>{item.stepLink.algoId}</Link>
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
        <pre className="code-block">{JSON.stringify(progress, null, 2)}</pre>
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
                setFeedback('已清空本地进度')
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
