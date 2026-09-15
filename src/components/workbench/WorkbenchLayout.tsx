import type { ReactNode } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

interface Props {
  title?: string
  inputSummary?: ReactNode
  viz: ReactNode
  code?: ReactNode
  /** Unified transport spanning both panels (play/pause/scrub + optional inspector strip) */
  transport?: ReactNode
  /** Hide duplicate title when page header already shows it */
  hideTitle?: boolean
}

/**
 * Shared workbench shell: summary | viz ~55% + code ~45% | transport spanning both.
 * Theme/motion controls live in Layout topbar only (single primary entry).
 * Height chain uses min-height:0 so CodeMirror gets real height.
 * Stable: callers must NOT key this on cursor/step.id.
 */
export default function WorkbenchLayout({
  title,
  inputSummary,
  viz,
  code,
  transport,
  hideTitle = false,
}: Props) {
  return (
    <div className="workbench-layout" data-testid="workbench-layout">
      <div className="workbench-header">
        {!hideTitle && title && <h2 className="workbench-title">{title}</h2>}
        {inputSummary && <div className="workbench-input-summary">{inputSummary}</div>}
      </div>

      <Group orientation="horizontal" className="workbench-panels">
        <Panel defaultSize="55" minSize="30" className="workbench-viz-panel">
          <div className="workbench-panel-inner">{viz}</div>
        </Panel>
        {code !== undefined && code !== null && (
          <>
            <Separator className="workbench-resize" data-panel-resize-handle="" />
            <Panel defaultSize="45" minSize="20" className="workbench-code-panel">
              <div className="workbench-panel-inner workbench-code-inner">{code}</div>
            </Panel>
          </>
        )}
      </Group>

      {transport && (
        <div className="workbench-transport" data-testid="workbench-transport-slot">
          {transport}
        </div>
      )}
    </div>
  )
}
