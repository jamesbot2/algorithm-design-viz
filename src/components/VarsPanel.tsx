import { memo, useMemo } from 'react'
import type { Step } from '../types/step'
import { formatFinalAnswer } from '../utils/formatAnswer'

function serialize(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'null'
  return String(v)
}

function formatCell(v: string | number): string {
  if (v === Infinity || v === 'Infinity') return '∞'
  if (v === -Infinity || v === '-Infinity') return '-∞'
  return String(v)
}

/** Compact cursor-synced array tables (Dijkstra dist/parent/done, etc.). */
function ArraysInInspector({
  step,
  prevStep,
}: {
  step: Step
  prevStep?: Step
}) {
  const arrays = step.arrays
  const changedIdx = useMemo(() => {
    const map: Record<string, Set<number>> = {}
    if (!arrays) return map
    for (const [name, values] of Object.entries(arrays)) {
      const prev = prevStep?.arrays?.[name]
      const set = new Set<number>()
      values.forEach((v, i) => {
        const pv = prev?.[i]
        if (pv === undefined || formatCell(v as string | number) !== formatCell(pv as string | number)) {
          set.add(i)
        }
      })
      map[name] = set
    }
    return map
  }, [arrays, step.id, prevStep?.arrays, prevStep?.id])

  if (!arrays || Object.keys(arrays).length === 0) return null

  return (
    <div className="inspector-arrays" data-testid="inspector-arrays">
      <div className="panel-title">数组（当前步）</div>
      {Object.entries(arrays).map(([name, values]) => (
        <div
          key={name}
          className="inspector-array-table"
          data-testid={`inspector-array-${name}`}
          data-array-name={name}
        >
          <div className="inspector-array-name">{name}</div>
          <table className="inspector-array-grid">
            <thead>
              <tr>
                {values.map((_, i) => (
                  <th key={i}>{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {values.map((v, i) => (
                  <td
                    key={i}
                    data-idx={i}
                    data-changed={changedIdx[name]?.has(i) ? '1' : undefined}
                    className={changedIdx[name]?.has(i) ? 'flash' : undefined}
                  >
                    {formatCell(v as string | number)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

/** Diff vars from adjacent step; flash only changed chips. No ancestor remount. */
function VarsPanel({ step, prevStep }: { step: Step; prevStep?: Step }) {
  const vars = step.vars ?? {}
  const entries = Object.entries(vars)

  const changed = useMemo(() => {
    const prev = prevStep?.vars ?? {}
    const set = new Set<string>()
    for (const [k, v] of Object.entries(step.vars ?? {})) {
      if (serialize(prev[k]) !== serialize(v)) set.add(k)
    }
    return set
  }, [step.vars, step.id, prevStep?.vars, prevStep?.id])

  // Separate current-step vars from terminal result (final answer lives elsewhere)
  const hasInlineResult =
    step.result !== undefined &&
    step.result !== null &&
    step.phase !== 'done' &&
    !step.message?.includes('完成')

  return (
    <div className="vars-panel" data-testid="vars-panel">
      <div className="panel-title">变量</div>
      {entries.length === 0 ? (
        <div className="vars-empty">暂无变量</div>
      ) : (
        <div className="vars-grid">
          {entries.map(([k, v]) => (
            <div
              key={k}
              className={`var-chip${changed.has(k) ? ' flash' : ''}`}
              data-changed={changed.has(k) ? '1' : undefined}
              data-var={k}
            >
              <span className="var-key">{k}</span>
              <span className="var-val">{serialize(v)}</span>
            </div>
          ))}
        </div>
      )}
      <ArraysInInspector step={step} prevStep={prevStep} />
      {hasInlineResult && (
        <div className="result-panel-enter" style={{ marginTop: '0.65rem' }} data-testid="inspector-mid-result">
          <div className="panel-title">中间结果</div>
          <div className="result-snap muted" style={{ fontSize: '0.82rem' }}>
            {formatFinalAnswer(step.result, step.vars)}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(VarsPanel)
