export type HeavyRequest =
  | { kind: 'nQueens'; n: number; mode: 'one' | 'all'; runId: string }
  | {
      kind: 'knapsackBrute'
      items: { id: string; weight: number; value: number }[]
      capacity: number
      runId: string
    }
