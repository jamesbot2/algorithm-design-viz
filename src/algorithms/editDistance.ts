import type { Step } from '../types/step'

export const meta = {
  id: 'editDistance',
  title: '编辑距离',
  complexity: '时间 O(mn)，空间 O(mn)',
  description: '将串 A 变为 B 的最少插入/删除/替换次数；回溯一条编辑操作序列。',
  code: `if A[i]==B[j]: dp[i][j]=dp[i-1][j-1]
else: dp[i][j]=1+min(插,删,替)
# reconstruct ops from (m,n)`,
  defaultA: 'kitten',
  defaultB: 'sitting',
  implName: 'editDistanceDP',
  implVersion: '1.2.0',
  timeComplexity: 'O(mn)',
  spaceComplexity: 'O(mn)',
}

export type EditOp =
  | { op: 'match'; a: string; b: string }
  | { op: 'replace'; a: string; b: string }
  | { op: 'insert'; b: string }
  | { op: 'delete'; a: string }

export function reconstructEditOps(A: string, B: string, dp: number[][]): EditOp[] {
  let i = A.length
  let j = B.length
  const ops: EditOp[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      ops.push({ op: 'match', a: A[i - 1]!, b: B[j - 1]! })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      ops.push({ op: 'replace', a: A[i - 1]!, b: B[j - 1]! })
      i--
      j--
    } else if (j > 0 && dp[i]![j] === dp[i]![j - 1]! + 1) {
      ops.push({ op: 'insert', b: B[j - 1]! })
      j--
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      ops.push({ op: 'delete', a: A[i - 1]! })
      i--
    } else if (i > 0 && j > 0) {
      // tie-break prefer replace
      ops.push({ op: 'replace', a: A[i - 1]!, b: B[j - 1]! })
      i--
      j--
    } else if (j > 0) {
      ops.push({ op: 'insert', b: B[j - 1]! })
      j--
    } else {
      ops.push({ op: 'delete', a: A[i - 1]! })
      i--
    }
  }
  return ops.reverse()
}

export function editPath(A: string, B: string, dp: number[][]): [number, number][] {
  let i = A.length
  let j = B.length
  const path: [number, number][] = [[i, j]]
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i]![j] === dp[i]![j - 1]! + 1)) {
      j--
    } else if (i > 0) {
      i--
    } else {
      j--
    }
    path.push([i, j])
  }
  return path
}

export function generateSteps(_arr: number[], A = meta.defaultA, B = meta.defaultB): Step[] {
  const m = A.length
  const n = B.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const steps: Step[] = []
  const DOC = 'editDistance.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    targets?: {
      current?: [number, number]
      reads?: [number, number][]
      writes?: [number, number][]
      path?: [number, number][]
    },
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      matrixTargets: targets ? { dp: targets } : undefined,
      arrays: { A: A.split(''), B: B.split('') },
      vars,
      codeLine,
      result,
      codeRefs,
    })
  }
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  snap('边界：空串编辑距离 = 长度', { m, n }, 0, { writes: [[0, 0]] }, undefined, ref('init'))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
        snap(`'${A[i - 1]}'=='${B[j - 1]}' → dp[${i}][${j}]=${dp[i]![j]}`, { i, j }, 0, {
          current: [i, j],
          reads: [[i - 1, j - 1]],
          writes: [[i, j]],
        }, undefined, ref('equal'))
      } else {
        const ins = dp[i]![j - 1]!
        const del = dp[i - 1]![j]!
        const rep = dp[i - 1]![j - 1]!
        dp[i]![j] = 1 + Math.min(ins, del, rep)
        snap(`不相等 → 1+min(插${ins},删${del},替${rep})=${dp[i]![j]}`, { i, j, ins, del, rep }, 1, {
          current: [i, j],
          reads: [
            [i, j - 1],
            [i - 1, j],
            [i - 1, j - 1],
          ],
          writes: [[i, j]],
        }, undefined, ref('replace'))
      }
    }
  }
  const ops = reconstructEditOps(A, B, dp)
  const path = editPath(A, B, dp)
  const opStr = ops.map((o) => o.op + (o.op === 'match' || o.op === 'replace' ? `:${(o as { a: string; b: string }).a}→${(o as { b: string }).b}` : o.op === 'insert' ? `:${(o as { b: string }).b}` : `:${(o as { a: string }).a}`)).join(', ')
  snap(
    `编辑距离 = ${dp[m]![n]}；操作：${opStr}`,
    { answer: dp[m]![n] },
    2,
    { current: [m, n], path },
    { ok: true, distance: dp[m]![n], ops },
    ref('done'),
  )
  return steps
}
