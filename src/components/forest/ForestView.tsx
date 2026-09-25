import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SearchTreeNode, Step } from '../../types/step'

/**
 * V24-01B: the Huffman forest as the stage's primary object.
 *
 * Draws every tree of the CURRENT forest snapshot (step.searchTree children) with a
 * deterministic tidy layout (leaves left→right, parents centred over children), plus
 * the run's input symbols/freqs as a compact table. Roles are derived structurally
 * from the immutable trace — no solve, no new state:
 *   - select frame  → the two top-level trees that the NEXT frame merges ("selected")
 *   - merge frame   → the top-level tree absent from the previous frame ("new") and its
 *                     two children ("merged")
 *   - done frame    → the single final tree; leaves show their code (edge 0 = left, 1 = right)
 * Large forests scroll inside the forest viewport (pan) with an explicit
 * 「定位当前」 action; the current focus is auto-located on step change.
 */

interface Props {
  step: Step
  prevStep?: Step
  nextStep?: Step
  /** Input arrays rendered as the compact table (e.g. symbols + freqs). */
  inputTable?: string[]
  /** Run-level max depth / leaf count so the geometry is stable across the run. */
  runMaxDepth: number
}

type Role = 'selected' | 'merged' | 'new' | 'final' | null

interface LaidNode {
  id: string
  label: string
  x: number
  y: number
  depth: number
  leaf: boolean
  parentId?: string
  edgeBit?: '0' | '1'
  code?: string
  treeId: string
  sym?: string
}

const anchorOf = (s?: Step) => s?.codeRefs?.[0]?.anchorId ?? s?.phase
const topIds = (s?: Step) => (s?.searchTree?.children ?? []).map((c) => c.id)

function depthOf(n: SearchTreeNode): number {
  const kids = n.children ?? []
  return kids.length ? 1 + Math.max(...kids.map(depthOf)) : 0
}

export function forestMaxDepth(steps: Step[]): number {
  let d = 0
  for (const s of steps) for (const t of s.searchTree?.children ?? []) d = Math.max(d, depthOf(t))
  return d
}

function layoutForest(trees: SearchTreeNode[], slotW: number, treeGap: number) {
  const nodes: LaidNode[] = []
  let cursor = 0
  const walk = (
    n: SearchTreeNode,
    depth: number,
    treeId: string,
    code: string,
    parentId?: string,
    bit?: '0' | '1',
  ): number => {
    const kids = n.children ?? []
    let x: number
    if (!kids.length) {
      x = cursor + slotW / 2
      cursor += slotW
    } else {
      const xs = kids.map((k, i) => walk(k, depth + 1, treeId, code + (i === 0 ? '0' : '1'), n.id, i === 0 ? '0' : '1'))
      x = (xs[0]! + xs[xs.length - 1]!) / 2
    }
    const sym = n.meta && typeof n.meta.symbol === 'string' ? n.meta.symbol : undefined
    nodes.push({ id: n.id, label: n.label, x, y: depth, depth, leaf: !kids.length, parentId, edgeBit: bit, code, treeId, sym })
    return x
  }
  trees.forEach((t, i) => {
    if (i > 0) cursor += treeGap
    walk(t, 0, t.id, '')
  })
  return { nodes, width: cursor }
}

