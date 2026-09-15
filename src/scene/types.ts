export const SCENE_PROTOCOL_VERSION = 1

export interface ScenePayload {
  version: number
  algoId: string
  /** Algorithm input snapshot */
  input: unknown
  params?: Record<string, unknown>
  seed?: number
  stepIndex?: number
}

export interface LocalLearningState {
  version: number
  progress: Record<string, { correct: number; wrong: number; lastAt?: string }>
  prefs: Record<string, unknown>
  wrongAnswers: { id: string; at: string; detail?: unknown }[]
  bookmarks: { algoId: string; label?: string; scene?: ScenePayload; at: string }[]
}
