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
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0

  const snap = (
    message: string,
    ht: number[] = [],
    hp: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    const arrayPointers: Record<string, Record<string, number>> = {}
    if (ht.length === 1) arrayPointers.text = { i: ht[0]! }
    if (hp.length >= 1) arrayPointers.pattern = { j: hp[0]! }
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
    })
    return steps
  }

  snap('构建 π/next 数组（最长真前后缀长度）', [], [], { phase: 'prefix' }, undefined, ref('buildLps'))
  let len = 0
  let i = 1
  while (i < m) {
    snap(`比较 p[${i}]='${p[i]}' 与 p[${len}]='${p[len]}'`, [], [i, len], { i, len }, undefined, ref('buildLps'))
    if (p[i] === p[len]) {
      len++
      next[i] = len
      snap(`匹配，next[${i}]=${len}`, [], [i], { i, len }, undefined, ref('buildLps'))
      i++
    } else if (len > 0) {
      len = next[len - 1]
      snap(`失配，len ← next[...] 回退到 ${len}`, [], [i], { i, len })
    } else {
      next[i] = 0
      snap(`next[${i}]=0`, [], [i], { i })
      i++
    }
  }
  snap(`π/next = [${next.join(',')}]`, [], [], { phase: 'match' })

  let ti = 0
  let pj = 0
  const hits: number[] = []
  while (ti < t.length) {
    snap(`比较 t[${ti}]='${t[ti]}' 与 p[${pj}]='${p[pj]}'`, [ti], [pj], { ti, pj }, undefined, ref('match'))
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
      snap(`失配，模式串跳转 j ← ${pj}`, [ti], [pj], { ti, pj }, undefined, ref('fallback'))
    } else {
      ti++
      snap('失配且 j=0，文本前进', [ti < t.length ? ti : t.length - 1], [], { ti, pj })
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
