export type { RunSnapshot, SceneShare, DraftShare } from './types'

export function createRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function freezeRunSnapshot(
  s: import('./types').RunSnapshot,
): Readonly<import('./types').RunSnapshot> {
  const input =
    s.input !== null && typeof s.input === 'object'
      ? Object.freeze(cloneJson(s.input) as object)
      : s.input
  return Object.freeze({
    ...s,
    input,
    params: s.params ? Object.freeze({ ...s.params }) : undefined,
  }) as Readonly<import('./types').RunSnapshot>
}
