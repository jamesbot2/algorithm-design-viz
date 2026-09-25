import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useWorkspaceBudget } from './WorkspaceBudget'
import { DataProbeContext } from '../data/dataProbe'
import {
  MIN_CODE_W,
  clamp,
  resolveCodeWidth,
  resolveDockedDataHeight,
  resolveLayoutMode,
  resolveWideDataWidth,
  type ActiveView,
  type LayoutMode,
  type WorkbenchLayoutPrefs,
} from './layoutModel'

interface Props {
  /** Demo column: step text + main scene (Visualizer). */
  scene: ReactNode
  /** Current-step data (CurrentStepData) — a real sibling region, never a portal. */
  data?: ReactNode
  /** Code browser (the ONE CodeMirror instance). */
  code?: ReactNode
  /** The ONE shared transport. */
  transport?: ReactNode
  /** Page-owned layout intent (single source). */
  prefs: WorkbenchLayoutPrefs
  onPrefsChange: (patch: Partial<WorkbenchLayoutPrefs>) => void
  /**
   * Invisible measuring copies of the data presentation for the run's largest
   * frames (rendered under DataProbeContext). The data region is calibrated from
   * them once per run, so playback never resizes the scene.
   */
  dataProbes?: ReactNode[]
  /** Resets content-calibrated data height (new run). */
  runKey?: string | number
  /** 'viewport' = lab page fills the scroll viewport; 'section' = inside a document page. */
  fill?: 'viewport' | 'section'
  /** Reports the resolved mode to the page (for summaries / tests). */
  onModeChange?: (mode: LayoutMode) => void
}

const GUTTER = 8
const SCENE_MIN_H = 240
/** Demo region height that gives a ~300px graph plot (banner + plot + padding). */
const SCENE_PREFERRED_H = 392
const VIEW_LABEL: Record<ActiveView, string> = { demo: '演示', data: '数据', code: '代码' }

/**
 * V23 learning workbench: ONE stable component tree laid out by CSS grid.
 *
 *   docked (desktop):  [ step text + scene ] | [ code ]
 *                      [ current data      ] | [ code ]
 *                      [ transport ─────────────────── ]
 *   wide:              [ scene | data | code ] + transport
 *   tabbed (narrow / low height): tabs 演示 / 数据 / 代码 + transport
 *
 * Mode comes from the real container budget (ResizeObserver) + the shell's
 * measured viewport height. Switching modes only changes grid placement and
 * `hidden`; children never remount, so cursor/runId/speed/reading state survive.
 */
