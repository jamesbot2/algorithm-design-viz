import { useMemo, useState } from 'react'
import type { Step } from '../../types/step'
import { useTestId } from '../data/dataProbe'
import { reconstructPath as reconstructNaive } from '../../algorithms/dijkstra'
import { reconstructPath as reconstructHeap } from '../../algorithms/dijkstraHeap'

interface Props {
  algoId: string
  steps: Step[]
}

function lastResult(steps: Step[]): Record<string, unknown> | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const r = steps[i]?.result
    if (r && typeof r === 'object') return r as Record<string, unknown>
  }
  return null
}

export default function GraphResultPanel({ algoId, steps }: Props) {
  const tid = useTestId()
  const result = useMemo(() => lastResult(steps), [steps])
  const [target, setTarget] = useState(0)

  if (!result || result.ok === false) {
    if (result && result.ok === false) {
      return (
        <div className="graph-result-panel">
          <h4>最终结果</h4>
          <p className="input-errors">算法未成功：{String(result.error ?? 'error')}</p>
        </div>
      )
    }
    return null
  }

  const isShortest =
    algoId === 'dijkstra' ||
    algoId === 'dijkstraHeap' ||
    algoId === 'bellmanFord' ||
    algoId === 'bfs'
  const isMst = algoId === 'kruskal' || algoId === 'prim'

  if (isShortest) {
    const dist = (result.dist as (number | null)[] | undefined) ?? []
    const parent = (result.parent as number[] | undefined) ?? []
    const start = typeof result.start === 'number' ? result.start : 0
    const n = Math.max(dist.length, parent.length)
    const path =
      parent.length > 0
        ? algoId === 'dijkstraHeap'
          ? reconstructHeap(parent, target)
          : reconstructNaive(parent, target)
        : []
    const cost = dist[target]
    const reachable = cost !== null && cost !== undefined

    return (
      <div className="graph-result-panel">
        <h4>最终结果 · 最短路查询</h4>
        <label>
          目标顶点
          <input
            type="number"
            min={0}
            max={Math.max(0, n - 1)}
            value={target}
            {...tid('graph-result-target')}
            aria-label="目标顶点"
            onChange={(e) => {
              const raw = e.target.value
              if (raw.trim() === '') return
              const n = Number(raw)
              if (!Number.isFinite(n) || !Number.isInteger(n)) return
              setTarget(n)
            }}
          />
        </label>
        <p>
          源 {start} → {target}：
          {reachable ? (
            <>
              代价 <strong>{cost}</strong>
              {path.length > 0 && (
                <>
                  ；路径 <code>{path.join(' → ')}</code>
                </>
              )}
            </>
          ) : (
            <span className="muted">不可达</span>
          )}
        </p>
        {Array.isArray(dist) && (
          <p className="hint muted">dist = [{dist.map((d) => (d === null ? '∞' : d)).join(', ')}]</p>
        )}
      </div>
    )
  }

  if (isMst) {
    const edges =
      (result.mst as [number, number, number][] | undefined) ??
      (result.edges as [number, number, number][] | undefined) ??
      []
    const total =
      typeof result.totalWeight === 'number'
        ? result.totalWeight
        : typeof result.cost === 'number'
          ? result.cost
          : edges.reduce((s, e) => s + (e[2] ?? 0), 0)
    const connected =
      result.connected ?? result.isTree ?? (result.kind === 'mst' ? true : result.kind === 'forest' ? false : result.ok)
    return (
      <div className="graph-result-panel">
        <h4>MST / 森林</h4>
        <p>
          选中边数 <strong>{edges.length}</strong>，总权 <strong>{total}</strong>
          {connected !== undefined && (
            <>；{connected ? '连通（树）' : '不连通（森林/部分树）'}</>
          )}
        </p>
        <ul className="mst-edge-list">
          {edges.map(([u, v, w], i) => (
            <li key={i}>
              {u}—{v} ({w})
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (algoId === 'floyd' && result.matrix) {
    return (
      <div className="graph-result-panel">
        <h4>全源距离</h4>
        <p className="hint">见矩阵视图；负环：{String(result.hasNegativeCycle ?? false)}</p>
      </div>
    )
  }

  return null
}
