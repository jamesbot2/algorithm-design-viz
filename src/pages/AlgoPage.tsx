import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import Visualizer from '../components/Visualizer'
import * as binarySearch from '../algorithms/binarySearch'
import * as knapsack01 from '../algorithms/knapsack01'
import * as lcs from '../algorithms/lcs'
import * as editDistance from '../algorithms/editDistance'
import * as activitySelection from '../algorithms/activitySelection'
import * as kmp from '../algorithms/kmp'

const DEFAULT_ARRAY = [5, 2, 8, 1, 9, 3, 7]

export default function AlgoPage() {
  const { id } = useParams()
  const algo = id ? algorithms[id] : undefined
  const [arrayText, setArrayText] = useState(DEFAULT_ARRAY.join(', '))
  const [target, setTarget] = useState(String(binarySearch.meta.defaultTarget))
  const [strA, setStrA] = useState(lcs.meta.defaultX)
  const [strB, setStrB] = useState(lcs.meta.defaultY)
  const [editA, setEditA] = useState(editDistance.meta.defaultA)
  const [editB, setEditB] = useState(editDistance.meta.defaultB)
  const [text, setText] = useState(kmp.meta.defaultText)
  const [pattern, setPattern] = useState(kmp.meta.defaultPattern)
  const [seed, setSeed] = useState(0)

  const parseArray = () =>
    arrayText
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !Number.isNaN(n))

  const steps = useMemo(() => {
    if (!algo) return []
    const arr = parseArray()
    void seed
    switch (id) {
      case 'binarySearch':
        return algo.generateSteps(arr.length ? arr : DEFAULT_ARRAY, Number(target) || 0)
      case 'knapsack01':
        return knapsack01.generateSteps(arr)
      case 'lcs':
        return lcs.generateSteps(arr, strA || 'ABCBDAB', strB || 'BDCABA')
      case 'editDistance':
        return editDistance.generateSteps(arr, editA || 'kitten', editB || 'sitting')
      case 'activitySelection':
        return activitySelection.generateSteps(arr)
      case 'kmp':
        return kmp.generateSteps(arr, text || 'ABABCABABABD', pattern || 'ABABD')
      case 'bfs':
      case 'dijkstra':
      case 'kruskal':
      case 'bellmanFord':
      case 'floyd':
      case 'prim':
        return algo.generateSteps(arr)
      default:
        return algo.generateSteps(arr.length ? arr : DEFAULT_ARRAY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algo, id, arrayText, target, strA, strB, editA, editB, text, pattern, seed])

  if (!algo) {
    return (
      <div className="page">
        <p>未找到算法。</p>
        <Link to="/">返回首页</Link>
      </div>
    )
  }

  const needsArray = !['knapsack01', 'lcs', 'editDistance', 'activitySelection', 'kmp', 'bfs', 'dijkstra', 'kruskal', 'bellmanFord', 'floyd', 'prim'].includes(id!)

  return (
    <div className="page algo-page">
      <div className="page-header">
        <Link to="/" className="back">← 首页</Link>
        <h1>{algo.meta.title}</h1>
        <p className="complexity">复杂度：{algo.meta.complexity}</p>
        <p className="subtitle">{algo.meta.description}</p>
      </div>

      <div className="input-panel">
        <h3>输入控制</h3>
        {needsArray && (
          <label>
            数组（逗号分隔）
            <input value={arrayText} onChange={(e) => setArrayText(e.target.value)} />
          </label>
        )}
        {id === 'binarySearch' && (
          <label>
            目标值
            <input value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
        )}
        {id === 'lcs' && (
          <>
            <label>串 X<input value={strA} onChange={(e) => setStrA(e.target.value)} /></label>
            <label>串 Y<input value={strB} onChange={(e) => setStrB(e.target.value)} /></label>
          </>
        )}
        {id === 'editDistance' && (
          <>
            <label>串 A<input value={editA} onChange={(e) => setEditA(e.target.value)} /></label>
            <label>串 B<input value={editB} onChange={(e) => setEditB(e.target.value)} /></label>
          </>
        )}
        {id === 'kmp' && (
          <>
            <label>文本<input value={text} onChange={(e) => setText(e.target.value)} /></label>
            <label>模式<input value={pattern} onChange={(e) => setPattern(e.target.value)} /></label>
          </>
        )}
        {(id === 'knapsack01' || id === 'activitySelection' || id === 'bfs' || id === 'dijkstra' || id === 'kruskal' || id === 'bellmanFord' || id === 'floyd' || id === 'prim') && (
          <p className="hint">本算法使用内置示例数据，点击「重新生成」可重置步骤。</p>
        )}
        <button type="button" className="primary" onClick={() => setSeed((s) => s + 1)}>
          重新生成步骤
        </button>
      </div>

      <Visualizer steps={steps} code={algo.meta.code as string | undefined} />
    </div>
  )
}
