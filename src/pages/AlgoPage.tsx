import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import { getAlgo } from '../algorithms/registry'
import type { Trace } from '../core/trace/types'
import Visualizer from '../components/Visualizer'
import GraphInput from '../components/graph/GraphInput'
import GraphResultPanel from '../components/graph/GraphResultPanel'
import * as binarySearch from '../algorithms/binarySearch'
import type { BinarySearchMode } from '../algorithms/binarySearch'
import * as knapsack01 from '../algorithms/knapsack01'
import * as lcs from '../algorithms/lcs'
import * as editDistance from '../algorithms/editDistance'
import * as activitySelection from '../algorithms/activitySelection'
import * as kmp from '../algorithms/kmp'
import * as dijkstraHeap from '../algorithms/dijkstraHeap'
import type { Step } from '../types/step'
import { DEMO_LIMITS } from '../utils/limits'
import { parseIntStrict, parseNumberList, type FieldError } from '../utils/parseInput'
import type { GraphAlgoId, GraphDraft } from '../core/graph/types'
import { defaultDraftFor } from '../core/graph/presets'
import { algoGraphOptions, edgesToAdj, edgesToFloydMatrix, validateGraphDraft } from '../core/graph/validate'
import { loadSceneFromHash, sceneToHashFragment } from '../scene/encode'
import { SCENE_PROTOCOL_VERSION } from '../scene/types'

const DEFAULT_ARRAY = [5, 2, 8, 1, 9, 3, 7]

const GRAPH_ALGOS: GraphAlgoId[] = [
  'bfs',
  'dijkstra',
  'dijkstraHeap',
  'kruskal',
  'prim',
  'bellmanFord',
  'floyd',
]

function isGraphAlgo(id: string | undefined): id is GraphAlgoId {
  return !!id && (GRAPH_ALGOS as string[]).includes(id)
}

type DraftState = {
  arrayText: string
  target: string
  strA: string
  strB: string
  editA: string
  editB: string
  text: string
  pattern: string
  bsMode: BinarySearchMode
  graph: GraphDraft | null
  mode: 'teach' | 'experiment'
}

function defaultDraft(id: string): DraftState {
  const d: DraftState = {
    arrayText: DEFAULT_ARRAY.join(', '),
    target: String(binarySearch.meta.defaultTarget),
    strA: lcs.meta.defaultX,
    strB: lcs.meta.defaultY,
    editA: editDistance.meta.defaultA,
    editB: editDistance.meta.defaultB,
    text: kmp.meta.defaultText,
    pattern: kmp.meta.defaultPattern,
    bsMode: 'requireSorted',
    graph: isGraphAlgo(id) ? defaultDraftFor(id) : null,
    mode: 'teach',
  }
  if (id === 'binarySearch') {
    d.arrayText = (binarySearch.meta.defaultArray as number[]).join(', ')
  }
  if (id === 'kadane' || id === 'maxSubarrayDC') {
    d.arrayText = '-2, 1, -3, 4, -1, 2, 1, -5, 4'
  }
  return d
}

