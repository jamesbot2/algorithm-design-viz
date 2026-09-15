import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { EdgeRole, HighlightRole, Step } from '../types/step'
import type { Trace } from '../core/trace/types'
import { ArraysFromStep } from './ArrayView'
import MatrixView from './MatrixView'
import VarsPanel from './VarsPanel'
import CodePanel from './CodePanel'
import GraphView from './GraphView'
import SearchTreeView from './search/SearchTreeView'
import { SEMANTIC_ROLE_LABELS } from '../theme/semanticColors'
import { motionCssVars, speedFeelMultiplier } from '../theme/motion'
import { useMotion } from '../theme/MotionContext'

interface Props {
  steps?: Step[]
  trace?: Trace
  code?: string
  /** Seek to this step on mount / when steps identity changes */
  initialStepIndex?: number
  onStepIndexChange?: (index: number) => void
  /** When true, show「上一轮结果」badge (stale after failed re-run) */
  staleResult?: boolean
}

type LegendRole = HighlightRole | EdgeRole | 'frontier' | 'settled' | 'pruned' | 'optimal' | 'error'

const ROLE_DOT: Record<string, string> = {
  compare: 'var(--sem-compare)',
  swap: 'var(--sem-swap)',
  focus: 'var(--sem-focus)',
  update: 'var(--sem-update)',
  sorted: 'var(--sem-sorted)',
  pivot: 'var(--sem-pivot)',
  read: 'var(--sem-read)',
  done: 'var(--sem-done)',
  accepted: 'var(--sem-accepted)',
  rejected: 'var(--sem-rejected)',
  pruned: 'var(--sem-pruned)',
  optimal: 'var(--sem-optimal)',
  checking: 'var(--sem-compare)',
  relaxing: 'var(--sem-focus)',
  tree: 'var(--sem-accepted)',
  path: 'var(--sem-focus)',
  frontier: 'var(--sem-frontier)',
  settled: 'var(--sem-settled)',
  error: 'var(--sem-error)',
}

function resolveSteps(steps?: Step[], trace?: Trace): Step[] {
  if (trace?.steps?.length) return trace.steps as Step[]
  return steps ?? []
}

function collectUsedRoles(steps: Step[]): Set<LegendRole> {
  const used = new Set<LegendRole>()
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
    if (s.graph?.edgeRoles) {
      for (const r of Object.values(s.graph.edgeRoles)) used.add(r)
    }
    if (s.graph?.nodeRoles) {
      for (const r of Object.values(s.graph.nodeRoles)) {
        if (r === 'frontier' || r === 'settled') used.add(r)
        if (r === 'neg-cycle') used.add('error')
      }
    }
    if (s.searchTree) {
      const walk = (n: NonNullable<Step['searchTree']>) => {
        if (n.status === 'pruned') used.add('pruned')
        if (n.status === 'optimal') used.add('optimal')
        if (n.status === 'rejected') used.add('rejected')
        if (n.status === 'feasible') used.add('accepted')
        n.children?.forEach(walk)
      }
      walk(s.searchTree)
    }
    if (s.ranges?.best) used.add('optimal')
    if (s.ranges?.current) used.add('focus')
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
  staleResult = false,
}: Props) {
  const steps = useMemo(() => resolveSteps(stepsProp, trace), [stepsProp, trace])
  const clamp = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))
  const [idx, setIdx] = useState(() => clamp(initialStepIndex, steps.length))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const [flashKey, setFlashKey] = useState(0)
  const [scrubPreview, setScrubPreview] = useState<number | null>(null)
  const [playPulse, setPlayPulse] = useState(false)
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const { mode } = useMotion()

  const step = steps[idx] ?? steps[0]
  const max = Math.max(0, steps.length - 1)
  const usedRoles = useMemo(() => collectUsedRoles(steps), [steps])
  const markers = useMemo(() => phaseMarkers(steps), [steps])
  const scaleMaxByArray = useMemo(() => computeScaleMax(steps), [steps])

  const effectiveInterval = useMemo(() => {
    // Speed feel: not only raw interval — compress/expand slightly via motion multiplier inverse
    const feel = speedFeelMultiplier(speed)
    return Math.max(80, Math.round(speed / Math.max(0.5, 2 - feel)))
  }, [speed])

  const speedVars = useMemo(
    () => motionCssVars(mode, speed),
    [mode, speed],
  )

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
    }, effectiveInterval)
    return clear
  }, [playing, effectiveInterval, max, clear])

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
    setPlayPulse(true)
    window.setTimeout(() => setPlayPulse(false), 180)
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
  const previewStep = scrubPreview !== null ? steps[scrubPreview] : null

  const stats = step?.stats
  const showStats =
    stats &&
    (stats.comparisons !== undefined || stats.swaps !== undefined || stats.writes !== undefined)

  if (!steps.length) {
    return <div className="viz-empty">暂无步骤，请调整输入后重新生成。</div>
  }

  const legendItems = [...usedRoles]
    .map((role) => ({
      role,
      label: SEMANTIC_ROLE_LABELS[role] ?? role,
      color: ROLE_DOT[role] ?? '#888',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh'))

  const hasBoard = Boolean(step.matrices?.board)

  return (
    <div className="visualizer" ref={rootRef} style={speedVars as CSSProperties}>
      <div key={`banner-${flashKey}`} className="viz-banner viz-step-flash viz-banner-enter">
        {step.message}
        {staleResult && <span className="stale-result-badge">上一轮结果</span>}
      </div>

      <div className="viz-toolbar">
        <button type="button" onClick={reset} title="重置">
          重置
        </button>
        <button type="button" onClick={goPrev} disabled={idx <= 0} title="上一步 (←)">
          上一步
        </button>
        <button
          type="button"
          className={`primary play-btn tactile${playing ? ' is-playing' : ''}${playPulse ? ' pulse' : ''}`}
          onClick={togglePlay}
          title="播放/暂停 (空格)"
        >
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
            setScrubPreview(null)
          }}
          onInput={(e) => {
            const v = Number((e.target as HTMLInputElement).value)
            setScrubPreview(v)
          }}
          onMouseUp={() => setScrubPreview(null)}
          onTouchEnd={() => setScrubPreview(null)}
          aria-label="步骤进度"
        />
        <span className="scrub-pct">{Math.round(progress)}%</span>
      </div>
      {markers.length > 0 && (
        <div className="phase-track" aria-hidden>
          {markers.map((m) => (
            <button
              key={`${m.phase}-${m.index}`}
              type="button"
              className="phase-marker"
              style={{ left: `${max === 0 ? 0 : (m.index / max) * 100}%` }}
              data-phase={m.phase}
              title={m.phase}
              onClick={() => {
                setPlaying(false)
                setIdx(m.index)
              }}
            />
          ))}
        </div>
      )}
      {previewStep && scrubPreview !== idx && (
        <div className="scrub-preview">
          预览 #{scrubPreview! + 1}：{previewStep.message}
        </div>
      )}

      {markers.length > 0 && (
        <div className="phase-jump">
          <span className="muted">阶段跳转：</span>
          {markers.map((m) => (
            <button
              key={`btn-${m.phase}-${m.index}`}
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
              <i className="legend-dot" style={{ background: r.color }} />
              {r.label}
            </span>
          ))}
        </div>
      )}

      <div className="viz-body">
        <div className="viz-main">
          {step.graph && <GraphView graph={step.graph} />}
          {step.searchTree && (
            <SearchTreeView tree={step.searchTree} linkedBoard={hasBoard} />
          )}
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
