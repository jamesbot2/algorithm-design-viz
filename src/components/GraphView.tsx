import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { EdgeRole, GraphState, NodeRole } from '../types/step'
import { ensureNodeLayout } from '../utils/layoutGraph'
import {
  curveControl,
  expandFit,
  fitViewBox,
  insetEndpoints,
  parallelChannelOffset,
  selfLoopPath,
  undirectedKey,
  type FitBox,
} from '../utils/graphEdgeGeometry'

const ROLE_CLASS: Record<EdgeRole, string> = {
  checking: 'edge checking',
  accepted: 'edge accepted',
  rejected: 'edge rejected',
  tree: 'edge tree',
  path: 'edge path',
  relaxing: 'edge relaxing',
}

function nodeClass(id: string, hlN: Set<string>, roles?: Record<string, NodeRole>): string {
  const role = roles?.[id]
  if (role) return `node role-${role}`
  if (hlN.has(id)) return 'node hot'
  return 'node'
}

const NODE_R = 16
const ARROW_PAD = 20
const LABEL_PAD = 10
/** Base SVG user-space font for .node-label when display scale is 1. */
const BASE_LABEL_USER = 13
/** Target on-screen CSS px for default-graph node labels. */
const MIN_LABEL_CSS_PX = 12
const MAX_LABEL_USER = 36
const CONTENT_PAD = 32

type Camera = { x: number; y: number; w: number; h: number; labelUser: number; edgeLabelUser: number }

function structureKey(nodes: { id: string | number; x: number; y: number }[], edgeIds: string[]): string {
  return (
    nodes.map((n) => `${n.id}:${n.x.toFixed(1)},${n.y.toFixed(1)}`).join('|') +
    '#' +
    edgeIds.join(',')
  )
}

function contentBox(
  nodes: { x: number; y: number }[],
  edgeLabels: { labelX: number; labelY: number }[],
): FitBox {
  let box: FitBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const n of nodes) {
    box = expandFit(box, n.x, n.y, NODE_R + 8)
  }
  for (const er of edgeLabels) {
    box = expandFit(box, er.labelX, er.labelY, LABEL_PAD)
  }
  if (!Number.isFinite(box.minX)) {
    return { minX: 0, minY: 0, maxX: 520, maxY: 280 }
  }
  return box
}

/**
 * Fit ALL content into the plot (no clipping), then enlarge SVG font so CSS px
 * stays ≈ MIN_LABEL_CSS_PX even when meet-scale shrinks the graph.
 * Optional pan offset is preserved across steps when structure is unchanged.
 */
function fitCamera(
  box: FitBox,
  plotW: number,
  plotH: number,
  pan?: { dx: number; dy: number },
): Camera {
  const vbStr = fitViewBox(box, Math.max(plotW, 1), Math.max(plotH, 1), CONTENT_PAD)
  const parts = vbStr.split(/\s+/).map(Number)
  let x = parts[0]!
  let y = parts[1]!
  const w = parts[2]!
  const h = parts[3]!
  if (pan) {
    x += pan.dx
    y += pan.dy
  }
  const disp = Math.min(plotW / w, plotH / h)
  // cssFont = labelUser * disp  →  labelUser = MIN / disp
  const labelUser =
    disp > 0.01
      ? Math.min(MAX_LABEL_USER, Math.max(BASE_LABEL_USER, MIN_LABEL_CSS_PX / disp))
      : BASE_LABEL_USER
  const edgeLabelUser = Math.max(10, labelUser * 0.85)
  return { x, y, w, h, labelUser, edgeLabelUser }
}