export default function AlgoPage() {
  const { id } = useParams()
  const algo = id ? algorithms[id] : undefined

  const [draft, setDraft] = useState<DraftState>(() => defaultDraft(id ?? ''))
  const [errors, setErrors] = useState<FieldError[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [trace, setTrace] = useState<Trace | undefined>(undefined)
  const [runId, setRunId] = useState(0)
  const [playbackKey, setPlaybackKey] = useState(0)
  const [hasRun, setHasRun] = useState(false)
  const [sceneWarn, setSceneWarn] = useState<string | null>(null)

  useEffect(() => {
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
    setSteps([])
    setTrace(undefined)
    setHasRun(false)
    setPlaybackKey((k) => k + 1)
    setSceneWarn(null)

    // Restore scene from URL hash query if present (HashRouter: #/algo/x?scene=...)
    const loaded = loadSceneFromHash(window.location.hash)
    if (loaded.ok && loaded.scene.algoId === id) {
      if (loaded.versionMismatch) {
        setSceneWarn(
          `场景协议版本不同：场景 v${loaded.scene.version}，当前 v${SCENE_PROTOCOL_VERSION}，已尝试加载。`,
        )
      }
      if (isGraphAlgo(id) && loaded.scene.input && typeof loaded.scene.input === 'object') {
        const g = loaded.scene.input as Partial<GraphDraft>
        if (typeof g.n === 'number' && Array.isArray(g.edges)) {
          setDraft((d) => ({
            ...d,
            graph: {
              n: g.n!,
              edges: g.edges as GraphDraft['edges'],
              directed: Boolean(g.directed),
              start: typeof g.start === 'number' ? g.start : 0,
            },
            mode: loaded.scene.params?.mode === 'experiment' ? 'experiment' : 'teach',
          }))
        }
      }
    }
  }, [id])

  const patch = useCallback((partial: Partial<DraftState>) => {
    setDraft((d) => ({ ...d, ...partial }))
  }, [])

  const validateAndBuild = useCallback(():
    | { ok: true; steps: Step[]; registryInput?: unknown }
    | { ok: false; errors: FieldError[] } => {
    if (!algo || !id) return { ok: false, errors: [{ field: 'algo', reason: '未找到算法' }] }
    const errs: FieldError[] = []
    const heavyTrace = draft.mode !== 'experiment'

    if (isGraphAlgo(id)) {
      const g = draft.graph ?? defaultDraftFor(id)
      const v = validateGraphDraft(g, algoGraphOptions(id))
      if (!v.ok) {
        return {
          ok: false,
          errors: v.issues.map((i) => ({ field: i.field, reason: i.reason })),
        }
      }
      const { n, edges, start, directed } = v.value
      if (id === 'bfs') {
        const adj = edgesToAdj(edges, n, directed)
        return {
          ok: true,
          steps: algo.generateSteps([], adj, start),
          registryInput: { adj, start },
        }
      }
      if (id === 'floyd') {
        const matrix = edgesToFloydMatrix(edges, n)
        return {
          ok: true,
          steps: algo.generateSteps([], matrix),
          registryInput: { matrix },
        }
      }
      if (id === 'kruskal') {
        return {
          ok: true,
          steps: algo.generateSteps([], edges, n),
          registryInput: { edges, n },
        }
      }
      if (id === 'prim') {
        return {
          ok: true,
          steps: algo.generateSteps([], edges, n, start),
          registryInput: { edges, n, start },
        }
      }
      if (id === 'dijkstraHeap') {
        const steps = dijkstraHeap.generateSteps([], edges, n, start, { heavyTrace })
        return { ok: true, steps, registryInput: { edges, n, start } }
      }
      // dijkstra / bellmanFord
      return {
        ok: true,
        steps: algo.generateSteps([], edges, n, start),
        registryInput: { edges, n, start },
      }
    }

    const needsArray = ![
      'knapsack01',
      'lcs',
      'editDistance',
      'activitySelection',
      'kmp',
      'nQueens',
      'matrixChain',
      'huffman',
    ].includes(id)

    let arr: number[] = []
    if (needsArray || id === 'binarySearch') {
      const parsed = parseNumberList(draft.arrayText, 'array', {
        allowEmpty: id === 'kadane' || id === 'binarySearch',
        maxLen: DEMO_LIMITS.arrayLen,
      })
      errs.push(...parsed.errors)
      arr = parsed.values
    }

    if (id === 'binarySearch') {
      const t = parseIntStrict(draft.target, 'target')
      errs.push(...t.errors)
      if (errs.length) return { ok: false, errors: errs }
      if (draft.bsMode === 'requireSorted' && !binarySearch.validateSorted(arr)) {
        return {
          ok: false,
          errors: [
            {
              field: 'array',
              reason: '数组未按非降序排列；请排序或改用「先排序再查找」模式',
            },
          ],
        }
      }
      return {
        ok: true,
        steps: algo.generateSteps(arr, t.value ?? 0, draft.bsMode),
        registryInput: { arr, target: t.value ?? 0, mode: draft.bsMode },
      }
    }

    if (id === 'lcs') {
      if (draft.strA.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'strA', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (draft.strB.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'strB', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        steps: lcs.generateSteps([], draft.strA, draft.strB),
        registryInput: { x: draft.strA, y: draft.strB },
      }
    }

    if (id === 'editDistance') {
      if (draft.editA.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'editA', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (draft.editB.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'editB', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        steps: editDistance.generateSteps([], draft.editA, draft.editB),
        registryInput: { a: draft.editA, b: draft.editB },
      }
    }

    if (id === 'kmp') {
      if (draft.text.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'text', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (draft.pattern.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'pattern', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        steps: kmp.generateSteps([], draft.text, draft.pattern),
        registryInput: { text: draft.text, pattern: draft.pattern },
      }
    }

    if (id === 'knapsack01') {
      return { ok: true, steps: knapsack01.generateSteps([]), registryInput: {} }
    }
    if (id === 'activitySelection') {
      return { ok: true, steps: activitySelection.generateSteps([]), registryInput: {} }
    }
    if (id === 'nQueens') {
      return { ok: true, steps: algo.generateSteps([], 4, 'all'), registryInput: { n: 4, mode: 'all' } }
    }
    if (id === 'matrixChain') {
      return { ok: true, steps: algo.generateSteps([]), registryInput: {} }
    }
    if (id === 'huffman') {
      return { ok: true, steps: algo.generateSteps([]), registryInput: {} }
    }

    if (errs.length) return { ok: false, errors: errs }
    if (!arr.length) {
      return { ok: false, errors: [{ field: 'array', reason: '数组不能为空' }] }
    }
    return { ok: true, steps: algo.generateSteps(arr), registryInput: { arr } }
  }, [algo, id, draft])

  const onRestoreDefaults = () => {
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
  }

  const onRun = () => {
    const result = validateAndBuild()
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    setSteps(result.steps)
    const entry = id ? getAlgo(id) : undefined
    if (entry?.solve && draft.mode === 'teach') {
      try {
        const solved = entry.solve(result.registryInput ?? {})
        setTrace(solved.trace)
        if (solved.trace.steps?.length) setSteps(solved.trace.steps as Step[])
      } catch {
        setTrace(undefined)
      }
    } else {
      setTrace(undefined)
    }
    setRunId((r) => r + 1)
    setPlaybackKey((k) => k + 1)
    setHasRun(true)

    // Persist short scene into hash when graph + small
    if (isGraphAlgo(id) && draft.graph) {
      const frag = sceneToHashFragment({
        version: SCENE_PROTOCOL_VERSION,
        algoId: id,
        input: draft.graph,
        params: { mode: draft.mode },
        seed: 0,
        stepIndex: 0,
      })
      if (frag && frag.length < 1800) {
        const base = window.location.hash.split('?')[0] || `#/algo/${id}`
        window.history.replaceState(null, '', `${base}?${frag}`)
      }
    }
  }

  const onResetPlayback = () => {
    setPlaybackKey((k) => k + 1)
  }

  const metaExtras = useMemo(() => {
    if (!algo) return null
    const m = algo.meta
    return (
      <div className="meta-extras">
        {m.implName && (
          <p className="meta-line">
            实现：{m.implName} <span className="muted">v{String(m.implVersion ?? '')}</span>
          </p>
        )}
        {(m.timeComplexity || m.spaceComplexity) && (
          <p className="meta-line">
            {m.timeComplexity && <>时间 {m.timeComplexity}</>}
            {m.timeComplexity && m.spaceComplexity && ' · '}
            {m.spaceComplexity && <>空间 {m.spaceComplexity}</>}
          </p>
        )}
        {m.spaceNotes && <p className="meta-note">{m.spaceNotes}</p>}
        {m.inputAssumptions && <p className="meta-note">输入约定：{m.inputAssumptions}</p>}
        {m.statDefinitions && <p className="meta-note">计数含义：{m.statDefinitions}</p>}
      </div>
    )
  }, [algo])

  if (!algo) {
    return (
      <div className="page">
        <p>未找到算法。</p>
        <Link to="/">返回首页</Link>
      </div>
    )
  }

  const needsArray = ![
    'knapsack01',
    'lcs',
    'editDistance',
    'activitySelection',
    'kmp',
    'nQueens',
    'matrixChain',
    'huffman',
    ...GRAPH_ALGOS,
  ].includes(id!)

  return (
    <div className="page algo-page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>{algo.meta.title}</h1>
        <p className="complexity">复杂度：{algo.meta.complexity}</p>
        <p className="subtitle">{algo.meta.description}</p>
        {metaExtras}
        {(id === 'dijkstra' || id === 'dijkstraHeap') && (
          <p className="hint">
            对照：
            <Link to="/algo/dijkstra">朴素 Dijkstra</Link>
            {' · '}
            <Link to="/algo/dijkstraHeap">堆优化 Dijkstra</Link>
            {' · '}
            <Link to="/experiment">实验台</Link>
          </p>
        )}
      </div>

      <div className="input-panel">
        <h3>输入控制</h3>
        <div className="mode-toggle">
          <button
            type="button"
            className={draft.mode === 'teach' ? 'active' : ''}
            onClick={() => patch({ mode: 'teach' })}
          >
            教学模式
          </button>
          <button
            type="button"
            className={draft.mode === 'experiment' ? 'active' : ''}
            onClick={() => patch({ mode: 'experiment' })}
          >
            实验模式
          </button>
        </div>
        <p className="hint">
          {draft.mode === 'teach'
            ? '教学：完整轨迹步骤（适合跟步）。'
            : '实验：轻量轨迹/计数为主（堆 Dijkstra 可关重轨迹）；复杂度勿用 DOM 计时证明。'}{' '}
          编辑草稿后点「运行」。演示上限：数组 ≤{DEMO_LIMITS.arrayLen}，图 n≤{DEMO_LIMITS.graphN}。
        </p>
        {sceneWarn && <p className="input-errors">{sceneWarn}</p>}

        {needsArray && (
          <label>
            数组（逗号分隔）
            <input value={draft.arrayText} onChange={(e) => patch({ arrayText: e.target.value })} />
          </label>
        )}
        {id === 'binarySearch' && (
          <>
            <label>
              目标值
              <input value={draft.target} onChange={(e) => patch({ target: e.target.value })} />
            </label>
            <label>
              模式
              <select
                value={draft.bsMode}
                onChange={(e) => patch({ bsMode: e.target.value as BinarySearchMode })}
              >
                <option value="requireSorted">要求已排序（默认，禁止静默排序）</option>
                <option value="sortThenSearch">先排序再查找</option>
              </select>
            </label>
          </>
        )}
        {id === 'lcs' && (
          <>
            <label>
              串 X
              <input value={draft.strA} onChange={(e) => patch({ strA: e.target.value })} />
            </label>
            <label>
              串 Y
              <input value={draft.strB} onChange={(e) => patch({ strB: e.target.value })} />
            </label>
          </>
        )}
        {id === 'editDistance' && (
          <>
            <label>
              串 A
              <input value={draft.editA} onChange={(e) => patch({ editA: e.target.value })} />
            </label>
            <label>
              串 B
              <input value={draft.editB} onChange={(e) => patch({ editB: e.target.value })} />
            </label>
          </>
        )}
        {id === 'kmp' && (
          <>
            <label>
              文本
              <input value={draft.text} onChange={(e) => patch({ text: e.target.value })} />
            </label>
            <label>
              模式
              <input value={draft.pattern} onChange={(e) => patch({ pattern: e.target.value })} />
            </label>
          </>
        )}

        {isGraphAlgo(id) && draft.graph && (
          <GraphInput
            key={`${id}-${runId}-draft`}
            algoId={id}
            value={draft.graph}
            onChange={(g) => patch({ graph: g })}
          />
        )}

        {(id === 'knapsack01' ||
          id === 'activitySelection' ||
          id === 'nQueens' ||
          id === 'matrixChain' ||
          id === 'huffman') && (
          <p className="hint">
            本算法当前使用内置示例；点击「运行」生成步骤。背包多策略见{' '}
            <Link to="/teach/knapsack">教学单元</Link>。练习见 <Link to="/practice">练习台</Link>。
          </p>
        )}

        {errors.length > 0 && (
          <ul className="input-errors" role="alert">
            {errors.map((e, i) => (
              <li key={i}>
                <strong>{e.field}</strong>
                {e.position !== undefined ? ` [@${e.position}]` : ''}: {e.reason}
              </li>
            ))}
          </ul>
        )}

        <div className="input-actions">
          <button type="button" onClick={onRestoreDefaults}>
            恢复默认示例
          </button>
          <button type="button" className="primary" onClick={onRun}>
            运行
          </button>
          <button type="button" onClick={onResetPlayback} disabled={!hasRun}>
            重置播放
          </button>
        </div>
        {hasRun && <p className="hint muted">当前运行 #{runId}（已快照输入）· 模式 {draft.mode}</p>}
      </div>

      {hasRun ? (
        <>
          {isGraphAlgo(id) && <GraphResultPanel algoId={id} steps={steps} />}
          <Visualizer
            key={playbackKey}
            steps={steps}
            trace={trace}
            code={algo.meta.code as string | undefined}
          />
        </>
      ) : (
        <div className="viz-empty">调整输入后点击「运行」开始可视化。</div>
      )}
    </div>
  )
}
