import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Step } from '../types/step'
import { ArraysFromStep } from './ArrayView'
import MatrixView from './MatrixView'
import VarsPanel from './VarsPanel'
import CodePanel from './CodePanel'
import GraphView from './GraphView'

interface Props {
  steps: Step[]
  code?: string
}

export default function Visualizer({ steps, code }: Props) {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const timer = useRef<number | null>(null)

  const step = steps[idx] ?? steps[0]
  const max = Math.max(0, steps.length - 1)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => {
    clear()
    if (!playing) return
    timer.current = window.setInterval(() => {
      setIdx((i) => {
        if (i >= max) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, speed)
    return clear
  }, [playing, speed, max, clear])

  useEffect(() => {
    setIdx(0)
    setPlaying(false)
  }, [steps])

  const progress = useMemo(() => (max === 0 ? 0 : (idx / max) * 100), [idx, max])

  if (!steps.length) {
    return <div className="viz-empty">暂无步骤，请调整输入后重新生成。</div>
  }

  return (
    <div className="visualizer">
      <div className="viz-banner">{step.message}</div>

      <div className="viz-controls">
        <button type="button" onClick={() => { setPlaying(false); setIdx(0) }} title="重置">⏮ 重置</button>
        <button type="button" onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)) }}>◀ 上一步</button>
        <button type="button" className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button type="button" onClick={() => { setPlaying(false); setIdx((i) => Math.min(max, i + 1)) }}>下一步 ▶</button>
        <label className="speed-label">
          速度
          <input
            type="range"
            min={100}
            max={1500}
            step={50}
            value={1600 - speed}
            onChange={(e) => setSpeed(1600 - Number(e.target.value))}
          />
        </label>
        <span className="step-counter">{idx + 1} / {steps.length}</span>
      </div>

      <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>

      <div className="viz-legend">
        <span><i className="dot compare" />比较</span>
        <span><i className="dot swap" />交换/更新</span>
        <span><i className="dot focus" />当前焦点</span>
        <span><i className="dot done" />相关</span>
      </div>

      <div className="viz-body">
        <div className="viz-main">
          {step.graph && <GraphView graph={step.graph} />}
          <ArraysFromStep step={step} />
          <MatrixView step={step} />
        </div>
        <div className="viz-side">
          <VarsPanel step={step} />
          {code && <CodePanel code={code} activeLine={step.codeLine} />}
        </div>
      </div>
    </div>
  )
}
