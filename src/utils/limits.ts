/** Demo size limits for the visualizer (keep steps / UI responsive). */
export const DEMO_LIMITS = {
  arrayLen: 32,
  stringLen: 64,
  graphN: 12,
  edges: 48,
  knapsackW: 40,
  knapsackItems: 12,
  matrixN: 10,
} as const

export type DemoLimitKey = keyof typeof DEMO_LIMITS
