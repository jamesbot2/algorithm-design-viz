import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { algorithms } from '../algorithms'
import { getAlgo } from '../algorithms/registry'
import type { Trace } from '../core/trace/types'
import Visualizer from '../components/Visualizer'
import * as binarySearch from '../algorithms/binarySearch'
import type { BinarySearchMode } from '../algorithms/binarySearch'
import * as knapsack01 from '../algorithms/knapsack01'
import * as lcs from '../algorithms/lcs'
import * as editDistance from '../algorithms/editDistance'
import * as activitySelection from '../algorithms/activitySelection'
import * as kmp from '../algorithms/kmp'
import type { Step } from '../types/step'
import { DEMO_LIMITS } from '../utils/limits'
import { parseIntStrict, parseNumberList, type FieldError } from '../utils/parseInput'

const DEFAULT_ARRAY = [5, 2, 8, 1, 9, 3, 7]

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
}

function defaultDraft(): DraftState {
  return {
    arrayText: DEFAULT_ARRAY.join(', '),
    target: String(binarySearch.meta.defaultTarget),
    strA: lcs.meta.defaultX,
    strB: lcs.meta.defaultY,
    editA: editDistance.meta.defaultA,
    editB: editDistance.meta.defaultB,
    text: kmp.meta.defaultText,
    pattern: kmp.meta.defaultPattern,
    bsMode: 'requireSorted',
  }
}

function defaultsForAlgo(id: string): DraftState {
  const d = defaultDraft()
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

  const [draft, setDraft] = useState<DraftState>(() => defaultsForAlgo(id ?? ''))
  const [errors, setErrors] = useState<FieldError[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [trace, setTrace] = useState<Trace | undefined>(undefined)
  const [runId, setRunId] = useState(0)
  const [playbackKey, setPlaybackKey] = useState(0)
  const [hasRun, setHasRun] = useState(false)

  // Reset draft when navigating to another algo
  useEffect(() => {
    setDraft(defaultsForAlgo(id ?? ''))
    setErrors([])
    setSteps([])
    setTrace(undefined)
    setHasRun(false)
    setPlaybackKey((k) => k + 1)
  }, [id])

  const patch = useCallback((partial: Partial<DraftState>) => {
    setDraft((d) => ({ ...d, ...partial }))
  }, [])

  const validateAndBuild = useCallback((): { ok: true; steps: Step[]; registryInput?: unknown } | { ok: false; errors: FieldError[] } => {
    if (!algo || !id) return { ok: false, errors: [{ field: 'algo', reason: '未找到算法' }] }
    const errs: FieldError[] = []

    const needsArray = ![
      'knapsack01',
      'lcs',
      'editDistance',
      'activitySelection',
      'kmp',
      'bfs',
      'dijkstra',
      'kruskal',
      'bellmanFord',
      'floyd',
      'prim',
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
      return { ok: true, steps: lcs.generateSteps([], draft.strA, draft.strB), registryInput: { x: draft.strA, y: draft.strB } }
    }

    if (id === 'editDistance') {
      if (draft.editA.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'editA', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (draft.editB.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'editB', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (errs.length) return { ok: false, errors: errs }
      return { ok: true, steps: editDistance.generateSteps([], draft.editA, draft.editB), registryInput: { a: draft.editA, b: draft.editB } }
    }

    if (id === 'kmp') {
      if (draft.text.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'text', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (draft.pattern.length > DEMO_LIMITS.stringLen) {
        errs.push({ field: 'pattern', reason: `长度超过上限 ${DEMO_LIMITS.stringLen}` })
      }
      if (errs.length) return { ok: false, errors: errs }
      return { ok: true, steps: kmp.generateSteps([], draft.text, draft.pattern), registryInput: { text: draft.text, pattern: draft.pattern } }
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
    if (
      id === 'bfs' ||
      id === 'dijkstra' ||
      id === 'kruskal' ||
      id === 'bellmanFord' ||
      id === 'floyd' ||
      id === 'prim'
    ) {
      return { ok: true, steps: algo.generateSteps([]), registryInput: {} }
    }

    if (errs.length) return { ok: false, errors: errs }
    if (!arr.length) {
      return { ok: false, errors: [{ field: 'array', reason: '数组不能为空' }] }
    }
    return { ok: true, steps: algo.generateSteps(arr), registryInput: { arr } }
  }, [algo, id, draft])

  const onRestoreDefaults = () => {
    setDraft(defaultsForAlgo(id ?? ''))
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
    // Prefer registry Trace when typed solve is available
    const entry = id ? getAlgo(id) : undefined
    if (entry?.solve) {
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
    'bfs',
    'dijkstra',
    'kruskal',
    'bellmanFord',
    'floyd',
    'prim',
    'nQueens',
    'matrixChain',
    'huffman',
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
      </div>

      <div className="input-panel">
        <h3>输入控制</h3>
        <p className="hint">
          编辑草稿后点击「运行」才会生成步骤（不会随输入即时重算）。演示上限：数组 ≤{DEMO_LIMITS.arrayLen}，
          字符串 ≤{DEMO_LIMITS.stringLen}。
        </p>
        {needsArray && (
          <label>
            数组（逗号分隔）
            <input
              value={draft.arrayText}
              onChange={(e) => patch({ arrayText: e.target.value })}
            />
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
        {(id === 'knapsack01' ||
          id === 'activitySelection' ||
          id === 'bfs' ||
          id === 'dijkstra' ||
          id === 'kruskal' ||
          id === 'bellmanFord' ||
          id === 'floyd' ||
          id === 'prim' ||
          id === 'nQueens' ||
          id === 'matrixChain' ||
          id === 'huffman') && (
          <p className="hint">本算法当前使用内置示例图/数据；点击「运行」生成步骤。背包多策略见 <a href="#/teach/knapsack">教学单元</a>。</p>
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
        {hasRun && (
          <p className="hint muted">
            当前运行 #{runId}（已快照输入）
          </p>
        )}
      </div>

      {hasRun ? (
        <Visualizer key={playbackKey} steps={steps} trace={trace} code={algo.meta.code as string | undefined} />
      ) : (
        <div className="viz-empty">调整输入后点击「运行」开始可视化。</div>
      )}
    </div>
  )
}
