import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { EdgeRole, HighlightRole, Step } from '../types/step'
import { ArraysFromStep } from './ArrayView'
import MatrixView from './MatrixView'
import GraphView from './GraphView'
import SearchTreeView from './search/SearchTreeView'
import { SEMANTIC_ROLE_LABELS } from '../theme/semanticColors'
import type { PlaybackController } from './workbench/usePlaybackController'

export type { SeekCommand } from './workbench/usePlaybackController'

interface Props {
  /** The ONE shared playback controller (owned by the page). */
  player: PlaybackController
  /** Draft differs from the displayed run — label, never silently rerun. */
  staleResult?: boolean
  /** Optional context shown under the step text (e.g. compact input summary). */
  context?: ReactNode
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

/**
 * V23: Visualizer renders ONLY the demo column content — one main step text and
 * the main scene (graph / DP matrix / array / board / search tree). It owns no
 * timer, no transport, no inspector band and no body Portal. Current data and
 * the transport are Workbench siblings fed by the same PlaybackController.
 */
export default function Visualizer({ player, staleResult = false, context }: Props) {
  const { steps, idx, step, prevStep, playing, isPreview, runId, snapSwap, speedVars } = player
  const usedRoles = useMemo(() => collectUsedRoles(steps), [steps])
  const scaleMaxByArray = useMemo(() => computeScaleMax(steps), [steps])
  const signedDomainByArray = useMemo(() => computeSignedDomain(steps), [steps])

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
  /** V18-02: explicit primary scene — LCS→DP matrix, sort→main array, NQ→board, graph→graph */
  const primaryScene = useMemo(() => {
    if (step?.graph) return 'graph' as const
    if (hasBoard) return 'board' as const
    const mats = stepForMatrix?.matrices
    if (mats && Object.keys(mats).some((k) => k !== 'board')) return 'matrix' as const
    if (step?.arrays && Object.keys(step.arrays).length > 0) return 'array' as const
    if (step?.searchTree) return 'tree' as const
    return 'empty' as const
  }, [step, hasBoard, stepForMatrix])
  const arraysCompanion = primaryScene === 'matrix' || primaryScene === 'board'
  const displayMessage = step?.message ?? '就绪：调整输入后点击「运行」。'

  return (
    <div
      className="visualizer"
      style={speedVars as CSSProperties}
      data-playing={playing ? '1' : '0'}
      data-step-index={idx}
      data-preview={isPreview ? '1' : '0'}
      data-run-id={runId !== undefined && runId !== null ? String(runId) : undefined}
      data-testid="visualizer"
    >
      {/* ONE main step description (action + reason + result). Wraps; never half-line clipped. */}
      <div className="viz-banner viz-banner-slot" data-testid="viz-banner" role="status">
        <div className="viz-banner-text" data-testid="viz-banner-text" title={displayMessage}>
          {displayMessage}
        </div>
        <div className="viz-banner-controls" data-testid="viz-banner-controls">
          {staleResult && <span className="stale-result-badge">上一轮结果</span>}
          {legendItems.length > 0 && (
            <details className="viz-legend-toggle" data-testid="viz-legend-toggle">
              <summary>图例</summary>
              <div className="viz-legend" data-testid="viz-legend">
                {legendItems.map((r) => (
                  <span key={r.role}>
                    <i className="legend-dot" style={{ background: r.color }} />
                    {r.label}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
      {context}

      <div
        className="viz-main stage-viewport"
        data-testid="viz-canvas"
        data-stage-viewport="1"
        data-primary-scene={primaryScene}
        id="stage-viewport"
      >
        {/* V18-02 Priority: graph | companion labels (compact) | board/matrix primary | main array | tree aux */}
        {step?.graph && <GraphView graph={step.graph} />}
        {step && !step.graph && arraysCompanion && (
          <ArraysFromStep
            step={step}
            prevStep={prevStep}
            scaleMaxByArray={scaleMaxByArray}
            signedDomainByArray={signedDomainByArray}
            snapSwap={snapSwap}
            companionMode
          />
        )}
        {(primaryScene === 'matrix' || primaryScene === 'board') && stepForMatrix && (
          <MatrixView step={stepForMatrix} prevStep={prevStep} />
        )}
        {step && !step.graph && !arraysCompanion && (
          <ArraysFromStep
            step={step}
            prevStep={prevStep}
            scaleMaxByArray={scaleMaxByArray}
            signedDomainByArray={signedDomainByArray}
            snapSwap={snapSwap}
            companionMode={false}
          />
        )}
        {primaryScene !== 'matrix' && primaryScene !== 'board' && stepForMatrix?.matrices && (
          <MatrixView step={stepForMatrix} prevStep={prevStep} />
        )}
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
    </div>
  )
}