function GraphView({ graph }: { graph: GraphState }) {
  const uid = useId().replace(/:/g, '')
  const markerId = `arrow-${uid}`
  const markerAccepted = `arrow-acc-${uid}`
  const plotRef = useRef<HTMLDivElement>(null)
  const [plotSize, setPlotSize] = useState({ w: 0, h: 0 })
  const [camera, setCamera] = useState<Camera | null>(null)
  const structRef = useRef<string>('')
  const panRef = useRef({ dx: 0, dy: 0 })
  const dragRef = useRef<{ px: number; py: number; pan: { dx: number; dy: number } } | null>(null)

  const nodes = useMemo(() => ensureNodeLayout(graph.nodes), [graph.nodes])
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [String(n.id), n])), [nodes])
  const hlN = useMemo(() => new Set((graph.highlightNodes ?? []).map(String)), [graph.highlightNodes])

  const hlEdgeIds = useMemo(() => {
    const set = new Set<string>(graph.highlightEdgeIds ?? [])
    for (const [a, b] of graph.highlightEdges ?? []) {
      set.add(`${a}->${b}`)
      set.add(`${a}-${b}`)
      const sa = String(a)
      const sb = String(b)
      set.add(sa <= sb ? `${sa}-${sb}` : `${sb}-${sa}`)
    }
    return set
  }, [graph.highlightEdgeIds, graph.highlightEdges])

  const siblingsByPair = useMemo(() => {
    const m = new Map<string, { id: string; from: string; to: string }[]>()
    for (const e of graph.edges) {
      const a = String(e.from)
      const b = String(e.to)
      if (a === b) continue
      const key = undirectedKey(a, b)
      const list = m.get(key) ?? []
      list.push({ id: e.id, from: a, to: b })
      m.set(key, list)
    }
    return m
  }, [graph.edges])

  const inferredRoles = useMemo(() => {
    if (graph.nodeRoles && Object.keys(graph.nodeRoles).length) return graph.nodeRoles
    const roles: Record<string, NodeRole> = {}
    for (const e of graph.edges) {
      const role = graph.edgeRoles?.[e.id]
      if (role === 'accepted' || role === 'tree') {
        const a = String(e.from)
        const b = String(e.to)
        if (!hlN.has(a)) roles[a] = roles[a] ?? 'settled'
        if (!hlN.has(b)) roles[b] = roles[b] ?? 'settled'
      }
    }
    for (const id of hlN) roles[id] = 'current'
    return roles
  }, [graph.nodeRoles, graph.edges, graph.edgeRoles, hlN])

  const showNegWarn =
    graph.warning === 'negative_cycle' ||
    Object.values(inferredRoles).some((r) => r === 'neg-cycle')

  const edgeRender = useMemo(() => {
    return graph.edges.map((e) => {
      const a = nodeMap.get(String(e.from))
      const b = nodeMap.get(String(e.to))
      if (!a || !b) return null
      const pa = String(e.from)
      const pb = String(e.to)
      const eid = e.id
      const role = graph.edgeRoles?.[eid]
      const hot = hlEdgeIds.has(eid) || !!role
      const cls = role ? ROLE_CLASS[role] : hot ? 'edge hot' : 'edge'

      if (pa === pb) {
        const loop = selfLoopPath(a.x!, a.y!, NODE_R, 30)
        return {
          eid,
          cls,
          pathD: loop.d,
          labelX: loop.labelX,
          labelY: loop.labelY,
          weight: e.weight,
          directed: e.directed,
          role,
          selfLoop: true,
        }
      }

      const siblings = siblingsByPair.get(undirectedKey(pa, pb)) ?? []
      const offset = parallelChannelOffset(eid, pa, pb, siblings, 28)
      const inset = insetEndpoints(a.x!, a.y!, b.x!, b.y!, NODE_R, ARROW_PAD)
      let pathD: string
      let labelX: number
      let labelY: number
      if (Math.abs(offset) > 0.5 || siblings.length > 1) {
        const c = curveControl(inset.ax, inset.ay, inset.bx, inset.by, offset, pa, pb)
        pathD = `M ${inset.ax} ${inset.ay} Q ${c.x} ${c.y} ${inset.bx} ${inset.by}`
        labelX = c.x
        labelY = c.y - 4
      } else {
        pathD = `M ${inset.ax} ${inset.ay} L ${inset.bx} ${inset.by}`
        labelX = (inset.ax + inset.bx) / 2
        labelY = (inset.ay + inset.by) / 2 - 6
      }

      return {
        eid,
        cls,
        pathD,
        labelX,
        labelY,
        weight: e.weight,
        directed: e.directed,
        role,
        selfLoop: false,
      }
    })
  }, [graph.edges, graph.edgeRoles, hlEdgeIds, nodeMap, siblingsByPair])

  const box = useMemo(() => {
    const labels = edgeRender.filter(Boolean).map((er) => ({ labelX: er!.labelX, labelY: er!.labelY }))
    return contentBox(
      nodes.map((n) => ({ x: n.x!, y: n.y! })),
      labels,
    )
  }, [nodes, edgeRender])

  const edgeIdList = useMemo(() => graph.edges.map((e) => e.id), [graph.edges])
  const sKey = useMemo(
    () => structureKey(nodes.map((n) => ({ id: n.id, x: n.x!, y: n.y! })), edgeIdList),
    [nodes, edgeIdList],
  )

  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setPlotSize({ w: Math.max(0, r.width), h: Math.max(0, r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showNegWarn])

  useEffect(() => {
    if (plotSize.w < 8 || plotSize.h < 8) return
    const structureChanged = structRef.current !== sKey
    if (structureChanged) {
      panRef.current = { dx: 0, dy: 0 }
      structRef.current = sKey
    }
    setCamera(fitCamera(box, plotSize.w, plotSize.h, panRef.current))
  }, [box, plotSize, sKey])

  const svgRef = useRef<SVGSVGElement>(null)

  /**
   * V14-03: convert screen delta → user delta with the SAME uniform meet scale
   * the SVG uses (xMidYMid meet), including letterbox. Prefer CTM inverse;
   * fall back to min(plotW/vbW, plotH/vbH).
   */
  const screenDeltaToUser = useCallback(
    (dxPx: number, dyPx: number): { dx: number; dy: number } => {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM?.()
      if (ctm && typeof DOMPoint !== 'undefined') {
        try {
          const inv = ctm.inverse()
          const p0 = new DOMPoint(0, 0).matrixTransform(inv)
          const p1 = new DOMPoint(dxPx, dyPx).matrixTransform(inv)
          return { dx: p1.x - p0.x, dy: p1.y - p0.y }
        } catch {
          /* fall through */
        }
      }
      if (!camera || plotSize.w < 1 || plotSize.h < 1) return { dx: 0, dy: 0 }
      const scale = Math.min(plotSize.w / camera.w, plotSize.h / camera.h)
      if (!(scale > 0)) return { dx: 0, dy: 0 }
      return { dx: dxPx / scale, dy: dyPx / scale }
    },
    [camera, plotSize.w, plotSize.h],
  )

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Capture on the plot host (not a child node) so moves stay coherent
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { px: e.clientX, py: e.clientY, pan: { ...panRef.current } }
  }, [])
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d) return
      const dxPx = e.clientX - d.px
      const dyPx = e.clientY - d.py
      const { dx, dy } = screenDeltaToUser(dxPx, dyPx)
      panRef.current = {
        dx: d.pan.dx - dx,
        dy: d.pan.dy - dy,
      }
      setCamera(fitCamera(box, plotSize.w, plotSize.h, panRef.current))
    },
    [box, plotSize.w, plotSize.h, screenDeltaToUser],
  )
  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }, [])

  const resetView = useCallback(() => {
    panRef.current = { dx: 0, dy: 0 }
    if (plotSize.w >= 8 && plotSize.h >= 8) {
      setCamera(fitCamera(box, plotSize.w, plotSize.h, panRef.current))
    }
  }, [box, plotSize.w, plotSize.h])

  const viewBox = camera
    ? `${camera.x} ${camera.y} ${camera.w} ${camera.h}`
    : fitViewBox(box, 520, 280, CONTENT_PAD)
  const labelUser = camera?.labelUser ?? BASE_LABEL_USER
  const edgeLabelUser = camera?.edgeLabelUser ?? 11

  return (
    <div className="graph-view" data-testid="graph-view">
      {showNegWarn && (
        <p className="graph-neg-warning" role="status" data-testid="graph-neg-warning">
          负环警告：当前距离不构成合法最短路（Bellman-Ford / Floyd 检测）。
        </p>
      )}
      <div className="graph-view-toolbar" data-testid="graph-view-toolbar">
        <button
          type="button"
          className="ghost graph-reset-view"
          data-testid="graph-reset-view"
          aria-label="重置视图"
          title="重置平移（仅相机）"
          onClick={resetView}
        >
          重置视图
        </button>
      </div>
      <div
        className="graph-plot"
        data-testid="graph-plot"
        ref={plotRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'none' }}
        data-pan-policy="pointer-capture-meet"
      >
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="graph-svg"
          preserveAspectRatio="xMidYMid meet"
          data-testid="graph-svg"
          data-label-user={labelUser.toFixed(2)}
        >
          {/* Catch hits in meet letterbox / gaps so nodes near edges stay targetable */}
          <rect
            data-graph-hitlayer="1"
            x={camera?.x ?? 0}
            y={camera?.y ?? 0}
            width={camera?.w ?? 520}
            height={camera?.h ?? 280}
            fill="transparent"
            pointerEvents="all"
          />
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#10a37f" />
            </marker>
            <marker
              id={markerAccepted}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-accepted, #22c55e)" />
            </marker>
          </defs>
          {edgeRender.map((er) => {
            if (!er) return null
            const marker =
              er.directed
                ? er.role === 'accepted' || er.role === 'tree'
                  ? `url(#${markerAccepted})`
                  : `url(#${markerId})`
                : undefined
            return (
              <g key={er.eid} data-edge-id={er.eid} data-self-loop={er.selfLoop ? '1' : '0'}>
                <path d={er.pathD} className={er.cls} fill="none" markerEnd={marker} />
                {er.weight !== undefined && (
                  <text
                    x={er.labelX}
                    y={er.labelY}
                    className="edge-label"
                    data-edge-label={er.eid}
                    fontSize={edgeLabelUser}
                  >
                    {er.weight}
                  </text>
                )}
              </g>
            )
          })}
          {nodes.map((n) => {
            const id = String(n.id)
            const cls = nodeClass(id, hlN, inferredRoles)
            const scale = cls.includes('role-current') || cls.includes('hot') ? 1.12 : 1
            return (
              <g
                key={id}
                data-node-id={id}
                style={{ transform: `scale(${scale})`, transformOrigin: `${n.x}px ${n.y}px` }}
              >
                <circle cx={n.x} cy={n.y} r={NODE_R} className={cls} />
                <text
                  x={n.x}
                  y={(n.y ?? 0) + 4}
                  textAnchor="middle"
                  className="node-label"
                  fontSize={labelUser}
                >
                  {n.label ?? n.id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default memo(GraphView)
