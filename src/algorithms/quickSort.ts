import type { Step } from '../types/step'

export const meta = {
  id: 'quickSort',
  title: '快速排序',
  complexity: '平均 O(n log n)，最坏 O(n²)，空间 O(log n)',
  description: '选取枢轴划分，使左侧 ≤ 枢轴 ≤ 右侧，再递归两侧。',
  code: `quickSort(a, L, R):
  if L >= R: return
  p = partition(a, L, R)
  quickSort(a, L, p-1)
  quickSort(a, p+1, R)`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({ id: id++, message, highlights: { a: highlights }, arrays: { a: [...a] }, vars, codeLine })
  }

  function partition(L: number, R: number): number {
    const pivot = a[R]
    snap(`选取枢轴 pivot = a[${R}] = ${pivot}`, [R], { L, R, pivot }, 2)
    let i = L - 1
    for (let j = L; j < R; j++) {
      snap(`比较 a[${j}]=${a[j]} 与 pivot=${pivot}`, [j, R], { L, R, i, j, pivot }, 2)
      if (a[j] <= pivot) {
        i++
        ;[a[i], a[j]] = [a[j], a[i]]
        snap(`a[${j}] ≤ pivot，交换 a[${i}] ↔ a[${j}]`, [i, j], { L, R, i, j, pivot }, 2)
      }
    }
    ;[a[i + 1], a[R]] = [a[R], a[i + 1]]
    snap(`枢轴就位：交换 a[${i + 1}] ↔ a[${R}]`, [i + 1, R], { L, R, pivot, p: i + 1 }, 2)
    return i + 1
  }

  function sort(L: number, R: number) {
    if (L >= R) {
      snap(`区间 [${L},${R}] 无需划分`, L === R ? [L] : [], { L, R }, 1)
      return
    }
    snap(`划分区间 [${L},${R}]`, Array.from({ length: R - L + 1 }, (_, i) => L + i), { L, R }, 2)
    const p = partition(L, R)
    sort(L, p - 1)
    sort(p + 1, R)
  }

  snap('开始快速排序', [], {}, 0)
  sort(0, a.length - 1)
  snap('排序完成', [], {}, 0)
  return steps
}
