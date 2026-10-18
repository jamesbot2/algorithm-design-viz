import type { FamGraph, FamMark, FamRow, FamView } from '../../types/advancedView'
import type { FamInput } from './famTypes'

export const row = (id: string, label: string, cells: (number | string | null)[], marks: Record<number, FamMark> = {}, offset = 0): FamRow => ({ id, label, cells: [...cells], marks: { ...marks }, offset })
export const fam = (op: string, rows: FamRow[], extra: { graph?: FamGraph; scalars?: [string, string, string | number][]; result?: (number | string)[] } = {}): FamView => ({
  kind: 'fam',
  op,
  rows,
  ...(extra.graph ? { graph: extra.graph } : {}),
  scalars: (extra.scalars ?? []).map(([id, label, value]) => ({ id, label, value })),
  ...(extra.result ? { result: extra.result } : {}),
})
export const ints = (i: FamInput, k: string) => i[k] as number[]
export const int = (i: FamInput, k: string) => i[k] as number
export const pairs = (xs: number[]): [number, number][] => {
  const o: [number, number][] = []
  for (let i = 0; i + 1 < xs.length; i += 2) o.push([xs[i]!, xs[i + 1]!])
  return o
}
export const triples = (xs: number[]): [number, number, number][] => {
  const o: [number, number, number][] = []
  for (let i = 0; i + 2 < xs.length; i += 3) o.push([xs[i]!, xs[i + 1]!, xs[i + 2]!])
  return o
}
