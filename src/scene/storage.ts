import type { LocalLearningState, ScenePayload } from './types'
import { SCENE_PROTOCOL_VERSION } from './types'

const KEY = 'adviz.localLearning.v1'

export function defaultLocalState(): LocalLearningState {
  return {
    version: SCENE_PROTOCOL_VERSION,
    progress: {},
    prefs: {},
    wrongAnswers: [],
    bookmarks: [],
  }
}

export function loadLocalLearning(): LocalLearningState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultLocalState()
    const parsed = JSON.parse(raw) as LocalLearningState
    if (!parsed || typeof parsed !== 'object') return defaultLocalState()
    return {
      ...defaultLocalState(),
      ...parsed,
      progress: parsed.progress ?? {},
      prefs: parsed.prefs ?? {},
      wrongAnswers: parsed.wrongAnswers ?? [],
      bookmarks: parsed.bookmarks ?? [],
    }
  } catch {
    return defaultLocalState()
  }
}

export function saveLocalLearning(state: LocalLearningState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportLocalLearningJson(): string {
  return JSON.stringify(loadLocalLearning(), null, 2)
}

export function clearLocalLearningConfirmed(): void {
  localStorage.removeItem(KEY)
}

export function recordPracticeResult(itemId: string, correct: boolean, detail?: unknown) {
  const st = loadLocalLearning()
  const cur = st.progress[itemId] ?? { correct: 0, wrong: 0 }
  if (correct) cur.correct += 1
  else {
    cur.wrong += 1
    st.wrongAnswers.push({ id: itemId, at: new Date().toISOString(), detail })
    if (st.wrongAnswers.length > 200) st.wrongAnswers = st.wrongAnswers.slice(-200)
  }
  cur.lastAt = new Date().toISOString()
  st.progress[itemId] = cur
  saveLocalLearning(st)
}

export function addBookmark(algoId: string, label?: string, scene?: ScenePayload) {
  const st = loadLocalLearning()
  st.bookmarks.push({ algoId, label, scene, at: new Date().toISOString() })
  saveLocalLearning(st)
}
