import type { Step } from '../types/step'

export const meta = {
  id: 'insertionSort',
  title: '插入排序',
  complexity: '时间 O(n²)，空间 O(1)',
  description: '将每个元素插入到左侧已排序区间的正确位置。',
  code: `for i = 1 to n-1
  key = a[i]
  j = i - 1
  while j >= 0 and a[j] > key
    a[j+1] = a[j]
    j--
  a[j+1] = key`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({ id: id++, message, highlights: { a: highlights }, arrays: { a: [...a] }, vars: { n: a.length, ...vars }, codeLine })
  }
  snap('开始插入排序', [], {}, 0)
  for (let i = 1; i < a.length; i++) {
    const key = a[i]
    let j = i - 1
    snap(`取出 key = a[${i}] = ${key}`, [i], { i, j, key }, 1)
    while (j >= 0 && a[j] > key) {
      snap(`a[${j}]=${a[j]} > key=${key}，右移`, [j, j + 1], { i, j, key }, 3)
      a[j + 1] = a[j]
      snap(`a[${j + 1}] ← ${a[j]}`, [j + 1], { i, j, key }, 4)
      j--
    }
    a[j + 1] = key
    snap(`插入 key 到位置 ${j + 1}`, [j + 1], { i, j, key }, 5)
  }
  snap('排序完成', [], {}, 0)
  return steps
}