function ForestView({ step, prevStep, nextStep, inputTable = [], runMaxDepth }: Props) {
  const trees = useMemo(() => step.searchTree?.children ?? [], [step.searchTree])
  const anchor = anchorOf(step)

  // ---- structural roles from the immutable trace ----
  const roles = useMemo(() => {
    const map = new Map<string, Role>()
    const prevTop = new Set(topIds(prevStep))
    if (anchor === 'merge' && prevStep?.searchTree) {
      const fresh = trees.find((t) => !prevTop.has(t.id))
      if (fresh) {
        map.set(fresh.id, 'new')
        for (const c of fresh.children ?? []) map.set(c.id, 'merged')
      }
    } else if (anchor === 'done' && trees.length === 1) {
      map.set(trees[0]!.id, 'final')
    } else if (anchorOf(nextStep) === 'merge' && nextStep?.searchTree) {
      const curTop = new Set(trees.map((t) => t.id))
      const fresh = (nextStep.searchTree.children ?? []).find((t) => !curTop.has(t.id))
      for (const c of fresh?.children ?? []) map.set(c.id, 'selected')
    }
    return map
  }, [anchor, trees, prevStep, nextStep])

  const isDone = anchor === 'done'
  const codes = useMemo(() => {
    const r = step.result as { codes?: Record<string, string> } | undefined
    return isDone && r?.codes ? r.codes : null
  }, [isDone, step.result])

  // ---- geometry: slot width from the longest label; level height from the allotted box ----
  const maxLabel = useMemo(() => {
    let m = 3
    const visit = (n: SearchTreeNode) => {
      m = Math.max(m, n.label.length)
      n.children?.forEach(visit)
    }
    trees.forEach(visit)
    return m
  }, [trees])
  const NODE_H = 26
  const CODE_H = 16
  const nodeW = Math.max(44, Math.ceil(maxLabel * 8.2 + 16))
  const slotW = nodeW + 12
  const treeGap = 18
  const { nodes, width } = useMemo(() => layoutForest(trees, slotW, treeGap), [trees, slotW])

  const viewportRef = useRef<HTMLDivElement>(null)
  const [levelH, setLevelH] = useState(44)
  useLayoutEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const apply = () => {
      const h = vp.clientHeight
      if (h <= 0) return
      const levels = Math.max(1, runMaxDepth)
      const room = h - NODE_H - CODE_H - 12
      const next = Math.max(34, Math.min(64, Math.floor(room / levels)))
      setLevelH((p) => (Math.abs(p - next) >= 1 ? next : p))
    }
    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    ro?.observe(vp)
    return () => ro?.disconnect()
  }, [runMaxDepth])

  const padX = 8
  const padTop = 6
  const canvasW = Math.max(width + padX * 2, 120)
  const canvasH = padTop + Math.max(0, runMaxDepth) * levelH + NODE_H + CODE_H + 6
  const pos = useMemo(() => {
    const m = new Map<string, { cx: number; top: number }>()
    for (const n of nodes) m.set(n.id, { cx: padX + n.x, top: padTop + n.depth * levelH })
    return m
  }, [nodes, levelH])

  // role of a node: its own role, else inherited from the nearest role'd top-level ancestor
  const nodeRole = useCallback(
    (n: LaidNode): Role => roles.get(n.id) ?? (roles.get(n.treeId) === 'selected' ? 'selected' : null),
    [roles],
  )

  // ---- locate current (focus nodes) — scrolls ONLY the forest viewport ----
  const locate = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    // Focus = the nodes the frame is about (selected roots / new parent + merged children /
    // final root) — not every inherited descendant, so a big subtree never pushes them out.
    const focus = [...vp.querySelectorAll('[data-forest-node][data-focus="1"]')] as HTMLElement[]
    if (!focus.length) return
    const vr = vp.getBoundingClientRect()
    const left = Math.min(...focus.map((f) => f.getBoundingClientRect().left))
    const right = Math.max(...focus.map((f) => f.getBoundingClientRect().right))
    const top = Math.min(...focus.map((f) => f.getBoundingClientRect().top))
    const bottom = Math.max(...focus.map((f) => f.getBoundingClientRect().bottom))
    if (left < vr.left) vp.scrollLeft += left - vr.left - 8
    else if (right > vr.right) vp.scrollLeft += Math.min(right - vr.right + 8, left - vr.left - 8)
    if (top < vr.top) vp.scrollTop += top - vr.top - 4
    else if (bottom > vr.bottom) vp.scrollTop += Math.min(bottom - vr.bottom + 4, top - vr.top - 4)
  }, [])
  useLayoutEffect(() => {
    locate()
  }, [step, levelH, locate])

  const inputArrays = inputTable.map((n) => [n, step.arrays?.[n] ?? []] as const)
  const [symName, freqName] = inputTable
  const syms = (step.arrays?.[symName ?? ''] ?? []) as (string | number)[]
  const freqs = (step.arrays?.[freqName ?? ''] ?? []) as (string | number)[]
  const overflowX = canvasW > (viewportRef.current?.clientWidth ?? Infinity) + 1

  return (
    <div className="forest-view" data-testid="forest-view" data-trees={trees.length}>
      <div className="forest-head">
        {inputArrays.length > 0 && (
          <div className="huffman-input-table" data-testid="huffman-input-table" aria-label="输入符号与频率">
            <span className="fh-title">输入</span>
            {syms.map((s, i) => (
              <span key={`${s}-${i}`} className="fh-sym" data-sym={String(s)} title={`${s}: ${freqs[i]}`}>
                <b>{String(s)}</b>
                <span className="fh-freq">{String(freqs[i] ?? '')}</span>
                {codes && (
                  <span className="fh-code" data-testid={`huffman-code-${s}`}>
                    ={codes[String(s)] || 'ε'}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
        <span className="fh-count" data-testid="forest-count">
          森林 {trees.length} 棵
        </span>
        <button
          type="button"
          className="fh-locate"
          data-testid="forest-locate-btn"
          onClick={locate}
          title="把当前选中 / 合并的子树滚动到可见区域"
        >
          定位当前
        </button>
      </div>
      <div
        className="forest-viewport"
        ref={viewportRef}
        data-testid="forest-viewport"
        data-overflow-x={overflowX ? '1' : '0'}
        tabIndex={0}
        aria-label="Huffman 森林（可滚动）"
      >
        {trees.length === 0 ? (
          <div className="viz-empty soft">本步无森林（{step.message}）</div>
        ) : (
          <div className="forest-canvas" style={{ width: canvasW, height: canvasH }} role="group" aria-label={`森林 ${trees.length} 棵`}>
            <svg className="forest-edges" width={canvasW} height={canvasH} aria-hidden="true">
              {nodes
                .filter((n) => n.parentId)
                .map((n) => {
                  const p = pos.get(n.parentId!)!
                  const c = pos.get(n.id)!
                  const x1 = p.cx
                  const y1 = p.top + NODE_H
                  const x2 = c.cx
                  const y2 = c.top
                  const r = nodeRole(n)
                  return (
                    <g key={`e-${n.id}`} className={`fe${r ? ` fe-${r}` : ''}`}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} />
                      <text x={(x1 + x2) / 2 + (n.edgeBit === '0' ? -7 : 7)} y={(y1 + y2) / 2 + 4} textAnchor="middle">
                        {n.edgeBit}
                      </text>
                    </g>
                  )
                })}
            </svg>
            {nodes.map((n) => {
              const p = pos.get(n.id)!
              const r = nodeRole(n)
              const sym = n.leaf ? n.sym : undefined
              return (
                <div
                  key={n.id}
                  className={`forest-node${n.leaf ? ' is-leaf' : ' is-internal'}${r ? ` role-${r}` : ''}`}
                  data-forest-node
                  data-node-id={n.id}
                  data-leaf={n.leaf ? '1' : '0'}
                  data-role={r ?? ''}
                  data-focus={roles.has(n.id) ? '1' : undefined}
                  data-depth={n.depth}
                  style={{ left: p.cx - nodeW / 2, top: p.top, width: nodeW, height: NODE_H }}
                  title={n.label}
                >
                  <span className="fn-label">{n.label}</span>
                  {codes && n.leaf && sym !== undefined && (
                    <span className="fn-code" data-testid={`forest-code-${sym}`}>
                      {codes[sym] || 'ε'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ForestView)
