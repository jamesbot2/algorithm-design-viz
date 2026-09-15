import { useEffect, useRef, useState } from 'react'
import type { Step } from '../types/step'

export default function VarsPanel({ step }: { step: Step }) {
  const vars = step.vars ?? {}
  const entries = Object.entries(vars)
  const prevRef = useRef<Record<string, string>>({})
  const [flash, setFlash] = useState<Set<string>>(new Set())

  useEffect(() => {
    const next: Record<string, string> = {}
    const changed = new Set<string>()
    for (const [k, v] of Object.entries(vars)) {
      const s = v === null || v === undefined ? 'null' : String(v)
      next[k] = s
      if (prevRef.current[k] !== undefined && prevRef.current[k] !== s) {
        changed.add(k)
      }
    }
    prevRef.current = next
    if (changed.size === 0) return
    setFlash(changed)
    const t = window.setTimeout(() => setFlash(new Set()), 550)
    return () => window.clearTimeout(t)
  }, [vars, step.id])

  return (
    <div className="vars-panel">
      <div className="panel-title">变量</div>
      {entries.length === 0 ? (
        <div className="vars-empty">暂无变量</div>
      ) : (
        <div className="vars-grid">
          {entries.map(([k, v]) => (
            <div key={k} className={`var-chip${flash.has(k) ? ' flash' : ''}`}>
              <span className="var-key">{k}</span>
              <span className="var-val">{v === null || v === undefined ? 'null' : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
