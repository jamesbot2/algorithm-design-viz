/**
 * STL lab validation specs (C++ only). The displayed teaching file and the contest file wrap REAL std containers; the validator
 *  1. compiles each with g++ -std=c++17 + ASan/UBSan + -Wall -Wextra (no warnings),
 *  2. runs them on random op sequences through the contest `main` (one dump line per op),
 *  3. requires teaching output == contest-core output == contest-full output, and the template sample output byte for byte,
 *  4. records the real-STL dumps as GOLDEN (tests/advanced/stl-golden.json) — vitest asserts the TS simulator equals them.
 * Case = { fields: draft strings for the demo input, input: stdin of contest main }.
 */
import { mulberry32, rint } from './advanced-families.mjs'

export const LAB = {}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]
const lines = (ops) => ops.join('\n')

// ───────────── stl-vector ─────────────
LAB['stl-vector'] = {
  dir: 'stl_vector',
  opCount: (c) => c.input.split('\n')[1],
  gen(seed) {
    const r = mulberry32(seed)
    const cases = []
    for (let t = 0; t < 250; t++) {
      const k = rint(r, 0, 6)
      const init = Array.from({ length: k }, () => rint(r, -9, 9))
      let size = k
      const ops = []
      const m = rint(r, 1, 12)
      while (ops.length < m) {
        const c = rint(r, 0, 7)
        if (c === 0 || c === 1) { ops.push(`push ${rint(r, -9, 9)}`); size++ }
        else if (c === 2) ops.push(`reserve ${rint(r, 0, 24)}`)
        else if (c === 3) { const n = rint(r, 0, 24); ops.push(`resize ${n}`); size = n }
        else if (c === 4) { ops.push(`insert ${rint(r, 0, size)} ${rint(r, -9, 9)}`); size++ }
        else if (c === 5 && size > 0) { ops.push(`erase ${rint(r, 0, size - 1)}`); size-- }
        else if (c === 6) ops.push('shrink')
        else if (c === 7 && size > 0) { ops.push(`it ${rint(r, 0, size - 1)}`); if (ops.length < m) ops.push('use') }
      }
      cases.push({ fields: { arr: init.join(', '), ops: ops.join('; ') }, input: `${k} ${init.join(' ')}\n${ops.length}\n${lines(ops)}\n` })
    }
    return cases
  },
}

// ───────────── stl-deque ─────────────
LAB['stl-deque'] = {
  dir: 'stl_deque',
  opCount: (c) => c.input.split('\n')[1],
  gen(seed) {
    const r = mulberry32(seed)
    const cases = []
    for (let t = 0; t < 250; t++) {
      const k = rint(r, 0, 5)
      const init = Array.from({ length: k }, () => rint(r, -9, 9))
      let size = k
      const ops = []
      const m = rint(r, 1, 14)
      while (ops.length < m) {
        const c = rint(r, 0, 5)
        if (c === 0) { ops.push(`pushb ${rint(r, -9, 9)}`); size++ }
        else if (c === 1) { ops.push(`pushf ${rint(r, -9, 9)}`); size++ }
        else if (size > 0 && c === 2) { ops.push('popb'); size-- }
        else if (size > 0 && c === 3) { ops.push('popf'); size-- }
        else if (size > 0 && c === 4) ops.push('front')
        else if (size > 0 && c === 5) ops.push('back')
      }
      cases.push({ fields: { arr: init.join(', '), ops: ops.join('; ') }, input: `${k} ${init.join(' ')}\n${ops.length}\n${lines(ops)}\n` })
    }
    return cases
  },
}

// ───────────── stl-unique ─────────────
LAB['stl-unique'] = {
  dir: 'stl_unique',
  opCount: () => 1,
  gen(seed) {
    const r = mulberry32(seed)
    const cases = []
    for (let t = 0; t < 250; t++) {
      const n = rint(r, 1, 10)
      const a = Array.from({ length: n }, () => rint(r, -3, 3))
      const mode = rint(r, 0, 2)
      const x = rint(r, -3, 3)
      cases.push({ fields: { arr: a.join(', '), mode: String(mode), x: String(x) }, input: `${n} ${a.join(' ')}\n${mode} ${x}\n` })
    }
    return cases
  },
}

// ───────────── stl-set-map ─────────────
LAB['stl-set-map'] = {
  dir: 'stl_set_map',
  opCount: (c) => c.input.split('\n')[0],
  gen(seed) {
    const r = mulberry32(seed)
    const names = ['sins', 'sdel', 'mins', 'mdel', 'mdel1', 'mcnt', 'slb', 'mapinc', 'mapget', 'mapfind']
    const cases = []
    for (let t = 0; t < 250; t++) {
      const ops = Array.from({ length: rint(r, 1, 14) }, () => `${pick(r, names)} ${rint(r, -6, 6)}`)
      cases.push({ fields: { ops: ops.join('; ') }, input: `${ops.length}\n${lines(ops)}\n` })
    }
    return cases
  },
}
