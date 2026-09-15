import { useMemo, useState } from 'react'
import type { GraphAlgoId, GraphDraft } from '../../core/graph/types'
import { GRAPH_PRESETS, defaultDraftFor } from '../../core/graph/presets'
import { algoGraphOptions, parseEdgeListText, validateGraphDraft } from '../../core/graph/validate'

export interface GraphInputProps {
  algoId: GraphAlgoId
  value: GraphDraft
  onChange: (draft: GraphDraft) => void
  /** Show validation issues inline */
  showIssues?: boolean
}

function edgesToText(edges: [number, number, number][]): string {
  return edges.map(([u, v, w]) => `${u} ${v} ${w}`).join('\n')
}

export default function GraphInput({ algoId, value, onChange, showIssues = true }: GraphInputProps) {
  const [edgeText, setEdgeText] = useState(() => edgesToText(value.edges))
  const [parseError, setParseError] = useState<string | null>(null)
  const opts = useMemo(() => algoGraphOptions(algoId), [algoId])
  const validation = useMemo(() => validateGraphDraft(value, opts), [value, opts])
  const presets = GRAPH_PRESETS[algoId] ?? []

  const applyEdgesText = (text: string) => {
    setEdgeText(text)
    const parsed = parseEdgeListText(text)
    if (!parsed.ok) {
      setParseError(parsed.reason)
      return
    }
    setParseError(null)
    onChange({ ...value, edges: parsed.edges })
  }

  const needsStart = opts.requireStart !== false

  return (
    <div className="graph-input">
      <div className="graph-input-row">
        <label>
          顶点数 n
          <input
            type="number"
            min={1}
            max={32}
            value={value.n}
            onChange={(e) => onChange({ ...value, n: Number(e.target.value) || 1 })}
          />
        </label>
        {needsStart && (
          <label>
            源点
            <input
              type="number"
              min={0}
              max={Math.max(0, value.n - 1)}
              value={value.start}
              onChange={(e) => onChange({ ...value, start: Number(e.target.value) || 0 })}
            />
          </label>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.directed}
            onChange={(e) => onChange({ ...value, directed: e.target.checked })}
          />
          有向图
        </label>
      </div>

      <label>
        边列表（每行：u v w，0-based）
        <textarea
          rows={6}
          value={edgeText}
          onChange={(e) => applyEdgesText(e.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="graph-input-presets">
        <span className="muted">预设：</span>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ghost"
            onClick={() => {
              const d = structuredClone(p.draft)
              onChange(d)
              setEdgeText(edgesToText(d.edges))
              setParseError(null)
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const d = defaultDraftFor(algoId)
            onChange(d)
            setEdgeText(edgesToText(d.edges))
            setParseError(null)
          }}
        >
          恢复默认
        </button>
      </div>

      {parseError && <p className="input-errors">{parseError}</p>}
      {showIssues && !validation.ok && (
        <ul className="input-errors" role="alert">
          {validation.issues.map((iss, i) => (
            <li key={i}>
              <strong>{iss.field}</strong>: {iss.reason}
            </li>
          ))}
        </ul>
      )}
      {showIssues && validation.ok && (
        <p className="hint muted">
          图校验通过：n={value.n}，|E|={value.edges.length}，{value.directed ? '有向' : '无向'}
          {needsStart ? `，源=${value.start}` : ''}
        </p>
      )}
    </div>
  )
}

/** Sync edge textarea when parent resets draft from outside. */
export function graphDraftKey(d: GraphDraft): string {
  return `${d.n}|${d.directed}|${d.start}|${d.edges.map((e) => e.join(',')).join(';')}`
}
