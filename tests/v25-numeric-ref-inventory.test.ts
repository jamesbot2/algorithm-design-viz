/**
 * V25-01 static + runtime inventory of modules that still emit legacy numeric
 * `codeLine` values (meta.code summary indices) on frames without a primary codeRef.
 * These frames rely on the 'legacy-unverified' fallback (codeLine + 1 on the full
 * document). This test does NOT claim they are correct — it lists them for follow-up
 * and locks Kadane at zero. Set V25_WRITE_INVENTORY=1 to write the JSON report.
 */
import { describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getAlgo } from '../src/algorithms/registry'
import { CATALOG_ALGO_IDS, getCatalog, numericLineFallback } from '../src/codeCatalog'
import { pickPrimaryCodeRef } from '../src/utils/codeRefs'
import type { Step } from '../src/types/step'

const ARRAY_INPUT = [5, 2, 4, 1, 3]
function stepsFor(id: string): Step[] | null {
  const mod = getAlgo(id)
  if (!mod) return null
  try {
    if (mod.solve) {
      const input =
        id === 'kadane' || id === 'maxSubarrayDC'
          ? { arr: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }
          : ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'].includes(id)
            ? { arr: ARRAY_INPUT }
            : {}
      const { trace } = mod.solve(input)
      if (trace.steps?.length) return trace.steps as Step[]
    }
  } catch {
    /* fall through */
  }
  return null
}

describe('V25-01 legacy numeric codeLine inventory', () => {
  it('lists numeric-only frames per catalog module; Kadane has none', () => {
    const rows: Record<string, unknown>[] = []
    const srcDir = path.join(process.cwd(), 'src/algorithms')
    for (const id of CATALOG_ALGO_IDS) {
      if (id.startsWith('knapsack.')) continue
      const file = path.join(srcDir, `${id}.ts`)
      const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
      // static: generator source passes a numeric codeLine somewhere
      const staticNumeric = /codeLine\s*[,:]|codeLine\?:|,\s*\d+\s*,\s*(undefined|\{|\[)/.test(src) && /codeLine/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))
      const steps = stepsFor(id)
      const doc = getCatalog(id)?.typescript
      let numericOnly = 0
      let unmappedZero = 0
      let mapped = 0
      const samples: string[] = []
      for (const s of steps ?? []) {
        const p = pickPrimaryCodeRef(s)
        if (p) mapped++
        else if (typeof s.codeLine === 'number' && s.codeLine > 0) {
          numericOnly++
          if (samples.length < 3 && doc) samples.push(`${s.message} → doc line ${s.codeLine + 1}: ${doc.source.split('\n')[s.codeLine]?.trim()}`)
        } else if (s.phase !== 'preview') unmappedZero++
      }
      rows.push({
        id,
        policy: numericLineFallback(id),
        staticNumericCodeLine: staticNumeric,
        runtimeChecked: steps !== null,
        frames: steps?.length ?? null,
        mapped,
        numericOnlyFrames: numericOnly,
        framesWithoutAnyRef: unmappedZero,
        samples,
        status: id === 'kadane' ? 'verified (V25)' : numericOnly > 0 || staticNumeric ? 'needs verification' : steps ? 'no numeric-only frames on sampled input (not audited)' : 'not runtime-checked',
      })
    }
    const k = rows.find((r) => r.id === 'kadane')!
    expect(k.numericOnlyFrames).toBe(0)
    expect(k.framesWithoutAnyRef).toBe(0)
    expect(k.staticNumericCodeLine).toBe(false)
    if (process.env.V25_WRITE_INVENTORY) {
      const out = path.join(process.cwd(), 'docs/traces/v25/legacy-numeric-inventory.json')
      fs.mkdirSync(path.dirname(out), { recursive: true })
      fs.writeFileSync(out, JSON.stringify(rows, null, 2))
    }
  })
})
