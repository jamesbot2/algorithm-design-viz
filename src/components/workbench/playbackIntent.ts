/**
 * V30-01/02: the single player's cursor state carries an explicit ACTION INTENT and the
 * real transition (from → to) that produced the displayed frame.
 *
 * Autoplay scheduling (`playing`) and animation pause intent (`motionPaused`) are separate:
 *  - only an explicit Pause freezes in-flight motion (resume continues it);
 *  - manual Next/Prev during autoplay stops the timer but the NEW transition plays to completion;
 *  - seek / reset / new run / replay are snapshot jumps (cancel, no travel).
 * Pure reducer — unit-testable without React.
 */
export type ActionIntent =
  | 'init'
  | 'autoAdvance'
  | 'manualNext'
  | 'manualPrev'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'seek'
  | 'reset'
  | 'replaceRun'
  | 'replay'

export interface PlaybackTransition {
  runId?: string | number
  /** Monotonic per controller; bumps on every cursor move. Never equal to / derived from runId. */
  transitionId: number
  /** Cursor index that was displayed before this transition (the real visual source). */
  from: number
  /** Cursor index being displayed. */
  to: number
  intent: ActionIntent
  /** Animation pause intent — true only after an explicit Pause. */
  motionPaused: boolean
  /** Snapshot jump: cancel in-flight motion, land instantly. */
  snapshot: boolean
}

export interface PlaybackState {
  idx: number
  playing: boolean
  t: Omit<PlaybackTransition, 'runId'>
}

export type PlaybackAction =
  | { type: 'autoAdvance'; max: number }
  | { type: 'manualNext'; max: number }
  | { type: 'manualPrev' }
  | { type: 'togglePlay'; len: number }
  | { type: 'seek'; target: number; len: number; intent?: 'seek' | 'reset' | 'replaceRun' }
  | { type: 'stop' }

export const SNAPSHOT_INTENTS: ReadonlySet<ActionIntent> = new Set(['seek', 'reset', 'replaceRun', 'replay'])

const clamp = (i: number, len: number) => Math.max(0, Math.min(i, Math.max(0, len - 1)))

export function initialPlaybackState(idx: number): PlaybackState {
  return { idx, playing: false, t: { transitionId: 0, from: idx, to: idx, intent: 'init', motionPaused: false, snapshot: true } }
}

function move(s: PlaybackState, to: number, intent: ActionIntent, playing: boolean): PlaybackState {
  return {
    idx: to,
    playing,
    t: {
      transitionId: s.t.transitionId + 1,
      from: s.idx,
      to,
      intent,
      motionPaused: false,
      snapshot: SNAPSHOT_INTENTS.has(intent),
    },
  }
}

export function playbackReducer(s: PlaybackState, a: PlaybackAction): PlaybackState {
  switch (a.type) {
    case 'autoAdvance': {
      if (!s.playing) return s // stale timer tick after takeover / pause — swallowed by design
      if (s.idx >= a.max) return { ...s, playing: false, t: { ...s.t, intent: 'complete', motionPaused: false } }
      return move(s, s.idx + 1, 'autoAdvance', true)
    }
    case 'manualNext': {
      // Takeover: stop the timer; the new transition itself is NOT paused.
      if (s.idx >= a.max) return s.playing ? { ...s, playing: false, t: { ...s.t, motionPaused: false } } : s
      return move(s, s.idx + 1, 'manualNext', false)
    }
    case 'manualPrev': {
      if (s.idx <= 0) return s.playing ? { ...s, playing: false, t: { ...s.t, motionPaused: false } } : s
      return move(s, s.idx - 1, 'manualPrev', false)
    }
    case 'togglePlay': {
      if (s.playing) return { ...s, playing: false, t: { ...s.t, intent: 'pause', motionPaused: true } }
      if (a.len <= 0) return s
      // completed → replay from 0 on the existing trace (snapshot jump, no re-solve)
      if (s.idx >= a.len - 1) return move(s, 0, 'replay', true)
      return { ...s, playing: true, t: { ...s.t, intent: 'resume', motionPaused: false } }
    }
    case 'seek':
      return move(s, clamp(a.target, a.len), a.intent ?? 'seek', false)
    case 'stop':
      return s.playing ? { ...s, playing: false, t: { ...s.t, intent: 'complete', motionPaused: false } } : s
  }
}
