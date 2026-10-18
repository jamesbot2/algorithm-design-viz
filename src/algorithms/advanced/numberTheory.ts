import type { FamSpec } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, int, row } from './famCommon'

const DOC = 'number_theory.ts'
export const spec: FamSpec = {
  id: 'number-theory',
  meta: {
    id: 'number-theory',
    title: '数论工具箱：gcd / exgcd / 快速幂 / 逆元 / 筛法',
    complexity: 'gcd、exgcd O(log min(a, b))；快速幂 O(log power)；筛法 O(n log log n)',
    description: '同一组输入依次演示欧几里得、扩展欧几里得、快速幂、模逆元（含无逆元的诚实报告）与埃氏筛。',
    implName: 'numberTheory',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'number_theory',
  fields: [
    { key: 'a', label: 'a（0..9999）', kind: 'int', min: 0, max: 9999 },
    { key: 'b', label: 'b / 逆元的模（1..9999）', kind: 'int', min: 1, max: 9999 },
    { key: 'power', label: '指数 power（0..99999）', kind: 'int', min: 0, max: 99999 },
    { key: 'm', label: '快速幂的模 m（1..9999）', kind: 'int', min: 1, max: 9999 },
    { key: 'n', label: '筛法上限 n（2..40）', kind: 'int', min: 2, max: 40 },
  ],
  defaultDraft: { a: '7', b: '40', power: '13', m: '1000', n: '30' },
  readyText: '尚未运行任何运算。',
  generate(i) {
    const a = int(i, 'a')
    const b = int(i, 'b')
    const power = int(i, 'power')
    const m = int(i, 'm')
    const n = int(i, 'n')
    const rec = new Recorder(DOC)
    const sc = (xs: [string, string, number | string][]) => xs
    rec.push(`输入 a = ${a}，b = ${b}，power = ${power}，m = ${m}，n = ${n}。依次演示 gcd(a, b)、exgcd(a, b)、a^power mod m、a 模 b 的逆元、n 以内的素数。`, fam('初始', [row('x', '输入', [a, b, power, m, n])]), [], { a, b, power, m, n })

    // ---- gcd
    let x = a
    let y = b
    while (y !== 0) {
      const nx = y
      const ny = x % y
      rec.push(`gcd：(${x}, ${y}) → (${y}, ${x} mod ${y}) = (${nx}, ${ny})。`, fam('欧几里得', [row('p', '(a, b)', [x, y], { 0: 'cur', 1: 'pivot' })], { scalars: sc([['a', 'a', nx], ['b', 'b', ny]]) }), ['nGcdStep'], { a: nx, b: ny })
      x = nx
      y = ny
    }
    const g = x
    rec.push(`b = 0：gcd(${a}, ${b}) = ${g}。`, fam('欧几里得', [row('p', '(a, b)', [x, y], { 0: 'hit' })], { scalars: sc([['gcd', 'gcd', g]]) }), ['nGcdRet'], { gcd: g })

    // ---- exgcd
    const exg = (A: number, B: number, log: boolean) => {
      let [r0, r1, s0, s1, t0, t1] = [A, B, 1, 0, 0, 1] as number[]
      const R = (): ReturnType<typeof row>[] => [row('r', 'r（余数）', [r0!, r1!], { 0: 'cur' }), row('s', 's（a 的系数）', [s0!, s1!]), row('t', 't（b 的系数）', [t0!, t1!])]
      if (log) rec.push(`exgcd：r = (${A}, ${B})，s = (1, 0)，t = (0, 1)。不变量：每一对都满足 r = ${A}·s + ${B}·t。`, fam('扩展欧几里得', R()), ['nExInit'], { r0: r0!, r1: r1! })
      while (r1 !== 0) {
        const q = Math.floor(r0! / r1!)
        ;[r0, r1] = [r1!, r0! - q * r1!]
        ;[s0, s1] = [s1!, s0! - q * s1!]
        ;[t0, t1] = [t1!, t0! - q * t1!]
        if (log) rec.push(`商 q = ${q}：r → (${r0}, ${r1})，s → (${s0}, ${s1})，t → (${t0}, ${t1})。`, fam('扩展欧几里得', R(), { scalars: sc([['q', 'q', q]]) }), ['nExStep'], { q, r0: r0!, r1: r1! })
      }
      return [r0!, s0!, t0!] as [number, number, number]
    }
    const [eg, ex, ey] = exg(a, b, true)
    rec.push(`返回 [g, x, y] = [${eg}, ${ex}, ${ey}]。验算：${a}·(${ex}) + ${b}·(${ey}) = ${a * ex + b * ey}${a * ex + b * ey === eg ? ' = g ✓' : ' ≠ g ✗'}。`, fam('扩展欧几里得', [row('r', '[g, x, y]', [eg, ex, ey], { 0: 'hit' })], { scalars: sc([['check', `${a}·x + ${b}·y`, a * ex + b * ey]]) }), ['nExRet'], { g: eg, x: ex, y: ey })

    // ---- powMod
    const bits = power.toString(2).split('').map(Number).reverse()
    let result = 1 % m
    let base = a % m
    const pv = (cur?: number, mk: FamMark = 'cur') => [row('bits', 'power 的二进制位（低位→高位）', bits.length ? bits : [0], cur === undefined ? {} : { [cur]: mk })]
    rec.push(`快速幂：result = 1 mod ${m} = ${result}；base = ${a} mod ${m} = ${base}。power = ${power} = 二进制 ${power.toString(2)}。`, fam('快速幂', pv(), { scalars: sc([['result', 'result', result], ['base', 'base', base]]) }), ['nPowInit'], { result, base })
    let pw = power
    let bi = 0
    while (pw > 0) {
      if (pw % 2 === 1) {
        result = (result * base) % m
        rec.push(`第 ${bi} 位是 1：result = result × base mod ${m} = ${result}。`, fam('快速幂', pv(bi, 'hit'), { scalars: sc([['result', 'result', result], ['base', 'base', base]]) }), ['nPowBit'], { bit: bi, result })
      }
      base = (base * base) % m
      rec.push(`base = base² mod ${m} = ${base}（下一位的权重是 2 倍）。`, fam('快速幂', pv(bi, pw % 2 === 1 ? 'hit' : 'warn'), { scalars: sc([['result', 'result', result], ['base', 'base', base]]) }), ['nPowSquare'], { bit: bi, base })
      pw = Math.floor(pw / 2)
      bi++
    }
    rec.push(`${a}^${power} mod ${m} = ${result}。`, fam('快速幂', pv(), { scalars: sc([['pow', `${a}^${power} mod ${m}`, result]]) }), ['nPowRet'], { pow: result })

    // ---- invMod (modulus b)
    const ia = ((a % b) + b) % b
    const [ig, ix] = exg(ia, b, false)
    rec.push(`逆元：求 ${a} 在模 ${b} 下的逆元。调用 exgcd(${ia}, ${b}) 得 g = ${ig}，x = ${ix}。`, fam('模逆元', [row('e', 'exgcd 结果 [g, x]', [ig, ix])]), ['nInvEx'], { g: ig, x: ix })
    let inv = -1
    if (ig !== 1) {
      rec.push(`g = ${ig} ≠ 1：${a} 与 ${b} 不互素，逆元不存在，返回 −1。`, fam('模逆元：无解', [row('e', 'exgcd 结果 [g, x]', [ig, ix], { 0: 'warn' })], { scalars: sc([['inv', '逆元', -1]]) }), ['nInvNone'], { inv: -1 })
    } else {
      inv = ((ix % b) + b) % b
      rec.push(`g = 1：${ia}·(${ix}) ≡ 1 (mod ${b})。规约到 [0, ${b})：逆元 = ${inv}。验算 ${a}·${inv} mod ${b} = ${(a * inv) % b}。`, fam('模逆元', [row('e', 'exgcd 结果 [g, x]', [ig, ix], { 0: 'hit' })], { scalars: sc([['inv', '逆元', inv]]) }), ['nInvRet'], { inv })
    }

    // ---- sieve
    const cells = Array.from({ length: n - 1 }, (_, k) => k + 2)
    const comp = new Array<boolean>(n + 1).fill(false)
    const primes: number[] = []
    const sv = (cur?: number, mk: FamMark = 'cur') => {
      const marks: Record<number, FamMark> = {}
      cells.forEach((v, k) => {
        if (comp[v]) marks[k] = 'warn'
        else if (primes.includes(v)) marks[k] = 'hit'
      })
      if (cur !== undefined) marks[cur - 2] = mk
      return [row('sv', '2..n（绿 = 素数，橙 = 合数）', cells, marks, 2)]
    }
    rec.push(`埃氏筛：composite[0..${n}] 全为 false，素数表为空。`, fam('筛法', sv()), ['nSieveInit'], { n })
    for (let i2 = 2; i2 <= n; i2++) {
      if (comp[i2]) {
        rec.push(`i = ${i2}：已被标成合数，跳过。`, fam('筛法', sv(i2, 'warn')), ['nSieveSkip'], { i: i2 })
        continue
      }
      primes.push(i2)
      rec.push(`i = ${i2}：未被标记，是素数。`, fam('筛法', sv(i2, 'hit'), { scalars: sc([['count', '素数个数', primes.length]]) }), ['nSievePrime'], { i: i2 })
      for (let j = i2 * i2; j <= n; j += i2) {
        comp[j] = true
        rec.push(`标记 ${j} = ${i2}×${j / i2} 为合数。`, fam('筛法', sv(j, 'cur'), { scalars: sc([['i', 'i', i2]]) }), ['nSieveMark'], { i: i2, j })
      }
    }
    const result2 = { gcd: g, exgcd: [eg, ex, ey], pow: result, inv, primes }
    rec.push(`筛完：${n} 以内共 ${primes.length} 个素数：${primes.join(', ')}。`, fam('完成', sv(), { result: primes }), ['nSieveRet'], { count: primes.length })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: result2 }
    return { steps: rec.steps, result: result2 }
  },
}
