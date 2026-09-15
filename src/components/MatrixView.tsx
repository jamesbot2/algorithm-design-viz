import type { Step } from '../types/step'

function cellClass(
  i: number,
  j: number,
  target?: { current?: [number, number]; reads?: [number, number][]; writes?: [number, number][]; path?: [number, number][] },
): string {
  if (!target) return ''
  const eq = (p?: [number, number]) => p !== undefined && p[0] === i && p[1] === j
  if (eq(target.current)) return 'hl-focus'
  if (target.writes?.some((p) => p[0] === i && p[1] === j)) return 'hl-swap'
  if (target.path?.some((p) => p[0] === i && p[1] === j)) return 'hl-sorted'
  if (target.reads?.some((p) => p[0] === i && p[1] === j)) return 'hl-read'
  return ''
}

export default function MatrixView({ step }: { step: Step }) {
  if (!step.matrices) return null

  return (
    <div className="matrices-panel">
      {Object.entries(step.matrices).map(([name, mat]) => {
        const target = step.matrixTargets?.[name]
        const rows = mat.length
        const cols = mat[0]?.length ?? 0
        // Row/col labels: 0-based indices. Knapsack etc. may use row 0 as empty-set sentinel — still labeled 0.
        return (
          <div key={name} className="matrix-view">
            <div className="array-label">
              {name}
              <span className="matrix-index-hint">（下标 0-based）</span>
            </div>
            <div className="matrix-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th className="matrix-corner" />
                    {Array.from({ length: cols }, (_, j) => (
                      <th key={j} className="matrix-col-h">
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mat.map((row, i) => (
                    <tr key={i}>
                      <th className="matrix-row-h">{i}</th>
                      {row.map((cell, j) => {
                        // Never truthy-check 0 — 0 is a valid DP / distance value
                        const display =
                          cell === null || cell === undefined ? '·' : String(cell)
                        return (
                          <td key={j} className={cellClass(i, j, target)}>
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
          </div>
        )
      })}
    </div>
  )
}
