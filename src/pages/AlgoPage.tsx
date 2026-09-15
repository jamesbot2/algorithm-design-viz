import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import { getAlgo } from '../algorithms/registry'
import type { Trace } from '../core/trace/types'
import { createCancelFlag, runAlgoAsync, yieldToEventLoop } from '../core/runner'
import { runSyncGeneratorCancelable } from '../core/runner/chunkedSolve'
import { pickPrimaryCodeRef, weakContextRefs } from '../utils/codeRefs'
import { formatFinalAnswer } from '../utils/formatAnswer'
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
import { createPreviewForAlgo } from '../preview/createPreview'

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
  const activeRunToken = useRef(0)
  const [runLabel, setRunLabel] = useState<'idle' | 'running' | 'cancelled' | 'truncated'>('idle')
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
    async (seekTo = 0): Promise<boolean> => {
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
        const thisToken = activeRunToken.current
        const maxSteps = draft.mode === 'experiment' ? 200 : 5000
        const heavy = id === 'nQueens' || id === 'knapsack01' || (id?.startsWith('knapsack') ?? false)
        const outcome = await runAlgoAsync({
          algoId: id!,
          implName: entry.meta.implName,
          implVersion: entry.meta.implVersion,
          validate: entry.validate,
          solveAsync: async (input, ctx) => {
            if (ctx.cancel.cancelled) {
              return { steps: [], result: { ok: false }, status: 'cancelled' as const }
            }
            if (heavy) {
              const chunked = await runSyncGeneratorCancelable(
                () => {
                  const solved = entry.solve!(input)
                  return (solved.trace.steps as Step[]) ?? []
                },
                { cancel: ctx.cancel, budget: { maxSteps }, chunkEvery: heavy ? 8 : 32 },
              )
              if (chunked.status === 'cancelled' || ctx.cancel.cancelled) {
                return { steps: chunked.steps, result: { ok: false }, status: 'cancelled' as const }
              }
              let steps = chunked.steps
              if (chunked.truncated) {
                const last = steps[steps.length - 1]
                if (last && !String(last.message).includes('截断')) {
                  steps = [
                    ...steps.slice(0, -1),
                    {
                      ...last,
                      message: `${last.message}（采样截断）`,
                      vars: { ...last.vars, truncated: true },
                    },
                  ]
                }
              }
              return { steps, result: { ok: true }, status: 'ok' as const }
            }
            await yieldToEventLoop()
            if (ctx.cancel.cancelled) {
              return { steps: [], result: { ok: false }, status: 'cancelled' as const }
            }
            const solved = entry.solve!(input)
            if (ctx.cancel.cancelled) {
              return {
                steps: (solved.trace.steps as Step[]) ?? [],
                result: solved.result,
                status: 'cancelled' as const,
              }
            }
            let steps = (solved.trace.steps as Step[]) ?? []
            let truncated = false
            if (steps.length > maxSteps) {
              steps = steps.slice(0, maxSteps)
              truncated = true
            }
            if (truncated) {
              const last = steps[steps.length - 1]
              if (last && !String(last.message).includes('截断')) {
                steps = [
                  ...steps.slice(0, -1),
                  { ...last, message: `${last.message}（采样截断）`, vars: { ...last.vars, truncated: true } },
                ]
              }
            }
            return {
              steps,
              result: solved.result,
              status: solved.trace.status,
            }
          },
          rawInput: built.registryInput,
          budget: {
            maxSteps,
            maxInputSize: budgetMax,
            inputSize: built.inputSize,
          },
          cancel: cancelRef.current,
          freeze: true,
          runId: `ui-${thisToken}`,
          isStale: (rid) => {
            const n = Number(String(rid).replace('ui-', ''))
            return n !== activeRunToken.current
          },
        })

        // Stale run — do not write back
        if (thisToken !== activeRunToken.current) {
          return false
        }

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
            // still show truncated steps — distinct from cancelled
            outSteps = outcome.steps
            outTrace = outcome.trace
            setRunLabel('truncated')
          } else if (outcome.status === 'validation_error') {
            setShakeKey((k) => k + 1)
            if (hasRun && steps.length > 0) setStaleResult(true)
            else setHasRun(false)
            return false
          }
        } else if (outcome.status === 'cancelled') {
          setErrors([{ field: 'run', reason: '已取消' }])
          setRunLabel('cancelled')
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
    void executeOnce(pendingSeek.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional after scene draft restore
  }, [draft.graph, id])

  const onRestoreDefaults = () => {
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
    setSceneWarn(null)
  }

  const onRun = () => {
    void (async () => {
      const token = ++activeRunToken.current
      cancelRef.current = createCancelFlag()
      setRunning(true)
      setRunLabel('running')
      try {
        await yieldToEventLoop()
        if (cancelRef.current.cancelled || token !== activeRunToken.current) {
          if (token === activeRunToken.current) {
            setRunLabel('cancelled')
            setErrors([{ field: 'run', reason: '已取消' }])
          }
          return
        }
        const ok = await executeOnce(0)
        // Heavy path: if still running flag and sync finished, mark truncated from errors
        if (token !== activeRunToken.current) return // stale — no write-back
        if (cancelRef.current.cancelled) {
          setRunLabel('cancelled')
          setErrors([{ field: 'run', reason: '已取消' }])
          return
        }
        if (ok === false) {
          /* validation errors already set */
        } else {
          setRunLabel('idle')
        }
      } finally {
        if (token === activeRunToken.current) {
          setRunning(false)
          setRunLabel((lab) => (lab === 'running' ? 'idle' : lab))
        }
      }
    })()
  }

  const onCancel = () => {
    cancelRef.current.cancelled = true
    setRunLabel('cancelled')
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

  const previewStep = useMemo(() => {
    if (!id) return null
    return createPreviewForAlgo(id, draft)
  }, [id, draft])

  const displaySteps = hasRun && steps.length ? steps : previewStep ? [previewStep] : []
  const isPreviewMode = !(hasRun && steps.length)

  const [theoryOpen, setTheoryOpen] = useState(false)
  const [running, setRunning] = useState(false)

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
      <div className="page-header page-header-compact">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>{algo.meta.title}</h1>
        <p className="complexity">复杂度：{algo.meta.complexity}</p>
        <button
          type="button"
          className="ghost theory-toggle"
          aria-expanded={theoryOpen}
          onClick={() => setTheoryOpen((o) => !o)}
        >
          {theoryOpen ? '收起说明' : '展开说明 / 理论'}
        </button>
        {theoryOpen && (
          <div className="theory-expandable">
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
        )}
      </div>

      <div
        className={`input-panel input-panel-v4${errors.length ? ' has-errors shake-pending' : ''}${shakeKey > 0 && errors.length ? ' shake' : ''}`}
        data-testid="input-panel"
      >
        <h3>输入控制</h3>
        <div className="mode-toggle control-row-item">
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

        <div className="input-grid" data-testid="input-grid">
          {needsArray && (
            <label className="field-array">
              数组（逗号分隔）
              <input value={draft.arrayText} onChange={(e) => patch({ arrayText: e.target.value })} />
            </label>
          )}
          {id === 'binarySearch' && (
            <>
              <label className="field-target">
                目标值
                <input value={draft.target} onChange={(e) => patch({ target: e.target.value })} />
              </label>
              <label className="field-mode">
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
              <label className="field-array">
                串 X
                <input value={draft.strA} onChange={(e) => patch({ strA: e.target.value })} />
              </label>
              <label className="field-array">
                串 Y
                <input value={draft.strB} onChange={(e) => patch({ strB: e.target.value })} />
              </label>
            </>
          )}
          {id === 'editDistance' && (
            <>
              <label className="field-array">
                串 A
                <input value={draft.editA} onChange={(e) => patch({ editA: e.target.value })} />
              </label>
              <label className="field-array">
                串 B
                <input value={draft.editB} onChange={(e) => patch({ editB: e.target.value })} />
              </label>
            </>
          )}
          {id === 'kmp' && (
            <>
              <label className="field-array">
                文本
                <input value={draft.text} onChange={(e) => patch({ text: e.target.value })} />
              </label>
              <label className="field-array">
                模式
                <input value={draft.pattern} onChange={(e) => patch({ pattern: e.target.value })} />
              </label>
            </>
          )}

          {isGraphAlgo(id) && draft.graph && (
            <div className="field-graph">
              <GraphInput
                key={`${id}-draft`}
                algoId={id}
                value={draft.graph}
                onChange={(g) => patch({ graph: g })}
              />
            </div>
          )}

          {id === 'nQueens' && (
            <>
              <label className="field-target">
                n
                <input value={draft.nQueensN} onChange={(e) => patch({ nQueensN: e.target.value })} />
              </label>
              <label className="field-mode">
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
            <label className="field-array">
              维度 dims（逗号分隔）
              <input value={draft.matrixDims} onChange={(e) => patch({ matrixDims: e.target.value })} />
            </label>
          )}
          {id === 'huffman' && (
            <>
              <label className="field-array">
                符号
                <input value={draft.huffmanSymbols} onChange={(e) => patch({ huffmanSymbols: e.target.value })} />
              </label>
              <label className="field-array">
                频率
                <input value={draft.huffmanFreqs} onChange={(e) => patch({ huffmanFreqs: e.target.value })} />
              </label>
            </>
          )}
          {id === 'knapsack01' && (
            <>
              <label className="field-array">
                重量
                <input value={draft.knapsackWeights} onChange={(e) => patch({ knapsackWeights: e.target.value })} />
              </label>
              <label className="field-array">
                价值
                <input value={draft.knapsackValues} onChange={(e) => patch({ knapsackValues: e.target.value })} />
              </label>
              <label className="field-target">
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
        </div>

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

        <div className="input-actions control-row" data-testid="input-actions">
          <button type="button" onClick={onRestoreDefaults}>
            恢复默认示例
          </button>
          <button type="button" className="primary" onClick={onRun} data-testid="run-btn">
            运行
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={!running}
            data-testid="cancel-btn"
            title={running ? '取消当前运行' : '空闲时不可取消'}
          >
            取消
          </button>
          {running && <span className="muted" data-testid="run-status">运行中…</span>}
          {!running && runLabel === 'cancelled' && (
            <span className="run-status-cancelled" data-testid="run-status">已取消</span>
          )}
          {!running && runLabel === 'truncated' && (
            <span className="run-status-truncated" data-testid="run-status">采样截断</span>
          )}
          <button type="button" onClick={onResetPlayback} disabled={!hasRun}>
            重置播放
          </button>
        </div>
        {hasRun && draftDirty && (
          <p className="dirty-banner" role="status">
            输入已编辑，正在显示<strong>上一轮运行</strong>的轨迹。点击「运行」以新快照重算。
          </p>
        )}
        <details className="debug-details muted">
          <summary>调试信息</summary>
          <p className="hint">
            run #{runId} · RunSnapshot {runSnapshot?.runId ?? '—'} · 模式 {draft.mode} · cursor=
            {cursorIndex}
            {draftDirty && ' · 草稿已改'}
            {isPreviewMode && ' · 预览（未运行）'}
          </p>
        </details>
      </div>

      <WorkbenchLayout
        hideTitle
        title={algo.meta.title}
        inputSummary={
          isPreviewMode
            ? '预览 · 尚未运行'
            : draftDirty
              ? '草稿已改 · 显示上一轮运行'
              : `步骤 ${cursorIndex + 1}/${Math.max(steps.length, 1)}`
        }
        transport={
          hasRun && steps[cursorIndex] ? (
            <div className="workbench-inspector" data-testid="workbench-inspector">
              <strong>检查器</strong>
              <span className="muted"> · {steps[cursorIndex]?.message}</span>
              {steps[cursorIndex]?.frameId && (
                <span className="muted"> · frame {steps[cursorIndex]?.frameId}</span>
              )}
              {steps[cursorIndex]?.vars && (
                <div className="muted" style={{ marginTop: 4 }}>
                  vars:{' '}
                  {Object.entries(steps[cursorIndex]!.vars!)
                    .slice(0, 8)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(' · ')}
                </div>
              )}
            </div>
          ) : null
        }
        viz={
          <>
            {isGraphAlgo(id) && hasRun && (
              <div className={`result-panel-enter${staleResult ? ' is-stale' : ''}`}>
                {staleResult && <span className="stale-result-badge">上一轮结果</span>}
                <GraphResultPanel algoId={id} steps={steps} />
              </div>
            )}
            <Visualizer
              key={hasRun ? (runSnapshot?.runId ?? runId) : 'preview'}
              steps={displaySteps}
              trace={hasRun ? trace : undefined}
              seekCommand={hasRun ? seekCommand : null}
              runId={hasRun ? (runSnapshot?.runId ?? runId) : 'preview'}
              onStepIndexChange={hasRun ? onStepChange : undefined}
              staleResult={hasRun && (staleResult || draftDirty)}
              finalAnswer={
                hasRun && steps.length ? (
                  <div className="final-answer-human" data-testid="final-answer">
                    {formatFinalAnswer(
                      steps[steps.length - 1]?.result,
                      steps[steps.length - 1]?.vars,
                    )}
                    {runLabel === 'cancelled' && (
                      <div className="run-status-cancelled">状态：已取消</div>
                    )}
                    {runLabel === 'truncated' && (
                      <div className="run-status-truncated">状态：采样截断</div>
                    )}
                  </div>
                ) : null
              }
            />
          </>
        }
        code={(() => {
          const catalog = id ? getCatalog(id) : null
          if (catalog) {
            const step = isPreviewMode ? undefined : steps[cursorIndex]
            const primary = pickPrimaryCodeRef(step)
            const contexts = weakContextRefs(step)
            const unmapped =
              !isPreviewMode &&
              !!step &&
              !primary &&
              !step.codeLine &&
              step.phase !== 'preview'
            return (
              <CodeBrowser
                documents={catalog}
                execAnchorId={isPreviewMode ? undefined : primary?.anchorId}
                contextAnchorIds={contexts.map((c) => c.anchorId)}
                activeLine={isPreviewMode ? undefined : step?.codeLine}
                unmapped={unmapped}
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
    </div>
  )

}
