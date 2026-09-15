import { memo, useMemo, useState, type CSSProperties } from 'react'
import type { HighlightRole, Step, StepRanges } from '../types/step'
import { deriveArrayPointers } from '../types/step'

interface Props {
  name: string
  values: (number | string)[]
  highlights?: number[]
  roles?: Record<number, HighlightRole>
  pointers?: Record<string, number>
  defaultMode?: 'bars' | 'cells'
  /** Stable scale across a run (max abs from full trace) */
  scaleMax?: number
  ranges?: StepRanges
}

const ROLE_CLASS: Record<HighlightRole, string> = {
  compare: 'hl-compare',
  swap: 'hl-swap',
  sorted: 'hl-sorted',
  pivot: 'hl-pivot',
  read: 'hl-read',
  focus: 'hl-focus',
  done: 'hl-done',
  update: 'hl-swap',
  accepted: 'hl-sorted',
  rejected: 'hl-swap',
  pruned: 'hl-read',
  optimal: 'hl-sorted',
}

const LEGACY_ORDER: HighlightRole[] = ['compare', 'swap', 'focus', 'done']

function roleForIndex(
  i: number,
  highlights: number[],
  roles?: Record<number, HighlightRole>,
): HighlightRole | null {
  if (roles && roles[i]) return roles[i]
  const hi = highlights.indexOf(i)
  if (hi < 0) return null
  return LEGACY_ORDER[Math.min(hi, LEGACY_ORDER.length - 1)]
}

function barSuitable(values: (number | string)[]): boolean {
  if (!values.length) return false
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v as number))) return false
  if (values.length > 24) return false
  return true
}

function rangeStyle(
  range: [number, number] | undefined,
  n: number,
): { left: string; width: string } | null {
  if (!range || n <= 0) return null
  const lo = Math.max(0, Math.min(range[0], range[1]))
  const hi = Math.min(n - 1, Math.max(range[0], range[1]))
  if (hi < lo) return null
  const leftPct = (lo / n) * 100
  const widthPct = ((hi - lo + 1) / n) * 100
  return { left: `${leftPct}%`, width: `${widthPct}%` }
}

