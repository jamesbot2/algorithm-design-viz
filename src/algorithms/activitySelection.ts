import type { Step } from '../types/step'

export const meta = {
  id: 'activitySelection',
  title: '活动选择',
  complexity: '时间 O(n log n)，空间 O(n)',
  description: '按结束时间排序，贪心选取互不冲突的最多活动。',
  code: `按结束时间排序
选第一个；之后选开始 ≥ 上次结束的活动`,
  defaultStarts: [1, 3, 0, 5, 8, 5],
  defaultEnds: [4, 5, 6, 7, 9, 9],
}

export function generateSteps(
  _arr: number[],
  starts = meta.defaultStarts,
  ends = meta.defaultEnds,
): Step[] {
  const n = starts.length
  const acts = starts.map((s, i) => ({ i, s, e: ends[i] })).sort((a, b) => a.e - b.e)
  const steps: Step[] = []
  const DOC = 'activitySelection.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const selected: number[] = []
  const labels = acts.map((a) => `A${a.i}[${a.s},${a.e})`)
  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    steps.push({
      id: id++,
      message,
      arrays: { activities: [...labels], selected: selected.map((x) => `A${acts[x].i}`) },
      highlights: { activities: highlights },
      vars,
      codeRefs,
    })
  }
  snap('按结束时间排序活动', [], { n }, ref('sort'))
  let lastEnd = -Infinity
  for (let k = 0; k < acts.length; k++) {
    const a = acts[k]
    snap(`考察 A${a.i}：[${a.s},${a.e})，上次结束=${lastEnd === -Infinity ? '无' : lastEnd}`, [k], { k, start: a.s, end: a.e, lastEnd: lastEnd === -Infinity ? '无' : lastEnd }, ref('check'))
    if (a.s >= lastEnd) {
      selected.push(k)
      lastEnd = a.e
      snap(`选取 A${a.i}，更新 lastEnd=${lastEnd}`, [k], { selected: selected.length, lastEnd }, ref('pick'))
    } else {
      snap(`与已选冲突，跳过 A${a.i}`, [k], { selected: selected.length, lastEnd }, ref('check'))
    }
  }
  snap(`完成：共选 ${selected.length} 个活动`, selected, { answer: selected.length }, ref('done'))
  return steps
}
