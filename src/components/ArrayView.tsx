import { useMemo, useState } from 'react'
import type { HighlightRole, Step } from '../types/step'
import { derivePointers } from '../types/step'

interface Props {
  name: string
  values: (number | string)[]
  highlights?: number[]
  roles?: Record<number, HighlightRole>
  pointers?: Record<string, number>
  defaultMode?: 'bars' | 'cells'
}

const ROLE_CLASS: Record<HighlightRole, string> = {
  compare: 'hl-compare',
  swap: 'hl-swap',
  sorted: 'hl-sorted',
  pivot: 'hl-pivot',
  read: 'hl-read',
  focus: 'hl-focus',
  done: 'hl-done',
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

export default function ArrayView({
  name,
  values,
  highlights = [],
  roles,
  pointers = {},
  defaultMode,
}: Props) {
  const numeric = values.every((v) => typeof v === 'number' && Number.isFinite(v as number))
  const [mode, setMode] = useState<'bars' | 'cells'>(
    defaultMode ?? (numeric ? 'bars' : 'cells'),
  )

  const nums = useMemo(
    () => (numeric ? (values as number[]) : values.map(() => 1)),
    [numeric, values],
  )
  const max = useMemo(() => Math.max(1, ...nums.map((n) => Math.abs(n))), [nums])
  const minH = 12
  const maxH = 160

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
        <div className="bars-wrap">
          {values.map((v, i) => {
            const role = roleForIndex(i, highlights, roles)
            const h = minH + (Math.abs(nums[i]) / max) * (maxH - minH)
            const ptrs = pointersByIndex.get(i) ?? []
            return (
              <div key={i} className="bar-col">
                <div
                  className={`bar${role ? ` ${ROLE_CLASS[role]}` : ''}`}
                  style={{ height: `${h}px` }}
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
              return (
                <div key={i} className={`cell${role ? ` ${ROLE_CLASS[role]}` : ''}`}>
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
    </div>
  )
}

export function ArraysFromStep({ step }: { step: Step }) {
  if (!step.arrays) return null
  const pointers = derivePointers(step)
  return (
    <div className="arrays-panel">
      {Object.entries(step.arrays).map(([name, values]) => (
        <ArrayView
          key={name}
          name={name}
          values={values}
          highlights={step.highlights?.[name] ?? []}
          roles={step.roles?.[name]}
          pointers={pointers}
        />
      ))}
    </div>
  )
}
