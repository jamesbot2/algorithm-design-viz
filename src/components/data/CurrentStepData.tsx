import { useEffect, useState, type ReactNode } from 'react'
import type { Step } from '../../types/step'
import VarsPanel from '../VarsPanel'
import { CONFIG_KEYS, friendlyLabel, summarizeConfig } from './friendlyFields'

interface Props {
  step: Step | undefined
  prevStep?: Step
  isPreview: boolean
  /** Last frame of the run is showing (final result may be expanded). */
  atEnd: boolean
  /** Separate final-result block (never replaces mid-run data). */
  finalAnswer?: ReactNode
  /** Graph pages: summary says "个顶点". */
  graph?: boolean
  runKey?: string | number
}

function serialize(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  return String(v)
}

/**
 * V23: pure presentation of the CURRENT step's key data, laid out by the
 * Workbench as a normal sibling of the scene (docked below it / own column /
 * own tab). No portal, no fixed band, no transport of its own.
 */
export default function CurrentStepData({ step, prevStep, isPreview, atEnd, finalAnswer, graph, runKey }: Props) {
  const [finalOpen, setFinalOpen] = useState(false)
  // New run: collapse the final result again; reaching the end opens it once.
  useEffect(() => setFinalOpen(false), [runKey])
  useEffect(() => {
    if (atEnd && !isPreview) setFinalOpen(true)
  }, [atEnd, isPreview])

  if (!step) return <div className="data-empty muted">暂无数据</div>
  const vars = (step.vars ?? {}) as Record<string, string | number | boolean | null>
  const summary = summarizeConfig(vars, { graph })
  const rawEntries = Object.entries(vars)
  const stats = step.stats ? Object.entries(step.stats) : []
  const frameId = step.frameId ?? (vars.frameId as string | undefined)
  const hasFinal = finalAnswer !== undefined && finalAnswer !== null && finalAnswer !== false

  return (
    <div className="current-step-data" data-testid="current-step-data" data-step-id={step.id}>
      {isPreview && <p className="data-hint muted">尚未运行：点击「运行」后这里显示每一步的关键数据。</p>}
      <VarsPanel step={step} prevStep={prevStep} graph={graph} />
      {frameId !== undefined && frameId !== null && (
        <div className="data-frame" data-testid="call-stack">
          <span className="field-label">当前帧标识</span> <code className="frame-id">{String(frameId)}</code>
          <span className="muted"> （不是完整调用栈）</span>
        </div>
      )}
      {stats.length > 0 && (
        <div className="data-stats" data-testid="stats-row">
          {stats.map(([k, v]) => (
            <span className="stat-chip" key={k}>
              {k === 'comparisons' ? '比较' : k === 'swaps' ? '交换' : k === 'writes' ? '写入' : k}{' '}
              <strong className="tabular-nums">{String(v)}</strong>
            </span>
          ))}
        </div>
      )}
      {(summary || hasFinal || rawEntries.length > 0) && (
        // Low-frequency config summary + collapsed secondary details share one row.
        <div className="data-secondary" data-testid="data-secondary">
          {summary && (
            <p className="data-config-summary" data-testid="data-config-summary">
              {summary}
            </p>
          )}
          {hasFinal && (
            <details
              className="final-answer-panel"
              data-testid="final-answer-panel"
              open={finalOpen}
              onToggle={(e) => setFinalOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary>最终结果{atEnd ? '' : '（整轮运行的结论，非当前步）'}</summary>
              <div className="final-answer-body">{finalAnswer}</div>
            </details>
          )}
          {rawEntries.length > 0 && (
            <details className="data-raw-fields" data-testid="data-raw-fields">
              <summary>全部字段（{rawEntries.length}）</summary>
              <dl>
                {rawEntries.map(([k, v]) => (
                  <div key={k} className="data-raw-row" data-config={CONFIG_KEYS.has(k) ? '1' : undefined}>
                    <dt>
                      <code>{k}</code>
                      {friendlyLabel(k, graph) !== k ? <span className="muted"> {friendlyLabel(k, graph)}</span> : null}
                    </dt>
                    <dd>{serialize(v)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
