import type { FamSpec } from './famTypes'
import { Recorder } from './common'
import { fam, int, ints, row } from './famCommon'

const DOC = 'bs_answer.ts'
export const spec: FamSpec = {
  id: 'bs-answer',
  meta: {
    id: 'bs-answer',
    title: '二分答案（最小化最大段和）',
    complexity: '每次判定 O(n)，二分 O(log sum)，总计 O(n log sum)',
    description: '对答案二分：判定 cap 能否把数组分成至多 k 段，可行则 hi = mid，否则 lo = mid + 1。',
    implName: 'binarySearchOnAnswer',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'bs_answer',
  fields: [
    { key: 'arr', label: '正整数数组 a（逗号分隔，长度 1..12）', kind: 'ints', minLen: 1, maxLen: 12, min: 1 },
    { key: 'k', label: '最多分成 k 段（1..12）', kind: 'int', min: 1, max: 12 },
  ],
  defaultDraft: { arr: '7, 2, 5, 10, 8, 3, 6', k: '3' },
  readyText: '尚未开始二分。',
  generate(i) {
    const a = ints(i, 'arr')
    const k = int(i, 'k')
    const rec = new Recorder(DOC)
    let lo = Math.max(...a)
    let hi = a.reduce((s, x) => s + x, 0)
    const tried: string[] = []
    const seg = new Array<number | null>(a.length).fill(null)
    const base = (marks: Record<number, any> = {}) => [row('a', 'a[i]', a, marks), row('seg', '所在段', seg), row('tried', '已试 cap', tried.length ? tried : ['—'])]
    rec.push(`a = [${a.join(', ')}]，k = ${k}。目标：最小的 cap，使得按 cap 贪心分段不超过 ${k} 段。`, fam('初始', base()), [], { k })
    rec.push(`区间下界 lo = max(a) = ${lo}（每段至少装得下最大元素），上界 hi = sum(a) = ${hi}（一段装下全部，必然可行）。`, fam('搜索区间', base(), { scalars: [['lo', 'lo', lo], ['hi', 'hi', hi], ['k', 'k', k]] }), ['bsInit'], { lo, hi })
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2)
      rec.push(`mid = ${lo} + ⌊(${hi} − ${lo}) / 2⌋ = ${mid}。`, fam(`试 cap = ${mid}`, base(), { scalars: [['lo', 'lo', lo], ['hi', 'hi', hi], ['mid', 'mid', mid]] }), ['bsMid'], { lo, hi, mid })
      // greedy feasibility
      let cnt = 1
      let cur = 0
      seg.fill(null)
      rec.push(`判定：从 1 段、当前段和 0 开始贪心分段。`, fam(`判定 cap = ${mid}`, base(), { scalars: [['mid', 'cap', mid], ['cnt', '段数', cnt], ['cur', 'cur', cur]] }), ['fInit'], { cap: mid })
      a.forEach((x, idx) => {
        const over = cur + x > mid
        if (over) {
          cnt++
          cur = x
        } else cur += x
        seg[idx] = cnt
        rec.push(over ? `a[${idx}] = ${x}：cur + x > ${mid} → 开第 ${cnt} 段，cur = ${x}。` : `a[${idx}] = ${x}：放进第 ${cnt} 段，cur = ${cur}。`, fam(`判定 cap = ${mid}`, base({ [idx]: over ? 'warn' : 'cur' }), { scalars: [['mid', 'cap', mid], ['cnt', '段数', cnt], ['cur', 'cur', cur]] }), over ? ['fCheck', 'fNew'] : ['fCheck', 'fExtend'], { idx, x, cnt, cur })
      })
      const ok = cnt <= k
      rec.push(`需要 ${cnt} 段，${ok ? `≤ ${k}` : `> ${k}`} → cap = ${mid} ${ok ? '可行' : '不可行'}。`, fam(`判定 cap = ${mid}`, base(), { scalars: [['mid', 'cap', mid], ['cnt', '段数', cnt], ['k', 'k', k]] }), ['fReturn', 'bsCheck'], { mid, cnt, ok })
      tried.push(`${mid}${ok ? '✓' : '✗'}`)
      if (ok) {
        hi = mid
        rec.push(`可行：答案 ≤ ${mid}，hi = ${mid}（保留 mid）。`, fam('收缩上界', base(), { scalars: [['lo', 'lo', lo], ['hi', 'hi', hi]] }), ['bsShrink'], { lo, hi })
      } else {
        lo = mid + 1
        rec.push(`不可行：答案 > ${mid}，lo = ${lo}。`, fam('抬高下界', base(), { scalars: [['lo', 'lo', lo], ['hi', 'hi', hi]] }), ['bsRaise'], { lo, hi })
      }
    }
    rec.push(`lo == hi == ${lo}：最小的可行 cap，即最小的"最大段和"。`, fam('完成', base(), { scalars: [['lo', 'lo', lo], ['hi', 'hi', hi]], result: [lo] }), ['bsReturn'], { answer: lo })
    const result = { answer: lo, tried }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
