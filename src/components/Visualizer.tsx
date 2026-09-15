import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HighlightRole, Step } from '../types/step'
import type { Trace } from '../core/trace/types'
import { ArraysFromStep } from './ArrayView'
import MatrixView from './MatrixView'
import VarsPanel from './VarsPanel'
import CodePanel from './CodePanel'
import GraphView from './GraphView'
import SearchTreeView from './search/SearchTreeView'

interface Props {
  steps?: Step[]
  trace?: Trace
  code?: string
  /** Seek to this step on mount / when steps identity changes */
  initialStepIndex?: number
  onStepIndexChange?: (index: number) => void
}

const ROLE_LABELS: { role: HighlightRole; label: string; cls: string }[] = [
  { role: 'compare', label: '比较', cls: 'compare' },
  { role: 'swap', label: '交换/更新', cls: 'swap' },
  { role: 'focus', label: '当前焦点', cls: 'focus' },
  { role: 'sorted', label: '已排序/路径', cls: 'sorted' },
  { role: 'pivot', label: '枢轴', cls: 'pivot' },
  { role: 'read', label: '读取', cls: 'read' },
  { role: 'done', label: '完成', cls: 'sorted' },
]

function resolveSteps(steps?: Step[], trace?: Trace): Step[] {
  if (trace?.steps?.length) return trace.steps as Step[]
  return steps ?? []
}

function collectUsedRoles(steps: Step[]): Set<HighlightRole> {
  const used = new Set<HighlightRole>()
  for (const s of steps) {
    if (s.roles) {
      for (const map of Object.values(s.roles)) {
        for (const r of Object.values(map)) used.add(r)
      }
    }
    if (s.highlights) {
      for (const idxs of Object.values(s.highlights)) {
        if (idxs.length) {
          used.add('compare')
          if (idxs.length > 1) used.add('swap')
          if (idxs.length > 2) used.add('focus')
        }
      }
    }
    if (s.matrixTargets) {
      for (const t of Object.values(s.matrixTargets)) {
        if (t.current) used.add('focus')
        if (t.writes?.length) used.add('swap')
        if (t.reads?.length) used.add('read')
        if (t.path?.length) used.add('sorted')
      }
    }
  }
  return used
}

function phaseMarkers(steps: Step[]): { index: number; phase: string }[] {
  const out: { index: number; phase: string }[] = []
  let last = ''
  steps.forEach((s, i) => {
    if (s.phase && s.phase !== last) {
      out.push({ index: i, phase: s.phase })
      last = s.phase
    }
  })
  return out
}

function computeScaleMax(steps: Step[]): Record<string, number> {
  const max: Record<string, number> = {}
  for (const s of steps) {
    if (!s.arrays) continue
    for (const [name, vals] of Object.entries(s.arrays)) {
      for (const v of vals) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          max[name] = Math.max(max[name] ?? 1, Math.abs(v))
        }
      }
    }
  }
  return max
}

export default function Visualizer({
  steps: stepsProp,
  trace,
  code,
  initialStepIndex = 0,
  onStepIndexChange,
}: Props) {
  const steps = useMemo(() => resolveSteps(stepsProp, trace), [stepsProp, trace])
  const clamp = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))
  const [idx, setIdx] = useState(() => clamp(initialStepIndex, steps.length))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const [flashKey, setFlashKey] = useState(0)
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const step = steps[idx] ?? steps[0]
  const max = Math.max(0, steps.length - 1)
  const usedRoles = useMemo(() => collectUsedRoles(steps), [steps])
  const markers = useMemo(() => phaseMarkers(steps), [steps])
  const scaleMaxByArray = useMemo(() => computeScaleMax(steps), [steps])

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
    const next = clamp(initialStepIndex, steps.length)
    setIdx(next)
    setPlaying(false)
    setFlashKey((k) => k + 1)
  }, [steps, initialStepIndex])

  useEffect(() => {
    onStepIndexChange?.(idx)
  }, [idx, onStepIndexChange])

  useEffect(() => {
    setFlashKey((k) => k + 1)
  }, [idx])

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

  const legendItems = ROLE_LABELS.filter((r) => usedRoles.has(r.role))

  return (
    <div className="visualizer" ref={rootRef}>
      <div key={`banner-${flashKey}`} className="viz-banner viz-step-flash">
        {step.message}
      </div>

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
          {step.phase ? ` · ${step.phase}` : ''}
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

      {markers.length > 0 && (
        <div className="phase-jump">
          <span className="muted">阶段跳转：</span>
          {markers.map((m) => (
            <button
              key={`${m.phase}-${m.index}`}
              type="button"
              className={step.phase === m.phase && idx >= m.index ? 'active' : ''}
              onClick={() => {
                setPlaying(false)
                setIdx(m.index)
              }}
            >
              {m.phase}
            </button>
          ))}
        </div>
      )}

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

      {legendItems.length > 0 && (
        <div className="viz-legend">
          {legendItems.map((r) => (
            <span key={r.role}>
              <i className={`dot ${r.cls}`} />
              {r.label}
            </span>
          ))}
        </div>
      )}

      <div className="viz-body">
        <div className="viz-main">
          {step.graph && <GraphView graph={step.graph} />}
          {step.searchTree && <SearchTreeView tree={step.searchTree} />}
          <ArraysFromStep step={step} scaleMaxByArray={scaleMaxByArray} />
          <MatrixView step={step} />
        </div>
        <div className="viz-side">
          <div key={`vars-${flashKey}`} className="viz-vars-flash">
            <VarsPanel step={step} />
          </div>
          {code && <CodePanel code={code} activeLine={step.codeLine} />}
        </div>
      </div>

      <p className="kbd-hint">
        快捷键：<kbd>空格</kbd> 播放/暂停 · <kbd>←</kbd> 上一步 · <kbd>→</kbd> 下一步
      </p>
    </div>
  )
}
