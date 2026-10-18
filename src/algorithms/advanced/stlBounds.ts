import type { Step } from '../../types/step'
import type { BoundsView } from '../../types/advancedView'
import type { BoundsInput } from '../../features/advanced/inputs'
import { Recorder } from './common'

export const meta = {
  id: 'stl-bounds',
  title: 'lower_bound / upper_bound 实验',
  complexity: '随机访问迭代器：O(log n) 次比较',
  description: '在已按 < 排好序的闭开区间 [first,last) 上二分，返回第一个满足条件的位置（可能是 end()）。',
  implName: 'stlBoundsTeachingModel',
  implVersion: '1.0.0',
  docId: 'stl_bounds.cpp',
  defaultArr: '1, 2, 2, 2, 5, 8, 8, 13',
  defaultTarget: 2,
}

export interface BoundsResult {
  ok: true
  mode: 'lower' | 'upper'
  index: number
  isEnd: boolean
  value: number | null
  /** number of comparisons actually performed */
  comparisons: number
}

/** Reference semantics (no trace): lower = first i with !(a[i] < x); upper = first i with x < a[i]. */
export function boundIndex(arr: number[], x: number, mode: 'lower' | 'upper'): number {
  let first = 0
  let last = arr.length
  while (first < last) {
    const mid = first + Math.floor((last - first) / 2)
    const goRight = mode === 'lower' ? arr[mid]! < x : !(x < arr[mid]!)
    if (goRight) first = mid + 1
    else last = mid
  }
  return first
}

export function generateBoundsSteps(input: BoundsInput): { steps: Step[]; result: BoundsResult } {
  const { arr, target, mode } = input
  const p = mode === 'lower' ? 'lb' : 'ub'
  const rec = new Recorder(meta.docId)
  let first = 0
  let last = arr.length
  let cmps = 0
  const view = (x: Partial<BoundsView> = {}): BoundsView => ({ kind: 'bounds', arr, target, mode, first, last, ...x })
  const name = mode === 'lower' ? 'lower_bound' : 'upper_bound'
  const cond = (m: number) => (mode === 'lower' ? `a[${m}]=${arr[m]} < ${target}` : `!(${target} < a[${m}]=${arr[m]})`)
  rec.push(
    `${name}(${target})：搜索闭开区间 [first,last)=[0,${arr.length})，${mode === 'lower' ? '找第一个 !(a[i] < x) 的位置' : '找第一个 x < a[i] 的位置'}。`,
    view(),
    [`${p}Init`],
    { first, last, target },
  )
  while (first < last) {
    const mid = first + Math.floor((last - first) / 2)
    rec.push(
      `区间 [${first},${last}) 非空：mid = first + (last−first)/2 = ${mid}。`,
      view({ mid }),
      [`${p}Mid`, [`${p}Loop`, 'condition']],
      { first, last, mid },
    )
    const goRight = mode === 'lower' ? arr[mid]! < target : !(target < arr[mid]!)
    cmps++
    rec.push(
      `比较 ${cond(mid)} → ${goRight ? '成立：答案在 mid 右侧' : '不成立：答案是 mid 或在其左侧'}。`,
      view({ mid, cmp: { index: mid, text: cond(mid), goRight } }),
      [`${p}Cmp`],
      { first, last, mid, goRight, comparisons: cmps },
    )
    if (goRight) {
      first = mid + 1
      rec.push(`first = mid+1 = ${first}（mid 及其左侧都排除）。`, view({ mid }), [`${p}GoRight`], { first, last, mid })
    } else {
      last = mid
      rec.push(`last = mid = ${last}（区间右端是开端点，mid 仍可能是答案）。`, view({ mid }), [`${p}GoLeft`], { first, last, mid })
    }
  }
  const isEnd = first === arr.length
  const result: BoundsResult = { ok: true, mode, index: first, isEnd, value: isEnd ? null : arr[first]!, comparisons: cmps }
  rec.push(
    isEnd ? `first == last == ${first} == end()：没有元素满足条件，返回 end()（不可解引用）。` : `first == last == ${first}：返回指向 a[${first}]=${arr[first]} 的位置。`,
    view({ result: first }),
    [`${p}Done`],
    { index: first, isEnd },
    { result },
  )
  return { steps: rec.steps, result }
}
