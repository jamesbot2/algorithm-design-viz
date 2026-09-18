import { memo, useEffect, useMemo, useRef } from 'react'
import type { Step } from '../types/step'
import { dpCellClassNames } from '../utils/dpCellRoles'

function MatrixView({ step, prevStep }: { step: Step; prevStep?: Step }) {
  const hints = step.labelHints
  const scrollRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

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

  // V18-02: follow current cell inside matrix-scroll only (never window / stage scrollIntoView)
  useEffect(() => {
    if (!step.matrixTargets) return
    // rAF: wait layout/flex settle after primary-scene resize
    const raf = requestAnimationFrame(() => {
      for (const [name, target] of Object.entries(step.matrixTargets!)) {
        const cur = target.current ?? target.writes?.[0]
        if (!cur) continue
        const scroller = scrollRefs.current.get(name)
        if (!scroller) continue
        const cell = scroller.querySelector(`td[data-cell="${cur[0]},${cur[1]}"]`) as HTMLElement | null
        if (!cell) continue
        const sRect = scroller.getBoundingClientRect()
        if (sRect.height < 8 || sRect.width < 8) continue
        const cRect = cell.getBoundingClientRect()
        const pad = 12
        let nextTop = scroller.scrollTop
        let nextLeft = scroller.scrollLeft
        // Prefer keeping cell fully inside scroller; nudge toward center when far out
        if (cRect.top < sRect.top + pad || cRect.bottom > sRect.bottom - pad) {
          const cellMid = cell.offsetTop + cell.offsetHeight / 2
          nextTop = Math.max(0, cellMid - sRect.height / 2)
        }
        if (cRect.left < sRect.left + pad || cRect.right > sRect.right - pad) {
          const cellMidX = cell.offsetLeft + cell.offsetWidth / 2
          nextLeft = Math.max(0, cellMidX - sRect.width / 2)
        }
        if (nextTop !== scroller.scrollTop || nextLeft !== scroller.scrollLeft) {
          scroller.scrollTo({ top: nextTop, left: nextLeft, behavior: 'auto' })
        }
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [step.id, step.matrixTargets])

  if (!step.matrices) return null

  return (
    <div className="matrices-panel" data-testid="matrices-panel">
      {Object.entries(step.matrices).map(([name, mat]) => {
        const target = step.matrixTargets?.[name]
        const prevMat = prevStep?.matrices?.[name]
        const rows = mat.length
        const cols = mat[0]?.length ?? 0
        const anti = Boolean(hints?.antiExample)
        return (
          <div key={name} className={`matrix-view${anti ? ' matrix-anti-example' : ''}`} data-matrix={name}>
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
            <div
              className="matrix-scroll"
              data-scroll-owner="matrix"
              data-testid={`matrix-scroll-${name}`}
              ref={(el) => {
                scrollRefs.current.set(name, el)
              }}
            >
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
                        const prevCell = prevMat?.[i]?.[j]
                        const prevDisplay =
                          prevCell === null || prevCell === undefined
                            ? undefined
                            : String(prevCell)
                        const cls = dpCellClassNames(i, j, target)
                        // Real prev from previous step state — never fake prev with current
                        const dataPrev =
                          prevDisplay !== undefined && prevDisplay !== display
                            ? prevDisplay
                            : undefined
                        return (
                          <td
                            key={j}
                            className={cls}
                            data-prev={dataPrev}
                            data-cell={`${i},${j}`}
                          >
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
              <p className="board-tree-link">棋盘为主场景；完整搜索树见下方折叠面板。</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(MatrixView)
