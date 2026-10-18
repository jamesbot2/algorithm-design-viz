import type { FamSpec, FamInput } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, int, ints, row } from './famCommon'

const DOC = 'stl_unique.cpp'
export interface UniqResult {
  ok: boolean
  states: string[]
  k: number
  kept: number[]
  final: number[]
}
export const spec: FamSpec = {
  id: 'stl-unique',
  cppOnly: true,
  meta: {
    id: 'stl-unique',
    title: 'unique + erase 实验',
    complexity: 'O(n)（sort 另计 O(n log n)）',
    description: 'unique / remove 只是把保留的元素移到前面并返回逻辑新终点，size() 不变；必须 erase 才真的缩小。',
    implName: 'uniqueEraseModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_unique',
  fields: [
    { key: 'arr', label: '序列（1..10 个整数）', kind: 'ints', minLen: 1, maxLen: 10, min: -9, max: 9 },
    { key: 'mode', label: '模式（0 = unique，1 = remove x，2 = 先 sort 再 unique）', kind: 'int', min: 0, max: 2 },
    { key: 'x', label: 'remove 的值 x', kind: 'int', min: -9, max: 9 },
  ],
  defaultDraft: { arr: '1, 1, 2, 2, 2, 3, 1, 1', mode: '2', x: '2' },
  readyText: '尚未执行。',
  generate(i: FamInput) {
    let a = [...ints(i, 'arr')]
    const mode = int(i, 'mode')
    const x = int(i, 'x')
    const n = a.length
    const rec = new Recorder(DOC)
    const R = (cells: (number | string | null)[], marks: Record<number, FamMark> = {}) => [row('a', `v（size() = ${cells.filter((c) => c !== null).length}）`, cells, marks)]
    rec.push(`序列 [${a.join(', ')}]，size = ${n}。模式：${mode === 0 ? 'unique（只合并相邻重复）' : mode === 1 ? `remove ${x}` : '先 sort 再 unique'}。`, fam('初始', R(a)), [], { n })
    if (mode === 2) {
      a = [...a].sort((p, q) => p - q)
      rec.push('std::sort：排序后相同的值一定相邻。（sort 内部的比较顺序不由标准规定，这里只展示结果。）', fam('sort', R(a)), ['uSort'], { n })
    }
    const anchor = mode === 1 ? 'uRemove' : 'uUnique'
    // teaching model of the read/write pointers (the standard only specifies the resulting prefix)
    const cur = [...a]
    let w = 0
    for (let r = 0; r < n; r++) {
      const keep = mode === 1 ? cur[r] !== x : w === 0 || cur[r] !== cur[w - 1]
      const why = mode === 1 ? `${cur[r]} ${keep ? '≠' : '='} ${x}` : w === 0 ? '第一个元素总是保留' : `${cur[r]} ${keep ? '≠' : '='} 已保留的最后一个 ${cur[w - 1]}`
      if (keep) cur[w++] = cur[r]!
      const marks: Record<number, FamMark> = { [r]: keep ? 'hit' : 'warn' }
      if (w > 0) marks[w - 1] = 'pivot'
      rec.push(`读指针 ${r}：${why} → ${keep ? `保留，写到位置 ${w - 1}` : '丢弃'}。（示意：标准只规定结果前缀，这里用读 / 写指针说明它。）`, fam('示意读写指针', R(cur.map((v, idx) => (idx < w ? v : idx <= r ? v : v)), marks), { scalars: [['w', '新终点 w', w]] }), [anchor], { r, w })
    }
    const kept = cur.slice(0, w)
    rec.push(`${mode === 1 ? 'remove' : 'unique'} 返回逻辑新终点 = ${w}。注意 size() 仍然是 ${n}：位置 ${w} 之后的值是"有效但未指定"的。`, fam('返回新终点', R([...kept, ...Array.from({ length: n - w }, () => '？' as string | number)], Object.fromEntries(Array.from({ length: n - w }, (_, t) => [w + t, 'warn' as FamMark]))), { scalars: [['k', '逻辑新终点', w], ['size', 'size()', n]] }), [anchor], { k: w, size: n })
    rec.push(`erase(begin() + ${w}, end())：这一步才真的缩小，size() = ${w}。结果 [${kept.join(', ')}]。`, fam('erase 之后', R([...kept, ...Array.from({ length: n - w }, () => null)], Object.fromEntries(kept.map((_, t) => [t, 'done' as FamMark]))), { scalars: [['size', 'size()', w]] }), ['uErase'], { size: w })
    const states = [`k=${w} kept=[${kept.join(' ')}] final=[${kept.join(' ')}] size_before_erase=${n}`]
    const result: UniqResult = { ok: true, states, k: w, kept, final: kept }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
