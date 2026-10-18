import { SOURCE_HASHES, validationState, type ValidationState } from './validation'

/** Local-only favorites / recently viewed templates (this browser's localStorage; nothing is sent anywhere). */
const FAV = 'adv-tpl-fav'
const REC = 'adv-tpl-recent'
const read = (k: string): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
const write = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable: preferences simply do not persist */
  }
}
export const getFavorites = () => read(FAV)
export const toggleFavorite = (id: string): string[] => {
  const cur = read(FAV)
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  write(FAV, next)
  return next
}
export const getRecent = () => read(REC)
export const pushRecent = (id: string) => write(REC, [id, ...read(REC).filter((x) => x !== id)].slice(0, 6))

const ORDER: ValidationState[] = ['failed', 'stale', 'unverified', 'verified']
/** Overall status of a template = the worst status over every displayed source (teach per language + contest core/full). */
export function templateStatus(id: string): ValidationState {
  const h = SOURCE_HASHES[id]
  if (!h) return 'unverified'
  const states: ValidationState[] = []
  for (const [lang, hash] of Object.entries(h.teach ?? {})) states.push(validationState(`${id}|teach|${lang}|run`, hash).state)
  if (h.contest) {
    states.push(validationState(`${id}|contest-core|cpp|run`, h.contest.core).state)
    states.push(validationState(`${id}|contest-full|cpp|run`, h.contest.full).state)
  }
  return ORDER.find((s) => states.includes(s)) ?? 'unverified'
}
export const templateLanguages = (id: string): string[] => Object.keys(SOURCE_HASHES[id]?.teach ?? {})
