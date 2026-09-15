import type { Step } from '../types/step'

export const meta = {
  id: 'floyd',
  title: 'Floyd-Warshall 全源最短路',
  complexity: '时间 O(n³)，空间 O(n²)',
  description: '三重循环：经中转点 k 松弛任意 i→j 的最短路。',
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
}

export function generateSteps(_arr: number[], matrix = meta.defaultMatrix): Step[] {
  const n = matrix.length
  const d = matrix.map((r) => r.map((x) => x))
  const steps: Step[] = []
  let id = 0
  const fmt = (x: number) => (x === Infinity ? '∞' : x)

  const snap = (message: string, vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({
      id: id++,
      message,
      matrices: { d: d.map((r) => r.map(fmt)) },
      vars,
      codeLine,
    })
  }

  snap('初始化距离矩阵（无边为 ∞）', { n }, 0)
  for (let k = 0; k < n; k++) {
    snap(`中转点 k = ${k}`, { k }, 1)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] === Infinity || d[k][j] === Infinity) continue
        const via = d[i][k] + d[k][j]
        snap(`检查 d[${i}][${j}] vs d[${i}][${k}]+d[${k}][${j}]=${via}`, { k, i, j, cur: fmt(d[i][j]), via }, 3)
        if (via < d[i][j]) {
          d[i][j] = via
          snap(`更新 d[${i}][${j}] = ${via}`, { k, i, j, newVal: via }, 3)
        }
      }
    }
  }
  snap('Floyd 完成', {}, 0)
  return steps
}
