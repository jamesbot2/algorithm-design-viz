import type { Step } from '../types/step'

export const meta = {
  id: 'kadane',
  title: '最大子数组（Kadane）',
  complexity: '时间 O(n)，空间 O(1)',
  description:
    '动态维护以当前位置结尾的最大和。约定：求非空子数组；全负时返回最大元素；空数组无子数组。',
  code: `best = cur = a[0]
for i = 1 to n-1:
  cur = max(a[i], cur + a[i])
  best = max(best, cur)`,
  implName: 'kadaneNonempty',
  implVersion: '1.1.0',
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  spaceNotes: '若干标量。',
  inputAssumptions: '非空子数组；空输入 → 无子数组；全负 → 最大元素及其单点区间。',
  statDefinitions: '不累计 comparisons。',
}

/**
 * V25-01 step ↔ code contract (document kadane.ts, see src/codeCatalog/kadane):
 *
 *   frame                 timing        primary anchor (arrow)     weak context
 *   ─────────────────────────────────────────────────────────────────────────────
 *   empty input           after         emptyInput  (line 3)       —
 *   初始化                 after         init        (lines 4–8)    (rest of range)
 *   考察 a[i]              before body   loopVisit   (line 9)       —
 *   重新开始 (reset)        after         resetWrite  (lines 11–12)  chooseCond (10)
 *   延伸 (extend)          after         extendWrite (line 14)      chooseCond (10)
 *   更新最优               after         updateBest  (lines 17–19)  bestCond (16)
 *   完成                   —             done        (line 22)      —
 *
 * "cur > best" false emits no frame: the next frame (考察 a[i+1] or 完成) shows best /
 * bestStart / bestEnd unchanged. Variable names in `vars` are the reference code's
 * names (cur, curStart, best, bestStart, bestEnd, i) — one execution context.
 * No numeric codeLine is emitted: meta.code is a 4-line summary, not the document.
 */
export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  const DOC = 'kadane.ts'
  type Ref = { documentId: string; anchorId: string; role?: 'primary' | 'context' | 'condition' }
  const ref = (primary: string, condition?: string): Ref[] => [
    { documentId: DOC, anchorId: primary, role: 'primary' },
    ...(condition ? [{ documentId: DOC, anchorId: condition, role: 'condition' as const }] : []),
  ]
  let id = 0
  const snap = (
    message: string,
    highlights: number[],
    vars: Record<string, string | number | boolean | null>,
    codeRefs: Ref[],
    result?: unknown,
    ranges?: { current?: [number, number]; best?: [number, number] },
  ) => {
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      arrays: { a: [...a] },
      arrayPointers:
        typeof vars.i === 'number' ? { a: { i: vars.i as number } } : undefined,
      vars,
      result,
      ranges,
      codeRefs,
    })
  }
  if (a.length === 0) {
    snap(
      '空数组：不存在非空子数组',
      [],
      { empty: true, hasSubarray: false, best: null },
      ref('emptyInput'),
      { ok: true, hasSubarray: false, best: null, range: null },
      undefined,
    )
    return steps
  }
  let best = a[0]!
  let cur = a[0]!
  let bestStart = 0
  let bestEnd = 0
  let curStart = 0
  const span = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)
  snap(
    `初始化 best = cur = a[0] = ${a[0]}`,
    [0],
    { best, cur, bestStart, bestEnd, curStart },
    ref('init'),
    undefined,
    { current: [0, 0], best: [0, 0] },
  )
  for (let i = 1; i < a.length; i++) {
    snap(
      `考察 a[${i}] = ${a[i]}`,
      [i],
      { i, cur, curStart, best, bestStart, bestEnd },
      ref('loopVisit'),
      undefined,
      { current: [curStart, i - 1 >= curStart ? i - 1 : curStart], best: [bestStart, bestEnd] },
    )
    if (cur + a[i]! < a[i]!) {
      cur = a[i]!
      curStart = i
      snap(
        `重新开始：cur ← a[${i}] = ${cur}，curStart ← ${i}`,
        [i],
        { i, cur, curStart, best, bestStart, bestEnd },
        ref('resetWrite', 'chooseCond'),
        undefined,
        { current: [curStart, i], best: [bestStart, bestEnd] },
      )
    } else {
      cur = cur + a[i]!
      snap(
        `延伸：cur ← cur + a[${i}] = ${cur}`,
        [i],
        { i, cur, curStart, best, bestStart, bestEnd },
        ref('extendWrite', 'chooseCond'),
        undefined,
        { current: [curStart, i], best: [bestStart, bestEnd] },
      )
    }
    if (cur > best) {
      best = cur
      bestStart = curStart
      bestEnd = i
      snap(
        `更新最优区间 [${bestStart},${bestEnd}]，best=${best}`,
        span(bestStart, bestEnd),
        { i, cur, curStart, best, bestStart, bestEnd },
        ref('updateBest', 'bestCond'),
        undefined,
        { current: [curStart, i], best: [bestStart, bestEnd] },
      )
    }
  }
  snap(
    `完成：最大和=${best}，区间[${bestStart},${bestEnd}]（非空子数组）`,
    span(bestStart, bestEnd),
    { best, bestStart, bestEnd },
    ref('done'),
    { ok: true, hasSubarray: true, best, range: [bestStart, bestEnd] },
    { current: [bestStart, bestEnd], best: [bestStart, bestEnd] },
  )
  return steps
}