function ArrayView({
  name,
  values,
  highlights = [],
  roles,
  pointers = {},
  defaultMode,
  scaleMax,
  ranges,
}: Props) {
  const numeric = values.every((v) => typeof v === 'number' && Number.isFinite(v as number))
  const suitable = barSuitable(values)
  const [mode, setMode] = useState<'bars' | 'cells'>(
    defaultMode ?? (suitable ? 'bars' : 'cells'),
  )

  const nums = useMemo(
    () => (numeric ? (values as number[]) : values.map(() => 1)),
    [numeric, values],
  )
  const max = useMemo(() => {
    const local = Math.max(1, ...nums.map((n) => Math.abs(n)))
    return Math.max(local, scaleMax ?? 0, 1)
  }, [nums, scaleMax])
  const minH = 12
  const maxH = 160
  const hasNegative = numeric && nums.some((n) => n < 0)

  const pointersByIndex = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const [label, idx] of Object.entries(pointers)) {
      if (typeof idx !== 'number' || idx < 0 || idx >= values.length) continue
      const list = map.get(idx) ?? []
      list.push(label)
      map.set(idx, list)
    }
    return map
  }, [pointers, values.length])

  const swapPair = useMemo(() => {
    const swapIdxs: number[] = []
    if (roles) {
      for (const [k, r] of Object.entries(roles)) {
        if (r === 'swap') swapIdxs.push(Number(k))
      }
    }
    if (swapIdxs.length < 2 && highlights.length >= 2) {
      return [highlights[0]!, highlights[1]!] as [number, number]
    }
    if (swapIdxs.length >= 2) return [swapIdxs[0]!, swapIdxs[1]!] as [number, number]
    return null
  }, [roles, highlights])

  const curBand = rangeStyle(ranges?.current, values.length)
  const bestBand = rangeStyle(ranges?.best, values.length)

  return (
    <div className="array-view">
      <div className="array-label">
        <span>{name}</span>
        {numeric && (
          <div className="view-toggle">
            <button
              type="button"
              className={mode === 'bars' ? 'active' : ''}
              onClick={() => setMode('bars')}
              disabled={!suitable && mode !== 'bars'}
            >
              柱状
            </button>
            <button
              type="button"
              className={mode === 'cells' ? 'active' : ''}
              onClick={() => setMode('cells')}
            >
              单元格
            </button>
          </div>
        )}
      </div>

      {mode === 'bars' && numeric ? (
        <div className={`bars-wrap${hasNegative ? ' signed' : ''}`} style={{ position: 'relative' }}>
          {bestBand && <div className="range-band best" style={bestBand} title="最优窗口" />}
          {curBand && <div className="range-band current" style={curBand} title="当前窗口" />}
          {hasNegative && <div className="bar-baseline" aria-hidden />}
          {values.map((v, i) => {
            const role = roleForIndex(i, highlights, roles)
            const n = nums[i]!
            const h = minH + (Math.abs(n) / max) * (maxH - minH)
            const ptrs = pointersByIndex.get(i) ?? []
            const neg = n < 0
            const isSwap =
              role === 'swap' || (swapPair !== null && (i === swapPair[0] || i === swapPair[1]))
            const swapDx =
              isSwap && swapPair
                ? i === swapPair[0]
                  ? 8
                  : i === swapPair[1]
                    ? -8
                    : 0
                : 0
            return (
              <div key={i} className={`bar-col${neg ? ' neg' : ' pos'}`}>
                <div
                  className={`bar${role ? ` ${ROLE_CLASS[role]}` : ''}${neg ? ' bar-neg' : ''}${
                    isSwap ? ' anim-swap-nudge' : ''
                  }`}
                  style={
                    {
                      height: `${h}px`,
                      ['--swap-dx' as string]: `${swapDx}px`,
                    } as CSSProperties
                  }
                  title={`[${i}] = ${v}`}
                >
                  <span className="bar-val">{String(v)}</span>
                </div>
                <span className="bar-idx">{i}</span>
                <div className="pointer-row">
                  {ptrs.map((p) => (
                    <span key={p} className="ptr-tag">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="array-cells">
            {values.map((v, i) => {
              const role = roleForIndex(i, highlights, roles)
              const isSwap = role === 'swap'
              return (
                <div
                  key={i}
                  className={`cell${role ? ` ${ROLE_CLASS[role]}` : ''}${
                    isSwap ? ' anim-swap-nudge' : ''
                  }`}
                >
                  <span className="cell-idx">{i}</span>
                  <span className="cell-val">{String(v)}</span>
                </div>
              )
            })}
          </div>
          {Object.keys(pointers).length > 0 && (
            <div className="pointer-row" style={{ justifyContent: 'flex-start', marginTop: '0.5rem' }}>
              {Object.entries(pointers).map(([label, idx]) => (
                <span key={label} className="ptr-tag">
                  {label}={idx}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {(ranges?.current || ranges?.best) && (
        <p className="matrix-note">
          {ranges.current && (
            <>
              当前窗口 [{ranges.current[0]},{ranges.current[1]}]
            </>
          )}
          {ranges.current && ranges.best && ' · '}
          {ranges.best && (
            <>
              最优窗口 [{ranges.best[0]},{ranges.best[1]}]
            </>
          )}
        </p>
      )}
    </div>
  )
}

export default memo(ArrayView)

export const ArraysFromStep = memo(function ArraysFromStep({
  step,
  scaleMaxByArray,
}: {
  step: Step
  scaleMaxByArray?: Record<string, number>
}) {
  if (!step.arrays) return null
  return (
    <div className="arrays-panel">
      {Object.entries(step.arrays).map(([name, values]) => (
        <ArrayView
          key={name}
          name={name}
          values={values}
          highlights={step.highlights?.[name] ?? []}
          roles={step.roles?.[name]}
          pointers={deriveArrayPointers(step, name)}
          scaleMax={scaleMaxByArray?.[name]}
          ranges={name === 'a' || Object.keys(step.arrays!).length === 1 ? step.ranges : undefined}
        />
      ))}
    </div>
  )
})
