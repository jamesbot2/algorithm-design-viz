import type { Step } from '../types/step'

export const meta = {
  id: 'kmp',
  title: 'KMP 字符串匹配',
  complexity: '时间 O(n+m)，空间 O(m)',
  description:
    '预处理模式串 π（next）数组：π[i] = 模式 p[0..i] 的最长真前后缀长度。匹配失败时利用 π 跳转。索引为 JS 字符串码元（UTF-16 code unit）下标。空模式约定：在位置 0 匹配成功（空串是任何串的前缀）。',
  code: `建 π/next[]
i=j=0
while i < n:
  if t[i]==p[j]: i++; j++
  else if j>0: j=next[j-1]
  else: i++`,
  defaultText: 'ABABCABABABD',
  defaultPattern: 'ABABD',
  implName: 'kmpPi',
  implVersion: '1.1.0',
  timeComplexity: 'O(n+m)',
  spaceComplexity: 'O(m)',
  spaceNotes: 'π/next 长度 m；匹配阶段 O(1) 额外。',
  inputAssumptions:
    'π[i]=p[0..i] 最长真前后缀长度；空 pattern → 命中 [0]；索引为 code-unit（非码点）。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(
  _arr: number[],
  text = meta.defaultText,
  pattern = meta.defaultPattern,
): Step[] {
  const t = text
  const p = pattern
  const m = p.length
  const next = Array(m).fill(0)
  const steps: Step[] = []
  const DOC = 'kmp.ts'
  // primary statement + optional branch condition (weak context), as in Kadane V25
  const ref = (anchorId: string, condition?: string) => [
    { documentId: DOC, anchorId, role: 'primary' as const },
    ...(condition ? [{ documentId: DOC, anchorId: condition, role: 'condition' as const }] : []),
  ]
  let id = 0

  const snap = (
    message: string,
    ht: number[] = [],
    hp: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string; role?: 'primary' | 'condition' }[],
    pointers?: { text?: Record<string, number>; pattern?: Record<string, number> },
  ) => {
    // V25 acceptance: pointer labels are the running function's own variables
    // (buildLps: i / len on the pattern; kmpSearch: i on the text, j on the pattern),
    // placed only when that variable is a valid index.
    const arrayPointers: Record<string, Record<string, number>> = {}
    for (const [arr, len] of [['text', t.length], ['pattern', m]] as const) {
      const src = pointers?.[arr]
      if (!src) continue
      const inRange = Object.fromEntries(Object.entries(src).filter(([, v]) => v >= 0 && v < len))
      if (Object.keys(inRange).length) arrayPointers[arr] = inRange
    }
    steps.push({
      id: id++,
      message,
      arrays: {
        text: t.split(''),
        pattern: p.split(''),
        next: m ? [...next] : [],
      },
      highlights: { text: ht, pattern: hp, next: [] },
      arrayPointers,
      vars,
      result,
      codeRefs: codeRefs,
    })
  }

  if (m === 0) {
    snap('空模式：约定在下标 0 匹配（空串为任意串前缀）', [], [], { phase: 'empty' }, {
      ok: true,
      hits: [0],
      convention: 'empty_pattern_matches_at_0',
    }, ref('emptyPattern'))
    return steps
  }

  snap('构建 π/next 数组（最长真前后缀长度）', [], [], { phase: 'prefix' }, undefined, ref('buildLps'))
  let len = 0
  let i = 1
  while (i < m) {
    snap(`比较 p[${i}]='${p[i]}' 与 p[${len}]='${p[len]}'`, [], [i, len], { i, len }, undefined, ref('lpsCompare'), { pattern: { i, len } })
    if (p[i] === p[len]) {
      len++
      next[i] = len
      snap(`匹配，next[${i}]=${len}`, [], [i], { i, len }, undefined, ref('lpsExtend', 'lpsCompare'), { pattern: { i, len } })
      i++
    } else if (len > 0) {
      len = next[len - 1]
      snap(`失配，len ← next[...] 回退到 ${len}`, [], [i], { i, len }, undefined, ref('lpsFallback', 'lpsFallbackCond'), { pattern: { i, len } })
    } else {
      next[i] = 0
      snap(`next[${i}]=0`, [], [i], { i }, undefined, ref('lpsZero'), { pattern: { i } })
      i++
    }
  }
  snap(`π/next = [${next.join(',')}]`, [], [], { phase: 'match' }, undefined, ref('lpsReturn'))

  let ti = 0
  let pj = 0
  const hits: number[] = []
  // vars use the reference code's names (kmpSearch: i over text, j over pattern)
  while (ti < t.length) {
    snap(`比较 t[${ti}]='${t[ti]}' 与 p[${pj}]='${p[pj]}'`, [ti], [pj], { i: ti, j: pj }, undefined, ref('match'), { text: { i: ti }, pattern: { j: pj } })
    if (t[ti] === p[pj]) {
      ti++
      pj++
      if (pj === m) {
        hits.push(ti - m)
        snap(
          `匹配成功！起点 ${ti - m}`,
          Array.from({ length: m }, (_, k) => ti - m + k),
          Array.from({ length: m }, (_, k) => k),
          { hit: ti - m },
          undefined,
          ref('hit'),
        )
        pj = next[pj - 1]
      }
    } else if (pj > 0) {
      pj = next[pj - 1]
      snap(`失配，模式串跳转 j ← ${pj}`, [ti], [pj], { i: ti, j: pj }, undefined, ref('fallbackWrite', 'fallback'), { text: { i: ti }, pattern: { j: pj } })
    } else {
      ti++
      snap('失配且 j=0，文本前进', [ti < t.length ? ti : t.length - 1], [], { i: ti, j: pj }, undefined, ref('advance'), { text: { i: ti } })
    }
  }
  snap(
    hits.length ? `完成，命中位置: [${hits.join(',')}]` : '完成，无匹配',
    [],
    [],
    { hits: hits.join(',') || '无' },
    { ok: true, hits, pi: [...next] },
    ref('done'),
  )
  return steps
}
