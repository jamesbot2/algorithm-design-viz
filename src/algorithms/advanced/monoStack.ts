import type { FamSpec } from './famTypes'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'

const DOC = 'mono_stack.ts'
export const spec: FamSpec = {
  id: 'mono-stack',
  meta: {
    id: 'mono-stack',
    title: '单调栈（下一个更大元素 + 最大矩形）',
    complexity: '每个元素至多入栈、出栈各一次：O(n)',
    description: '栈中保持单调；新元素打破单调时，弹出的栈顶找到了答案（下一个更大 / 矩形右边界）。',
    implName: 'monotonicStack',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'mono_stack',
  fields: [{ key: 'arr', label: '数组 / 柱高 a（非负整数，逗号分隔，长度 1..12）', kind: 'ints', minLen: 1, maxLen: 12, min: 0 }],
  defaultDraft: { arr: '2, 1, 5, 6, 2, 3, 6, 6' },
  readyText: '栈为空，结果尚未计算。',
  generate(i) {
    const a = ints(i, 'arr')
    const n = a.length
    const rec = new Recorder(DOC)
    const res = new Array<number | null>(n).fill(null)
    const st: number[] = []
    const stRow = () => row('st', '栈（下标）', st.length ? st : ['空'])
    const stVal = () => row('sv', '栈（对应值）', st.length ? st.map((k) => a[k]!) : ['空'])
    const A = (m: Record<number, any> = {}) => row('a', 'a[i]', a, m)
    rec.push(`a = [${a.join(', ')}]。第一部分：对每个 i 找右边第一个严格更大的元素下标；第二部分：把 a 当作柱状图求最大矩形。`, fam('初始', [A(), stRow(), stVal(), row('res', 'next greater', res)]), [], { n })
    rec.push('结果数组初始化为 −1（尚未找到）。', fam('下一个更大', [A(), stRow(), stVal(), row('res', 'next greater', res.map((x) => x ?? -1))]), ['msInit'], { n })
    const ng = new Array<number>(n).fill(-1)
    for (let k = 0; k < n; k++) {
      while (st.length && a[st[st.length - 1]!]! < a[k]!) {
        const t = st.pop()!
        ng[t] = k
        rec.push(`a[${t}] = ${a[t]} < a[${k}] = ${a[k]}：弹出 ${t}，它的下一个更大元素是下标 ${k}。`, fam('下一个更大', [A({ [k]: 'cur', [t]: 'hit' }), stRow(), stVal(), row('res', 'next greater', ng, { [t]: 'hit' })]), ['msPopCheck', 'msPop'], { i: k, popped: t })
      }
      rec.push(st.length ? `a[${st[st.length - 1]}] = ${a[st[st.length - 1]!]} ≥ a[${k}] = ${a[k]}：不弹，${k} 入栈。` : `栈空：${k} 入栈。`, fam('下一个更大', [A({ [k]: 'cur' }), stRow(), stVal(), row('res', 'next greater', ng)]), ['msPopCheck'], { i: k })
      st.push(k)
      rec.push(`下标 ${k} 入栈（栈中值不增）。`, fam('下一个更大', [A({ [k]: 'cur' }), stRow(), stVal(), row('res', 'next greater', ng)]), ['msPush'], { i: k, size: st.length })
    }
    rec.push(`第一部分完成：${ng.join(', ')}（仍在栈中的下标没有更大元素，保持 −1）。`, fam('下一个更大', [A(), stRow(), stVal(), row('res', 'next greater', ng)], { result: [...ng] }), ['msReturn'], { n })
    // largest rectangle
    st.length = 0
    let best = 0
    const areaRow = new Array<number | null>(n).fill(null)
    const H = (m: Record<number, any> = {}) => row('h', '柱高 h[i]', a, m)
    rec.push('第二部分：最大矩形。栈中高度严格递增；末尾补一个高度 0 的哨兵来清空栈。', fam('最大矩形', [H(), stRow(), stVal(), row('area', '以该柱为高的面积', areaRow)], { scalars: [['best', '最大面积', best]] }), ['lrPopCheck'], { n })
    for (let k = 0; k <= n; k++) {
      const cur = k === n ? 0 : a[k]!
      while (st.length && a[st[st.length - 1]!]! >= cur) {
        const t = st.pop()!
        const height = a[t]!
        const left = st.length ? st[st.length - 1]! + 1 : 0
        const area = height * (k - left)
        areaRow[t] = area
        best = Math.max(best, area)
        const rg: Record<number, any> = {}
        for (let x = left; x < k; x++) rg[x] = 'range'
        rg[t] = 'hit'
        rec.push(`h[${t}] = ${height} ≥ ${k === n ? '哨兵 0' : `h[${k}] = ${cur}`}：弹出 ${t}。左边界 ${left}，宽 ${k} − ${left} = ${k - left}，面积 ${height}×${k - left} = ${area}；最大 ${best}。`, fam('最大矩形', [H(rg), stRow(), stVal(), row('area', '以该柱为高的面积', areaRow, { [t]: 'hit' })], { scalars: [['best', '最大面积', best]] }), ['lrPopCheck', 'lrPop', 'lrArea'], { i: k, popped: t, area, best })
      }
      st.push(k)
      rec.push(k === n ? '哨兵入栈，处理结束。' : `下标 ${k} 入栈（栈中高度严格递增）。`, fam('最大矩形', [H(k < n ? { [k]: 'cur' } : {}), stRow(), stVal(), row('area', '以该柱为高的面积', areaRow)], { scalars: [['best', '最大面积', best]] }), ['lrPush'], { i: k, size: st.length })
    }
    rec.push(`最大矩形面积 = ${best}。`, fam('完成', [H(), stRow(), stVal(), row('area', '以该柱为高的面积', areaRow)], { scalars: [['best', '最大面积', best]], result: [best] }), ['lrReturn'], { best })
    const result = { nextGreater: ng, best }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
