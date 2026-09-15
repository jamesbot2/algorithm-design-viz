import type { ReactNode } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useMotion } from '../../theme/MotionContext'

interface Props {
  title?: string
  inputSummary?: ReactNode
  viz: ReactNode
  code?: ReactNode
  /** Optional bottom transport slot (Visualizer usually embeds its own) */
  transport?: ReactNode
}

/**
 * Shared workbench shell: title | input summary | viz ~55% + code ~45% | bottom transport.
 * Desktop shows theme/motion/focus controls (not only mobile topbar).
 */
export default function WorkbenchLayout({
  title,
  inputSummary,
  viz,
  code,
  transport,
}: Props) {
  const { userPref, setUserPref, density, setDensity } = useMotion()

  return (
    <div className="workbench-layout" data-testid="workbench-layout">
      <div className="workbench-header">
        {title && <h2 className="workbench-title">{title}</h2>}
        {inputSummary && <div className="workbench-input-summary">{inputSummary}</div>}
        <span className="spacer" style={{ flex: 1 }} />
        <div className="workbench-desktop-controls" data-testid="workbench-desktop-controls">
          <label className="topbar-motion" title="主题（实验 Lab tokens）">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>
              主题
            </span>
            <select
              aria-label="主题"
              defaultValue="lab-dark"
              onChange={(e) => {
                document.documentElement.setAttribute('data-lab-theme', e.target.value)
              }}
            >
              <option value="lab-dark">Lab 深色</option>
              <option value="lab-light">Lab 浅色</option>
              <option value="legacy">经典</option>
            </select>
          </label>
          <label className="topbar-motion" title="动画模式">
            <span className="muted" style={{ fontSize: '0.72rem', marginRight: 4 }}>
              动效
            </span>
            <select
              aria-label="动画模式"
              value={userPref === null ? 'system' : userPref}
              onChange={(e) => {
                const v = e.target.value
                setUserPref(v === 'system' ? null : (v as 'standard' | 'reduced'))
              }}
            >
              <option value="system">跟随系统</option>
              <option value="standard">标准</option>
              <option value="reduced">减弱</option>
            </select>
          </label>
          <button
            type="button"
            className="ghost icon-btn"
            title={density === 'projection' ? '切换普通密度' : '投影友好密度'}
            aria-label="投影密度 / 焦点"
            onClick={() => setDensity(density === 'projection' ? 'normal' : 'projection')}
          >
            {density === 'projection' ? '密' : '焦'}
          </button>
        </div>
      </div>

      <Group orientation="horizontal" className="workbench-panels">
        <Panel defaultSize="55" minSize="30" className="workbench-viz-panel">
          {viz}
        </Panel>
        {code !== undefined && code !== null && (
          <>
            <Separator className="workbench-resize" data-panel-resize-handle="" />
            <Panel defaultSize="45" minSize="20" className="workbench-code-panel">
              {code}
            </Panel>
          </>
        )}
      </Group>

      {transport && <div className="workbench-transport">{transport}</div>}
    </div>
  )
}
