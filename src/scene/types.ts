import type { RunSnapshot } from '../core/runSnapshot/types'

export const SCENE_PROTOCOL_VERSION = 1

export interface ScenePayload {
  version: number
  algoId: string
  /** Algorithm input from the *run* snapshot (not live draft) */
  input: unknown
  params?: Record<string, unknown>
  seed?: number
  stepIndex?: number
  /** Optional immutable run binding — preferred over rewriting draft into scene */
  runSnapshot?: RunSnapshot
  sourceHash?: string
  /** When true, payload is draft-only and must be labeled as non-run in UI */
  draftOnly?: boolean
}

export interface LocalLearningState {
  version: number
  progress: Record<string, { correct: number; wrong: number; lastAt?: string }>
  prefs: Record<string, unknown>
  wrongAnswers: { id: string; at: string; detail?: unknown }[]
  bookmarks: { algoId: string; label?: string; scene?: ScenePayload; at: string }[]
}
