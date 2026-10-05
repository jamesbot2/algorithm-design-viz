/**
 * V28: the user's code-language choice (TypeScript by default), persisted in localStorage and
 * shared by every code panel. Switching language only changes which document is shown — it
 * never touches the run, cursor, speed or playback state (those live in the player).
 */
import { useSyncExternalStore } from 'react'
import { CODE_LANGUAGES, type CodeLanguage } from './types'

export const CODE_LANGUAGE_STORAGE_KEY = 'adv.codeLanguage.v1'
const DEFAULT: CodeLanguage = 'typescript'

const isLanguage = (v: unknown): v is CodeLanguage =>
  typeof v === 'string' && (CODE_LANGUAGES as readonly string[]).includes(v)

function read(): CodeLanguage {
  try {
    const v = globalThis.localStorage?.getItem(CODE_LANGUAGE_STORAGE_KEY)
    return isLanguage(v) ? v : DEFAULT
  } catch {
    return DEFAULT
  }
}

let current: CodeLanguage = read()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

export function getCodeLanguage(): CodeLanguage {
  return current
}

export function setCodeLanguage(lang: CodeLanguage) {
  if (!isLanguage(lang) || lang === current) return
  current = lang
  try {
    globalThis.localStorage?.setItem(CODE_LANGUAGE_STORAGE_KEY, lang)
  } catch {
    /* private mode / quota: keep the in-memory choice */
  }
  emit()
}

function subscribe(f: () => void) {
  listeners.add(f)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CODE_LANGUAGE_STORAGE_KEY) return
    const v = read()
    if (v !== current) {
      current = v
      emit()
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(f)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

export function useCodeLanguage(): [CodeLanguage, (l: CodeLanguage) => void] {
  const lang = useSyncExternalStore(subscribe, getCodeLanguage, getCodeLanguage)
  return [lang, setCodeLanguage]
}

/** Test hook: re-read storage (e.g. after a test cleared localStorage). */
export function __reloadCodeLanguageForTests() {
  current = read()
  emit()
}
