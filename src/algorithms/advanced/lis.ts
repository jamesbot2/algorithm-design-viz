import type { FamSpec } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'

const DOC = 'lis.ts'
export const spec: FamSpec = {
  id: 'lis',
  meta: {
    id: 'lis',
    title: '最长上升子序列（严格，O(n log n)）',
    complexity: 'O(n log n)',
    description: 'tails[k] 保存长度为 k+1 的严格上升子序列的最小结尾；每个数二分找到位置，替换或追加；prev 数组用于还原一个具体序列。',
    implName: 'lisNLogN',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'lis',
  fields: [{ key: 'arr', label: '序列（1..10 个整数）', kind: 'ints', minLen: 1, maxLen: 10, min: -999, max: 999 }],
  defaultDraft: { arr: '10 9 2 5 3 7 101 18' },
  readyText: '尚未处理任何元素，tails 为空。',
  generate(i) {
    const a = ints(i, 'arr')
    const rec = new Recorder(DOC)
    const tails: number[] = []
    const prev = new Array<number | string>(a.length).fill('—')
    const prevN = new Array<number>(a.length).fill(-1)
    const rows = (m: Record<string, Record<number, FamMark>> = {}) => [
      row('a', 'a[i]', a, m.a),
      row('tails', 'tails[k]（长度 k+1 的最小结尾值）', tails.length ? tails.map((t) => a[t]!) : ['空'], m.tails),
      row('prev', 'prev[i]（前驱下标）', prev, m.prev),
    ]
    rec.push(`序列长 ${a.length}。严格上升：相等的数不能同时出现在子序列里。`, fam('初始', rows()), [], { n: a.length })
    for (let i = 0; i < a.length; i++) {
      let lo = 0
      let hi = tails.length
      if (lo === hi) rec.push(`a[${i}] = ${a[i]}：tails 为空，不需要二分，位置 lo = 0。`, fam('二分', rows({ a: { [i]: 'cur' } }), { scalars: [['i', 'i', i], ['lo', 'lo', 0], ['hi', 'hi', 0]] }), ['lisSearch'], { i, lo, hi })
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        const less = a[tails[mid]!]! < a[i]!
        rec.push(`a[${i}] = ${a[i]}：tails[${mid}] = ${a[tails[mid]!]} ${less ? '<' : '≥'} ${a[i]}，${less ? `lo = ${mid + 1}（要放更右）` : `hi = ${mid}（这里或更左）`}。`, fam('二分', rows({ a: { [i]: 'cur' }, tails: { [mid]: less ? 'range' : 'pivot' } }), { scalars: [['i', 'i', i], ['lo', 'lo', less ? mid + 1 : lo], ['hi', 'hi', less ? hi : mid]] }), ['lisSearch'], { i, mid, lo, hi, less: less ? 1 : 0 })
        if (less) lo = mid + 1
        else hi = mid
      }
      if (lo > 0) {
        prevN[i] = tails[lo - 1]!
        prev[i] = prevN[i]!
        rec.push(`位置 lo = ${lo}：前驱是长度 ${lo} 的最优结尾（a[${prevN[i]}] = ${a[prevN[i]!]}），prev[${i}] = ${prevN[i]}。`, fam('记前驱', rows({ a: { [i]: 'cur', [prevN[i]!]: 'range' }, prev: { [i]: 'cur' } })), ['lisPrev'], { i, prev: prevN[i]! })
      }
      const grow = lo === tails.length
      tails[lo] = i
      rec.push(grow ? `lo = ${lo} 等于当前长度：${a[i]} 追加到 tails 末尾，最长长度变成 ${tails.length}。` : `替换 tails[${lo}]：结尾更小（${a[i]}）对后面更有利，长度不变。`, fam(grow ? '追加' : '替换', rows({ a: { [i]: 'done' }, tails: { [lo]: grow ? 'hit' : 'cur' } }), { scalars: [['len', '当前最长', tails.length]] }), ['lisPlace'], { i, lo, len: tails.length })
    }
    const seqIdx: number[] = []
    let k = tails.length ? tails[tails.length - 1]! : -1
    const seqRev: number[] = []
    while (k >= 0) {
      seqIdx.push(k)
      seqRev.push(a[k]!)
      rec.push(`回溯：取 a[${k}] = ${a[k]}，前驱 prev[${k}] = ${prevN[k]}。`, fam('还原', rows({ a: Object.fromEntries(seqIdx.map((x) => [x, 'hit' as FamMark])), prev: { [k]: 'cur' } })), ['lisRecover'], { k })
      k = prevN[k]!
    }
    const seq = seqRev.reverse()
    rec.push(`翻转得到一个最长严格上升子序列：[${seq.join(', ')}]，长度 ${seq.length}。（最长不唯一，这只是其中一个；注意 tails 里的值本身不一定是合法子序列。）`, fam('完成', rows({ a: Object.fromEntries(seqIdx.map((x) => [x, 'hit' as FamMark])) }), { result: [seq.length, ...seq] }), ['lisReturn'], { length: seq.length })
    const result = { length: seq.length, seq }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
