import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

interface Props {
  title?: string
  inputSummary?: ReactNode
  viz: ReactNode
  code?: ReactNode
  inspector?: ReactNode
  /** Unified transport spanning both panels (play/pause/scrub + optional inspector strip) */
  transport?: ReactNode
  /** Hide duplicate title when page header already shows it */
  hideTitle?: boolean
}

type LayoutMode = 'split' | 'tabs'
type TabId = 'demo' | 'code' | 'inspector'

const NARROW_PX = 720

/**
 * Shared workbench shell. Layout mode from container width (ResizeObserver),
 * not window.innerWidth alone — accounts for sidebar + zoom.
 */
export default function WorkbenchLayout({
  title,
  inputSummary,
  viz,
  code,
  inspector,
  transport,
  hideTitle = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<LayoutMode>('split')
  const [tab, setTab] = useState<TabId>('demo')

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth
      setMode(w < NARROW_PX ? 'tabs' : 'split')
    })
    ro.observe(el)
    setMode(el.clientWidth < NARROW_PX ? 'tabs' : 'split')
    return () => ro.disconnect()
  }, [])

  const hasCode = code !== undefined && code !== null

  return (
    <div
      className="workbench-layout"
      data-testid="workbench-layout"
      data-layout={mode}
      ref={rootRef}
    >
      <div className="workbench-header">
        {!hideTitle && title && <h2 className="workbench-title">{title}</h2>}
        {inputSummary && <div className="workbench-input-summary">{inputSummary}</div>}
      </div>

      {mode === 'tabs' && (
        <div className="workbench-tabs" role="tablist" aria-label="工作台视图">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'demo'}
            className={tab === 'demo' ? 'active' : ''}
            onClick={() => setTab('demo')}
          >
            演示
          </button>
          {hasCode && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'code'}
              className={tab === 'code' ? 'active' : ''}
              onClick={() => setTab('code')}
            >
              代码
            </button>
          )}
          {inspector != null && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'inspector'}
              className={tab === 'inspector' ? 'active' : ''}
              onClick={() => setTab('inspector')}
            >
              检查器
            </button>
          )}
        </div>
      )}

      {mode === 'split' ? (
        <Group orientation="horizontal" className="workbench-panels">
          <Panel defaultSize="55" minSize="30" className="workbench-viz-panel">
            <div className="workbench-panel-inner">{viz}</div>
          </Panel>
          {hasCode && (
            <>
              <Separator className="workbench-resize" data-panel-resize-handle="" />
              <Panel defaultSize="45" minSize="20" className="workbench-code-panel">
                <div className="workbench-panel-inner workbench-code-inner">{code}</div>
              </Panel>
            </>
          )}
        </Group>
      ) : (
        <div className="workbench-tab-panels">
          {tab === 'demo' && (
            <div className="workbench-tab-panel" role="tabpanel">
              {viz}
            </div>
          )}
          {tab === 'code' && hasCode && (
            <div className="workbench-tab-panel" role="tabpanel">
              {code}
            </div>
          )}
          {tab === 'inspector' && inspector != null && (
            <div className="workbench-tab-panel" role="tabpanel">
              {inspector}
            </div>
          )}
        </div>
      )}

      {transport && (
        <div className="workbench-transport" data-testid="workbench-transport-slot">
          {transport}
        </div>
      )}
    </div>
  )
}
