/** Composable DP matrix cell roles — no early-return that swallows write/path. */

export type MatrixTarget = {
  current?: [number, number]
  reads?: [number, number][]
  writes?: [number, number][]
  path?: [number, number][]
}

function eq(p: [number, number] | undefined, i: number, j: number): boolean {
  return p !== undefined && p[0] === i && p[1] === j
}

export function dpCellClassNames(i: number, j: number, target?: MatrixTarget): string {
  if (!target) return ''
  const classes: string[] = []
  if (eq(target.current, i, j)) classes.push('hl-focus')
  if (target.writes?.some((p) => p[0] === i && p[1] === j)) classes.push('hl-swap', 'hl-write')
  if (target.path?.some((p) => p[0] === i && p[1] === j)) classes.push('hl-sorted', 'hl-path')
  if (target.reads?.some((p) => p[0] === i && p[1] === j)) classes.push('hl-read')
  return classes.join(' ')
}
