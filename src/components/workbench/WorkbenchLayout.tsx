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
type HeightMode = 'fill' | 'scroll'

const NARROW_PX = 720
/** Absolute readable mins — not only percentage floors */
const MIN_VIZ_PX = 180
const MIN_CODE_PX = 160

/**
 * Shared workbench shell.
 * Layout mode from container width (ResizeObserver) — NOT a dual React tree.
 * Split and tabs share one stable panel tree so crossing 720px does not remount
 * Visualizer / CodeBrowser session state (runId, cursor, play, speed, font, follow).
 *
 * Height budget comes from measured available space (contentRect), not a fixed 14rem guess.
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
  const [heightMode, setHeightMode] = useState<HeightMode>('fill')
  const [budget, setBudget] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      const w = cr?.width ?? el.clientWidth
      const h = cr?.height ?? el.clientHeight
      setMode(w < NARROW_PX ? 'tabs' : 'split')
      setBudget({ w, h })
      // When measured height cannot host viz min + transport chrome, allow natural scroll escape
      const need = MIN_VIZ_PX + 120
      setHeightMode(h > 0 && h < need ? 'scroll' : 'fill')
      el.style.setProperty('--wb-measured-h', `${Math.max(0, h)}px`)
      el.style.setProperty('--wb-measured-w', `${Math.max(0, w)}px`)
    })
    ro.observe(el)
    const initial = el.clientWidth
    if (initial > 0) setMode(initial < NARROW_PX ? 'tabs' : 'split')
    return () => ro.disconnect()
  }, [])

  const hasCode = code !== undefined && code !== null
  const hasInspector = inspector !== undefined && inspector !== null

  const vizActive = mode === 'split' || tab === 'demo'
  const codeActive = mode === 'split' || tab === 'code'
  const inspectorActive = mode === 'split' || tab === 'inspector'

  // Convert absolute px mins to % for the panel library when we know width
  const vizMinPct =
    budget.w > 0 ? Math.min(40, Math.max(15, (MIN_VIZ_PX / budget.w) * 100)) : 20
  const codeMinPct =
    budget.w > 0 ? Math.min(35, Math.max(12, (MIN_CODE_PX / budget.w) * 100)) : 15

  const panels = (
    <Group
      orientation="horizontal"
      className="workbench-panels workbench-panels-stable"
      data-testid="workbench-panels"
    >
      <Panel
        defaultSize={hasCode ? '55' : '100'}
        minSize={String(Math.round(vizMinPct))}
        className="workbench-viz-panel"
        data-tab-active={vizActive ? '1' : '0'}
        style={{ minWidth: mode === 'split' ? MIN_VIZ_PX : undefined }}
      >
        {/* Keep mounted; hide only via attribute/CSS — never unmount on layout switch */}
        <div
          className="workbench-panel-inner"
          hidden={mode === 'tabs' && !vizActive}
          data-testid="workbench-viz-slot"
          data-scroll-owner="viz"
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
            minSize={String(Math.round(codeMinPct))}
            className="workbench-code-panel"
            data-tab-active={codeActive ? '1' : '0'}
            style={{ minWidth: mode === 'split' ? MIN_CODE_PX : undefined }}
          >
            <div
              className="workbench-panel-inner workbench-code-inner"
              hidden={mode === 'tabs' && !codeActive}
              data-testid="workbench-code-slot"
              data-scroll-owner="code"
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
              data-scroll-owner="inspector"
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
      data-height-mode={heightMode}
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
