import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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

/** Parent sends this only on scene load / new run / explicit external seek — never from onStepIndexChange. */
export type SeekCommand = { requestId: number | string; target: number }

interface Props {
  steps?: Step[]
  trace?: Trace
  code?: string
  /** @deprecated Prefer seekCommand; kept for one-shot mount only */
  initialStepIndex?: number
  /** Explicit seek — Visualizer owns idx/playing; parent must not mirror cursor back here */
  seekCommand?: SeekCommand | null
  /** New runId/traceId resets player once (idx=0, playing=false) */
  runId?: string | number
  onStepIndexChange?: (index: number) => void
  staleResult?: boolean
  /** Optional interactive code browser slot (Phase B) */
  codeSlot?: ReactNode
  /** Final-answer panel content (collapsed by default) */
  finalAnswer?: ReactNode
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
    if (s.arrayOps) {
      for (const ops of Object.values(s.arrayOps)) {
        for (const op of ops) {
          if (op.type === 'compare') used.add('compare')
          else if (op.type === 'swap') used.add('swap')
          else used.add('update')
        }
      }
    } else if (s.highlights) {
      for (const idxs of Object.values(s.highlights)) {
        if (idxs.length) used.add('compare')
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

/** Collapse consecutive identical phases into segments (not a marker per compare). */
function phaseSegments(steps: Step[]): { start: number; end: number; phase: string }[] {
  const out: { start: number; end: number; phase: string }[] = []
  let cur: { start: number; end: number; phase: string } | null = null
  steps.forEach((s, i) => {
    if (!s.phase) return
    if (cur && cur.phase === s.phase) {
      cur.end = i
    } else {
      if (cur) out.push(cur)
      cur = { start: i, end: i, phase: s.phase }
    }
  })
  if (cur) out.push(cur)
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

function shouldIgnoreKeyboard(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  if (
    t.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="slider"], [role="separator"], [data-panel-resize-handle], .cm-editor, .cm-content, .code-browser, .WorkbenchLayout',
    )
  ) {
    // Allow Space/arrows on the visualizer's own transport buttons via explicit handling;
    // but do not steal from other buttons / editors / sliders / separators.
    if (t.closest('.viz-toolbar, .scrub-row, .phase-jump, .phase-track')) return false
    if (tag === 'BUTTON' || t.closest('button')) return true
    if (t.closest('.cm-editor, .cm-content, .code-browser')) return true
    if (t.closest('[role="slider"], input[type="range"]')) return true
    if (t.closest('[role="separator"], [data-panel-resize-handle]')) return true
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (t.isContentEditable || t.closest('[contenteditable="true"]')) return true
  }
  return false
}

export default function Visualizer({
  steps: stepsProp,
  trace,
  code,
  initialStepIndex = 0,
  seekCommand = null,
  runId,
  onStepIndexChange,
  staleResult = false,
  codeSlot,
  finalAnswer,
}: Props) {
  const steps = useMemo(() => resolveSteps(stepsProp, trace), [stepsProp, trace])
  const clamp = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))
  const [idx, setIdx] = useState(() => clamp(initialStepIndex, steps.length))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const [scrubPreview, setScrubPreview] = useState<number | null>(null)
  const [playPulse, setPlayPulse] = useState(false)
  const [answerOpen, setAnswerOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastSeekReq = useRef<string | number | null>(null)
  const lastRunId = useRef<string | number | undefined>(undefined)
  const { mode } = useMotion()

  const step = steps[idx] ?? steps[0]
  const prevStep = idx > 0 ? steps[idx - 1] : undefined
  const max = Math.max(0, steps.length - 1)
  const usedRoles = useMemo(() => collectUsedRoles(steps), [steps])
  const segments = useMemo(() => phaseSegments(steps), [steps])
  const scaleMaxByArray = useMemo(() => computeScaleMax(steps), [steps])

  const effectiveInterval = useMemo(() => {
    const feel = speedFeelMultiplier(speed)
    return Math.max(80, Math.round(speed / Math.max(0.5, 2 - feel)))
  }, [speed])

  const speedVars = useMemo(() => motionCssVars(mode, speed), [mode, speed])

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

  // New runId resets player once — does not pause on every parent re-render
  useEffect(() => {
    if (runId === undefined) return
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    setIdx(0)
    setPlaying(false)
  }, [runId])

  // Explicit seek only when requestId changes
  useEffect(() => {
    if (!seekCommand) return
    if (lastSeekReq.current === seekCommand.requestId) return
    lastSeekReq.current = seekCommand.requestId
    setIdx(clamp(seekCommand.target, steps.length))
    setPlaying(false)
  }, [seekCommand, steps.length])

  // Notify-only — must NOT feed back into seek/init in parent
  useEffect(() => {
    onStepIndexChange?.(idx)
  }, [idx, onStepIndexChange])

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
      if (shouldIgnoreKeyboard(e)) return
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

  const isPreview =
    !steps.length ||
    step?.phase === 'preview' ||
    (steps.length === 1 && step?.id === -1 && (step?.vars as { ready?: boolean } | undefined)?.ready === true)

  const legendItems = [...usedRoles]
    .map((role) => ({
      role,
      label: SEMANTIC_ROLE_LABELS[role] ?? role,
      color: ROLE_DOT[role] ?? '#888',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh'))

  const hasBoard = Boolean(step?.matrices?.board)
  const displayMessage = step?.message ?? '就绪：调整输入后点击「运行」。'

  return (
    <div className="visualizer" ref={rootRef} style={speedVars as CSSProperties} data-playing={playing ? '1' : '0'} data-step-index={idx} data-preview={isPreview ? '1' : '0'} data-testid="visualizer">
      <div className="viz-banner viz-banner-slot" data-testid="viz-banner" role="status">
        <div className="viz-banner-text">{displayMessage}</div>
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
          data-testid="play-btn"
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
        <span className="step-counter tabular-nums" data-testid="step-counter">
          {steps.length ? `${idx + 1} / ${steps.length}` : '— / —'}
          {step?.phase ? ` · ${step.phase}` : ''}
        </span>
      </div>

      <div className="scrub-row">
        <span className="scrub-label">进度</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, max)}
          step={1}
          value={steps.length ? idx : 0}
          disabled={!steps.length}
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
          role="slider"
        />
        <span className="scrub-pct tabular-nums">{Math.round(progress)}%</span>
      </div>
      {segments.length > 0 && (
        <div className="phase-track" aria-hidden>
          {segments.map((seg) => {
            const left = max === 0 ? 0 : (seg.start / max) * 100
            const width = max === 0 ? 100 : ((seg.end - seg.start + 1) / max) * 100
            return (
              <button
                key={`${seg.phase}-${seg.start}`}
                type="button"
                className="phase-segment"
                style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                data-phase={seg.phase}
                title={`${seg.phase} (#${seg.start + 1}–${seg.end + 1})`}
                onClick={() => {
                  setPlaying(false)
                  setIdx(seg.start)
                }}
              />
            )
          })}
        </div>
      )}
      {previewStep && scrubPreview !== idx && (
        <div className="scrub-preview scrub-preview-overlay" data-testid="scrub-preview">
          预览 #{scrubPreview! + 1}：{previewStep.message}
        </div>
      )}

      {segments.length > 0 && (
        <div className="phase-jump">
          <span className="muted">阶段跳转：</span>
          {segments.map((seg) => (
            <button
              key={`btn-${seg.phase}-${seg.start}`}
              type="button"
              className={idx >= seg.start && idx <= seg.end ? 'active' : ''}
              onClick={() => {
                setPlaying(false)
                setIdx(seg.start)
              }}
            >
              {seg.phase}
            </button>
          ))}
        </div>
      )}

      <div className="stats-row stats-row-fixed" data-testid="stats-row">
        <span className="stat-chip">
          比较 <strong className="tabular-nums">{stats?.comparisons ?? '—'}</strong>
        </span>
        <span className="stat-chip">
          交换 <strong className="tabular-nums">{stats?.swaps ?? '—'}</strong>
        </span>
        <span className="stat-chip">
          写入 <strong className="tabular-nums">{stats?.writes ?? '—'}</strong>
        </span>
      </div>

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

      {/* Single column: canvas + compact inspector. Code lives in Workbench right panel only. */}
      <div className="viz-body viz-body-single">
        <div className="viz-main" data-testid="viz-canvas">
          {step?.graph && <GraphView graph={step.graph} />}
          {step?.searchTree && (
            <SearchTreeView tree={step.searchTree} linkedBoard={hasBoard} />
          )}
          {step && <ArraysFromStep step={step} prevStep={prevStep} scaleMaxByArray={scaleMaxByArray} />}
          {step && <MatrixView step={step} />}
          {!step && <div className="viz-empty soft">暂无画布内容</div>}
        </div>
        <div className="viz-inspector" data-testid="viz-inspector">
          <div className="viz-vars-stable">
            {step ? <VarsPanel step={step} prevStep={prevStep} /> : null}
          </div>
          {finalAnswer !== undefined && finalAnswer !== null && (
            <details
              className="final-answer-panel"
              open={answerOpen}
              onToggle={(e) => setAnswerOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary>最终结果（折叠）</summary>
              <div className="final-answer-body">{finalAnswer}</div>
            </details>
          )}
          {/* Legacy fallback only when codeSlot explicitly passed; Workbench owns CodeBrowser */}
          {codeSlot}
          {!codeSlot && code && step && <CodePanel code={code} activeLine={step.codeLine} />}
        </div>
      </div>

      <p className="kbd-hint">
        快捷键：<kbd>空格</kbd> 播放/暂停 · <kbd>←</kbd> 上一步 · <kbd>→</kbd> 下一步（输入框/按钮/滑块/编辑器内不抢键）
      </p>
    </div>
  )
}
