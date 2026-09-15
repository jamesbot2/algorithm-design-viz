import { memo, useMemo } from 'react'
import type { Step } from '../types/step'

function cellClass(
  i: number,
  j: number,
  target?: {
    current?: [number, number]
    reads?: [number, number][]
    writes?: [number, number][]
    path?: [number, number][]
  },
): string {
  if (!target) return ''
  const eq = (p?: [number, number]) => p !== undefined && p[0] === i && p[1] === j
  if (eq(target.current)) return 'hl-focus'
  if (target.writes?.some((p) => p[0] === i && p[1] === j)) return 'hl-swap hl-write'
  if (target.path?.some((p) => p[0] === i && p[1] === j)) return 'hl-sorted hl-path'
  if (target.reads?.some((p) => p[0] === i && p[1] === j)) return 'hl-read'
  return ''
}

function MatrixView({ step }: { step: Step }) {
  const hints = step.labelHints
  const syncRows = useMemo(() => {
    const set = new Set<number>()
    if (!step.matrixTargets) return set
    for (const t of Object.values(step.matrixTargets)) {
      if (t.current) set.add(t.current[0])
      t.writes?.forEach((p) => set.add(p[0]))
      t.reads?.forEach((p) => set.add(p[0]))
    }
    return set
  }, [step.matrixTargets])

  const syncCols = useMemo(() => {
    const set = new Set<number>()
    if (!step.matrixTargets) return set
    for (const t of Object.values(step.matrixTargets)) {
      if (t.current) set.add(t.current[1])
      t.writes?.forEach((p) => set.add(p[1]))
      t.reads?.forEach((p) => set.add(p[1]))
    }
    return set
  }, [step.matrixTargets])

  if (!step.matrices) return null

  return (
    <div className="matrices-panel">
      {Object.entries(step.matrices).map(([name, mat]) => {
        const target = step.matrixTargets?.[name]
        const rows = mat.length
        const cols = mat[0]?.length ?? 0
        const anti = Boolean(hints?.antiExample)
        return (
          <div key={name} className={`matrix-view${anti ? ' matrix-anti-example' : ''}`}>
            <div className="array-label">
              {name}
              <span className="matrix-index-hint">（下标 0-based）</span>
            </div>
            {anti && (
              <div className="matrix-anti-banner" role="status">
                反例演示：{hints?.antiNote ?? '此轨迹展示错误算法，勿当作正确实现'}
              </div>
            )}
            {(hints?.items?.length || hints?.rows?.length || hints?.cols?.length) && (
              <p className="matrix-note">
                {hints?.items && syncRows.size > 0 && (
                  <>
                    物品强调：
                    {[...syncRows]
                      .filter((r) => hints.items?.[r - 1] || hints.items?.[r])
                      .map((r) => hints.items?.[r] ?? hints.items?.[r - 1] ?? `i${r}`)
                      .join(', ') || '—'}
                  </>
                )}
                {hints?.rows && (
                  <>
                    {' '}
                    行标签：
                    {hints.rows
                      .map((lab, i) => (syncRows.has(i) ? `【${lab}】` : lab))
                      .slice(0, 12)
                      .join(' ')}
                  </>
                )}
              </p>
            )}
            <div className="matrix-scroll">
              <table className={`matrix-table sticky-labels${anti ? ' matrix-anti-example' : ''}`}>
                <thead>
                  <tr>
                    <th className="matrix-corner sticky-corner" />
                    {Array.from({ length: cols }, (_, j) => (
                      <th
                        key={j}
                        className={`matrix-col-h sticky-top${syncCols.has(j) ? ' matrix-label-sync' : ''}`}
                      >
                        {hints?.cols?.[j] ?? j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mat.map((row, i) => (
                    <tr key={i}>
                      <th
                        className={`matrix-row-h sticky-left${syncRows.has(i) ? ' matrix-label-sync' : ''}`}
                      >
                        {hints?.rows?.[i] ?? hints?.items?.[i] ?? i}
                      </th>
                      {row.map((cell, j) => {
                        const display =
                          cell === null || cell === undefined ? '·' : String(cell)
                        const cls = cellClass(i, j, target)
                        return (
                          <td key={j} className={cls} data-prev={display}>
                            {display}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows > 0 && name === 'dp' && (
              <p className="matrix-note">
                行/列标签为矩阵下标。若算法用「第 i 件物品」对应行 i（物品 0-based 为 i-1），请以步骤说明为准。
              </p>
            )}
            {name === 'board' && step.searchTree && (
              <p className="board-tree-link">棋盘与搜索树同步：当前步树快照见下方/侧栏搜索树。</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(MatrixView)
