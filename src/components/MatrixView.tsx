import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Step } from '../types/step'
import { dpCellClassNames } from '../utils/dpCellRoles'
import { createScrollFollowIntent } from '../utils/scrollFollowIntent'

/** Content-space offset of cell relative to scroller scrollport (not offsetParent). */
function cellContentBox(cell: HTMLElement, scroller: HTMLElement) {
  const sRect = scroller.getBoundingClientRect()
  const cRect = cell.getBoundingClientRect()
  return {
    top: scroller.scrollTop + (cRect.top - sRect.top),
    left: scroller.scrollLeft + (cRect.left - sRect.left),
    width: cRect.width,
    height: cRect.height,
    sRect,
    cRect,
  }
}

function stickyInsets(scroller: HTMLElement) {
  const topEl = scroller.querySelector('.sticky-top, thead th') as HTMLElement | null
  const leftEl = scroller.querySelector('.sticky-left, tbody th.matrix-row-h') as HTMLElement | null
  return {
    top: topEl ? topEl.getBoundingClientRect().height : 0,
    left: leftEl ? leftEl.getBoundingClientRect().width : 0,
  }
}

function MatrixView({ step, prevStep }: { step: Step; prevStep?: Step }) {
  const hints = step.labelHints
  const scrollRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const followGen = useRef(0)
  const intentRef = useRef(createScrollFollowIntent())
  const [followPaused, setFollowPaused] = useState(false)
  const [followArmed, setFollowArmed] = useState(true)
  const userScrollCleanup = useRef<Map<string, () => void>>(new Map())
  const followPausedRef = useRef(followPaused)
  const followArmedRef = useRef(followArmed)
  followPausedRef.current = followPaused
  followArmedRef.current = followArmed

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

  const scrollCellIntoView = useCallback(
    (scroller: HTMLDivElement, cell: HTMLElement, center: boolean, kind: 'follow' | 'layout' | 'locate') => {
      const box = cellContentBox(cell, scroller)
      const insets = stickyInsets(scroller)
      const pad = 8
      const viewH = scroller.clientHeight
      const viewW = scroller.clientWidth
      if (viewH < 8 || viewW < 8) return false

      const visTop = scroller.scrollTop + insets.top + pad
      const visBottom = scroller.scrollTop + viewH - pad
      const visLeft = scroller.scrollLeft + insets.left + pad
      const visRight = scroller.scrollLeft + viewW - pad

      const cellTop = box.top
      const cellBottom = box.top + box.height
      const cellLeft = box.left
      const cellRight = box.left + box.width

      let nextTop = scroller.scrollTop
      let nextLeft = scroller.scrollLeft

      if (center) {
        const usableH = Math.max(1, viewH - insets.top)
        const usableW = Math.max(1, viewW - insets.left)
        nextTop = Math.max(0, cellTop - insets.top - usableH / 2 + box.height / 2)
        nextLeft = Math.max(0, cellLeft - insets.left - usableW / 2 + box.width / 2)
      } else {
        if (cellTop < visTop || cellBottom > visBottom) {
          if (cellTop < visTop) {
            nextTop = Math.max(0, cellTop - insets.top - pad)
          } else {
            nextTop = Math.max(0, cellBottom - viewH + pad)
          }
        }
        if (cellLeft < visLeft || cellRight > visRight) {
          if (cellLeft < visLeft) {
            nextLeft = Math.max(0, cellLeft - insets.left - pad)
          } else {
            nextLeft = Math.max(0, cellRight - viewW + pad)
          }
        }
      }

      // Clamp to real scroll range to avoid browser clamp thrash (scrollHeight ±1).
      const maxTop = Math.max(0, scroller.scrollHeight - viewH)
      const maxLeft = Math.max(0, scroller.scrollWidth - viewW)
      nextTop = Math.min(Math.max(0, nextTop), maxTop)
      nextLeft = Math.min(Math.max(0, nextLeft), maxLeft)

      if (Math.abs(nextTop - scroller.scrollTop) < 0.5 && Math.abs(nextLeft - scroller.scrollLeft) < 0.5) {
        return false
      }
      const gen = ++followGen.current
      const txn = intentRef.current.beginTransaction(kind)
      scroller.scrollTo({ top: nextTop, left: nextLeft, behavior: 'auto' })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (followGen.current === gen) {
            txn.end()
          } else {
            txn.end()
          }
        })
      })
      return true
    },
    [],
  )

  const followCurrentCells = useCallback(
    (center: boolean, kind: 'follow' | 'layout' | 'locate' = 'follow') => {
      if (!step.matrixTargets) return
      for (const [name, target] of Object.entries(step.matrixTargets)) {
        const cur = target.current ?? target.writes?.[0]
        if (!cur) continue
        const scroller = scrollRefs.current.get(name)
        if (!scroller) continue
        const cell = scroller.querySelector(
          `td[data-cell="${cur[0]},${cur[1]}"]`,
        ) as HTMLElement | null
        if (!cell) continue
        scrollCellIntoView(scroller, cell, center, kind)
      }
    },
    [step.matrixTargets, scrollCellIntoView],
  )

  // V20-01: follow current cell; layout/clamp scrolls must not pause
  useEffect(() => {
    if (!step.matrixTargets) return
    if (!followArmed || followPaused) return
    const gen = ++followGen.current
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (followGen.current !== gen) return
        followCurrentCells(false, 'follow')
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [step.id, step.matrixTargets, followArmed, followPaused, followCurrentCells])

  // Remeasure on scroller resize — re-follow if armed (layout txn); keep user pos if paused
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observers: ResizeObserver[] = []
    for (const scroller of scrollRefs.current.values()) {
      if (!scroller) continue
      const ro = new ResizeObserver(() => {
        if (!followArmedRef.current || followPausedRef.current) return
        const gen = ++followGen.current
        requestAnimationFrame(() => {
          if (followGen.current !== gen) return
          followCurrentCells(false, 'layout')
        })
      })
      ro.observe(scroller)
      // Also watch table size (write emphasis / scrollHeight ±1)
      const table = scroller.querySelector('table')
      if (table) ro.observe(table)
      observers.push(ro)
    }
    return () => observers.forEach((o) => o.disconnect())
  }, [step.id, followCurrentCells, step.matrices])

  const bindScroller = useCallback((name: string, el: HTMLDivElement | null) => {
    const prev = scrollRefs.current.get(name)
    if (prev && prev !== el) {
      userScrollCleanup.current.get(name)?.()
      userScrollCleanup.current.delete(name)
    }
    scrollRefs.current.set(name, el)
    if (!el) return
    // Make scroller focusable for keyboard browse classification
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1
    const cleanup = intentRef.current.bind(el, () => {
      setFollowPaused(true)
    })
    userScrollCleanup.current.set(name, cleanup)
  }, [])

  useEffect(() => {
    return () => {
      for (const cleanup of userScrollCleanup.current.values()) cleanup()
      userScrollCleanup.current.clear()
      followGen.current += 1
      intentRef.current.cancelAll()
    }
  }, [])

  const locateCurrent = () => {
    setFollowPaused(false)
    setFollowArmed(true)
    followCurrentCells(true, 'locate')
  }

  const resumeFollow = () => {
    setFollowPaused(false)
    setFollowArmed(true)
    followCurrentCells(false, 'follow')
  }

  if (!step.matrices) return null

  return (
    <div className="matrices-panel" data-testid="matrices-panel">
      <div className="matrix-follow-bar" data-testid="matrix-follow-bar">
        <button
          type="button"
          className="ghost"
          data-testid="matrix-locate-btn"
          onClick={locateCurrent}
          title="将当前格滚入矩阵视口并居中"
        >
          定位当前格
        </button>
        <button
          type="button"
          className="ghost"
          data-testid="matrix-resume-follow-btn"
          onClick={resumeFollow}
          disabled={!followPaused && followArmed}
          title="恢复自动跟随当前格"
        >
          恢复跟随
        </button>
        {followPaused && (
          <span className="hint" data-testid="matrix-follow-paused" role="status">
            已暂停矩阵跟随
          </span>
        )}
      </div>
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
              data-follow-paused={followPaused ? '1' : '0'}
              ref={(el) => bindScroller(name, el)}
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
