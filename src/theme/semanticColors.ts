/** Semantic color roles for algorithm visualization highlights / feedback. */
export const semanticColors = {
  compare: 'var(--sem-compare, #f59e0b)',
  swap: 'var(--sem-swap, #ef4444)',
  focus: 'var(--sem-focus, #3b82f6)',
  sorted: 'var(--sem-sorted, #22c55e)',
  pivot: 'var(--sem-pivot, #a855f7)',
  read: 'var(--sem-read, #06b6d4)',
  done: 'var(--sem-done, #22c55e)',
  prune: 'var(--sem-prune, #94a3b8)',
  reject: 'var(--sem-reject, #f87171)',
  optimal: 'var(--sem-optimal, #eab308)',
  bannerFlash: 'var(--sem-banner-flash, rgba(59, 130, 246, 0.18))',
  varsFlash: 'var(--sem-vars-flash, rgba(34, 197, 94, 0.12))',
} as const

export type SemanticColorRole = keyof typeof semanticColors

export function semanticCssVars(): Record<string, string> {
  return {
    '--sem-compare': '#f59e0b',
    '--sem-swap': '#ef4444',
    '--sem-focus': '#3b82f6',
    '--sem-sorted': '#22c55e',
    '--sem-pivot': '#a855f7',
    '--sem-read': '#06b6d4',
    '--sem-done': '#22c55e',
    '--sem-prune': '#94a3b8',
    '--sem-reject': '#f87171',
    '--sem-optimal': '#eab308',
    '--sem-banner-flash': 'rgba(59, 130, 246, 0.18)',
    '--sem-vars-flash': 'rgba(34, 197, 94, 0.12)',
  }
}
