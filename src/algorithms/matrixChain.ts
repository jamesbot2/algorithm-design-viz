import type { Step } from '../types/step'

export const meta = {
  id: 'matrixChain',
  title: '矩阵链乘',
  complexity: '时间 O(n³)，空间 O(n²)',
  description:
    '区间 DP：枚举分裂点 k，求最少乘法次数并恢复最优加括号方案。示例 dims=[10,30,5,60] → 4500。',
  code: `for len=2..n:
  for i=1..n-len+1:
    j=i+len-1
    for k=i..j-1:
      dp[i][j]=min(dp[i][k]+dp[k+1][j]+p[i-1]*p[k]*p[j])`,
  defaultDims: [10, 30, 5, 60],
  implName: 'matrixChainOrder',
  implVersion: '1.0.0',
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n²)',
}

export interface MatrixChainResult {
  ok: boolean
  minCost: number
  dims: number[]
  parenthesization: string
}

function buildParen(s: number[][], i: number, j: number): string {
  if (i === j) return `A${i}`
  const k = s[i]![j]!
  return `(${buildParen(s, i, k)}${buildParen(s, k + 1, j)})`
}

export function solveMatrixChain(dims: number[]): {
  result: MatrixChainResult
  steps: Step[]
  dp: number[][]
} {
  // dims length = n+1 for n matrices
  const n = dims.length - 1
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0))
  const split: number[][] = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0))
  const steps: Step[] = []
  const DOC = 'matrixChain.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0

  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    targets?: {
      current?: [number, number]
      reads?: [number, number][]
      writes?: [number, number][]
    },
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    steps.push({
      id: id++,
      message,
      matrices: {
        dp: dp.map((r) => r.map((x) => (x === Infinity ? '∞' : x))),
      },
      matrixTargets: targets ? { dp: targets } : undefined,
      arrays: { dims: [...dims] },
      vars,
      result,
      codeRefs: codeRefs ?? ref('lenLoop'),
    })
  }

  for (let i = 1; i <= n; i++) dp[i]![i] = 0
  snap(`n=${n} 个矩阵，dims=[${dims.join(',')}]`, { n })

  for (let len = 2; len <= n; len++) {
    for (let i = 1; i <= n - len + 1; i++) {
      const j = i + len - 1
      dp[i]![j] = Infinity
      for (let k = i; k < j; k++) {
        const cost =
          dp[i]![k]! + dp[k + 1]![j]! + dims[i - 1]! * dims[k]! * dims[j]!
        snap(
          `枚举 k=${k}：cost=${cost}（${dims[i - 1]}×${dims[k]}×${dims[j]}）`,
          { i, j, k, cost, len },
          {
            current: [i, j],
            reads: [
              [i, k],
              [k + 1, j],
            ],
            writes: [[i, j]],
          },
        )
        if (cost < dp[i]![j]!) {
          dp[i]![j] = cost
          split[i]![j] = k
        }
      }
      snap(`dp[${i}][${j}]=${dp[i]![j]}，最优分裂 k=${split[i]![j]}`, { i, j, k: split[i]![j]! }, {
        current: [i, j],
        writes: [[i, j]],
      })
    }
  }

  const parenthesization = n >= 1 ? buildParen(split, 1, n) : ''
  const minCost = n >= 1 ? dp[1]![n]! : 0
  const result: MatrixChainResult = {
    ok: true,
    minCost,
    dims: [...dims],
    parenthesization,
  }
  snap(
    `最少乘法次数 = ${minCost}；加括号：${parenthesization}`,
    { answer: minCost, parenthesization },
    { current: [1, n] },
    result,
  )
  return { result, steps, dp }
}

export function generateSteps(_arr: number[], dims = meta.defaultDims): Step[] {
  return solveMatrixChain(dims).steps
}
