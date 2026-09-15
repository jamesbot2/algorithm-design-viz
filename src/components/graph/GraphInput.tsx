import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphAlgoId, GraphDraft } from '../../core/graph/types'
import { GRAPH_PRESETS, defaultDraftFor } from '../../core/graph/presets'
import {
  algoGraphOptions,
  parseEdgeListText,
  parseGraphIntField,
  validateGraphDraft,
} from '../../core/graph/validate'

export type GraphValidity = {
  parseOk: boolean
  parseError: string | null
  validationOk: boolean
  canRun: boolean
  issues: { field: string; reason: string }[]
  /** Field-level n/start parse failures (explicit; not fallback). */
  nError: string | null
  startError: string | null
  nTransient: boolean
  startTransient: boolean
  /** Parsed runnable values only when canRun; otherwise null. */
  runnable: GraphDraft | null
}

export interface GraphInputProps {
  algoId: GraphAlgoId
  value: GraphDraft
  onChange: (draft: GraphDraft) => void
  onValidityChange?: (v: GraphValidity) => void
  syncKey?: string
  showIssues?: boolean
}

function edgesToText(edges: [number, number, number][]): string {
  return edges.map(([u, v, w]) => `${u} ${v} ${w}`).join('\n')
}

/**
 * Controlled graph draft: raw text kept for editing; n/start/edges validated separately.
 * Illegal n/start never silently fall back to the previous legal value for running.
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
  const needsStart = opts.requireStart !== false

  useEffect(() => {
    if (syncKey === undefined) return
    if (lastSync.current === syncKey) return
    lastSync.current = syncKey
    setEdgeText(edgesToText(value.edges))
    setNText(String(value.n))
    setStartText(String(value.start))
    setParseError(null)
  }, [syncKey, value.edges, value.n, value.start])

  const edgesFingerprint = useMemo(() => edgesToText(value.edges), [value.edges])
  const parsedEdges = useMemo(() => parseEdgeListText(edgeText), [edgeText])

  const nParsed = useMemo(() => parseGraphIntField(nText, 'n'), [nText])
  const startParsed = useMemo(() => {
    if (!needsStart) {
      // Optional start: empty → 0 for draft shape; still not used by floyd/kruskal
      if (startText.trim() === '') return { ok: true as const, value: 0 }
      return parseGraphIntField(startText, 'start')
    }
    return parseGraphIntField(startText, 'start')
  }, [startText, needsStart])

  const draftForValidate: GraphDraft = useMemo(() => {
    // Never substitute previous legal n/start when parse fails — use NaN so validation fails closed
    return {
      ...value,
      n: nParsed.ok ? nParsed.value : Number.NaN,
      start: startParsed.ok ? startParsed.value : Number.NaN,
      edges: parsedEdges.ok ? parsedEdges.edges : [],
      directed: value.directed,
    }
  }, [value, nParsed, startParsed, parsedEdges])

  const validation = useMemo(
    () => validateGraphDraft(draftForValidate, opts),
    [draftForValidate, opts],
  )

  const validity: GraphValidity = useMemo(() => {
    const parseOk = parsedEdges.ok
    const nOk = nParsed.ok
    const startOk = startParsed.ok
    const nTransient = !nParsed.ok && Boolean(nParsed.transient)
    const startTransient = !startParsed.ok && Boolean((startParsed as { transient?: boolean }).transient)
    const fieldErrors: { field: string; reason: string }[] = []
    if (!nOk && !nTransient) fieldErrors.push({ field: 'n', reason: nParsed.reason })
    if (needsStart && !startOk && !startTransient) {
      fieldErrors.push({ field: 'start', reason: (startParsed as { reason: string }).reason })
    }
    if (nTransient) fieldErrors.push({ field: 'n', reason: nParsed.reason })
    if (needsStart && startTransient) {
      fieldErrors.push({ field: 'start', reason: (startParsed as { reason: string }).reason })
    }

    const validationOk = validation.ok
    const issues = [
      ...fieldErrors,
      ...(validation.ok ? [] : validation.issues.filter((i) => i.field !== 'n' && i.field !== 'start')),
      // Still surface n/start range issues from validator when parse ok
      ...(validation.ok
        ? []
        : validation.issues.filter((i) => (i.field === 'n' || i.field === 'start') && nOk && (i.field !== 'start' || startOk))),
    ]
    const canRun = parseOk && nOk && (!needsStart || startOk) && validationOk
    const runnable: GraphDraft | null = canRun && validation.ok ? validation.value : null
    return {
      parseOk,
      parseError: parseOk ? null : parsedEdges.ok === false ? parsedEdges.reason : parseError,
      validationOk,
      canRun,
      issues,
      nError: nOk ? null : nParsed.reason,
      startError: !needsStart || startOk ? null : (startParsed as { reason: string }).reason,
      nTransient,
      startTransient,
      runnable,
    }
  }, [parsedEdges, validation, nParsed, startParsed, needsStart, parseError])

  useEffect(() => {
    onValidityChange?.(validity)
  }, [validity, onValidityChange])

  /** Emit parent draft only with explicitly parsed fields — never Math.trunc fallback. */
  const emitFromTexts = (
    partial: Partial<GraphDraft>,
    next?: { edgeText?: string; nText?: string; startText?: string },
  ) => {
    const text = next?.edgeText ?? edgeText
    const nRaw = next?.nText ?? nText
    const sRaw = next?.startText ?? startText
    const parsed = parseEdgeListText(text)
    const nP = parseGraphIntField(nRaw, 'n')
    const sP = needsStart
      ? parseGraphIntField(sRaw, 'start')
      : sRaw.trim() === ''
        ? ({ ok: true as const, value: 0 } as const)
        : parseGraphIntField(sRaw, 'start')

    if (!parsed.ok) {
      setParseError(parsed.reason)
      onChange({
        ...value,
        ...partial,
        // Keep last numeric n/start only as non-runnable display parent state when parse fails on edges;
        // runnable gate is canRun. Clear edges so previous graph cannot run.
        n: nP.ok ? nP.value : value.n,
        start: sP.ok ? sP.value : value.start,
        edges: [],
      })
      return
    }
    setParseError(null)
    onChange({
      ...value,
      ...partial,
      n: nP.ok ? nP.value : value.n,
      start: sP.ok ? sP.value : value.start,
      edges: parsed.edges,
    })
  }

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
            data-testid="graph-n"
            value={nText}
            aria-invalid={validity.nError ? true : undefined}
            onChange={(e) => {
              const raw = e.target.value
              setNText(raw)
              emitFromTexts({}, { nText: raw })
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
              data-testid="graph-start"
              value={startText}
              aria-invalid={validity.startError ? true : undefined}
              onChange={(e) => {
                const raw = e.target.value
                setStartText(raw)
                emitFromTexts({}, { startText: raw })
              }}
            />
          </label>
        )}
        <label className="checkbox-label checkbox-field">
          <input
            type="checkbox"
            checked={value.directed}
            onChange={(e) => emitFromTexts({ directed: e.target.checked })}
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
            emitFromTexts({}, { edgeText: text })
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
          data-testid="graph-restore-default"
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
        <p className="input-errors" role="alert" data-testid="graph-edges-error">
          {validity.parseError ?? '边列表解析失败'}
        </p>
      )}
      {validity.nError && (
        <p className="input-errors" role="alert" data-testid="graph-n-error">
          <strong>n</strong>: {validity.nError}
        </p>
      )}
      {validity.startError && (
        <p className="input-errors" role="alert" data-testid="graph-start-error">
          <strong>start</strong>: {validity.startError}
        </p>
      )}
      {showIssues && validity.parseOk && !validity.nError && !validity.startError && !validity.validationOk && (
        <ul className="input-errors" role="alert" data-testid="graph-validation-errors">
          {validity.issues.map((iss, i) => (
            <li key={i}>
              <strong>{iss.field}</strong>: {iss.reason}
            </li>
          ))}
        </ul>
      )}
      {showPassed && validity.runnable && (
        <p className="hint muted" data-testid="graph-valid-ok">
          图校验通过：n={validity.runnable.n}，|E|={validity.runnable.edges.length}，
          {validity.runnable.directed ? '有向' : '无向'}
          {needsStart ? `，源=${validity.runnable.start}` : ''}
        </p>
      )}
      <span hidden data-edges-fp={edgesFingerprint} />
    </div>
  )
}

export function graphDraftKey(d: GraphDraft): string {
  return `${d.n}|${d.directed}|${d.start}|${d.edges.map((e) => e.join(',')).join(';')}`
}
