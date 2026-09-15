import type { Step } from '../types/step'

export const meta = {
  id: 'kmp',
  title: 'KMP 字符串匹配',
  complexity: '时间 O(n+m)，空间 O(m)',
  description: '预处理模式串 next/π 数组，匹配失败时利用已匹配信息跳转。',
  code: `建 next[]
i=j=0
while i < n:
  if t[i]==p[j]: i++; j++
  else if j>0: j=next[j-1]
  else: i++`,
  defaultText: 'ABABCABABABD',
  defaultPattern: 'ABABD',
}

export function generateSteps(
  _arr: number[],
  text = meta.defaultText,
  pattern = meta.defaultPattern,
): Step[] {
  const t = text, p = pattern
  const m = p.length
  const next = Array(m).fill(0)
  const steps: Step[] = []
  let id = 0

  const snap = (message: string, ht: number[] = [], hp: number[] = [], vars: Record<string, string | number | boolean | null> = {}) => {
    steps.push({
      id: id++,
      message,
      arrays: {
        text: t.split(''),
        pattern: p.split(''),
        next: [...next],
      },
      highlights: { text: ht, pattern: hp, next: [] },
      vars,
    })
  }

  snap('构建 next 数组（最长真前后缀）', [], [], { phase: 'prefix' })
  let len = 0, i = 1
  while (i < m) {
    snap(`比较 p[${i}]='${p[i]}' 与 p[${len}]='${p[len]}'`, [], [i, len], { i, len })
    if (p[i] === p[len]) {
      len++
      next[i] = len
      snap(`匹配，next[${i}]=${len}`, [], [i], { i, len })
      i++
    } else if (len > 0) {
      len = next[len - 1]
      snap(`失配，len ← next[${len}]... 回退`, [], [i], { i, len })
    } else {
      next[i] = 0
      snap(`next[${i}]=0`, [], [i], { i })
      i++
    }
  }
  snap(`next = [${next.join(',')}]`, [], [], { phase: 'match' })

  let ti = 0, pj = 0
  const hits: number[] = []
  while (ti < t.length) {
    snap(`比较 t[${ti}]='${t[ti]}' 与 p[${pj}]='${p[pj]}'`, [ti], [pj], { ti, pj })
    if (t[ti] === p[pj]) {
      ti++
      pj++
      if (pj === m) {
        hits.push(ti - m)
        snap(`匹配成功！起点 ${ti - m}`, Array.from({ length: m }, (_, k) => ti - m + k), Array.from({ length: m }, (_, k) => k), { hit: ti - m })
        pj = next[pj - 1]
      }
    } else if (pj > 0) {
      pj = next[pj - 1]
      snap(`失配，模式串跳转 j ← ${pj}`, [ti], [pj], { ti, pj })
    } else {
      ti++
      snap('失配且 j=0，文本前进', [ti], [], { ti, pj })
    }
  }
  snap(hits.length ? `完成，命中位置: [${hits.join(',')}]` : '完成，无匹配', [], [], { hits: hits.join(',') || '无' })
  return steps
}
