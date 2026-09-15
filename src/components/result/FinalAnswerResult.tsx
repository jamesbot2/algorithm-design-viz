import type { ReactNode } from 'react'
import { formatFinalAnswer } from '../../utils/formatAnswer'

interface Props {
  result?: unknown
  vars?: Record<string, string | number | boolean | null>
  statusNote?: ReactNode
}

/** Structured final-answer panel — never raw JSON.slice as primary UI. */
export default function FinalAnswerResult({ result, vars, statusNote }: Props) {
  const primary = formatFinalAnswer(result, vars)
  const fields = extractFields(result)

  return (
    <div className="final-answer-result" data-testid="final-answer">
      <div className="final-answer-primary" data-testid="final-answer-primary">
        {primary}
      </div>
      {fields.length > 0 && (
        <dl className="final-answer-fields">
          {fields.map(([k, v]) => (
            <div key={k} className="final-answer-field">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {statusNote}
    </div>
  )
}

function extractFields(result: unknown): [string, string][] {
  if (!result || typeof result !== 'object') return []
  const r = result as Record<string, unknown>
  const keys = [
    'foundIndex',
    'lcs',
    'length',
    'solutionCount',
    'maxValue',
    'selectedIds',
    'sorted',
    'dist',
    'mstWeight',
    'sum',
    'answer',
    'best',
    'hits',
    'truncated',
    'complete',
  ]
  const out: [string, string][] = []
  for (const k of keys) {
    if (k in r && r[k] != null) {
      const v = r[k]
      out.push([k, Array.isArray(v) ? v.join(', ') : String(v)])
    }
  }
  return out.slice(0, 8)
}
