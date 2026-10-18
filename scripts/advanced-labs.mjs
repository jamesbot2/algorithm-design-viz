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
