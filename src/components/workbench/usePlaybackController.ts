import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Step } from '../../types/step'
import type { Trace } from '../../core/trace/types'
import { coordinatedStepIntervalMs } from '../../utils/playbackClock'
import { useMotion } from '../../theme/MotionContext'
import { motionCssVars } from '../../theme/motion'
import { segmentGeometry, teachableStages, type StageSegment } from '../../utils/teachableStages'
import { shouldIgnoreKeyboard } from '../../utils/keyboardGuard'
import type { PlaybackTransportProps } from './PlaybackTransport'
import { initialPlaybackState, playbackReducer, type PlaybackTransition } from './playbackIntent'

export type { ActionIntent, PlaybackTransition } from './playbackIntent'

/** Parent sends this only on scene load / new run / explicit external seek — never from onStepIndexChange. */
export type SeekCommand = { requestId: number | string; target: number }

export interface PlaybackOptions {
  steps?: Step[]
  trace?: Trace
  /** New runId/traceId resets player once (idx=0, playing=false) */
  runId?: string | number
  seekCommand?: SeekCommand | null
  onStepIndexChange?: (index: number) => void
  initialStepIndex?: number
  /** Global Space/←/→ shortcuts (one page = one controller). Default true. */
  keyboard?: boolean
}

export interface PlaybackController {
  steps: Step[]
  runId?: string | number
  idx: number
  max: number
  step: Step | undefined
  /** Trace-adjacent previous step (data diff / matrix flash) — NOT the animation source. */
  prevStep: Step | undefined
  /** V30: real displayed transition (from → to) + action intent for scene animation. */
  transition: PlaybackTransition
  /** Step whose ops describe the from→to transition (later of the two when adjacent); undefined for snapshot jumps. */
  motionStep: Step | undefined
  playing: boolean
  speed: number
  isPreview: boolean
  atEnd: boolean
  progress: number
  snapSwap: boolean
  speedVars: Record<string, string>
  goPrev: () => void
  goNext: () => void
  togglePlay: () => void
  reset: () => void
  seekTo: (i: number) => void
  setSpeed: (ms: number) => void
  /** Props for the ONE shared PlaybackTransport (no second timer/player). */
  transportProps: PlaybackTransportProps
}

function resolveSteps(steps?: Step[], trace?: Trace): Step[] {
  if (trace?.steps?.length) return trace.steps as Step[]
  return steps ?? []
}

const clampIdx = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))

/**
 * V23: the single playback controller (cursor + timer + speed) lifted out of
 * Visualizer so the Workbench can lay out scene / current data / transport as
 * siblings without portals. Exactly one instance per learning page.
 */
