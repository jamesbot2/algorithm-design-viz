import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { segmentGeometry, type StageSegment } from '../../utils/teachableStages'

export interface PlaybackTransportProps {
  idx: number
  max: number
  stepsLen: number
  playing: boolean
  playPulse: boolean
  speed: number
  phase?: string
  progress: number
  /** Visual track segments (geometry already N-normalized preferred). */
  segments: (StageSegment & { leftPct?: number; widthPct?: number })[]
  /** Teachable stage jump targets (bounded). */
  teachableStages?: StageSegment[]
  /** Overflow stages for searchable list. */
  overflowStages?: StageSegment[]
  scrubPreview: number | null
  previewMessage?: string
  /** Playback chrome labels */
  playLabel?: string
  isPreview?: boolean
  atEnd?: boolean
  onReset: () => void
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  onSpeed: (speed: number) => void
  onSeek: (idx: number) => void
  onScrubPreview: (idx: number | null) => void
  style?: CSSProperties
}

function speedMultiplier(intervalMs: number): string {
  // Map interval 100..1500 → display multiplier relative to 600ms baseline
  const mult = 600 / Math.max(100, intervalMs)
  if (Math.abs(mult - 1) < 0.05) return '1×'
  if (mult >= 10) return `${Math.round(mult)}×`
  return `${Math.round(mult * 10) / 10}×`
}

function toggleIsVisible(btn: HTMLElement): boolean {
  const r = btn.getBoundingClientRect()
  if (r.width < 1 || r.height < 1) return false
  const st = getComputedStyle(btn)
  if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false
  // Off-screen entirely
  const vv = window.visualViewport
  const top = vv?.offsetTop ?? 0
  const left = vv?.offsetLeft ?? 0
  const w = vv?.width ?? window.innerWidth
  const h = vv?.height ?? window.innerHeight
  if (r.bottom < top || r.top > top + h || r.right < left || r.left > left + w) return false
  return true
}

type PanelPos =
  | { mode: 'anchor'; left: number; bottom: number; width: number; maxHeight: number }
  | { mode: 'sheet'; left: number; top: number; width: number; maxHeight: number }

