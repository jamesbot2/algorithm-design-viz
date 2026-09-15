/** Semantic color roles for algorithm visualization highlights / feedback. */
export const semanticColors = {
  compare: 'var(--sem-compare, #f59e0b)',
  swap: 'var(--sem-swap, #ef4444)',
  focus: 'var(--sem-focus, #3b82f6)',
  update: 'var(--sem-update, #f97316)',
  accepted: 'var(--sem-accepted, #22c55e)',
  rejected: 'var(--sem-rejected, #f87171)',
  pruned: 'var(--sem-pruned, #94a3b8)',
  optimal: 'var(--sem-optimal, #eab308)',
  sorted: 'var(--sem-sorted, #22c55e)',
  pivot: 'var(--sem-pivot, #a855f7)',
  read: 'var(--sem-read, #06b6d4)',
  done: 'var(--sem-done, #22c55e)',
  error: 'var(--sem-error, #ef4444)',
  frontier: 'var(--sem-frontier, #38bdf8)',
  settled: 'var(--sem-settled, #64748b)',
  bannerFlash: 'var(--sem-banner-flash, rgba(59, 130, 246, 0.18))',
  varsFlash: 'var(--sem-vars-flash, rgba(34, 197, 94, 0.12))',
} as const

export type SemanticColorRole = keyof typeof semanticColors

/** Chinese labels for legend generation (roles that appear in steps). */
export const SEMANTIC_ROLE_LABELS: Record<string, string> = {
  compare: '比较',
  swap: '交换',
  focus: '焦点',
  update: '更新',
  accepted: '接受',
  rejected: '拒绝',
  pruned: '剪枝',
  optimal: '最优',
  sorted: '已确定/路径',
  pivot: '枢轴',
  read: '读取',
  done: '完成',
  error: '错误',
  frontier: '前沿',
  settled: '已结算',
}

export function semanticCssVars(): Record<string, string> {
  return {
    '--sem-compare': '#f59e0b',
    '--sem-swap': '#ef4444',
    '--sem-focus': '#3b82f6',
    '--sem-update': '#f97316',
    '--sem-accepted': '#22c55e',
    '--sem-rejected': '#f87171',
    '--sem-pruned': '#94a3b8',
    '--sem-optimal': '#eab308',
    '--sem-sorted': '#22c55e',
    '--sem-pivot': '#a855f7',
    '--sem-read': '#06b6d4',
    '--sem-done': '#22c55e',
    '--sem-error': '#ef4444',
    '--sem-frontier': '#38bdf8',
    '--sem-settled': '#64748b',
    '--sem-banner-flash': 'rgba(59, 130, 246, 0.18)',
    '--sem-vars-flash': 'rgba(34, 197, 94, 0.12)',
  }
}
