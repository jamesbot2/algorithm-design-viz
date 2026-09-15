import type { Step } from '../types/step'

/** Fine-grained event phases — not teachable stage jump targets. */
export const EVENT_PHASES = new Set([
  'compare',
  'swap',
  'read',
  'update',
  'checking',
  'relaxing',
  'reject',
  'rejected',
  'accept',
  'accepted',
  'visit',
  'frontier',
  'settle',
  'settled',
  'prune',
  'pruned',
  'pivot',
  'partition',
  'merge',
  'copy',
])

export type StageSegment = {
  start: number
  end: number
  phase: string
  label: string
  kind: 'teachable' | 'event'
}

export type TimelineGeometry = {
  /** Discrete step count N. Empty → 0. */
  n: number
  /** left% and width% in [0,100], last segment never overflows. */
  leftPct: number
  widthPct: number
}

/**
 * Interval model: N discrete steps map to half-open [0, N).
 * Segment covering steps [start, end] inclusive → [start, end+1).
 * Position/width normalize by N (not N-1).
 */
export function segmentGeometry(start: number, end: number, n: number): TimelineGeometry {
  if (n <= 0) return { n: 0, leftPct: 0, widthPct: 0 }
  const lo = Math.max(0, Math.min(start, n - 1))
  const hi = Math.max(lo, Math.min(end, n - 1))
  const leftPct = (lo / n) * 100
  const widthPct = ((hi - lo + 1) / n) * 100
  const cappedWidth = Math.min(widthPct, 100 - leftPct)
  return { n, leftPct, widthPct: Math.max(0, cappedWidth) }
}

function macroKey(step: Step, _index: number): { key: string; label: string; phase: string } {
  const phase = (step.phase ?? '').trim() || 'step'
  const iVar = typeof step.vars?.i === 'number' ? (step.vars.i as number) : null

  if (phase === 'init' || phase === 'start' || phase === 'preview') {
    return { key: 'init', label: '初始化', phase: 'init' }
  }
  if (phase === 'done' || phase === 'complete' || phase === 'finish') {
    return { key: 'done', label: '完成', phase: 'done' }
  }
  if (phase === 'reconstruct' || phase === 'backtrace' || phase === 'recover') {
    return { key: 'reconstruct', label: '方案恢复', phase: 'reconstruct' }
  }
  if (phase === 'fill' || phase === 'dp' || phase === 'compute' || phase === 'table') {
    return { key: 'compute', label: '填表/计算', phase: 'compute' }
  }
  if (phase === 'outer') {
    const pass = iVar != null && iVar >= 0 ? iVar : 0
    return { key: `pass-${pass}`, label: `第 ${pass + 1} 轮`, phase: 'outer' }
  }
  if (EVENT_PHASES.has(phase)) {
    if (iVar != null && iVar >= 0) {
      return { key: `pass-${iVar}`, label: `第 ${iVar + 1} 轮`, phase: 'outer' }
    }
    return { key: 'compute', label: '计算', phase: 'compute' }
  }
  return { key: `phase-${phase}`, label: phase, phase }
}

/** Collapse consecutive identical phases (event density / track decoration). */
export function eventPhaseSegments(steps: Step[]): StageSegment[] {
  const out: StageSegment[] = []
  let cur: StageSegment | null = null
  steps.forEach((s, i) => {
    const phase = s.phase?.trim()
    if (!phase) return
    if (cur && cur.phase === phase) {
      cur.end = i
    } else {
      if (cur) out.push(cur)
      cur = {
        start: i,
        end: i,
        phase,
        label: phase,
        kind: EVENT_PHASES.has(phase) ? 'event' : 'teachable',
      }
    }
  })
  if (cur) out.push(cur)
  return out
}

/**
 * Teachable stages for jump UI — max ~8 direct entries.
 * Extra passes go into overflow (searchable/scrollable list).
 */
export function teachableStages(
  steps: Step[],
  maxDirect = 8,
): {
  direct: StageSegment[]
  overflow: StageSegment[]
  all: StageSegment[]
} {
  const regrouped: StageSegment[] = []
  let prevKey: string | null = null
  let acc: StageSegment | null = null
  steps.forEach((s, i) => {
    const m = macroKey(s, i)
    if (acc && prevKey === m.key) {
      acc.end = i
    } else {
      if (acc) regrouped.push(acc)
      acc = { start: i, end: i, phase: m.phase, label: m.label, kind: 'teachable' }
      prevKey = m.key
    }
  })
  if (acc) regrouped.push(acc)

  if (regrouped.length <= maxDirect) {
    return { direct: regrouped, overflow: [], all: regrouped }
  }

  const direct: StageSegment[] = []
  const overflow: StageSegment[] = []
  const hasDone = regrouped[regrouped.length - 1]?.phase === 'done'
  const tail = hasDone ? regrouped[regrouped.length - 1]! : null
  const body = hasDone ? regrouped.slice(0, -1) : regrouped
  // Reserve slots: head stages + optional "更多" + optional done
  const keepHead = Math.max(1, maxDirect - (tail ? 2 : 1))
  for (let i = 0; i < body.length; i++) {
    if (i < keepHead) direct.push(body[i]!)
    else overflow.push(body[i]!)
  }
  if (overflow.length) {
    direct.push({
      start: overflow[0]!.start,
      end: overflow[overflow.length - 1]!.end,
      phase: 'more',
      label: `更多 (${overflow.length})`,
      kind: 'teachable',
    })
  }
  if (tail) direct.push(tail)
  return { direct, overflow, all: regrouped }
}