/** Unified play/pause/prev/next/scrub/speed chrome for Workbench transport. */
export default function PlaybackTransport({
  idx,
  max,
  stepsLen,
  playing,
  playPulse,
  speed,
  phase,
  progress,
  segments,
  teachableStages,
  overflowStages = [],
  scrubPreview,
  previewMessage,
  playLabel,
  isPreview = false,
  atEnd = false,
  onReset,
  onPrev,
  onNext,
  onTogglePlay,
  onSpeed,
  onSeek,
  onScrubPreview,
  style,
}: PlaybackTransportProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsToggleRef = useRef<HTMLButtonElement>(null)
  const [settingsPos, setSettingsPos] = useState<PanelPos | null>(null)

  useLayoutEffect(() => {
    if (!settingsOpen) return
    const place = () => {
      const btn = settingsToggleRef.current
      const vv = window.visualViewport
      const vw = vv?.width ?? window.innerWidth
      const vh = vv?.height ?? window.innerHeight
      const vLeft = vv?.offsetLeft ?? 0
      const vTop = vv?.offsetTop ?? 0

      // Zero-rect / hidden toggle (e.g. 844→1280 dock hides): close + restore focus
      if (!btn || !toggleIsVisible(btn)) {
        setSettingsOpen(false)
        return
      }

      const r = btn.getBoundingClientRect()
      const width = Math.min(420, Math.max(280, vw - 16))
      const panelEl = settingsRef.current
      const panelH = Math.min(panelEl?.offsetHeight || 280, Math.min(vh * 0.7, 360))
      let left = Math.max(vLeft + 8, Math.min(r.left, vLeft + vw - width - 8))
      // Prefer above the toggle
      let bottom = Math.max(8, window.innerHeight - r.top + 8)
      // If that would push the panel above the visual viewport, clamp / use sheet
      const topIfBottom = window.innerHeight - bottom - panelH
      if (topIfBottom < vTop + 8 || bottom + panelH > vh) {
        // Centered sheet within visualViewport
        const sheetW = Math.min(width, vw - 16)
        const sheetH = Math.min(panelH, vh - 24)
        setSettingsPos({
          mode: 'sheet',
          left: vLeft + (vw - sheetW) / 2,
          top: vTop + Math.max(12, (vh - sheetH) / 2),
          width: sheetW,
          maxHeight: sheetH,
        })
        return
      }
      setSettingsPos({ mode: 'anchor', left, bottom, width, maxHeight: Math.min(vh * 0.7, 360) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', place)
    vv?.addEventListener('scroll', place)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      vv?.removeEventListener('resize', place)
      vv?.removeEventListener('scroll', place)
    }
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const panel = settingsRef.current
    const toggleBtn = settingsToggleRef.current
    const prev = document.activeElement as HTMLElement | null
    panel?.querySelector<HTMLElement>('input,button,select,[href]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      // Prefer toggle if still visible; else previous focus
      if (toggleBtn && toggleIsVisible(toggleBtn)) toggleBtn.focus()
      else prev?.focus?.()
    }
  }, [settingsOpen])

  const n = stepsLen
  const jumps = teachableStages ?? segments.filter((s) => s.kind !== 'event')
  const primaryLabel =
    playLabel ??
    (isPreview
      ? '请先运行'
      : playing
        ? '暂停'
        : atEnd
          ? '重新播放'
          : idx > 0
            ? '继续'
            : '开始演示')

  const overflowSelect = (testId: string) =>
    moreOpen && overflowStages.length > 0 ? (
      <div className="phase-jump-overflow" data-testid={testId}>
        <label className="muted">
          跳到阶段
          <select
            aria-label="更多阶段"
            data-testid={testId === 'phase-jump-overflow-dock' ? 'overflow-stages-select-dock' : 'overflow-stages-select'}
            defaultValue=""
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isNaN(v)) onSeek(v)
            }}
          >
            <option value="" disabled>
              选择…
            </option>
            {overflowStages.map((s) => (
              <option key={`ov-${s.start}-${testId}`} value={s.start}>
                {s.label} (#{s.start + 1}–#{s.end + 1})
              </option>
            ))}
          </select>
        </label>
      </div>
    ) : null

  const panelStyle: CSSProperties | undefined = settingsPos
    ? settingsPos.mode === 'anchor'
      ? {
          left: settingsPos.left,
          bottom: settingsPos.bottom,
          top: 'auto',
          width: settingsPos.width,
          right: 'auto',
          maxHeight: settingsPos.maxHeight,
        }
      : {
          left: settingsPos.left,
          top: settingsPos.top,
          bottom: 'auto',
          width: settingsPos.width,
          right: 'auto',
          maxHeight: settingsPos.maxHeight,
        }
    : undefined

  return (
    <div className="playback-transport" data-testid="playback-transport" style={style}>
      <div className="viz-toolbar workbench-transport-toolbar">
        <button type="button" onClick={onReset} title="重置播放（回到起点并暂停）" data-testid="reset-playback-btn">
          重置播放
        </button>
        <button type="button" onClick={onPrev} disabled={idx <= 0 || isPreview} title="上一步 (←)">
          上一步
        </button>
        <button
          type="button"
          className={`primary play-btn tactile${playing ? ' is-playing' : ''}${playPulse ? ' pulse' : ''}`}
          onClick={onTogglePlay}
          title={primaryLabel}
          data-testid="play-btn"
          disabled={isPreview && stepsLen <= 1}
        >
          {primaryLabel}
        </button>
        <button type="button" onClick={onNext} disabled={idx >= max || isPreview} title="下一步 (→)">
          下一步
        </button>
        <label className="speed-label">
          速度 {speedMultiplier(speed)}
          <input
            type="range"
            min={100}
            max={1500}
            step={50}
            value={1600 - speed}
            onChange={(e) => onSpeed(1600 - Number(e.target.value))}
            aria-label="播放速度"
          />
        </label>
        <button
          type="button"
          className="ghost playback-settings-dock"
          data-testid="playback-settings-toggle"
          aria-expanded={settingsOpen}
          aria-controls="playback-settings-panel"
          ref={settingsToggleRef}
          onClick={() => setSettingsOpen((o) => !o)}
        >
          播放设置
        </button>
        <span className="spacer" />
        <span className="step-counter tabular-nums" data-testid="step-counter">
          {stepsLen ? `${idx + 1} / ${stepsLen}` : '— / —'}
          {phase ? ` · ${phase}` : ''}
        </span>
      </div>

      <div className="scrub-row">
        <span className="scrub-label">进度</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, max)}
          step={1}
          value={stepsLen ? idx : 0}
          disabled={!stepsLen || isPreview}
          onChange={(e) => {
            onSeek(Number(e.target.value))
            onScrubPreview(null)
          }}
          onInput={(e) => onScrubPreview(Number((e.target as HTMLInputElement).value))}
          onMouseUp={() => onScrubPreview(null)}
          onTouchEnd={() => onScrubPreview(null)}
          onPointerUp={() => onScrubPreview(null)}
          onPointerCancel={() => onScrubPreview(null)}
          aria-label="步骤进度"
          role="slider"
        />
        <span className="scrub-pct tabular-nums">{Math.round(progress)}%</span>
      </div>

      {segments.length > 0 && n > 0 && (
        <div className="phase-track" data-testid="phase-track" aria-hidden="true">
          {segments.map((seg) => {
            const g =
              seg.leftPct != null && seg.widthPct != null
                ? { leftPct: seg.leftPct, widthPct: seg.widthPct }
                : segmentGeometry(seg.start, seg.end, n)
            return (
              <span
                key={`seg-${seg.phase}-${seg.start}`}
                className="phase-segment"
                style={{ left: `${g.leftPct}%`, width: `${g.widthPct}%` }}
                data-phase={seg.phase}
                title={`${seg.label ?? seg.phase} (#${seg.start + 1}–${seg.end + 1})`}
              />
            )
          })}
        </div>
      )}

      {scrubPreview !== null && scrubPreview !== idx && previewMessage && (
        <div className="scrub-preview scrub-preview-overlay" data-testid="scrub-preview">
          预览 #{scrubPreview + 1}：{previewMessage}
        </div>
      )}

      {jumps.length > 0 && (
        <div className="phase-jump" data-testid="phase-jump">
          <span className="muted">阶段跳转：</span>
          {jumps.map((seg) =>
            seg.phase === 'more' ? (
              <button
                key={`btn-more-${seg.start}`}
                type="button"
                className={moreOpen ? 'active' : ''}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
              >
                {seg.label}
              </button>
            ) : (
              <button
                key={`btn-${seg.phase}-${seg.start}-${seg.label}`}
                type="button"
                className={idx >= seg.start && idx <= seg.end ? 'active' : ''}
                title={`${seg.label}（#${seg.start + 1}–${seg.end + 1}）`}
                onClick={() => onSeek(seg.start)}
              >
                {seg.label}
              </button>
            ),
          )}
          {overflowSelect('phase-jump-overflow')}
        </div>
      )}

      {settingsOpen &&
        createPortal(
          <div
            id="playback-settings-panel"
            className="playback-settings-panel"
            data-testid="playback-settings-panel"
            data-portaled="1"
            data-placement={settingsPos?.mode ?? 'pending'}
            role="dialog"
            aria-label="播放设置"
            aria-modal="true"
            ref={settingsRef}
            style={panelStyle}
          >
            <div className="playback-settings-head">
              <strong>播放设置</strong>
              <button
                type="button"
                className="ghost"
                data-testid="playback-settings-close"
                aria-label="关闭设置"
                onClick={() => setSettingsOpen(false)}
              >
                关闭
              </button>
            </div>
            <label className="speed-label">
              速度 {speedMultiplier(speed)}
              <input
                type="range"
                min={100}
                max={1500}
                step={50}
                value={1600 - speed}
                onChange={(e) => onSpeed(1600 - Number(e.target.value))}
                aria-label="播放速度（设置面板）"
              />
            </label>
            {segments.length > 0 && n > 0 && (
              <div className="phase-track" data-testid="phase-track-dock" aria-hidden="true">
                {segments.map((seg) => {
                  const g =
                    seg.leftPct != null && seg.widthPct != null
                      ? { leftPct: seg.leftPct, widthPct: seg.widthPct }
                      : segmentGeometry(seg.start, seg.end, n)
                  return (
                    <span
                      key={`dock-seg-${seg.phase}-${seg.start}`}
                      className="phase-segment"
                      style={{ left: `${g.leftPct}%`, width: `${g.widthPct}%` }}
                      data-phase={seg.phase}
                      title={`${seg.label ?? seg.phase} (#${seg.start + 1}–${seg.end + 1})`}
                    />
                  )
                })}
              </div>
            )}
            {jumps.length > 0 && (
              <div className="phase-jump" data-testid="phase-jump-dock">
                <span className="muted">阶段跳转：</span>
                {jumps.map((seg) =>
                  seg.phase === 'more' ? (
                    <button
                      key={`dock-more-${seg.start}`}
                      type="button"
                      className={moreOpen ? 'active' : ''}
                      aria-expanded={moreOpen}
                      data-testid="phase-more-dock"
                      onClick={() => setMoreOpen((o) => !o)}
                    >
                      {seg.label}
                    </button>
                  ) : (
                    <button
                      key={`dock-btn-${seg.phase}-${seg.start}-${seg.label}`}
                      type="button"
                      className={idx >= seg.start && idx <= seg.end ? 'active' : ''}
                      title={`${seg.label}（#${seg.start + 1}–${seg.end + 1}）`}
                      onClick={() => onSeek(seg.start)}
                    >
                      {seg.label}
                    </button>
                  ),
                )}
                {overflowSelect('phase-jump-overflow-dock')}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
