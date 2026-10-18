import type { FamSpec } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, int, ints, pairs, row } from './famCommon'

const DOC = 'topo.ts'
export const spec: FamSpec = {
  id: 'topo',
  meta: {
    id: 'topo',
    title: '拓扑排序（Kahn + 判环）',
    complexity: 'O(n + m)',
    description: '反复取出入度为 0 的结点并删除它的出边；若最后处理的结点数 < n，说明图中有环。',
    implName: 'kahnTopologicalSort',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'topo',
  fields: [
    { key: 'n', label: '结点数 n（1..8）', kind: 'int', min: 1, max: 8 },
    { key: 'edges', label: '有向边（u v 两个一组，至多 12 条，结点 0..n−1）', kind: 'ints', maxLen: 24, min: 0 },
  ],
  defaultDraft: { n: '6', edges: '5 2, 5 0, 4 0, 4 1, 2 3, 3 1' },
  readyText: '尚未建图、尚未处理任何结点。',
  check: (i) => {
    const n = int(i, 'n')
    const e = ints(i, 'edges')
    if (e.length % 2) return { field: 'edges', reason: '边须 2 个一组（u v）' }
    const bad = e.find((x) => x >= n)
    if (bad !== undefined) return { field: 'edges', reason: `结点编号 ${bad} 超出 0..${n - 1}` }
    return null
  },
  generate(i) {
    const n = int(i, 'n')
    const flat = ints(i, 'edges')
    const E = pairs(flat)
    const rec = new Recorder(DOC)
    const adj: number[][] = Array.from({ length: n }, () => [])
    const indeg = new Array<number>(n).fill(0)
    const queue: number[] = []
    const order: number[] = []
    const done = new Set<number>()
    const inQ = new Set<number>()
    const gview = (cur?: number, hot?: string, final = false) => {
      const marks: Record<number, FamMark> = {}
      for (const v of done) marks[v] = 'done'
      for (const v of inQ) if (!done.has(v)) marks[v] = 'hit'
      if (cur !== undefined) marks[cur] = 'cur'
      if (final) for (let v = 0; v < n; v++) if (!done.has(v)) marks[v] = 'warn'
      return { n, edges: E, directed: true, layout: 'circle' as const, marks, edgeMarks: hot ? { [hot]: 'cur' as FamMark } : {} }
    }
    const rows = (m: { indeg?: Record<number, FamMark> } = {}) => [
      row('indeg', '入度 indeg[v]', indeg, m.indeg),
      row('queue', '队列（队首→队尾）', queue.length ? queue.slice(order.length) : ['空']),
      row('order', '排序结果', order.length ? order : ['—']),
    ]
    rec.push(`n = ${n}，边 ${E.map(([u, v]) => `${u}→${v}`).join('、') || '（无）'}。目标：给出一个"先 u 后 v"都满足的顺序；若图有环则如实报告。`, fam('初始', rows(), { graph: gview() }), [], { n, m: E.length })
    E.forEach(([u, v], k) => {
      adj[u]!.push(v)
      indeg[v]!++
      rec.push(`边 ${k + 1}：${u}→${v}。记录出边，indeg[${v}] → ${indeg[v]}。`, fam('建图', rows({ indeg: { [v]: 'cur' } }), { graph: gview(undefined, `${u}-${v}`) }), ['tsBuild'], { u, v, indeg: indeg[v]! })
    })
    for (let v = 0; v < n; v++) if (indeg[v] === 0) {
      queue.push(v)
      inQ.add(v)
    }
    rec.push(queue.length ? `入度为 0 的结点 ${queue.join('、')} 入队（没有任何前置要求）。` : '没有入度为 0 的结点：队列一开始就是空的。', fam('起点入队', rows(), { graph: gview() }), ['tsSeed'], { queued: queue.length })
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head]!
      order.push(u)
      done.add(u)
      rec.push(`队首 ${u} 出队，放进结果的第 ${order.length} 位。`, fam('处理结点', rows({ indeg: { [u]: 'done' } }), { graph: gview(u) }), ['tsPop'], { u, placed: order.length })
      for (const v of adj[u]!) {
        indeg[v]!--
        rec.push(`删除边 ${u}→${v}：indeg[${v}] → ${indeg[v]}。`, fam('处理结点', rows({ indeg: { [v]: 'cur' } }), { graph: gview(u, `${u}-${v}`) }), ['tsRelax'], { u, v, indeg: indeg[v]! })
        if (indeg[v] === 0) {
          queue.push(v)
          inQ.add(v)
          rec.push(`indeg[${v}] = 0：前置要求全部满足，${v} 入队。`, fam('处理结点', rows({ indeg: { [v]: 'hit' } }), { graph: gview(u, `${u}-${v}`) }), ['tsEnqueue'], { v })
        }
      }
    }
    const acyclic = order.length === n
    const left = [...Array(n).keys()].filter((v) => !done.has(v))
    rec.push(acyclic ? `已处理 ${order.length} = n 个结点：无环，顺序 = [${order.join(', ')}]。` : `只处理了 ${order.length} / ${n} 个结点就卡住：图中有环。结点 ${left.join('、')} 在环上或可从环到达，没有合法顺序（已处理的部分 [${order.join(', ')}] 仍然合法）。`, fam(acyclic ? '完成：无环' : '完成：检测到环', rows(), { graph: gview(undefined, undefined, !acyclic), result: [acyclic ? 1 : 0, ...order] }), ['tsResult'], { status: acyclic ? 1 : 0, processed: order.length })
    const result = { status: acyclic ? 1 : 0, order, stuck: left }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
