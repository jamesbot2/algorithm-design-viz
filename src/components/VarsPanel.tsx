import { memo, useMemo } from 'react'
import type { Step } from '../types/step'
import { formatFinalAnswer } from '../utils/formatAnswer'

function serialize(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'null'
  return String(v)
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
      {hasInlineResult && (
        <div className="result-panel-enter" style={{ marginTop: '0.65rem' }}>
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
