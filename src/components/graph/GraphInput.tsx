import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphAlgoId, GraphDraft } from '../../core/graph/types'
import { GRAPH_PRESETS, defaultDraftFor } from '../../core/graph/presets'
import { algoGraphOptions, parseEdgeListText, validateGraphDraft } from '../../core/graph/validate'

export type GraphValidity = {
  parseOk: boolean
  parseError: string | null
  validationOk: boolean
  canRun: boolean
  issues: { field: string; reason: string }[]
}

export interface GraphInputProps {
  algoId: GraphAlgoId
  value: GraphDraft
  onChange: (draft: GraphDraft) => void
  /** Notify parent when draft becomes unrunnable (parse/validation). */
  onValidityChange?: (v: GraphValidity) => void
  /** External restore/preset/import fingerprint — syncs textarea without remount. */
  syncKey?: string
  showIssues?: boolean
}

function edgesToText(edges: [number, number, number][]): string {
  return edges.map(([u, v, w]) => `${u} ${v} ${w}`).join('\n')
}

/**
 * Single controlled graph draft: raw text + parse + validation + dirty.
 * Illegal text does NOT leave previous valid edges runnable.
 */
export default function GraphInput({
  algoId,
  value,
  onChange,
  onValidityChange,
  syncKey,
  showIssues = true,
}: GraphInputProps) {
  const [edgeText, setEdgeText] = useState(() => edgesToText(value.edges))
  const [nText, setNText] = useState(() => String(value.n))
  const [startText, setStartText] = useState(() => String(value.start))
  const [parseError, setParseError] = useState<string | null>(null)
  const lastSync = useRef<string | undefined>(undefined)
  const opts = useMemo(() => algoGraphOptions(algoId), [algoId])

  // Sync from parent restore/preset/scene — not on every keystroke
  useEffect(() => {
    if (syncKey === undefined) return
    if (lastSync.current === syncKey) return
    lastSync.current = syncKey
    setEdgeText(edgesToText(value.edges))
    setNText(String(value.n))
    setStartText(String(value.start))
    setParseError(null)
  }, [syncKey, value.edges, value.n, value.start])

  // Also sync when edges identity changes from parent while parse was clean
  // (e.g. restore defaults without syncKey — AlgoPage should pass syncKey)
  const edgesFingerprint = useMemo(() => edgesToText(value.edges), [value.edges])

  const parsedEdges = useMemo(() => parseEdgeListText(edgeText), [edgeText])

  const draftForValidate: GraphDraft = useMemo(() => {
    const nParsed = nText.trim() === '' ? NaN : Number(nText)
    const startParsed = startText.trim() === '' ? NaN : Number(startText)
    return {
      ...value,
      n: Number.isFinite(nParsed) ? nParsed : value.n,
      start: Number.isFinite(startParsed) ? startParsed : value.start,
      edges: parsedEdges.ok ? parsedEdges.edges : [],
    }
  }, [value, nText, startText, parsedEdges])

  const validation = useMemo(
    () => validateGraphDraft(draftForValidate, opts),
    [draftForValidate, opts],
  )

  const validity: GraphValidity = useMemo(() => {
    const parseOk = parsedEdges.ok
    const nEmpty = nText.trim() === ''
    const startEmpty = startText.trim() === '' && opts.requireStart !== false
    const fieldTransient = nEmpty || startEmpty
    const validationOk = validation.ok
    const canRun = parseOk && validationOk && !fieldTransient
    return {
      parseOk,
      parseError: parseOk ? null : parsedEdges.ok === false ? parsedEdges.reason : parseError,
      validationOk,
      canRun,
      issues: validation.ok ? [] : validation.issues,
    }
  }, [parsedEdges, validation, nText, startText, opts.requireStart, parseError])

  useEffect(() => {
    onValidityChange?.(validity)
  }, [validity, onValidityChange])

  const emitDraft = (partial: Partial<GraphDraft> & { edges?: GraphDraft['edges'] }, text?: string) => {
    const nextText = text ?? edgeText
    const parsed = parseEdgeListText(nextText)
    if (!parsed.ok) {
      setParseError(parsed.reason)
      // Clear edges so parent cannot run previous valid graph
      onChange({
        ...value,
        ...partial,
        edges: [],
      })
      return
    }
    setParseError(null)
    onChange({
      ...value,
      ...partial,
      edges: parsed.edges,
    })
  }

  const needsStart = opts.requireStart !== false
  const showPassed = validity.canRun && showIssues

  return (
    <div className="graph-input" data-testid="graph-input" data-can-run={validity.canRun ? '1' : '0'}>
      <div className="graph-input-row">
        <label>
          顶点数 n
          <input
            type="text"
            inputMode="numeric"
            aria-label="顶点数 n"
            value={nText}
            onChange={(e) => {
              const raw = e.target.value
              setNText(raw)
              if (raw.trim() === '') {
                // Transient empty — do not snap to 1
                onChange({ ...value, edges: parsedEdges.ok ? parsedEdges.edges : [] })
                return
              }
              const n = Number(raw)
              if (!Number.isFinite(n)) return
              emitDraft({ n: Math.trunc(n) })
            }}
          />
        </label>
        {needsStart && (
          <label>
            源点
            <input
              type="text"
              inputMode="numeric"
              aria-label="源点"
              value={startText}
              onChange={(e) => {
                const raw = e.target.value
                setStartText(raw)
                if (raw.trim() === '') {
                  onChange({ ...value, edges: parsedEdges.ok ? parsedEdges.edges : [] })
                  return
                }
                const s = Number(raw)
                if (!Number.isFinite(s)) return
                emitDraft({ start: Math.trunc(s) })
              }}
            />
          </label>
        )}
        <label className="checkbox-label checkbox-field">
          <input
            type="checkbox"
            checked={value.directed}
            onChange={(e) => emitDraft({ directed: e.target.checked })}
          />
          有向图
        </label>
      </div>

      <label>
        边列表（每行：u v w，0-based）
        <textarea
          rows={6}
          value={edgeText}
          onChange={(e) => {
            const text = e.target.value
            setEdgeText(text)
            const parsed = parseEdgeListText(text)
            if (!parsed.ok) {
              setParseError(parsed.reason)
              onChange({ ...value, edges: [] })
              return
            }
            setParseError(null)
            onChange({ ...value, edges: parsed.edges })
          }}
          spellCheck={false}
          aria-invalid={parsedEdges.ok ? undefined : true}
        />
      </label>

      <div className="graph-input-presets">
        <span className="muted">预设：</span>
        {(GRAPH_PRESETS[algoId] ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            className="ghost"
            onClick={() => {
              const d = structuredClone(p.draft)
              setEdgeText(edgesToText(d.edges))
              setNText(String(d.n))
              setStartText(String(d.start))
              setParseError(null)
              onChange(d)
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
            setEdgeText(edgesToText(d.edges))
            setNText(String(d.n))
            setStartText(String(d.start))
            setParseError(null)
            onChange(d)
          }}
        >
          恢复默认
        </button>
      </div>

      {!validity.parseOk && (
        <p className="input-errors" role="alert">
          {validity.parseError ?? '边列表解析失败'}
        </p>
      )}
      {showIssues && validity.parseOk && !validity.validationOk && (
        <ul className="input-errors" role="alert">
          {validity.issues.map((iss, i) => (
            <li key={i}>
              <strong>{iss.field}</strong>: {iss.reason}
            </li>
          ))}
        </ul>
      )}
      {nText.trim() === '' && (
        <p className="hint muted" role="status">
          请输入顶点数 n（提交时校验）
        </p>
      )}
      {showPassed && (
        <p className="hint muted">
          图校验通过：n={draftForValidate.n}，|E|={draftForValidate.edges.length}，
          {draftForValidate.directed ? '有向' : '无向'}
          {needsStart ? `，源=${draftForValidate.start}` : ''}
        </p>
      )}
      {/* silence unused */}
      <span hidden data-edges-fp={edgesFingerprint} />
    </div>
  )
}

/** Sync edge textarea when parent resets draft from outside. */
export function graphDraftKey(d: GraphDraft): string {
  return `${d.n}|${d.directed}|${d.start}|${d.edges.map((e) => e.join(',')).join(';')}`
}
