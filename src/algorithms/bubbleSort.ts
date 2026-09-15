import type { Step } from '../types/step'

export const meta = {
  id: 'bubbleSort',
  title: '冒泡排序',
  complexity: '时间 O(n²)，空间 O(1)',
  description: '反复比较相邻元素并交换，使较大元素逐渐「冒泡」到末尾。',
  code: `for i = 0 to n-2
  for j = 0 to n-2-i
    if a[j] > a[j+1]
      swap(a[j], a[j+1])`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number): void => {
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      arrays: { a: [...a] },
      vars: { n: a.length, ...vars },
      codeLine,
    })
  }
  snap('开始冒泡排序', [], { i: null, j: null }, 0)
  const n = a.length
  for (let i = 0; i < n - 1; i++) {
    snap(`外层循环 i = ${i}，已排好区间 [${n - i}, ${n - 1}]`, [], { i, j: null }, 1)
    for (let j = 0; j < n - 1 - i; j++) {
      snap(`比较 a[${j}]=${a[j]} 与 a[${j + 1}]=${a[j + 1]}`, [j, j + 1], { i, j }, 2)
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
        snap(`交换：a[${j}] ↔ a[${j + 1}]`, [j, j + 1], { i, j, swapped: true }, 3)
      } else {
        snap(`无需交换`, [j, j + 1], { i, j, swapped: false }, 2)
      }
    }
  }
  snap('排序完成', [], { i: null, j: null }, 0)
  return steps
}