export function usePlaybackController({
  steps: stepsProp,
  trace,
  runId,
  seekCommand = null,
  onStepIndexChange,
  initialStepIndex = 0,
  keyboard = true,
}: PlaybackOptions): PlaybackController {
  const steps = useMemo(() => resolveSteps(stepsProp, trace), [stepsProp, trace])
  // V30: one reducer = cursor + autoplay flag + action intent / real from→to (no second cursor).
  const [pstate, dispatch] = useReducer(playbackReducer, clampIdx(initialStepIndex, steps.length), initialPlaybackState)
  const rawIdx = pstate.idx
  const playing = pstate.playing
  const [speed, setSpeed] = useState(600)
  const [scrubPreview, setScrubPreview] = useState<number | null>(null)
  const [playPulse, setPlayPulse] = useState(false)
  const [snapSwap, setSnapSwap] = useState(false)
  const timer = useRef<number | null>(null)
  const lastSeekReq = useRef<string | number | null>(null)
  const lastRunId = useRef<string | number | undefined>(undefined)
  const { mode, setSpeedIntervalMs, bumpTransitionEpoch, setPlaybackPlaying } = useMotion()

  // A run switch can shorten steps for one render before the reset effect runs.
  const idx = clampIdx(rawIdx, steps.length)
  const step = steps[idx] ?? steps[0]
  const prevStep = idx > 0 ? steps[idx - 1] : undefined
  const transition = useMemo<PlaybackTransition>(
    () => ({ ...pstate.t, from: clampIdx(pstate.t.from, steps.length), to: idx, runId }),
    [pstate.t, idx, steps.length, runId],
  )
  const motionStep =
    !transition.snapshot && Math.abs(transition.to - transition.from) === 1
      ? steps[Math.max(transition.from, transition.to)]
      : undefined
  const max = Math.max(0, steps.length - 1)

  const stageInfo = useMemo(() => teachableStages(steps, 8), [steps])
  const segments = useMemo(() => {
    const n = steps.length
    return stageInfo.all.map((s: StageSegment) => {
      const g = segmentGeometry(s.start, s.end, n)
      return { ...s, leftPct: g.leftPct, widthPct: g.widthPct }
    })
  }, [steps, stageInfo])

  const stepHasSwapMotion = useMemo(
    () => !!step?.arrayOps && Object.values(step.arrayOps).some((ops) => ops.some((o) => o.type === 'swap')),
    [step],
  )
  const stepHasMoveMotion = useMemo(
    () => !!step?.arrayOps && Object.values(step.arrayOps).some((ops) => ops.some((o) => o.type === 'move')),
    [step],
  )
  const effectiveInterval = useMemo(
    () =>
      coordinatedStepIntervalMs(speed, mode, {
        hasSwapMotion: stepHasSwapMotion,
        hasMoveMotion: stepHasMoveMotion,
        baseSwapMs: 280,
      }),
    [speed, mode, stepHasSwapMotion, stepHasMoveMotion],
  )

  // Informational mirror of the autoplay flag. V30: ArrayView no longer pauses motion from it —
  // animation pause intent is `transition.motionPaused` (explicit Pause only).
  useEffect(() => {
    setPlaybackPlaying(playing)
  }, [playing, setPlaybackPlaying])

  // Keep motion tokens / FLIP durations on the same clock as playback
  useEffect(() => {
    setSpeedIntervalMs(speed)
  }, [speed, setSpeedIntervalMs])
  const speedVars = useMemo(() => motionCssVars(mode, speed) as Record<string, string>, [mode, speed])

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
      dispatch({ type: 'stop' })
      return clear
    }
    // Single-frame: show once then complete (no infinite empty spin)
    if (max <= 0) {
      const t = window.setTimeout(() => dispatch({ type: 'stop' }), effectiveInterval)
      timer.current = t
      return clear
    }
    timer.current = window.setInterval(() => {
      dispatch({ type: 'autoAdvance', max })
    }, effectiveInterval)
    return clear
  }, [playing, effectiveInterval, max, clear, steps.length])

  // New runId resets player once — does not pause on every parent re-render
  useEffect(() => {
    if (runId === undefined) return
    if (lastRunId.current === runId) return
    lastRunId.current = runId
    dispatch({ type: 'seek', target: 0, len: Number.MAX_SAFE_INTEGER, intent: 'replaceRun' })
    setSnapSwap(true)
    bumpTransitionEpoch()
    const t = window.setTimeout(() => setSnapSwap(false), 50)
    return () => window.clearTimeout(t)
  }, [runId, bumpTransitionEpoch])

  // Explicit seek only when requestId changes — snap geometry (no FLIP residue)
  useEffect(() => {
    if (!seekCommand) return
    if (lastSeekReq.current === seekCommand.requestId) return
    lastSeekReq.current = seekCommand.requestId
    setSnapSwap(true)
    dispatch({ type: 'seek', target: seekCommand.target, len: steps.length })
    bumpTransitionEpoch()
    const t = window.setTimeout(() => setSnapSwap(false), 50)
    return () => window.clearTimeout(t)
  }, [seekCommand, steps.length, bumpTransitionEpoch])

  // Notify-only — must NOT feed back into seek/init in parent
  useEffect(() => {
    onStepIndexChange?.(idx)
  }, [idx, onStepIndexChange])

  const goPrev = useCallback(() => {
    // V10-04: stepping creates a new FLIP via geometry change + new transitionId.
    // Do not bump transitionEpoch here — reserved for cancel-only (seek/reset/replace-run).
    // V30-02: intent manualPrev; from = the frame actually displayed, so the scene travels back.
    dispatch({ type: 'manualPrev' })
  }, [])

  const goNext = useCallback(() => {
    // V30-01: takeover stops autoplay but the new transition plays (motionPaused=false).
    dispatch({ type: 'manualNext', max })
  }, [max])

  const togglePlay = useCallback(() => {
    setPlayPulse(true)
    window.setTimeout(() => setPlayPulse(false), 180)
    // V29 M2: Pause = freeze mid-motion (intent 'pause', motionPaused) — no bumpTransitionEpoch.
    // Resume continues the frozen transition. Completed → replay from 0 (existing trace; no re-solve).
    dispatch({ type: 'togglePlay', len: steps.length })
  }, [steps.length])

  const reset = useCallback(() => {
    // V29 M2: reset is a snapshot jump — snapSwap prevents FLIP across non-adjacent geometry.
    setSnapSwap(true)
    bumpTransitionEpoch()
    dispatch({ type: 'seek', target: 0, len: Math.max(1, steps.length), intent: 'reset' })
    window.setTimeout(() => setSnapSwap(false), 50)
  }, [bumpTransitionEpoch, steps.length])

  const seekTo = useCallback(
    (i: number) => {
      setSnapSwap(true)
      bumpTransitionEpoch()
      dispatch({ type: 'seek', target: i, len: steps.length })
      window.setTimeout(() => setSnapSwap(false), 50)
    },
    [steps.length, bumpTransitionEpoch],
  )

  useEffect(() => {
    if (!keyboard) return
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
  }, [keyboard, togglePlay, goPrev, goNext])

  const isPreview =
    !steps.length ||
    step?.phase === 'preview' ||
    (steps.length === 1 && step?.id === -1 && (step?.vars as { ready?: boolean } | undefined)?.ready === true)
  const progress = max === 0 ? 0 : (idx / max) * 100
  const atEnd = steps.length > 0 && idx >= max && !playing
  const previewStep = scrubPreview !== null ? steps[scrubPreview] : null

  const transportProps: PlaybackTransportProps = {
    idx,
    max,
    stepsLen: steps.length,
    playing,
    playPulse,
    speed,
    phase: step?.phase,
    progress,
    segments,
    teachableStages: stageInfo.direct,
    overflowStages: stageInfo.overflow,
    scrubPreview,
    previewMessage: previewStep?.message,
    isPreview,
    atEnd,
    onReset: reset,
    onPrev: goPrev,
    onNext: goNext,
    onTogglePlay: togglePlay,
    onSpeed: setSpeed,
    onSeek: seekTo,
    onScrubPreview: setScrubPreview,
  }

  return {
    steps,
    runId,
    idx,
    max,
    step,
    prevStep,
    transition,
    motionStep,
    playing,
    speed,
    isPreview,
    atEnd,
    progress,
    snapSwap,
    speedVars,
    goPrev,
    goNext,
    togglePlay,
    reset,
    seekTo,
    setSpeed,
    transportProps,
  }
}
