import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, row } from './famCommon'
import { opLabel } from './labCommon'

const DOC = 'stl_set_map.cpp'
const G = { args: ['i'] as ('i' | 'w')[], lo: -20, hi: 20 }
export const GRAMMAR: LabGrammar = { sins: G, sdel: G, mins: G, mdel: G, mdel1: G, mcnt: G, slb: G, mapinc: G, mapget: G, mapfind: G }
export interface SetMapResult {
  ok: boolean
  states: string[]
  S: number[]
  M: number[]
  P: [number, number][]
}
interface Evt {
  msg: string
  anchors: string[]
  mark?: { row: 'S' | 'M' | 'P'; key: number; kind: FamMark }
}
interface St {
  S: number[]
  M: number[]
  P: Map<number, number>
}
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b)

/** Pure model of std::set / std::multiset / std::map<int,int> (sorted order, unique / duplicate keys, operator[] insertion). */
export function simSetMap(ops: LabOp[], emit?: (e: Evt, s: St) => void): SetMapResult {
  const s: St = { S: [], M: [], P: new Map() }
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, s)
  const P = () => [...s.P.entries()].sort((a, b) => a[0] - b[0])
  E({ msg: '三个空容器：set（唯一有序键）、multiset（可重复有序键）、map（有序键 → 值）。', anchors: [] })
  for (const op of ops) {
    const x = op.n[0]!
    const label = opLabel(op, GRAMMAR)
    let r = '-'
    if (op.t === 'sins') {
      const has = s.S.includes(x)
      if (!has) s.S = sorted([...s.S, x])
      r = has ? '0' : '1'
      E({ msg: has ? `${label}：${x} 已在 set 里，不插入（返回 second = false）。` : `${label}：插入 ${x}，set 保持有序且唯一。`, anchors: ['sIns'], mark: { row: 'S', key: x, kind: has ? 'warn' : 'hit' } })
    } else if (op.t === 'sdel') {
      const has = s.S.includes(x)
      s.S = s.S.filter((v) => v !== x)
      r = has ? '1' : '0'
      E({ msg: `${label}：${has ? `删除 ${x}，返回 1` : `没有 ${x}，返回 0`}。`, anchors: ['sDel'] })
    } else if (op.t === 'mins') {
      s.M = sorted([...s.M, x])
      E({ msg: `${label}：multiset 允许重复，现在有 ${s.M.filter((v) => v === x).length} 个 ${x}。`, anchors: ['mIns'], mark: { row: 'M', key: x, kind: 'hit' } })
    } else if (op.t === 'mdel') {
      const c = s.M.filter((v) => v === x).length
      s.M = s.M.filter((v) => v !== x)
      r = String(c)
      E({ msg: `${label}：erase(值) 删除所有 ${x}，共 ${c} 个。想只删一个要用 erase(find(值))（mdel1）。`, anchors: ['mDelAll'] })
    } else if (op.t === 'mdel1') {
      const at = s.M.indexOf(x)
      if (at >= 0) s.M.splice(at, 1)
      r = at >= 0 ? '1' : '0'
      E({ msg: `${label}：find 找到第一个 ${x}${at >= 0 ? '，只删除这一个' : '：没有，什么也不删（返回 0；若直接 erase(end()) 则是未定义行为，所以先判断）'}。`, anchors: ['mDelOne'] })
    } else if (op.t === 'mcnt') {
      r = String(s.M.filter((v) => v === x).length)
      E({ msg: `${label}：multiset 中有 ${r} 个 ${x}。`, anchors: ['mCnt'] })
    } else if (op.t === 'slb') {
      const hit = s.S.find((v) => v >= x)
      r = hit === undefined ? 'end' : String(hit)
      E({ msg: `${label}：set 中第一个 ≥ ${x} 的是 ${hit === undefined ? 'end()（没有）' : hit}。`, anchors: ['sLb'], mark: hit === undefined ? undefined : { row: 'S', key: hit, kind: 'cur' } })
    } else if (op.t === 'mapinc') {
      const had = s.P.has(x)
      s.P.set(x, (s.P.get(x) ?? 0) + 1)
      E({ msg: `${label}：p[${x}]++ ${had ? `把已有的值加到 ${s.P.get(x)}` : `——键 ${x} 不存在，先被插入为 0，再加 1 = 1`}。`, anchors: ['pInc'], mark: { row: 'P', key: x, kind: 'hit' } })
    } else if (op.t === 'mapget') {
      const had = s.P.has(x)
      if (!had) s.P.set(x, 0)
      r = String(s.P.get(x))
      E({ msg: had ? `${label}：p[${x}] = ${r}（键已存在，没有副作用）。` : `${label}：键 ${x} 不存在 —— 但 p[${x}] 也会把它插入为 0！只想读的话应该用 find / count。`, anchors: ['pGet'], mark: { row: 'P', key: x, kind: had ? 'cur' : 'warn' } })
    } else {
      const v = s.P.get(x)
      r = v === undefined ? '-1' : String(v)
      E({ msg: `${label}：find ${v === undefined ? `没找到 ${x}，返回 end()（本模板约定返回 −1），map 没有任何变化` : `找到 ${x} → ${v}`}。`, anchors: ['pFind'], mark: v === undefined ? undefined : { row: 'P', key: x, kind: 'cur' } })
    }
    states.push(`r=${r} S=[${s.S.join(' ')}] M=[${s.M.join(' ')}] P=[${P().map(([a, b]) => `${a}:${b}`).join(' ')}]`)
  }
  E({ msg: '全部操作完成。', anchors: [] })
  return { ok: true, states, S: s.S, M: s.M, P: P() }
}

export const spec: FamSpec = {
  id: 'stl-set-map',
  cppOnly: true,
  meta: {
    id: 'stl-set-map',
    title: 'set / multiset / map 实验（含 map[] 副作用）',
    complexity: '插入 / 删除 / 查找 O(log n)',
    description: 'set 唯一有序，multiset 可重复（erase(值) 删全部），map 的 operator[] 在键不存在时会插入。',
    implName: 'setMapModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_set_map',
  fields: [{ key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 14 }],
  defaultDraft: { ops: 'sins 5; sins 5; sins 9; slb 6; slb 10; mins 3; mins 3; mdel1 3; mcnt 3; mapget 7; mapinc 7; mapfind 8; mdel 3' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const ops = i.ops as LabOp[]
    const rec = new Recorder(DOC)
    simSetMap(ops, (e, s) => {
      const m = (rowId: 'S' | 'M' | 'P', keys: number[]): Record<number, FamMark> => {
        const o: Record<number, FamMark> = {}
        if (e.mark && e.mark.row === rowId) keys.forEach((k, idx) => k === e.mark!.key && (o[idx] = e.mark!.kind))
        return o
      }
      const pk = [...s.P.keys()].sort((a, b) => a - b)
      rec.push(
        e.msg,
        fam('容器', [
          row('S', 'set（唯一，升序）', s.S.length ? s.S : ['空'], m('S', s.S)),
          row('M', 'multiset（可重复，升序）', s.M.length ? s.M : ['空'], m('M', s.M)),
          row('P', 'map（键→值，按键升序）', pk.length ? pk.map((k) => `${k}→${s.P.get(k)}`) : ['空'], m('P', pk)),
        ], { scalars: [['ns', 'set 大小', s.S.length], ['nm', 'multiset 大小', s.M.length], ['np', 'map 大小', s.P.size]] }),
        e.anchors,
        { set: s.S.length, multiset: s.M.length, map: s.P.size },
      )
    })
    const res = simSetMap(ops)
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
