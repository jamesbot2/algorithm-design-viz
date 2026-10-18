import type { FamSpec } from './famTypes'
import { Recorder } from './common'
import { fam, int, ints, row } from './famCommon'

const DOC = 'mono_queue.ts'
export const spec: FamSpec = {
  id: 'mono-queue',
  meta: {
    id: 'mono-queue',
    title: '单调队列（滑动窗口最大值 / 最小值）',
    complexity: '每个下标至多入队、出队各一次：O(n)',
    description: '双端队列存下标，值严格递减：队尾弹出更小的、队首弹出过期的，队首即窗口最大值。',
    implName: 'monotonicQueue',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'mono_queue',
  fields: [
    { key: 'arr', label: '数组 a（逗号分隔，长度 1..12）', kind: 'ints', minLen: 1, maxLen: 12 },
    { key: 'k', label: '窗口长度 k（1..数组长度）', kind: 'int', min: 1, max: 12 },
  ],
  defaultDraft: { arr: '1, 3, -1, -3, 5, 3, 6, 7, 2, 2', k: '3' },
  readyText: '队列为空，窗口尚未滑动。',
  check: (i) => (int(i, 'k') > ints(i, 'arr').length ? { field: 'k', reason: `窗口长度 k 不能超过数组长度 ${ints(i, 'arr').length}` } : null),
  generate(i) {
    const a = ints(i, 'arr')
    const k = int(i, 'k')
    const rec = new Recorder(DOC)
    const dq: number[] = []
    const out: number[] = []
    const qRow = () => row('dq', '队列（下标）', dq.length ? dq : ['空'])
    const qVal = () => row('dv', '队列（对应值）', dq.length ? dq.map((x) => a[x]!) : ['空'])
    const oRow = (m: Record<number, any> = {}) => row('out', '窗口最大值', out.length ? out : ['—'], m)
    const A = (cur: number, m: Record<number, any> = {}) => {
      const marks: Record<number, any> = { ...m }
      for (let x = Math.max(0, cur - k + 1); x <= cur; x++) marks[x] ??= 'range'
      if (cur >= 0) marks[cur] = 'cur'
      return row('a', 'a[i]（窗口 = 最近 k 个）', a, marks)
    }
    rec.push(`a = [${a.join(', ')}]，窗口长度 k = ${k}。队列里存下标，值严格递减。`, fam('初始', [A(-1), qRow(), qVal(), oRow()], { scalars: [['k', 'k', k]] }), [], { k })
    for (let x = 0; x < a.length; x++) {
      while (dq.length && a[dq[dq.length - 1]!]! <= a[x]!) {
        const t = dq.pop()!
        rec.push(`队尾 a[${t}] = ${a[t]} ≤ a[${x}] = ${a[x]}：它在窗口里永远不会再是最大值，从队尾弹出。`, fam(`i = ${x}`, [A(x, { [t]: 'warn' }), qRow(), qVal(), oRow()], { scalars: [['i', 'i', x]] }), ['mqPopBack'], { i: x, popped: t })
      }
      dq.push(x)
      rec.push(`下标 ${x} 入队尾（队内值严格递减）。`, fam(`i = ${x}`, [A(x), qRow(), qVal(), oRow()], { scalars: [['i', 'i', x]] }), ['mqPush'], { i: x, size: dq.length })
      if (dq[0]! <= x - k) {
        const t = dq.shift()!
        rec.push(`队首下标 ${t} ≤ i − k = ${x - k}：已滑出窗口，从队首弹出。`, fam(`i = ${x}`, [A(x, { [t]: 'warn' }), qRow(), qVal(), oRow()], { scalars: [['i', 'i', x]] }), ['mqExpire'], { i: x, expired: t })
      }
      if (x >= k - 1) {
        out.push(a[dq[0]!]!)
        rec.push(`窗口 [${x - k + 1}, ${x}] 已满：队首下标 ${dq[0]}，最大值 ${a[dq[0]!]}。`, fam(`i = ${x}`, [A(x, { [dq[0]!]: 'hit' }), qRow(), qVal(), oRow({ [out.length - 1]: 'hit' })], { scalars: [['i', 'i', x]] }), ['mqEmit'], { i: x, max: a[dq[0]!]! })
      }
    }
    const mins = a.map((_, x) => x).filter((x) => x >= k - 1).map((x) => Math.min(...a.slice(x - k + 1, x + 1)))
    rec.push(`完成：窗口最大值 = [${out.join(', ')}]（最小值同理，对 −a 做一遍再取负：[${mins.join(', ')}]）。`, fam('完成', [A(a.length - 1), qRow(), qVal(), oRow()], { result: [...out] }), ['mqEmit'], { n: a.length })
    const result = { max: out, min: mins }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
