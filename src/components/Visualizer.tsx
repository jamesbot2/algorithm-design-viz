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
  const rootRef = useRef<HTMLDivElement>(null)

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

  const goPrev = useCallback(() => {
    setPlaying(false)
    setIdx((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setPlaying(false)
    setIdx((i) => Math.min(max, i + 1))
  }, [max])

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  const reset = useCallback(() => {
    setPlaying(false)
    setIdx(0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, goPrev, goNext])

  const progress = useMemo(() => (max === 0 ? 0 : (idx / max) * 100), [idx, max])

  const stats = step?.stats
  const showStats =
    stats &&
    (stats.comparisons !== undefined || stats.swaps !== undefined || stats.writes !== undefined)

  if (!steps.length) {
    return <div className="viz-empty">暂无步骤，请调整输入后重新生成。</div>
  }

  return (
    <div className="visualizer" ref={rootRef}>
      <div className="viz-banner">{step.message}</div>

      <div className="viz-toolbar">
        <button type="button" onClick={reset} title="重置">
          重置
        </button>
        <button type="button" onClick={goPrev} disabled={idx <= 0} title="上一步 (←)">
          上一步
        </button>
        <button type="button" className="primary" onClick={togglePlay} title="播放/暂停 (空格)">
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={goNext} disabled={idx >= max} title="下一步 (→)">
          下一步
        </button>
        <label className="speed-label">
          速度
          <input
            type="range"
            min={100}
            max={1500}
            step={50}
            value={1600 - speed}
            onChange={(e) => setSpeed(1600 - Number(e.target.value))}
            aria-label="播放速度"
          />
        </label>
        <span className="spacer" />
        <span className="step-counter">
          {idx + 1} / {steps.length}
        </span>
      </div>

      <div className="scrub-row">
        <span className="scrub-label">进度</span>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={idx}
          onChange={(e) => {
            setPlaying(false)
            setIdx(Number(e.target.value))
          }}
          aria-label="步骤进度"
        />
        <span className="scrub-pct">{Math.round(progress)}%</span>
      </div>

      {showStats && (
        <div className="stats-row">
          {stats.comparisons !== undefined && (
            <span className="stat-chip">
              比较 <strong>{stats.comparisons}</strong>
            </span>
          )}
          {stats.swaps !== undefined && (
            <span className="stat-chip">
              交换 <strong>{stats.swaps}</strong>
            </span>
          )}
          {stats.writes !== undefined && (
            <span className="stat-chip">
              写入 <strong>{stats.writes}</strong>
            </span>
          )}
        </div>
      )}

      <div className="viz-legend">
        <span>
          <i className="dot compare" />
          比较
        </span>
        <span>
          <i className="dot swap" />
          交换/更新
        </span>
        <span>
          <i className="dot focus" />
          当前焦点
        </span>
        <span>
          <i className="dot sorted" />
          已排序
        </span>
        <span>
          <i className="dot pivot" />
          枢轴
        </span>
        <span>
          <i className="dot read" />
          读取
        </span>
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

      <p className="kbd-hint">
        快捷键：<kbd>空格</kbd> 播放/暂停 · <kbd>←</kbd> 上一步 · <kbd>→</kbd> 下一步
      </p>
    </div>
  )
}
