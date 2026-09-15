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
 * Shared workbench shell.
 * Layout mode from container width (ResizeObserver) — NOT a dual React tree.
 * Split and tabs share one stable panel tree so crossing 720px does not remount
 * Visualizer / CodeBrowser session state (runId, cursor, play, speed, font, follow).
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
    // Avoid 0-width first paint (tests / hidden) forcing tabs then remounting mental model
    const initial = el.clientWidth
    if (initial > 0) setMode(initial < NARROW_PX ? 'tabs' : 'split')
    return () => ro.disconnect()
  }, [])

  const hasCode = code !== undefined && code !== null
  const hasInspector = inspector !== undefined && inspector !== null

  const vizActive = mode === 'split' || tab === 'demo'
  const codeActive = mode === 'split' || tab === 'code'
  const inspectorActive = mode === 'split' || tab === 'inspector'

  const panels = (
    <Group
      orientation="horizontal"
      className="workbench-panels workbench-panels-stable"
      data-testid="workbench-panels"
    >
      <Panel
        defaultSize={hasCode ? '55' : '100'}
        minSize="20"
        className="workbench-viz-panel"
        data-tab-active={vizActive ? '1' : '0'}
      >
        {/* Keep mounted; hide only via attribute/CSS — never unmount on layout switch */}
        <div
          className="workbench-panel-inner"
          hidden={mode === 'tabs' && !vizActive}
          data-testid="workbench-viz-slot"
        >
          {viz}
        </div>
      </Panel>
      {hasCode && (
        <>
          <Separator
            className="workbench-resize"
            data-panel-resize-handle=""
            style={mode === 'tabs' ? { display: 'none' } : undefined}
          />
          <Panel
            defaultSize="45"
            minSize="15"
            className="workbench-code-panel"
            data-tab-active={codeActive ? '1' : '0'}
          >
            <div
              className="workbench-panel-inner workbench-code-inner"
              hidden={mode === 'tabs' && !codeActive}
              data-testid="workbench-code-slot"
            >
              {code}
            </div>
          </Panel>
        </>
      )}
      {hasInspector && (
        <>
          <Separator
            className="workbench-resize"
            data-panel-resize-handle=""
            style={mode === 'tabs' ? { display: 'none' } : undefined}
          />
          <Panel
            defaultSize="30"
            minSize="10"
            className="workbench-inspector-panel"
            data-tab-active={inspectorActive ? '1' : '0'}
          >
            <div
              className="workbench-panel-inner"
              hidden={mode === 'tabs' && !inspectorActive}
              data-testid="workbench-inspector-slot"
            >
              {inspector}
            </div>
          </Panel>
        </>
      )}
    </Group>
  )

  return (
    <div
      className="workbench-layout"
      data-testid="workbench-layout"
      data-layout={mode}
      data-tab={tab}
      ref={rootRef}
    >
      <div className="workbench-header">
        {!hideTitle && title && <h2 className="workbench-title">{title}</h2>}
        {inputSummary && <div className="workbench-input-summary">{inputSummary}</div>}
      </div>

      <div
        className="workbench-tabs"
        role="tablist"
        aria-label="工作台视图"
        hidden={mode !== 'tabs'}
      >
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
        {hasInspector && (
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

      {panels}

      {transport && (
        <div className="workbench-transport" data-testid="workbench-transport-slot">
          {transport}
        </div>
      )}
    </div>
  )
}
