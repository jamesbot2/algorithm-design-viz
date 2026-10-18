import type { Step } from '../../types/step'
import type { HeapView } from '../../types/advancedView'
import type { StlOperationsInput } from '../../features/advanced/inputs'
import { Recorder } from './common'

export const meta = {
  id: 'stl-priority-queue',
  title: 'priority_queue 实验（大根堆）',
  complexity: 'push / pop O(log n)，top O(1)',
  description: '默认大根堆：top() 是最大元素。堆序只保证父 ≥ 子，底层数组并未排序。本实验使用选定的教学模型。',
  implName: 'priorityQueueTeachingModel',
  implVersion: '1.0.0',
  docId: 'stl_priority_queue.cpp',
  defaultOps: 'push(5); push(9); push(3); push(9); push(12); top(); pop(); pop(); push(7); pop()',
}

export interface PqResult {
  ok: boolean
  heap: number[]
  tops: number[]
  popped: number[]
  stoppedAt?: number
  reason?: string
}

/** Textbook binary max-heap (strict `<`: equal values never swap). Reference model + trace. */
export function generatePqSteps(input: StlOperationsInput): { steps: Step[]; result: PqResult } {
  const ops = input.ops
  // run-level capacity (stable slot layout)
  let cur = 0
  let cap = 1
  for (const o of ops) {
    if (o.t === 'push') cap = Math.max(cap, ++cur)
    else if (o.t === 'pop' && cur > 0) cur--
  }
  const h: number[] = []
  const rec = new Recorder(meta.docId)
  const tops: number[] = []
  const popped: number[] = []
  const view = (op: string, x: Partial<HeapView> = {}): HeapView => ({ kind: 'heap', heap: [...h], cap, op, ...x })
  const vars = (o: Record<string, string | number | boolean | null> = {}) => ({ size: h.length, heap: h.join(','), top: h.length ? h[0]! : null, ...o })
  // first frame: nothing executed yet → no code reference (no fake arrow)
  rec.push('空的 priority_queue（默认 std::less → 大根堆）。', view('init'), [], vars(), { phase: 'init' })

  let k = 0
  for (const op of ops) {
    k++
    if (op.t === 'push') {
      const label = `push(${op.v})`
      h.push(op.v)
      let i = h.length - 1
      rec.push(`${label}：先追加到数组末尾（下标 ${i}），此时可能破坏堆序。`, view(label, { cursor: i }), ['pushAppend'], vars({ op: label, i }))
      while (i > 0) {
        const pi = (i - 1) >> 1
        const bad = h[pi]! < h[i]!
        rec.push(
          `上浮比较：父 h[${pi}]=${h[pi]} ${bad ? '<' : '≥'} 子 h[${i}]=${h[i]} → ${bad ? '违反堆序，交换' : '堆序成立，停止（相等不交换）'}。`,
          view(label, { cursor: i, compare: [pi, i] }),
          ['siftUpCmp', ['siftUpLoop', 'condition']],
          vars({ op: label, i, parent: pi, swap: bad }),
        )
        if (!bad) break
        ;[h[pi], h[i]] = [h[i]!, h[pi]!]
        rec.push(`交换 h[${pi}] 与 h[${i}]，继续检查新位置 ${pi}。`, view(label, { cursor: pi, swapped: [pi, i] }), ['siftUpSwap'], vars({ op: label, i: pi }))
        i = pi
      }
      if (i === 0) rec.push(`到达根（下标 0），上浮结束。`, view(label, { cursor: 0 }), ['siftUpLoop'], vars({ op: label }))
    } else if (op.t === 'top') {
      if (!h.length) {
        const reason = `第 ${k} 个操作 top()：容器为空。对空 priority_queue 调用 top() 是未定义行为，本实验在执行它之前停止（不画一个"确定的值"）。`
        rec.push(reason, view('top()', { stopped: true }), [], vars({ op: 'top()' }), { phase: 'stopped' })
        const result: PqResult = { ok: false, heap: [...h], tops, popped, stoppedAt: k, reason }
        rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
        return { steps: rec.steps, result }
      }
      tops.push(h[0]!)
      rec.push(`top() 返回 h[0]=${h[0]}（只读，不删除）。`, view('top()', { top: h[0], cursor: 0 }), ['top'], vars({ op: 'top()' }))
    } else {
      if (!h.length) {
        const reason = `第 ${k} 个操作 pop()：容器为空。对空 priority_queue 调用 pop() 是未定义行为，本实验在执行它之前停止。`
        rec.push(reason, view('pop()', { stopped: true }), [], vars({ op: 'pop()' }), { phase: 'stopped' })
        const result: PqResult = { ok: false, heap: [...h], tops, popped, stoppedAt: k, reason }
        rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
        return { steps: rec.steps, result }
      }
      const label = 'pop()'
      const last = h.length - 1
      const top = h[0]!
      popped.push(top)
      ;[h[0], h[last]] = [h[last]!, h[0]!]
      rec.push(`pop()：把堆顶 ${top} 与末尾 h[${last}]=${h[0]} 交换，堆顶 ${top} 暂存在末尾。`, view(label, { swapped: [0, last], parked: last, popped: top }), ['popSwap'], vars({ op: label, removed: top }))
      h.pop()
      rec.push(`pop_back：移除末尾的 ${top}，size 变为 ${h.length}。新的根 ${h.length ? h[0] : '（空）'} 需要下沉。`, view(label, { popped: top, cursor: h.length ? 0 : undefined }), ['popShrink'], vars({ op: label, removed: top }))
      let i = 0
      const n = h.length
      while (i < n) {
        const l = 2 * i + 1
        const r = l + 1
        let big = i
        if (l < n && h[big]! < h[l]!) big = l
        if (r < n && h[big]! < h[r]!) big = r
        const cmpIdx: [number, number] = big === i ? [i, l < n ? l : i] : [i, big]
        if (l >= n) {
          rec.push(`下标 ${i} 没有孩子，下沉结束。`, view(label, { cursor: i, popped: top }), ['siftDownCmp'], vars({ op: label, i }))
          break
        }
        rec.push(
          `下沉比较：h[${i}]=${h[i]} 与孩子 ${r < n ? `h[${l}]=${h[l]}、h[${r}]=${h[r]}` : `h[${l}]=${h[l]}`} 中较大者 → ${big === i ? '父已不小于孩子，停止' : `与 h[${big}]=${h[big]} 交换`}。`,
          view(label, { cursor: i, compare: cmpIdx, popped: top }),
          ['siftDownCmp'],
          vars({ op: label, i, big }),
        )
        if (big === i) break
        ;[h[i], h[big]] = [h[big]!, h[i]!]
        rec.push(`交换 h[${i}] 与 h[${big}]，继续检查下标 ${big}。`, view(label, { cursor: big, swapped: [i, big], popped: top }), ['siftDownSwap'], vars({ op: label, i: big }))
        i = big
      }
    }
  }
  const result: PqResult = { ok: true, heap: [...h], tops, popped }
  rec.push(`全部操作完成：堆数组 [${h.join(', ')}]（只有堆序，不是有序数组）。`, view('done'), [], vars(), { result, phase: 'done' })
  return { steps: rec.steps, result }
}
