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

export default function ExperimentPage() {
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [which, setWhich] = useState<'maxsub' | 'knapsack' | 'dijkstra'>('dijkstra')

  const run = () => {
    if (which === 'maxsub') setResult(runMaxSubarrayCompare([20, 50, 100], 42))
    else if (which === 'knapsack') setResult(runKnapsackStrategiesCompare([4, 8, 12], 7))
    else setResult(runDijkstraCompare([{ n: 20, m: 40 }, { n: 40, m: 120 }], 99))
  }

  const download = (kind: 'csv' | 'json') => {
    if (!result) return
    const text = kind === 'csv' ? exportExperimentCsv(result.rows) : exportExperimentJson(result)
    const blob = new Blob([text], { type: kind === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `experiment-${which}.${kind}`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          <select value={which} onChange={(e) => setWhich(e.target.value as typeof which)}>
            <option value="dijkstra">朴素 vs 堆 Dijkstra</option>
            <option value="maxsub">最大子数组方法对照</option>
            <option value="knapsack">背包策略对照</option>
          </select>
        </label>
        <div className="input-actions">
          <button type="button" className="primary" onClick={run}>
            运行实验
          </button>
          <button type="button" disabled={!result} onClick={() => download('csv')}>
            导出 CSV
          </button>
          <button type="button" disabled={!result} onClick={() => download('json')}>
            导出 JSON
          </button>
        </div>
      </div>
      {result && (
        <>
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
                  <th>experiment</th>
                  <th>method</th>
                  <th>n</th>
                  <th>metric</th>
                  <th>value</th>
                  <th>extra</th>
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
