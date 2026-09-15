import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import { getAlgo } from '../algorithms/registry'
import type { Trace } from '../core/trace/types'
import { runAlgo, createCancelFlag } from '../core/runner'
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
import { createRunId, freezeRunSnapshot, type RunSnapshot } from '../core/runSnapshot'
import type { SeekCommand } from '../components/Visualizer'
import WorkbenchLayout from '../components/workbench/WorkbenchLayout'
import CodeBrowser from '../components/codeBrowser/CodeBrowser'
import { getCatalog } from '../codeCatalog'
import * as nQueensMod from '../algorithms/nQueens'
import * as matrixChainMod from '../algorithms/matrixChain'
import * as huffmanMod from '../algorithms/huffman'

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
  nQueensN: string
  nQueensMode: 'one' | 'all'
  matrixDims: string
  huffmanSymbols: string
  huffmanFreqs: string
  knapsackWeights: string
  knapsackValues: string
  knapsackW: string
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
    nQueensN: String(nQueensMod.meta.defaultN),
    nQueensMode: 'all',
    matrixDims: (matrixChainMod.meta.defaultDims as number[]).join(', '),
    huffmanSymbols: (huffmanMod.meta.defaultSymbols as string[]).join(', '),
    huffmanFreqs: (huffmanMod.meta.defaultFreqs as number[]).join(', '),
    knapsackWeights: (knapsack01.meta.defaultWeights as number[]).join(', '),
    knapsackValues: (knapsack01.meta.defaultValues as number[]).join(', '),
    knapsackW: String(knapsack01.meta.defaultCapacity),
  }
  if (id === 'binarySearch') {
    d.arrayText = (binarySearch.meta.defaultArray as number[]).join(', ')
  }
  if (id === 'kadane' || id === 'maxSubarrayDC') {
    d.arrayText = '-2, 1, -3, 4, -1, 2, 1, -5, 4'
  }
  return d
}

type BuildOk = {
  ok: true
  registryInput: unknown
  /** Fallback steps when registry.solve is unavailable — produced once. */
  fallbackSteps?: Step[]
  inputSize?: number
}

