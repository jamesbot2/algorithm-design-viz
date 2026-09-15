import type { Step } from '../types/step'

export default function VarsPanel({ step }: { step: Step }) {
  const vars = step.vars ?? {}
  const entries = Object.entries(vars)
  return (
    <div className="vars-panel">
      <div className="panel-title">变量</div>
      {entries.length === 0 ? (
        <div className="vars-empty">暂无变量</div>
      ) : (
        <div className="vars-grid">
          {entries.map(([k, v]) => (
            <div key={k} className="var-item">
              <span className="var-key">{k}</span>
              <span className="var-val">{v === null || v === undefined ? 'null' : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