export default function WorkbenchLayout({
  scene,
  data,
  code,
  transport,
  prefs,
  onPrefsChange,
  dataProbes,
  runKey,
  fill = 'viewport',
  onModeChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dataContentRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const { viewportHeight } = useWorkspaceBudget()
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [dataContentH, setDataContentH] = useState(0)
  const transportRef = useRef<HTMLDivElement>(null)
  const [transportH, setTransportH] = useState(56)
  useLayoutEffect(() => {
    const el = transportRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const read = () => setTransportH(el.offsetHeight || 56)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const read = () => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }))
    read()
    if (typeof ResizeObserver === 'undefined') return
    // Budget = the observed contentRect of the real grid container (not window.innerWidth).
    const ro = new ResizeObserver((entries) => {
      const cr = entries.find((e) => e.target === el)?.contentRect
      if (cr && cr.width > 0) {
        const w = Math.round(cr.width)
        const h = Math.round(cr.height)
        setBox((b) => (b.w === w && b.h === h ? b : { w, h }))
      } else read()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Content-calibrated data height: monotonic within a run so stepping never
  // makes the scene (and graph camera) jitter; resets on a new run.
  useEffect(() => {
    setDataContentH(0)
  }, [runKey])
  useLayoutEffect(() => {
    const el = dataContentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const probeHost = probeRef.current
    const read = () => {
      // The final-result block (auto-opened at the last frame, or opened by the
      // user) never drives the region height: it opens in place and the data body
      // (the single data scroller) scrolls, so playback never resizes the scene.
      const fin = el.querySelector<HTMLElement>('.final-answer-panel[open]')
      let h = el.scrollHeight
      const row = fin?.parentElement
      if (fin && row) {
        // Height the secondary row would have with the final block closed.
        let closed = fin.querySelector<HTMLElement>('summary')?.offsetHeight ?? 0
        for (const c of Array.from(row.children)) if (c !== fin) closed = Math.max(closed, (c as HTMLElement).offsetHeight)
        h -= Math.max(0, row.offsetHeight - closed)
      }
      if (probeHost) for (const p of Array.from(probeHost.children)) h = Math.max(h, (p as HTMLElement).scrollHeight)
      setDataContentH((prev) => (h > prev ? h : prev))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    if (probeHost) for (const p of Array.from(probeHost.querySelectorAll('.wb-data-probe-item > *'))) ro.observe(p)
    return () => ro.disconnect()
  }, [runKey, dataProbes?.length])

  const hasCode = code !== undefined && code !== null
  const hasData = data !== undefined && data !== null
  const mode: LayoutMode = resolveLayoutMode({ width: box.w, viewportHeight: fill === 'viewport' ? viewportHeight : 0 })

  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])

  const codeW = hasCode && mode !== 'tabbed' ? resolveCodeWidth(mode, box.w, prefs.codeWidthPx) : 0
  const wideDataW = mode === 'wide' && hasData ? resolveWideDataWidth(box.w, codeW, prefs.dataSizePx) : 0
  const DATA_HEAD_H = 30
  // Column height available to scene+data in docked mode (transport row excluded).
  const columnH = Math.max(0, box.h - transportH - 16)
  const dockedDataH =
    mode === 'docked' && hasData && prefs.dataVisible
      ? resolveDockedDataHeight({
          columnHeight: columnH,
          contentHeight: dataContentH + DATA_HEAD_H + 4,
          pref: prefs.dataSizePx,
          sceneMin: SCENE_PREFERRED_H,
        })
      : 0

  const lowTabs = mode === 'tabbed' && viewportHeight > 0 && viewportHeight < 560 && box.w >= 640
  const grid = useMemo(() => {
    const t = (rows: string[]) => rows.map((r) => `"${r}"`).join(' ')
    if (mode === 'tabbed') {
      // Short landscape: tabs share the transport row so the scene keeps the height.
      if (lowTabs) {
        return {
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          gridTemplateAreas: t(['view view', 'tabs transport']),
        }
      }
      return {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        gridTemplateAreas: t(['tabs', 'view', 'transport']),
      }
    }
    if (mode === 'wide' && hasData) {
      // Collapsed data keeps its own narrow column (header strip) so the scene only
      // gains width — collapsing never costs the graph height.
      return {
        gridTemplateColumns: `minmax(0, 1fr) ${GUTTER}px ${prefs.dataVisible ? `${wideDataW}px` : 'auto'} ${GUTTER}px ${codeW}px`,
        gridTemplateRows: 'minmax(0, 1fr) auto',
        gridTemplateAreas: t([
          'demo split-a data split-b code',
          'transport transport transport transport transport',
        ]),
      }
    }
    const cols = hasCode ? `minmax(0, 1fr) ${GUTTER}px ${codeW}px` : 'minmax(0, 1fr)'
    const row = (a: string) => (hasCode ? `${a} split-b code` : a)
    const full = (a: string) => (hasCode ? `${a} ${a} ${a}` : a)
    if (!hasData) {
      return { gridTemplateColumns: cols, gridTemplateRows: 'minmax(0, 1fr) auto', gridTemplateAreas: t([row('demo'), full('transport')]) }
    }
    return {
      gridTemplateColumns: cols,
      gridTemplateRows: prefs.dataVisible
        ? `minmax(${SCENE_MIN_H}px, 1fr) ${GUTTER}px ${dockedDataH}px auto`
        : `minmax(${SCENE_MIN_H}px, 1fr) 0px auto auto`,
      gridTemplateAreas: t([row('demo'), row('split-a'), row('data'), full('transport')]),
    }
  }, [mode, lowTabs, hasCode, hasData, prefs.dataVisible, codeW, wideDataW, dockedDataH])

  // Low-height landscape stays ONE locked screen (transport always reachable);
  // the scene gets its room from compact chrome (layout.css, max-height: 560px)
  // and from tabs sharing the transport row, not from page scrolling.
  const minH =
    mode === 'tabbed'
      ? viewportHeight > 0 && viewportHeight < 560
        ? 240
        : 420
      : mode === 'wide'
        ? 480
        : 490

  const style = {
    ...grid,
    '--wb-min-h': `${minH}px`,
    '--wb-code-w': `${codeW}px`,
  } as CSSProperties

  // ---- split drags (pointer + keyboard). Only write page-owned prefs. ----
  const dragRef = useRef<{ kind: 'code' | 'data' | 'wide-data'; start: number; base: number } | null>(null)
  const onSplitDown = (kind: 'code' | 'data' | 'wide-data') => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const base = kind === 'code' ? codeW : kind === 'data' ? dockedDataH : wideDataW
    dragRef.current = { kind, start: kind === 'data' ? e.clientY : e.clientX, base }
  }
  const applyDrag = useCallback(
    (kind: 'code' | 'data' | 'wide-data', value: number) => {
      if (kind === 'code') onPrefsChange({ codeWidthPx: clamp(Math.round(value), MIN_CODE_W, Math.max(MIN_CODE_W, box.w - 440)) })
      else if (kind === 'data') onPrefsChange({ dataSizePx: clamp(Math.round(value), 96, Math.max(96, columnH - SCENE_MIN_H)) })
      else onPrefsChange({ dataSizePx: clamp(Math.round(value), 260, Math.max(260, box.w - codeW - 440)) })
    },
    [onPrefsChange, box.w, columnH, codeW],
  )
  const onSplitMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    if (d.kind === 'data') applyDrag('data', d.base - (e.clientY - d.start))
    else applyDrag(d.kind, d.base - (e.clientX - d.start))
  }
  const onSplitUp = () => {
    dragRef.current = null
  }
  const onSplitKey = (kind: 'code' | 'data' | 'wide-data') => (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16
    const base = kind === 'code' ? codeW : kind === 'data' ? dockedDataH : wideDataW
    const grow = kind === 'data' ? ['ArrowUp'] : ['ArrowLeft']
    const shrink = kind === 'data' ? ['ArrowDown'] : ['ArrowRight']
    if (grow.includes(e.key)) {
      e.preventDefault()
      e.stopPropagation()
      applyDrag(kind, base + step)
    } else if (shrink.includes(e.key)) {
      e.preventDefault()
      e.stopPropagation()
      applyDrag(kind, base - step)
    }
  }
  const split = (kind: 'code' | 'data' | 'wide-data', area: string, label: string, value: number, orientation: 'vertical' | 'horizontal') => (
    <div
      className={`wb-split wb-split-${orientation}`}
      style={{ gridArea: area }}
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      data-testid={`workbench-split-${kind}`}
      onPointerDown={onSplitDown(kind)}
      onPointerMove={onSplitMove}
      onPointerUp={onSplitUp}
      onPointerCancel={onSplitUp}
      onKeyDown={onSplitKey(kind)}
    />
  )

  const tabbed = mode === 'tabbed'
  const views: ActiveView[] = ['demo', ...(hasData ? (['data'] as const) : []), ...(hasCode ? (['code'] as const) : [])]
  const active: ActiveView = views.includes(prefs.activeView) ? prefs.activeView : 'demo'
  const tabRefs = useRef<Partial<Record<ActiveView, HTMLButtonElement | null>>>({})
  const onTabKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    e.stopPropagation()
    const i = views.indexOf(active)
    const next = views[(i + (e.key === 'ArrowRight' ? 1 : views.length - 1)) % views.length]
    onPrefsChange({ activeView: next })
    tabRefs.current[next]?.focus()
  }

  return (
    <div
      className="workbench-layout"
      data-testid="workbench-layout"
      data-layout-mode={mode}
      data-layout={tabbed ? 'tabs' : 'split'}
      data-active-view={active}
      data-data-visible={hasData && (tabbed ? active === 'data' : prefs.dataVisible) ? '1' : '0'}
      data-fill={fill}
      data-transport={!tabbed && box.h >= 700 ? 'roomy' : 'compact'}
      data-low-tabs={lowTabs ? '1' : undefined}
      ref={rootRef}
      style={style}
    >
      <div className="workbench-tabs" role="tablist" aria-label="工作台视图" hidden={!tabbed} style={{ gridArea: 'tabs' }}>
        {views.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            id={`wb-tab-${v}`}
            data-testid={`workbench-tab-${v}`}
            aria-selected={active === v}
            aria-controls={`wb-panel-${v}`}
            tabIndex={active === v ? 0 : -1}
            className={active === v ? 'active' : ''}
            ref={(el) => {
              tabRefs.current[v] = el
            }}
            onKeyDown={onTabKey}
            onClick={() => onPrefsChange({ activeView: v })}
          >
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      <section
        className="wb-region wb-demo"
        id="wb-panel-demo"
        role={tabbed ? 'tabpanel' : 'region'}
        aria-label="演示"
        aria-labelledby={tabbed ? 'wb-tab-demo' : undefined}
        data-testid="workbench-viz-slot"
        data-scroll-owner="viz"
        hidden={tabbed && active !== 'demo'}
        style={{ gridArea: tabbed ? 'view' : 'demo' }}
      >
        {scene}
      </section>

      {hasData && mode === 'docked' && prefs.dataVisible && split('data', 'split-a', '调整演示与数据高度', dockedDataH, 'horizontal')}
      {hasData && mode === 'wide' && prefs.dataVisible && split('wide-data', 'split-a', '调整数据列宽度', wideDataW, 'vertical')}

      {hasData && (
        <section
          className="wb-region wb-data"
          id="wb-panel-data"
          role={tabbed ? 'tabpanel' : 'region'}
          aria-label="当前数据"
          aria-labelledby={tabbed ? 'wb-tab-data' : undefined}
          data-testid="workbench-data-slot"
          data-expanded={tabbed ? '1' : prefs.dataVisible ? '1' : '0'}
          hidden={tabbed && active !== 'data'}
          style={{ gridArea: tabbed ? 'view' : 'data' }}
        >
          {!tabbed && (
            <header className="wb-data-head">
              <span className="wb-data-title">当前数据</span>
              <button
                type="button"
                className="ghost wb-data-toggle"
                data-testid="data-toggle"
                aria-expanded={prefs.dataVisible}
                aria-controls="wb-data-body"
                onClick={() => onPrefsChange({ dataVisible: !prefs.dataVisible })}
              >
                {prefs.dataVisible ? '收起' : '展开'}
              </button>
            </header>
          )}
          <div
            className="wb-data-body"
            id="wb-data-body"
            data-scroll-owner="data"
            data-testid="workbench-data-body"
            hidden={!tabbed && !prefs.dataVisible}
          >
            <div className="wb-data-content" ref={dataContentRef}>
              {data}
            </div>
            {dataProbes && dataProbes.length > 0 && (
              <div className="wb-data-probes" ref={probeRef} aria-hidden="true" inert>
                <DataProbeContext.Provider value={true}>
                  {dataProbes.map((p, i) => (
                    <div className="wb-data-probe-item wb-data-content" key={i}>
                      {p}
                    </div>
                  ))}
                </DataProbeContext.Provider>
              </div>
            )}
          </div>
        </section>
      )}

      {hasCode && !tabbed && split('code', 'split-b', '调整代码列宽度', codeW, 'vertical')}

      {hasCode && (
        <section
          className="wb-region wb-code"
          id="wb-panel-code"
          role={tabbed ? 'tabpanel' : 'region'}
          aria-label="代码"
          aria-labelledby={tabbed ? 'wb-tab-code' : undefined}
          data-testid="workbench-code-slot"
          data-scroll-owner="code"
          hidden={tabbed && active !== 'code'}
          style={{ gridArea: tabbed ? 'view' : 'code' }}
        >
          {code}
        </section>
      )}

      {transport && (
        <div className="workbench-transport" data-testid="workbench-transport-slot" ref={transportRef} style={{ gridArea: 'transport' }}>
          {transport}
        </div>
      )}
    </div>
  )
}
