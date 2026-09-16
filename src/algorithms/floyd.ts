import type { Step } from '../types/step'

export const meta = {
  id: 'floyd',
  title: 'Floyd-Warshall 全源最短路',
  complexity: '时间 O(n³)，空间 O(n²)',
  description: '三重循环：经中转点 k 松弛任意 i→j。若结束后对角元为负，则存在负环。',
  code: `for k = 0..n-1:
  for i = 0..n-1:
    for j = 0..n-1:
      d[i][j] = min(d[i][j], d[i][k]+d[k][j])`,
  defaultMatrix: [
    [0, 3, 8, Infinity, -4],
    [Infinity, 0, Infinity, 1, 7],
    [Infinity, 4, 0, Infinity, Infinity],
    [2, Infinity, -5, 0, Infinity],
    [Infinity, Infinity, Infinity, 6, 0],
  ] as number[][],
  implName: 'floydWarshall',
  implVersion: '1.1.0',
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n²)',
  spaceNotes: '距离矩阵 d[n][n]。',
  inputAssumptions: '邻接矩阵；无边为 ∞；对角初值 0。负环：结束后某 d[i][i]<0。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(_arr: number[], matrix = meta.defaultMatrix): Step[] {
  const n = matrix.length
  const d = matrix.map((r) => r.map((x) => x))
  const steps: Step[] = []
  const DOC = 'floyd.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const LINE_ANCHOR: Record<number, string> = { 0: 'kLoop', 1: 'kLoop', 3: 'relax' }
  let id = 0
  const fmt = (x: number) => (x === Infinity ? '∞' : x)

  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    targets?: { current?: [number, number]; reads?: [number, number][]; writes?: [number, number][]; path?: [number, number][] },
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    steps.push({
      id: id++,
      message,
      matrices: { d: d.map((r) => r.map(fmt)) },
      matrixTargets: targets ? { d: targets } : undefined,
      vars,
      codeLine,
      result,
      codeRefs: codeRefs ?? (codeLine !== undefined && LINE_ANCHOR[codeLine] ? ref(LINE_ANCHOR[codeLine]) : ref('done')),
    })
  }

  snap('初始化距离矩阵（无边为 ∞）', { n }, 0)
  for (let k = 0; k < n; k++) {
    snap(`中转点 k = ${k}`, { k }, 1, { reads: [[k, k]] })
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] === Infinity || d[k][j] === Infinity) continue
        const via = d[i][k] + d[k][j]
        snap(
          `检查 d[${i}][${j}] vs d[${i}][${k}]+d[${k}][${j}]=${via}`,
          { k, i, j, cur: fmt(d[i][j]), via },
          3,
          {
            current: [i, j],
            reads: [
              [i, k],
              [k, j],
            ],
          },
        )
        if (via < d[i][j]) {
          d[i][j] = via
          snap(`更新 d[${i}][${j}] = ${via}`, { k, i, j, newVal: via }, 3, {
            current: [i, j],
            writes: [[i, j]],
            reads: [
              [i, k],
              [k, j],
            ],
          })
        }
      }
    }
  }

  const negDiag: number[] = []
  for (let i = 0; i < n; i++) {
    if (d[i][i] < 0) negDiag.push(i)
  }
  if (negDiag.length) {
    snap(
      `检测到负环：对角元 d[i][i]<0（i ∈ [${negDiag.join(', ')}]）。矩阵不可当作有效全源最短路。`,
      { negativeCycle: true, vertices: negDiag.join(',') },
      undefined,
      { path: negDiag.map((i) => [i, i] as [number, number]) },
      { ok: false, error: 'negative_cycle', diagonal: negDiag },
      ref('done'),
    )
  } else {
    snap('Floyd 完成（无负环）', { negativeCycle: false }, undefined, undefined, {
      ok: true,
      negativeCycle: false,
      matrix: d.map((r) => r.map((x) => (x === Infinity ? null : x))),
    }, ref('done'))
  }
  return steps
}
