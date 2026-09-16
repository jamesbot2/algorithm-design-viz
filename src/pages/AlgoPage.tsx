import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import { getAlgo } from '../algorithms/registry'
import type { Trace } from '../core/trace/types'
import {
  createCancelFlag,
  runAlgoAsync,
  yieldToEventLoop,
  makeRunIdentity,
  isRunCurrent,
  isDraftDirtyVersusSnapshot,
  maybeAwaitSolveBarrier,
  type RunIdentity,
} from '../core/runner'
import { runHeavyPreferWorker } from '../core/runner/runHeavy'
import { pickPrimaryCodeRef, weakContextRefs } from '../utils/codeRefs'
import FinalAnswerResult from '../components/result/FinalAnswerResult'
import Visualizer from '../components/Visualizer'
import GraphInput, { type GraphValidity } from '../components/graph/GraphInput'
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
import { parseIntStrict, parseNonNegInt, parseNumberList, assertNonNegIntegers, type FieldError } from '../utils/parseInput'
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
  const [graphValidity, setGraphValidity] = useState<GraphValidity | null>(null)
  const [graphSyncKey, setGraphSyncKey] = useState('init')
  const cancelRef = useRef(createCancelFlag())
  /** Monotonic generation; also invalidates prior identities. */
  const generationRef = useRef(0)
  const activeIdentityRef = useRef<RunIdentity | null>(null)
  const inputRevisionRef = useRef(0)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const idRef = useRef(id)
  idRef.current = id
  const [runLabel, setRunLabel] = useState<'idle' | 'running' | 'cancelled' | 'truncated'>('idle')
  const pendingAutoRun = useRef(false)
  const pendingSeek = useRef(0)
  const [chromeHost, setChromeHost] = useState<HTMLDivElement | null>(null)

  const invalidateActiveRun = useCallback((reason: string) => {
    void reason
    cancelRef.current.cancelled = true
    generationRef.current += 1
    activeIdentityRef.current = null
  }, [])

  const patch = useCallback((partial: Partial<DraftState>) => {
    inputRevisionRef.current += 1
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
      if (graphValidity && !graphValidity.canRun) {
        const errs: FieldError[] = []
        if (graphValidity.nError) errs.push({ field: 'n', reason: graphValidity.nError })
        if (graphValidity.startError) errs.push({ field: 'start', reason: graphValidity.startError })
        if (!graphValidity.parseOk) {
          errs.push({ field: 'edges', reason: graphValidity.parseError ?? '边列表解析失败' })
        }
        for (const iss of graphValidity.issues) {
          if (errs.some((e) => e.field === iss.field && e.reason === iss.reason)) continue
          errs.push({ field: iss.field, reason: iss.reason })
        }
        if (!errs.length) errs.push({ field: 'graph', reason: '图草稿尚未通过校验' })
        return { ok: false, errors: errs }
      }
      // Prefer shared runnable snapshot from GraphInput validator (same as UI canRun)
      if (graphValidity?.runnable) {
        const runnable = graphValidity.runnable
        const { n, edges, start, directed } = runnable
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
      const W = parseNonNegInt(draft.knapsackW, 'W')
      errs.push(...wts.errors, ...vals.errors, ...W.errors)
      errs.push(...assertNonNegIntegers(wts.values, 'weights', { allowZero: false }))
      errs.push(...assertNonNegIntegers(vals.values, 'values', { allowZero: true }))
      if (wts.values.length !== vals.values.length) {
        errs.push({ field: 'weights', reason: 'weights 与 values 长度须一致' })
      }
      // Discrete DP: never call solver on illegal input (no NaN / non-int / Inf capacity)
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
  }, [algo, id, draft, graphValidity])

  /** Single execution path: validate → run once → {result, steps/trace}. Identity captured at start. */
  const executeOnce = useCallback(
    async (seekTo = 0, opts?: { identity?: RunIdentity }): Promise<boolean> => {
      const algoIdAtStart = id
      if (!algoIdAtStart) return false

      const built = validateAndBuild()
      if (!built.ok) {
        // Validation failures are sync — only write if still on same algo page
        if (idRef.current !== algoIdAtStart) return false
        setErrors(built.errors)
        setShakeKey((k) => k + 1)
        if (hasRun && steps.length > 0) {
          setStaleResult(true)
        } else {
          setHasRun(false)
        }
        return false
      }

      const submittedDraft = draftRef.current
      const inputSnapshot = isGraphAlgo(algoIdAtStart)
        ? structuredClone(submittedDraft.graph)
        : structuredClone(built.registryInput)
      // Immutable identity at start: keep generation/runId from caller, always freeze submitted input
      const base = opts?.identity
      const gen = base?.generation ?? generationRef.current
      if (generationRef.current !== gen) {
        return false
      }
      const identity = makeRunIdentity({
        generation: gen,
        algoId: algoIdAtStart,
        inputSnapshot,
        inputRevision: base?.inputRevision ?? inputRevisionRef.current,
        runId: base?.runId,
      })
      // Bind this attempt as active (replace-run already bumped generation in onRun)
      activeIdentityRef.current = identity
      cancelRef.current.cancelled = false

      const stillCurrent = () => isRunCurrent(activeIdentityRef.current, identity)

      if (stillCurrent()) {
        setErrors([])
        setStaleResult(false)
      }

      const entry = getAlgo(algoIdAtStart)
      let outSteps: Step[] = built.fallbackSteps ?? []
      let outTrace: Trace | undefined
      let outcomeStatus: string | undefined

      const budgetMax =
        submittedDraft.mode === 'experiment'
          ? DEMO_LIMITS.arrayLen * DEMO_LIMITS.arrayLen
          : DEMO_LIMITS.arrayLen * 200

      if (entry?.validate && entry?.solve) {
        const maxSteps = submittedDraft.mode === 'experiment' ? 200 : 5000
        const heavy =
          algoIdAtStart === 'nQueens' ||
          algoIdAtStart === 'knapsack01' ||
          algoIdAtStart.startsWith('knapsack')
        const outcome = await runAlgoAsync({
          algoId: algoIdAtStart,
          implName: entry.meta.implName,
          implVersion: entry.meta.implVersion,
          validate: entry.validate,
          solveAsync: async (input, ctx) => {
            await maybeAwaitSolveBarrier({
              algoId: algoIdAtStart,
              runId: identity.runId,
              generation: identity.generation,
            })
            if (!stillCurrent() || ctx.cancel.cancelled) {
              return { steps: [], result: { ok: false }, status: 'cancelled' as const }
            }
            if (heavy) {
              const preferWorker =
                algoIdAtStart === 'nQueens' ||
                algoIdAtStart === 'knapsackBrute' ||
                algoIdAtStart.includes('brute')
              const workerReq =
                algoIdAtStart === 'nQueens'
                  ? {
                      kind: 'nQueens' as const,
                      n: Number((input as { n?: number }).n ?? 4),
                      mode: ((input as { mode?: 'one' | 'all' }).mode ?? 'all') as 'one' | 'all',
                      runId: identity.runId,
                    }
                  : null
              const heavyOut = await runHeavyPreferWorker(
                () => {
                  const solved = entry.solve!(input)
                  return (solved.trace.steps as Step[]) ?? []
                },
                {
                  cancel: ctx.cancel,
                  runId: identity.runId,
                  maxSteps,
                  preferWorker: Boolean(preferWorker),
                  workerRequest: workerReq,
                },
              )
              if (!stillCurrent() || heavyOut.status === 'cancelled' || ctx.cancel.cancelled) {
                return { steps: heavyOut.steps, result: { ok: false }, status: 'cancelled' as const }
              }
              let hs = heavyOut.steps
              if (heavyOut.truncated) {
                const last = hs[hs.length - 1]
                if (last && !String(last.message).includes('截断')) {
                  hs = [
                    ...hs.slice(0, -1),
                    {
                      ...last,
                      message: `${last.message}（采样截断）`,
                      vars: { ...last.vars, truncated: true },
                    },
                  ]
                }
              }
              return { steps: hs, result: { ok: true }, status: 'ok' as const }
            }
            await yieldToEventLoop()
            if (!stillCurrent() || ctx.cancel.cancelled) {
              return { steps: [], result: { ok: false }, status: 'cancelled' as const }
            }
            const solved = entry.solve!(input)
            if (!stillCurrent() || ctx.cancel.cancelled) {
              return {
                steps: (solved.trace.steps as Step[]) ?? [],
                result: solved.result,
                status: 'cancelled' as const,
              }
            }
            let ss = (solved.trace.steps as Step[]) ?? []
            let truncated = false
            if (ss.length > maxSteps) {
              ss = ss.slice(0, maxSteps)
              truncated = true
            }
            if (truncated) {
              const last = ss[ss.length - 1]
              if (last && !String(last.message).includes('截断')) {
                ss = [
                  ...ss.slice(0, -1),
                  { ...last, message: `${last.message}（采样截断）`, vars: { ...last.vars, truncated: true } },
                ]
              }
            }
            return {
              steps: ss,
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
          runId: identity.runId,
          isStale: () => !stillCurrent(),
        })

        if (!stillCurrent()) {
          return false
        }

        outcomeStatus = outcome.status
        if (outcome.status === 'validation_error' || outcome.status === 'budget_exceeded') {
          const msgs = (outcome.errors ?? []).map((e) =>
            'message' in e ? e.message : String(e),
          )
          if (!stillCurrent()) return false
          setErrors(
            msgs.length
              ? msgs.map((m) => ({ field: 'run', reason: m }))
              : [{ field: 'run', reason: outcome.status }],
          )
          if (outcome.status === 'budget_exceeded' && outcome.steps?.length) {
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
          if (!stillCurrent()) return false
          setErrors([{ field: 'run', reason: '已取消' }])
          setRunLabel('cancelled')
          outSteps = outcome.steps ?? []
          outTrace = outcome.trace
        } else {
          outSteps = outcome.steps ?? outSteps
          outTrace = outcome.trace
        }
      } else {
        await maybeAwaitSolveBarrier({
          algoId: algoIdAtStart,
          runId: identity.runId,
          generation: identity.generation,
        })
        if (!stillCurrent()) return false
        outSteps = built.fallbackSteps ?? []
        outTrace = undefined
      }

      if (!stillCurrent()) return false

      const clamped = Math.max(0, Math.min(seekTo, Math.max(0, outSteps.length - 1)))
      const nextRunNumeric = runId + 1
      const snap = freezeRunSnapshot({
        algoId: algoIdAtStart,
        version: SCENE_PROTOCOL_VERSION,
        input: inputSnapshot,
        params: { mode: submittedDraft.mode },
        seed: 0,
        runId: createRunId(),
      })

      // Dirty = current live draft vs displayed result snapshot (not blindly false)
      const live = draftRef.current
      const liveSlice = isGraphAlgo(algoIdAtStart)
        ? live.graph
        : // rebuild comparable slice from live draft for common fields
          (built.registryInput as object)
      // Prefer comparing nQueens / registry against identity snapshot when user edited
      let dirtyNow = false
      if (algoIdAtStart === 'nQueens') {
        dirtyNow = isDraftDirtyVersusSnapshot(
          { n: Number(live.nQueensN), mode: live.nQueensMode },
          identity.inputSnapshot,
        )
        // Also treat text drift (n=9 typed) vs snapshot n=8
        if (!dirtyNow) {
          dirtyNow = String(live.nQueensN) !== String((identity.inputSnapshot as { n?: number })?.n)
        }
      } else if (isGraphAlgo(algoIdAtStart)) {
        dirtyNow = isDraftDirtyVersusSnapshot(live.graph, identity.inputSnapshot)
      } else {
        dirtyNow = inputRevisionRef.current !== identity.inputRevision
      }
      void liveSlice
      void outcomeStatus

      setSteps(outSteps)
      setTrace(outTrace)
      setRunSnapshot(snap)
      setRunId(nextRunNumeric)
      setDraftDirty(dirtyNow)
      setCursorIndex(clamped)
      seekReqRef.current += 1
      setSeekCommand({ requestId: seekReqRef.current, target: clamped })
      setHasRun(true)
      // V10-03: after successful run, collapse input so demo/stage keeps the height budget.
      // User re-opens via「编辑输入」— same session, same draft.
      setInputEditing(false)

      // Persist scene from RunSnapshot + cursor — never live draft on cursor change
      if (isGraphAlgo(algoIdAtStart) && snap.input) {
        const frag = sceneToHashFragment({
          version: SCENE_PROTOCOL_VERSION,
          algoId: algoIdAtStart,
          input: snap.input,
          params: snap.params,
          seed: snap.seed,
          stepIndex: clamped,
          runSnapshot: { ...snap },
        })
        if (frag && frag.length < 1800) {
          const base = window.location.hash.split('?')[0] || `#/algo/${algoIdAtStart}`
          window.history.replaceState(null, '', `${base}?${frag}`)
        }
      }
      return true
    },
    [validateAndBuild, id, hasRun, steps.length, runId],
  )

  useEffect(() => {
    // Invalidate / cancel any in-flight work from previous algo (same component instance)
    invalidateActiveRun('algoId-change')
    cancelRef.current = createCancelFlag()
    setRunning(false)
    setRunLabel('idle')

    setDraft(defaultDraft(id ?? ''))
    inputRevisionRef.current = 0
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

    // Restore input then auto-run + seek (same identity path as run button)
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
  }, [id, invalidateActiveRun])

  // After draft restored from scene, run once and seek via same onRun identity path
  useEffect(() => {
    if (!pendingAutoRun.current) return
    if (!id || !algo) return
    pendingAutoRun.current = false
    const seekTo = pendingSeek.current
    void (async () => {
      cancelRef.current.cancelled = true
      const gen = ++generationRef.current
      cancelRef.current = createCancelFlag()
      activeIdentityRef.current = null
      const seedIdentity = makeRunIdentity({
        generation: gen,
        algoId: id,
        inputSnapshot: null,
        inputRevision: inputRevisionRef.current,
      })
      setRunning(true)
      setRunLabel('running')
      try {
        await yieldToEventLoop()
        if (generationRef.current !== gen) return
        const ok = await executeOnce(seekTo, { identity: seedIdentity })
        if (generationRef.current !== gen) return
        if (cancelRef.current.cancelled) {
          setRunLabel('cancelled')
          setErrors([{ field: 'run', reason: '已取消' }])
          return
        }
        if (ok !== false) setRunLabel('idle')
      } finally {
        if (generationRef.current === gen) {
          setRunning(false)
          setRunLabel((lab) => (lab === 'running' ? 'idle' : lab))
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional after scene draft restore
  }, [draft.graph, id])

  // Unmount: invalidate so late resolve/reject/finally cannot write
  useEffect(() => {
    return () => {
      invalidateActiveRun('unmount')
    }
  }, [invalidateActiveRun])

  const onRestoreDefaults = () => {
    inputRevisionRef.current += 1
    setDraft(defaultDraft(id ?? ''))
    setErrors([])
    setSceneWarn(null)
    setGraphSyncKey(`restore-${Date.now()}`)
    setDraftDirty(true)
  }

  const onRun = () => {
    void (async () => {
      // Replace-run: cancel prior work and bump generation so old identities fail stillCurrent
      cancelRef.current.cancelled = true
      const gen = ++generationRef.current
      cancelRef.current = createCancelFlag()
      activeIdentityRef.current = null
      const algoIdAtStart = id
      if (!algoIdAtStart) return
      const seedIdentity = makeRunIdentity({
        generation: gen,
        algoId: algoIdAtStart,
        inputSnapshot: null,
        inputRevision: inputRevisionRef.current,
      })
      setRunning(true)
      setRunLabel('running')
      try {
        await yieldToEventLoop()
        if (generationRef.current !== gen || cancelRef.current.cancelled) {
          if (generationRef.current === gen) {
            setRunLabel('cancelled')
            setErrors([{ field: 'run', reason: '已取消' }])
          }
          return
        }
        const ok = await executeOnce(0, { identity: seedIdentity })
        if (generationRef.current !== gen) return
        if (cancelRef.current.cancelled) {
          setRunLabel('cancelled')
          setErrors([{ field: 'run', reason: '已取消' }])
          return
        }
        if (ok === false) {
          /* validation errors already set */
        } else if (generationRef.current === gen) {
          setRunLabel('idle')
        }
      } finally {
        if (generationRef.current === gen) {
          setRunning(false)
          setRunLabel((lab) => (lab === 'running' ? 'idle' : lab))
        }
      }
    })()
  }

  const onCancel = () => {
    cancelRef.current.cancelled = true
    // Keep identity so UI can show cancelled for *this* run; do not bump generation
    setRunLabel('cancelled')
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
  const [inputEditing, setInputEditing] = useState(false)
  const [running, setRunning] = useState(false)
  const theoryToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!theoryOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTheoryOpen(false)
        theoryToggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [theoryOpen])

  // Complex forms (graph / nQueens / DP strings) start expanded so fields stay operable;
  // simple array algos stay on summary until「编辑输入」.
  useEffect(() => {
    if (!id) return
    const complex =
      isGraphAlgo(id) ||
      id === 'nQueens' ||
      id === 'knapsack01' ||
      id === 'lcs' ||
      id === 'editDistance' ||
      id === 'matrixChain' ||
      id === 'huffman' ||
      id === 'kmp'
    setInputEditing(complex)
  }, [id])

  useEffect(() => {
    if (errors.length > 0) setInputEditing(true)
  }, [errors.length])

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

  const inputSummaryText = isPreviewMode
    ? '预览 · 尚未运行'
    : draftDirty
      ? '草稿已改 · 显示上一轮运行'
      : `步骤 ${cursorIndex + 1}/${Math.max(steps.length, 1)}`

  return (
    <div
      className="page algo-page"
      data-theory-open={theoryOpen ? '1' : '0'}
      data-input-editing={inputEditing ? '1' : '0'}
    >
      <div className="page-header page-header-compact">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>{algo.meta.title}</h1>
        <p className="complexity">复杂度：{algo.meta.complexity}</p>
        <button
          type="button"
          className="ghost theory-toggle"
          ref={theoryToggleRef}
          aria-expanded={theoryOpen}
          aria-controls="theory-drawer"
          onClick={() => setTheoryOpen((o) => !o)}
        >
          {theoryOpen ? '收起说明' : '展开说明 / 理论'}
        </button>
      </div>

      {theoryOpen && (
        <aside
          className="theory-drawer"
          id="theory-drawer"
          data-testid="theory-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="说明与理论"
        >
          <div className="theory-drawer-inner theory-expandable">
            <div className="theory-drawer-head">
              <strong>说明 / 理论</strong>
              <button type="button" className="ghost" data-testid="theory-close" onClick={() => setTheoryOpen(false)}>
                关闭
              </button>
            </div>
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
        </aside>
      )}

      <div
        className={`input-panel input-panel-v4 input-panel-v9${errors.length ? ' has-errors shake-pending' : ''}${shakeKey > 0 && errors.length ? ' shake' : ''}`}
        data-testid="input-panel"
        data-editing={inputEditing ? '1' : '0'}
      >
        <div className="input-summary-bar" data-testid="input-summary-bar">
          <div className="input-summary-text">
            <strong>输入</strong>
            <span className="muted"> · {inputSummaryText}</span>
            {isGraphAlgo(id) && draft.graph && (
              <span className="muted"> · 图 n={draft.graph.n}</span>
            )}
          </div>
          <button
            type="button"
            className="ghost"
            data-testid="input-edit-toggle"
            onClick={() => setInputEditing((v) => !v)}
          >
            {inputEditing ? '收起编辑' : '编辑输入'}
          </button>
        </div>
        <div className="input-panel-body" hidden={!inputEditing && !errors.length} data-testid="input-panel-body">
        <h3 className="sr-only">输入控制</h3>
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
                algoId={id}
                value={draft.graph}
                syncKey={`${id}-${graphSyncKey}`}
                onChange={(g) => patch({ graph: g })}
                onValidityChange={setGraphValidity}
              />
            </div>
          )}

          {id === 'nQueens' && (
            <>
              <label className="field-target">
                n
                <input
                  data-testid="nqueens-n"
                  value={draft.nQueensN}
                  onChange={(e) => patch({ nQueensN: e.target.value })}
                />
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
        </div>

        <div className="input-actions control-row input-actions-sticky" data-testid="input-actions">
          {inputEditing && (
            <button type="button" onClick={onRestoreDefaults}>
              恢复默认示例
            </button>
          )}
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
          <div className="workbench-transport-inner">
            <div
              ref={setChromeHost}
              className="workbench-chrome-host"
              data-testid="workbench-transport"
            />
          </div>
        }
        viz={
          <Visualizer
            key={hasRun ? (runSnapshot?.runId ?? runId) : 'preview'}
            steps={displaySteps}
            trace={hasRun ? trace : undefined}
            seekCommand={hasRun ? seekCommand : null}
            runId={hasRun ? (runSnapshot?.runId ?? runId) : 'preview'}
            onStepIndexChange={hasRun ? onStepChange : undefined}
            staleResult={hasRun && (staleResult || draftDirty)}
            chromePlacement="workbench"
            externalChromeHost={chromeHost}
            finalAnswer={
              hasRun && steps.length ? (
                <>
                  {isGraphAlgo(id) && (
                    <div className={`result-panel-enter${staleResult ? ' is-stale' : ''}`}>
                      {staleResult && <span className="stale-result-badge">上一轮结果</span>}
                      <GraphResultPanel algoId={id} steps={steps} />
                    </div>
                  )}
                  <FinalAnswerResult
                    result={steps[steps.length - 1]?.result}
                    vars={steps[steps.length - 1]?.vars}
                    statusNote={
                      <>
                        {runLabel === 'cancelled' && (
                          <div className="run-status-cancelled">状态：已取消</div>
                        )}
                        {runLabel === 'truncated' && (
                          <div className="run-status-truncated">状态：采样截断</div>
                        )}
                      </>
                    }
                  />
                </>
              ) : null
            }
          />
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
