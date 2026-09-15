import type { CSSProperties } from 'react'

export interface PlaybackTransportProps {
  idx: number
  max: number
  stepsLen: number
  playing: boolean
  playPulse: boolean
  speed: number
  phase?: string
  progress: number
  segments: { start: number; end: number; phase: string }[]
  scrubPreview: number | null
  previewMessage?: string
  onReset: () => void
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  onSpeed: (speed: number) => void
  onSeek: (idx: number) => void
  onScrubPreview: (idx: number | null) => void
  style?: CSSProperties
}

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
  scrubPreview,
  previewMessage,
  onReset,
  onPrev,
  onNext,
  onTogglePlay,
  onSpeed,
  onSeek,
  onScrubPreview,
  style,
}: PlaybackTransportProps) {
  return (
    <div className="playback-transport" data-testid="playback-transport" style={style}>
      <div className="viz-toolbar workbench-transport-toolbar">
        <button type="button" onClick={onReset} title="重置">
          重置
        </button>
        <button type="button" onClick={onPrev} disabled={idx <= 0} title="上一步 (←)">
          上一步
        </button>
        <button
          type="button"
          className={`primary play-btn tactile${playing ? ' is-playing' : ''}${playPulse ? ' pulse' : ''}`}
          onClick={onTogglePlay}
          title="播放/暂停 (空格)"
          data-testid="play-btn"
        >
          {playing ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={onNext} disabled={idx >= max} title="下一步 (→)">
          下一步
        </button>
        <label className="speed-label">
          速度
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
          disabled={!stepsLen}
          onChange={(e) => {
            onSeek(Number(e.target.value))
            onScrubPreview(null)
          }}
          onInput={(e) => onScrubPreview(Number((e.target as HTMLInputElement).value))}
          onMouseUp={() => onScrubPreview(null)}
          onTouchEnd={() => onScrubPreview(null)}
          aria-label="步骤进度"
          role="slider"
        />
        <span className="scrub-pct tabular-nums">{Math.round(progress)}%</span>
      </div>

      {segments.length > 0 && (
        <div className="phase-track" aria-hidden>
          {segments.map((seg) => {
            const left = max === 0 ? 0 : (seg.start / max) * 100
            const width = max === 0 ? 100 : ((seg.end - seg.start + 1) / max) * 100
            return (
              <button
                key={`${seg.phase}-${seg.start}`}
                type="button"
                className="phase-segment"
                style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                data-phase={seg.phase}
                title={`${seg.phase} (#${seg.start + 1}–${seg.end + 1})`}
                onClick={() => onSeek(seg.start)}
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

      {segments.length > 0 && (
        <div className="phase-jump">
          <span className="muted">阶段跳转：</span>
          {segments.map((seg) => (
            <button
              key={`btn-${seg.phase}-${seg.start}`}
              type="button"
              className={idx >= seg.start && idx <= seg.end ? 'active' : ''}
              onClick={() => onSeek(seg.start)}
            >
              {seg.phase}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