export default function AlgoPage() {
  const { id } = useParams()
  const algo = id ? algorithms[id] : undefined

  const [draft, setDraft] = useState<DraftState>(() => defaultDraft(id ?? ''))
  const [errors, setErrors] = useState<FieldError[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [trace, setTrace] = useState<Trace | undefined>(undefined)
  const [runId, setRunId] = useState(0)
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null)
  const [playbackKey, setPlaybackKey] = useState(0)
  const [hasRun, setHasRun] = useState(false)
  const [sceneWarn, setSceneWarn] = useState<string | null>(null)
  /** Notify-only cursor from Visualizer — must NOT feed seekCommand */
  const [cursorIndex, setCursorIndex] = useState(0)
  const [seekCommand, setSeekCommand] = useState<SeekCommand | null>(null)
  const seekReqRef = useRef(0)
  const [staleResult, setStaleResult] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [draftDirty, setDraftDirty] = useState(false)
  const cancelRef = useRef(createCancelFlag())
  const pendingAutoRun = useRef(false)
  const pendingSeek = useRef(0)

  const patch = useCallback((partial: Partial<DraftState>) => {
    setDraft((d) => ({ ...d, ...partial }))
    setDraftDirty(true)
  }, [])

  /** Validate draft once → registry input. Steps generated at most once in executeOnce. */
  const validateAndBuild = useCallback((): BuildOk | { ok: false; errors: FieldError[] } => {
    if (!algo || !id) return { ok: false, errors: [{ field: 'algo', reason: '未找到算法' }] }
    const errs: FieldError[] = []
    const heavyTrace = draft.mode !== 'experiment'
    const hasRegistrySolve = Boolean(getAlgo(id)?.solve)
    const maybeSteps = (fn: () => Step[]): Step[] | undefined =>
      hasRegistrySolve ? undefined : fn()

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
      const inputSize = n + edges.length
      if (id === 'bfs') {
        const adj = edgesToAdj(edges, n, directed)
        return {
          ok: true,
          registryInput: { adj, start },
          fallbackSteps: maybeSteps(() => algo.generateSteps([], adj, start)),
          inputSize,
        }
      }
      if (id === 'floyd') {
        const matrix = edgesToFloydMatrix(edges, n)
        return {
          ok: true,
          registryInput: { matrix },
          fallbackSteps: maybeSteps(() => algo.generateSteps([], matrix)),
          inputSize,
        }
      }
      if (id === 'kruskal') {
        return {
          ok: true,
          registryInput: { edges, n },
          fallbackSteps: maybeSteps(() => algo.generateSteps([], edges, n)),
          inputSize,
        }
      }
      if (id === 'prim') {
        return {
          ok: true,
          registryInput: { edges, n, start },
          fallbackSteps: maybeSteps(() => algo.generateSteps([], edges, n, start)),
          inputSize,
        }
      }
      if (id === 'dijkstraHeap') {
        return {
          ok: true,
          registryInput: { edges, n, start },
          fallbackSteps: maybeSteps(() =>
            dijkstraHeap.generateSteps([], edges, n, start, { heavyTrace }),
          ),
          inputSize,
        }
      }
      return {
        ok: true,
        registryInput: { edges, n, start },
        fallbackSteps: maybeSteps(() => algo.generateSteps([], edges, n, start)),
        inputSize,
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
        registryInput: { arr, target: t.value ?? 0, mode: draft.bsMode },
        fallbackSteps: maybeSteps(() => algo.generateSteps(arr, t.value ?? 0, draft.bsMode)),
        inputSize: arr.length,
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
        registryInput: { x: draft.strA, y: draft.strB },
        fallbackSteps: maybeSteps(() => lcs.generateSteps([], draft.strA, draft.strB)),
        inputSize: draft.strA.length * draft.strB.length,
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
        registryInput: { a: draft.editA, b: draft.editB },
        fallbackSteps: maybeSteps(() => editDistance.generateSteps([], draft.editA, draft.editB)),
        inputSize: draft.editA.length * draft.editB.length,
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
        registryInput: { text: draft.text, pattern: draft.pattern },
        fallbackSteps: maybeSteps(() => kmp.generateSteps([], draft.text, draft.pattern)),
        inputSize: draft.text.length + draft.pattern.length,
      }
    }

    if (id === 'knapsack01') {
      const wts = parseNumberList(draft.knapsackWeights, 'weights', { allowEmpty: true, maxLen: DEMO_LIMITS.arrayLen })
      const vals = parseNumberList(draft.knapsackValues, 'values', { allowEmpty: true, maxLen: DEMO_LIMITS.arrayLen })
      const W = parseIntStrict(draft.knapsackW, 'W')
      errs.push(...wts.errors, ...vals.errors, ...W.errors)
      if (wts.values.length !== vals.values.length) {
        errs.push({ field: 'weights', reason: 'weights 与 values 长度须一致' })
      }
      if (errs.length) return { ok: false, errors: errs }
      const weights = wts.values
      const values = vals.values
      const cap = W.value ?? 0
      return {
        ok: true,
        registryInput: { weights, values, capacity: cap },
        fallbackSteps: maybeSteps(() => knapsack01.generateSteps([], weights, values, cap)),
        inputSize: weights.length * Math.max(1, cap),
      }
    }
    if (id === 'activitySelection') {
      return {
        ok: true,
        registryInput: {},
        fallbackSteps: maybeSteps(() => activitySelection.generateSteps([])),
        inputSize: 4,
      }
    }
    if (id === 'nQueens') {
      const nParsed = parseIntStrict(draft.nQueensN, 'n')
      errs.push(...nParsed.errors)
      const n = nParsed.value ?? 4
      if (n < 1 || n > 12) errs.push({ field: 'n', reason: 'n 须在 1..12' })
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        registryInput: { n, mode: draft.nQueensMode },
        fallbackSteps: maybeSteps(() => algo.generateSteps([], n, draft.nQueensMode)),
        inputSize: n,
      }
    }
    if (id === 'matrixChain') {
      const dims = parseNumberList(draft.matrixDims, 'dims', { allowEmpty: false, maxLen: 20 })
      errs.push(...dims.errors)
      if (dims.values.length < 2) errs.push({ field: 'dims', reason: 'dims 至少 2 个数（n 个矩阵需要 n+1 维）' })
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        registryInput: { dims: dims.values },
        fallbackSteps: maybeSteps(() => algo.generateSteps([], dims.values)),
        inputSize: dims.values.length,
      }
    }
    if (id === 'huffman') {
      const syms = draft.huffmanSymbols.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)
      const freqs = parseNumberList(draft.huffmanFreqs, 'freqs', { allowEmpty: true, maxLen: 64 })
      errs.push(...freqs.errors)
      if (syms.length !== freqs.values.length) {
        errs.push({ field: 'symbols', reason: 'symbols 与 freqs 长度须一致' })
      }
      if (errs.length) return { ok: false, errors: errs }
      return {
        ok: true,
        registryInput: { symbols: syms, freqs: freqs.values },
        fallbackSteps: maybeSteps(() => algo.generateSteps([], syms, freqs.values)),
        inputSize: syms.length,
      }
    }

    if (errs.length) return { ok: false, errors: errs }
    if (!arr.length) {
      return { ok: false, errors: [{ field: 'array', reason: '数组不能为空' }] }
    }
    return {
      ok: true,
      registryInput: { arr },
      fallbackSteps: maybeSteps(() => algo.generateSteps(arr)),
      inputSize: arr.length,
    }
  }, [algo, id, draft])

  /** Single execution path: validate → run once → {result, steps/trace}. */
  const executeOnce = useCallback(
    (seekTo = 0) => {
      const built = validateAndBuild()
      if (!built.ok) {
        setErrors(built.errors)
        setShakeKey((k) => k + 1)
        // Keep prior viz if present — mark as stale rather than silently claiming current
        if (hasRun && steps.length > 0) {
          setStaleResult(true)
        } else {
          setHasRun(false)
        }
        return false
      }
      setErrors([])
      setStaleResult(false)

      cancelRef.current.cancelled = false
      const entry = id ? getAlgo(id) : undefined
      let outSteps: Step[] = built.fallbackSteps ?? []
      let outTrace: Trace | undefined

      const budgetMax =
        draft.mode === 'experiment'
          ? DEMO_LIMITS.arrayLen * DEMO_LIMITS.arrayLen
          : DEMO_LIMITS.arrayLen * 200

      if (entry?.validate && entry?.solve) {
        // Prefer runAlgo: validate + solve once (no double generateSteps + solve)
        const outcome = runAlgo({
          algoId: id!,
          implName: entry.meta.implName,
          implVersion: entry.meta.implVersion,
          validate: entry.validate,
          solve: (input, _ctx) => {
            const solved = entry.solve!(input)
            return {
              steps: (solved.trace.steps as Step[]) ?? [],
              result: solved.result,
              status: solved.trace.status,
            }
          },
          rawInput: built.registryInput,
          budget: {
            maxSteps: draft.mode === 'experiment' ? 200 : 5000,
            maxInputSize: budgetMax,
            inputSize: built.inputSize,
          },
          cancel: cancelRef.current,
          freeze: true,
        })

        if (outcome.status === 'validation_error' || outcome.status === 'budget_exceeded') {
          const msgs = (outcome.errors ?? []).map((e) =>
            'message' in e ? e.message : String(e),
          )
          setErrors(
            msgs.length
              ? msgs.map((m) => ({ field: 'run', reason: m }))
              : [{ field: 'run', reason: outcome.status }],
          )
          if (outcome.status === 'budget_exceeded' && outcome.steps?.length) {
            // still show truncated steps
            outSteps = outcome.steps
            outTrace = outcome.trace
          } else if (outcome.status === 'validation_error') {
            setShakeKey((k) => k + 1)
            if (hasRun && steps.length > 0) setStaleResult(true)
            else setHasRun(false)
            return false
          }
        } else if (outcome.status === 'cancelled') {
          setErrors([{ field: 'run', reason: '已取消' }])
          outSteps = outcome.steps ?? []
          outTrace = outcome.trace
        } else {
          outSteps = outcome.steps ?? outSteps
          outTrace = outcome.trace
        }
      } else {
        // Legacy path: fallbackSteps already produced once in validateAndBuild
        outSteps = built.fallbackSteps ?? []
        outTrace = undefined
      }

      setSteps(outSteps)
      setTrace(outTrace)
      const clamped = Math.max(0, Math.min(seekTo, Math.max(0, outSteps.length - 1)))
      const nextRunNumeric = runId + 1
      const snap = freezeRunSnapshot({
        algoId: id!,
        version: SCENE_PROTOCOL_VERSION,
        input: isGraphAlgo(id)
          ? structuredClone(draft.graph)
          : structuredClone(built.registryInput),
        params: { mode: draft.mode },
        seed: 0,
        runId: createRunId(),
      })
      setRunSnapshot(snap)
      setRunId(nextRunNumeric)
      setDraftDirty(false)
      setCursorIndex(clamped)
      seekReqRef.current += 1
      setSeekCommand({ requestId: seekReqRef.current, target: clamped })
      setPlaybackKey((k) => k + 1)
      setHasRun(true)

      // Persist scene from RunSnapshot + cursor — never live draft on cursor change
      if (isGraphAlgo(id) && snap.input) {
        const frag = sceneToHashFragment({
          version: SCENE_PROTOCOL_VERSION,
          algoId: id,
          input: snap.input,
          params: snap.params,
          seed: snap.seed,
          stepIndex: clamped,
          runSnapshot: { ...snap },
        })
        if (frag && frag.length < 1800) {
          const base = window.location.hash.split('?')[0] || `#/algo/${id}`
          window.history.replaceState(null, '', `${base}?${frag}`)
        }
      }
      return true
    },
    [validateAndBuild, id, draft, hasRun, steps.length, runId],
  )

  useEffect(() => {
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
    setSteps([])
    setTrace(undefined)
    setHasRun(false)
    setPlaybackKey((k) => k + 1)
    setSceneWarn(null)
    setCursorIndex(0)
    setSeekCommand(null)
    setRunSnapshot(null)
    setDraftDirty(false)
    setStaleResult(false)
    pendingAutoRun.current = false
    pendingSeek.current = 0

    const loaded = loadSceneFromHash(window.location.hash)
    if (!loaded.ok) {
      if (window.location.hash.includes('scene=')) {
        setSceneWarn(`场景加载失败：${loaded.reason}`)
      }
      return
    }
    if (loaded.scene.algoId !== id) return

    // Restore input then auto-run + seek
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
        pendingSeek.current = loaded.scene.stepIndex ?? 0
        pendingAutoRun.current = true
      } else {
        setSceneWarn('场景 input 结构非法：缺少 n/edges')
      }
    }
  }, [id])

  // After draft restored from scene, run once and seek
  useEffect(() => {
    if (!pendingAutoRun.current) return
    if (!id || !algo) return
    pendingAutoRun.current = false
    executeOnce(pendingSeek.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional after scene draft restore
  }, [draft.graph, id])

  const onRestoreDefaults = () => {
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
    setSceneWarn(null)
  }

  const onRun = () => {
    executeOnce(0)
  }

  const onCancel = () => {
    cancelRef.current.cancelled = true
  }

  const onResetPlayback = () => {
    seekReqRef.current += 1
    setSeekCommand({ requestId: seekReqRef.current, target: 0 })
    setCursorIndex(0)
  }

  /** Notify-only: update cursor + scene from snapshot — do NOT set seekCommand */
  const onStepChange = useCallback(
    (idx: number) => {
      setCursorIndex(idx)
      if (isGraphAlgo(id) && runSnapshot && hasRun) {
        const frag = sceneToHashFragment({
          version: SCENE_PROTOCOL_VERSION,
          algoId: id!,
          input: runSnapshot.input,
          params: runSnapshot.params,
          seed: runSnapshot.seed,
          stepIndex: idx,
          runSnapshot: { ...runSnapshot },
        })
        if (frag && frag.length < 1800) {
          const base = window.location.hash.split('?')[0] || `#/algo/${id}`
          window.history.replaceState(null, '', `${base}?${frag}`)
        }
      }
    },
    [id, runSnapshot, hasRun],
  )

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

      <div className={`input-panel${errors.length ? ' has-errors shake-pending' : ''}${shakeKey > 0 && errors.length ? ' shake' : ''}`}>
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
            ? '教学：完整轨迹步骤（适合跟步）。一次「运行」只求解一次。'
            : '实验：轻量轨迹/计数为主；复杂度勿用 DOM 计时证明。一次「运行」只求解一次。'}{' '}
          编辑草稿后点「运行」。演示上限：数组 ≤{DEMO_LIMITS.arrayLen}，图 n≤{DEMO_LIMITS.graphN}。
        </p>
        {sceneWarn && (
          <p className="input-errors" role="alert">
            {sceneWarn}
          </p>
        )}

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

        {id === 'nQueens' && (
          <>
            <label>
              n
              <input value={draft.nQueensN} onChange={(e) => patch({ nQueensN: e.target.value })} />
            </label>
            <label>
              模式
              <select
                value={draft.nQueensMode}
                onChange={(e) => patch({ nQueensMode: e.target.value as 'one' | 'all' })}
              >
                <option value="one">求一个解</option>
                <option value="all">全部解</option>
              </select>
            </label>
          </>
        )}
        {id === 'matrixChain' && (
          <label>
            维度 dims（逗号分隔）
            <input value={draft.matrixDims} onChange={(e) => patch({ matrixDims: e.target.value })} />
          </label>
        )}
        {id === 'huffman' && (
          <>
            <label>
              符号
              <input value={draft.huffmanSymbols} onChange={(e) => patch({ huffmanSymbols: e.target.value })} />
            </label>
            <label>
              频率
              <input value={draft.huffmanFreqs} onChange={(e) => patch({ huffmanFreqs: e.target.value })} />
            </label>
          </>
        )}
        {id === 'knapsack01' && (
          <>
            <label>
              重量
              <input value={draft.knapsackWeights} onChange={(e) => patch({ knapsackWeights: e.target.value })} />
            </label>
            <label>
              价值
              <input value={draft.knapsackValues} onChange={(e) => patch({ knapsackValues: e.target.value })} />
            </label>
            <label>
              容量 W
              <input value={draft.knapsackW} onChange={(e) => patch({ knapsackW: e.target.value })} />
            </label>
            <p className="hint">
              多策略对比见 <Link to="/teach/knapsack">教学单元</Link>。
            </p>
          </>
        )}
        {id === 'activitySelection' && (
          <p className="hint">本算法使用内置示例；点击「运行」生成步骤。</p>
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
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" onClick={onResetPlayback} disabled={!hasRun}>
            重置播放
          </button>
        </div>
        {hasRun && (
          <p className="hint muted">
            当前运行 #{runId}（RunSnapshot {runSnapshot?.runId ?? '—'}）· 模式 {draft.mode} · cursor={cursorIndex}
            {draftDirty && ' · 草稿已改，显示上一轮运行'}
          </p>
        )}
        {hasRun && draftDirty && (
          <p className="dirty-banner" role="status">
            输入已编辑，正在显示<strong>上一轮运行</strong>的轨迹。点击「运行」以新快照重算。
          </p>
        )}
      </div>

      {hasRun ? (
        <WorkbenchLayout
          title={algo.meta.title}
          inputSummary={
            draftDirty
              ? '草稿已改 · 显示上一轮运行'
              : `run #${runId} · cursor ${cursorIndex + 1}/${Math.max(steps.length, 1)}`
          }
          viz={
            <>
              {isGraphAlgo(id) && (
                <div className={`result-panel-enter${staleResult ? ' is-stale' : ''}`}>
                  {staleResult && <span className="stale-result-badge">上一轮结果</span>}
                  <GraphResultPanel algoId={id} steps={steps} />
                </div>
              )}
              <Visualizer
                key={playbackKey}
                steps={steps}
                trace={trace}
                seekCommand={seekCommand}
                runId={runSnapshot?.runId ?? runId}
                onStepIndexChange={onStepChange}
                staleResult={staleResult || draftDirty}
                finalAnswer={
                  steps.length ? (
                    <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                      {JSON.stringify(steps[steps.length - 1]?.result ?? steps[steps.length - 1]?.vars, null, 2)?.slice(0, 600)}
                    </pre>
                  ) : null
                }
              />
            </>
          }
          code={(() => {
            const catalog = id ? getCatalog(id) : null
            if (catalog) {
              return (
                <CodeBrowser
                  document={catalog.typescript}
                  execAnchorId={
                    steps[cursorIndex]?.codeRefs?.[0]?.anchorId ?? steps[cursorIndex]?.phase
                  }
                  activeLine={steps[cursorIndex]?.codeLine}
                  pseudocode={catalog.pseudocode?.source}
                />
              )
            }
            return (
              <div className="code-stub muted">
                <div className="panel-title">参考代码</div>
                <pre className="code-pre">{(algo.meta.code as string) || '（暂无目录文档）'}</pre>
              </div>
            )
          })()}
        />
      ) : (
        <div className="viz-empty">调整输入后点击「运行」开始可视化。</div>
      )}
    </div>
  )
}
