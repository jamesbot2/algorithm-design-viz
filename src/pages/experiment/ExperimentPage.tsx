import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  exportExperimentCsv,
  exportExperimentJson,
  runDijkstraCompare,
  runKnapsackStrategiesCompare,
  runMaxSubarrayCompare,
  type ExperimentResult,
} from '../../experiment'
import { exportBasename, type ExperimentWhich } from './exportIdentity'

type Completed = {
  which: ExperimentWhich
  result: ExperimentResult
}

export default function ExperimentPage() {
  const [completed, setCompleted] = useState<Completed | null>(null)
  const [which, setWhich] = useState<ExperimentWhich>('dijkstra')
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const draftDirty = completed != null && completed.which !== which

  const run = () => {
    setExportMsg(null)
    let result: ExperimentResult
    if (which === 'maxsub') result = runMaxSubarrayCompare([20, 50, 100], 42)
    else if (which === 'knapsack') result = runKnapsackStrategiesCompare([4, 8, 12], 7)
    else result = runDijkstraCompare([{ n: 20, m: 40 }, { n: 40, m: 120 }], 99)
    setCompleted({ which, result })
  }

  const download = (kind: 'csv' | 'json') => {
    if (!completed) return
    // Export always from completed snapshot — never draft which
    const text =
      kind === 'csv' ? exportExperimentCsv(completed.result.rows) : exportExperimentJson(completed.result)
    const blob = new Blob([text], { type: kind === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportBasename({ which: completed.which }, which)}.${kind}`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg(`已导出 ${a.download}（来自已完成实验：${completed.which}）`)
  }

  const result = completed?.result ?? null

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>实验台</h1>
        <p className="subtitle">
          对照实验输出<strong>算法核心操作计数</strong>（comparisons / scans / relaxations / heapPops /
          staleSkips / dpStates / btNodes / prunedNodes）。metric=<code>vizSteps</code> 单独表示
          <strong>可视化步骤量</strong>，不是算法工作量。指数规模已封顶。勿将浏览器墙钟当作复杂度证明。
        </p>
      </div>
      <div className="input-panel">
        <label>
          实验
          <select
            value={which}
            onChange={(e) => setWhich(e.target.value as ExperimentWhich)}
            data-testid="experiment-which"
          >
            <option value="dijkstra">朴素 vs 堆 Dijkstra</option>
            <option value="maxsub">最大子数组方法对照</option>
            <option value="knapsack">背包策略对照</option>
          </select>
        </label>
        {draftDirty && (
          <p className="dirty-banner" role="status" data-testid="experiment-pending">
            参数待运行：当前选择「{which}」，下方结果仍属上一轮「{completed?.which}」。导出文件名与数据来自已完成快照。
          </p>
        )}
        <div className="input-actions">
          <button type="button" className="primary" onClick={run} data-testid="experiment-run">
            运行实验
          </button>
          <button
            type="button"
            disabled={!completed}
            onClick={() => download('csv')}
            data-testid="experiment-export-csv"
          >
            导出 CSV
          </button>
          <button
            type="button"
            disabled={!completed}
            onClick={() => download('json')}
            data-testid="experiment-export-json"
          >
            导出 JSON
          </button>
        </div>
        {exportMsg && (
          <p className="hint" role="status" data-testid="export-feedback">
            {exportMsg}
          </p>
        )}
      </div>
      {result && (
        <>
          <p className="hint" data-testid="experiment-result-which">
            已完成实验：{completed!.which}
            {draftDirty ? '（草稿已切换，结果未更新）' : ''}
          </p>
          <ul>
            {result.notes.map((n, i) => (
              <li key={i} className="hint">
                {n}
              </li>
            ))}
          </ul>
          <div className="matrix-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>实验</th>
                  <th>方法</th>
                  <th>规模 n</th>
                  <th>指标</th>
                  <th>数值</th>
                  <th>附加</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i} className={r.metric === 'vizSteps' ? 'muted' : undefined}>
                    <td>{r.experiment}</td>
                    <td>{r.method}</td>
                    <td>{r.n}</td>
                    <td>
                      {r.metric}
                      {r.metric === 'vizSteps' ? '（可视化步骤量）' : ''}
                    </td>
                    <td>{r.value}</td>
                    <td>
                      <code>{r.extra ? JSON.stringify(r.extra) : ''}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
