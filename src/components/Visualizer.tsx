import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { EdgeRole, HighlightRole, Step } from '../types/step'
import type { Trace } from '../core/trace/types'
import { ArraysFromStep } from './ArrayView'
import MatrixView from './MatrixView'
import VarsPanel from './VarsPanel'
import CodePanel from './CodePanel'
import GraphView from './GraphView'
import SearchTreeView from './search/SearchTreeView'
import { SEMANTIC_ROLE_LABELS } from '../theme/semanticColors'
import { motionCssVars } from '../theme/motion'
import { coordinatedStepIntervalMs } from '../utils/playbackClock'
import { useMotion } from '../theme/MotionContext'
import PlaybackTransport from './workbench/PlaybackTransport'
import { segmentGeometry, teachableStages } from '../utils/teachableStages'

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
  /**
   * Where to place play/pause/scrub chrome.
   * `workbench` portals into externalChromeHost (spans both panels).
   */
  chromePlacement?: 'embedded' | 'workbench'
  /** Host element for workbench transport portal */
  externalChromeHost?: HTMLElement | null
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

/** Run-level signedness — keep half-span for value 1 across [1,-1] → mid [1,1]. */
function computeSignedDomain(steps: Step[]): Record<string, { hasPos: boolean; hasNeg: boolean }> {
  const out: Record<string, { hasPos: boolean; hasNeg: boolean }> = {}
  for (const s of steps) {
    if (!s.arrays) continue
    for (const [name, vals] of Object.entries(s.arrays)) {
      const cur = out[name] ?? { hasPos: false, hasNeg: false }
      for (const v of vals) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          if (v > 0) cur.hasPos = true
          if (v < 0) cur.hasNeg = true
        }
      }
      out[name] = cur
    }
  }
  return out
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
    if (t.closest('.viz-toolbar, .scrub-row, .phase-jump, .phase-track, .playback-transport')) return false
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
  chromePlacement = 'embedded',
  externalChromeHost = null,
}: Props) {
  const steps = useMemo(() => resolveSteps(stepsProp, trace), [stepsProp, trace])
  const clamp = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))
  const [idx, setIdx] = useState(() => clamp(initialStepIndex, steps.length))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const [scrubPreview, setScrubPreview] = useState<number | null>(null)
  const [playPulse, setPlayPulse] = useState(false)
  const [answerOpen, setAnswerOpen] = useState(false)
  const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastSeekReq = useRef<string | number | null>(null)
  const lastRunId = useRef<string | number | undefined>(undefined)
  const [snapSwap, setSnapSwap] = useState(false)
  const { mode, setSpeedIntervalMs, bumpTransitionEpoch } = useMotion()

  const step = steps[idx] ?? steps[0]
  const prevStep = idx > 0 ? steps[idx - 1] : undefined
  const max = Math.max(0, steps.length - 1)
  const usedRoles = useMemo(() => collectUsedRoles(steps), [steps])
  const stageInfo = useMemo(() => teachableStages(steps, 8), [steps])
  const segments = useMemo(() => {
    const n = steps.length
    return stageInfo.all.map((s) => {
      const g = segmentGeometry(s.start, s.end, n)
      return { ...s, leftPct: g.leftPct, widthPct: g.widthPct }
    })
  }, [steps, stageInfo])
  const scaleMaxByArray = useMemo(() => computeScaleMax(steps), [steps])
  const signedDomainByArray = useMemo(() => computeSignedDomain(steps), [steps])

  const stepHasSwapMotion = useMemo(() => {
    if (!step?.arrayOps) return false
    return Object.values(step.arrayOps).some((ops) => ops.some((o) => o.type === 'swap'))
  }, [step])

  const stepHasMoveMotion = useMemo(() => {
    if (!step?.arrayOps) return false
    return Object.values(step.arrayOps).some((ops) => ops.some((o) => o.type === 'move'))
  }, [step])

  const effectiveInterval = useMemo(
    () =>
      coordinatedStepIntervalMs(speed, mode, {
        hasSwapMotion: stepHasSwapMotion,
        hasMoveMotion: stepHasMoveMotion,
        baseSwapMs: 280,
      }),
    [speed, mode, stepHasSwapMotion, stepHasMoveMotion],
  )

  // Keep motion tokens / FLIP durations on the same clock as playback
  useEffect(() => {
    setSpeedIntervalMs(speed)
  }, [speed, setSpeedIntervalMs])

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
    if (steps.length <= 0) {
      setPlaying(false)
      return clear
    }
    // Single-frame: show once then complete (no infinite empty spin)
    if (max <= 0) {
      const t = window.setTimeout(() => setPlaying(false), effectiveInterval)
      timer.current = t
      return clear
    }
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
  }, [playing, effectiveInterval, max, clear, steps.length])

  // New runId resets player once — does not pause on every parent re-render
  useEffect(() => {
    if (runId === undefined) return
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    setIdx(0)
    setPlaying(false)
    bumpTransitionEpoch()
  }, [runId, bumpTransitionEpoch])

  // Explicit seek only when requestId changes — snap geometry (no FLIP residue)
  useEffect(() => {
    if (!seekCommand) return
    if (lastSeekReq.current === seekCommand.requestId) return
    lastSeekReq.current = seekCommand.requestId
    setSnapSwap(true)
    setIdx(clamp(seekCommand.target, steps.length))
    setPlaying(false)
    bumpTransitionEpoch()
    const t = window.setTimeout(() => setSnapSwap(false), 50)
    return () => window.clearTimeout(t)
  }, [seekCommand, steps.length, bumpTransitionEpoch])

  // Notify-only — must NOT feed back into seek/init in parent
  useEffect(() => {
    onStepIndexChange?.(idx)
  }, [idx, onStepIndexChange])

  const goPrev = useCallback(() => {
    setPlaying(false)
    // V10-04: stepping creates a new FLIP via geometry change + new transitionId.
    // Do not bump transitionEpoch here — that is reserved for cancel-only
    // (pause / seek / reset / replace-run). Bumping+setIdx together used to
    // race a post-layout clear that wiped the brand-new invert.
    setIdx((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setPlaying(false)
    setIdx((i) => Math.min(max, i + 1))
  }, [max])

  const togglePlay = useCallback(() => {
    setPlayPulse(true)
    window.setTimeout(() => setPlayPulse(false), 180)
    if (playing) {
      setPlaying(false)
      bumpTransitionEpoch()
      return
    }
    if (steps.length === 0) return
    const last = Math.max(0, steps.length - 1)
    // completed → replay: seek 0 then play (existing trace; must NOT re-solve)
    if (idx >= last) {
      setIdx(0)
    }
    setPlaying(true)
  }, [playing, steps.length, idx, bumpTransitionEpoch])

  const reset = useCallback(() => {
    setPlaying(false)
    bumpTransitionEpoch()
    setIdx(0)
  }, [bumpTransitionEpoch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape must close the sheet even if focus is on a button inside it
      if (e.key === 'Escape' && inspectorSheetOpen) {
        e.preventDefault()
        setInspectorSheetOpen(false)
        return
      }
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
  }, [togglePlay, goPrev, goNext, inspectorSheetOpen])

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

  // V11-03: keep last board when a step omits matrices.board (e.g. legacy traces)
  const [cachedBoard, setCachedBoard] = useState<(string | number | null)[][] | null>(null)
  const stepsBoardKey = useMemo(() => steps.map((s) => s.id).join(','), [steps])
  useEffect(() => {
    setCachedBoard(null)
  }, [stepsBoardKey])
  useEffect(() => {
    const b = step?.matrices?.board
    if (b) setCachedBoard(b as (string | number | null)[][])
  }, [step])
  const displayBoard = (step?.matrices?.board ?? cachedBoard) as (string | number | null)[][] | null
  const hasBoard = Boolean(displayBoard)
  const stepForMatrix = useMemo(() => {
    if (!step) return step
    if (step.matrices?.board || !displayBoard) return step
    return {
      ...step,
      matrices: { ...(step.matrices ?? {}), board: displayBoard },
    }
  }, [step, displayBoard])
  const displayMessage = step?.message ?? '就绪：调整输入后点击「运行」。'

  const seekTo = useCallback(
    (i: number) => {
      setPlaying(false)
      bumpTransitionEpoch()
      setIdx(clamp(i, steps.length))
    },
    [steps.length, bumpTransitionEpoch],
  )

  const atEnd = steps.length > 0 && idx >= max && !playing
  const transport = (
    <PlaybackTransport
      idx={idx}
      max={max}
      stepsLen={steps.length}
      playing={playing}
      playPulse={playPulse}
      speed={speed}
      phase={step?.phase}
      progress={progress}
      segments={segments}
      teachableStages={stageInfo.direct}
      overflowStages={stageInfo.overflow}
      scrubPreview={scrubPreview}
      previewMessage={previewStep?.message}
      isPreview={isPreview}
      atEnd={atEnd}
      onReset={reset}
      onPrev={goPrev}
      onNext={goNext}
      onTogglePlay={togglePlay}
      onSpeed={setSpeed}
      onSeek={seekTo}
      onScrubPreview={setScrubPreview}
    />
  )

  const chrome =
    chromePlacement === 'workbench' && externalChromeHost
      ? createPortal(transport, externalChromeHost)
      : chromePlacement === 'embedded'
        ? transport
        : null

  return (
    <div className="visualizer" ref={rootRef} style={speedVars as CSSProperties} data-playing={playing ? '1' : '0'} data-step-index={idx} data-preview={isPreview ? '1' : '0'} data-testid="visualizer" data-chrome={chromePlacement}>
      <div className="viz-banner viz-banner-slot" data-testid="viz-banner" role="status">
        <div className="viz-banner-text">{displayMessage}</div>
        {staleResult && <span className="stale-result-badge">上一轮结果</span>}
        <button
          type="button"
          className="ghost inspector-sheet-toggle"
          data-testid="inspector-sheet-toggle"
          aria-expanded={inspectorSheetOpen}
          onClick={() => setInspectorSheetOpen((o) => !o)}
        >
          变量/结果
        </button>
      </div>

      {chrome}

      <div className="stats-row stats-row-fixed" data-testid="stats-row">
        {stats?.comparisons != null && (
          <span className="stat-chip">
            比较 <strong className="tabular-nums">{stats.comparisons}</strong>
          </span>
        )}
        {stats?.swaps != null && (
          <span className="stat-chip">
            交换 <strong className="tabular-nums">{stats.swaps}</strong>
          </span>
        )}
        {stats?.writes != null && (
          <span className="stat-chip">
            写入 <strong className="tabular-nums">{stats.writes}</strong>
          </span>
        )}
        {stats &&
          Object.entries(stats)
            .filter(([k]) => !['comparisons', 'swaps', 'writes'].includes(k))
            .map(([k, v]) => (
              <span className="stat-chip" key={k}>
                {k} <strong className="tabular-nums">{String(v)}</strong>
              </span>
            ))}
      </div>

      {/* Always mount legend band — empty placeholder prevents canvas height drift when roles appear */}
      <div className="viz-legend" data-testid="viz-legend" aria-hidden={legendItems.length === 0}>
        {legendItems.map((r) => (
          <span key={r.role}>
            <i className="legend-dot" style={{ background: r.color }} />
            {r.label}
          </span>
        ))}
      </div>

      {/* Single column: main scene first. Code lives in Workbench right panel only. */}
      <div className="viz-body viz-body-single">
        <div
          className="viz-main stage-viewport"
          data-testid="viz-canvas"
          data-stage-viewport="1"
          id="stage-viewport"
        >
          {/* Priority: graph | arrays | board/matrix — search tree is aux when board present */}
          {step?.graph && <GraphView graph={step.graph} />}
          {step && (
            <ArraysFromStep
              step={step}
              prevStep={prevStep}
              scaleMaxByArray={scaleMaxByArray}
              signedDomainByArray={signedDomainByArray}
              snapSwap={snapSwap}
            />
          )}
          {stepForMatrix && <MatrixView step={stepForMatrix} prevStep={prevStep} />}
          {step?.searchTree && hasBoard && (
            <details className="search-tree-aux" data-testid="search-tree-aux">
              <summary>搜索树（辅助视图）</summary>
              <SearchTreeView tree={step.searchTree} linkedBoard activePathIds={step.activePathIds} />
            </details>
          )}
          {step?.searchTree && !hasBoard && (
            <SearchTreeView tree={step.searchTree} linkedBoard={false} activePathIds={step.activePathIds} />
          )}
          {!step && <div className="viz-empty soft">暂无画布内容</div>}
        </div>
        <div className="viz-inspector" data-testid="viz-inspector">
          {/* Primary step message lives in viz-banner only (UI-09) — inspector shows vars/delta */}
          <div className="inspector-delta" data-testid="step-explanation">
            <div className="panel-title">变量 / 变化</div>
            {prevStep && step?.message && prevStep.message !== step.message ? (
              <p className="inspector-explain-text muted hint">较上步：条件与赋值见下方变量高亮</p>
            ) : (
              <p className="inspector-explain-text muted hint">详见顶部步骤说明</p>
            )}
          </div>
          {(step?.frameId || (step?.vars && 'frameId' in step.vars)) && (
            <div className="inspector-stack" data-testid="call-stack">
              <div className="panel-title">当前帧标识</div>
              <code className="frame-id">{String(step?.frameId ?? step?.vars?.frameId)}</code>
              <p className="hint muted">frameId 不是完整调用栈</p>
            </div>
          )}
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
              <div className="final-answer-body">
                {typeof finalAnswer === 'object' && finalAnswer !== null && 'type' in (finalAnswer as object)
                  ? finalAnswer
                  : finalAnswer}
              </div>
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

      {inspectorSheetOpen &&
        createPortal(
          <div
            className="inspector-sheet"
            data-testid="inspector-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="变量与结果"
          >
            <div className="inspector-sheet-head">
              <strong>变量 / 结果</strong>
              <button type="button" className="ghost" onClick={() => setInspectorSheetOpen(false)}>
                关闭
              </button>
            </div>
            <div className="viz-inspector inspector-sheet-body" data-testid="viz-inspector-sheet">
              <div className="inspector-delta">
                <div className="panel-title">变量 / 变化</div>
                <p className="inspector-explain-text muted hint">与主检查器同源数据</p>
              </div>
              {(step?.frameId || (step?.vars && 'frameId' in step.vars)) && (
                <div className="inspector-stack">
                  <div className="panel-title">当前帧标识</div>
                  <code className="frame-id">{String(step?.frameId ?? step?.vars?.frameId)}</code>
                </div>
              )}
              <div className="viz-vars-stable">
                {step ? <VarsPanel step={step} prevStep={prevStep} /> : null}
              </div>
              {finalAnswer !== undefined && finalAnswer !== null && (
                <div className="final-answer-body">{finalAnswer}</div>
              )}
              {legendItems.length > 0 && (
                <div className="viz-legend">
                  {legendItems.map((r) => (
                    <span key={`sheet-${r.role}`}>
                      <i className="legend-dot" style={{ background: r.color }} />
                      {r.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
