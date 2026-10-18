import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Step } from '../../../types/step'
import { createCancelFlag, type CancelFlag } from '../../../core/runner'
import { runHeavyPreferWorker } from '../../../core/runner/runHeavy'
import { freezeSteps } from '../../../core/snapshot/freeze'
import { pickPrimaryCodeRef, weakContextRefs } from '../../../utils/codeRefs'
import Visualizer from '../../../components/Visualizer'
import CurrentStepData from '../../../components/data/CurrentStepData'
import PlaybackTransport from '../../../components/workbench/PlaybackTransport'
import { usePlaybackController } from '../../../components/workbench/usePlaybackController'
import { useWorkbenchPrefs } from '../../../components/workbench/useWorkbenchPrefs'
import WorkbenchLayout from '../../../components/workbench/WorkbenchLayout'
import CodeBrowser from '../../../components/codeBrowser/CodeBrowser'
import FinalAnswerResult from '../../../components/result/FinalAnswerResult'
import { advancedEntries, solveAdvanced, type AdvancedEntry, type AdvancedAlgoId } from '../../../algorithms/advanced/registry'
import type { ValidationIssue } from '../../../core/trace/types'
import type { TopicMeta } from '../catalog/types'
import AdvancedScene from '../components/AdvancedScene'
import { CATALOG_LOADERS, type CatalogBundle } from '../components/catalogLoaders'
import { buildPreview } from '../components/preview'
import '../components/advanced.css'

const STL_NOTICE = '演示运行本站内置的操作模型；右侧为参考代码。本页不会执行用户任意编辑的 C++ 源码。'

/** One demo page for every 高阶算法 topic: same Workbench, same single player, same CodeBrowser. */
export default function AdvancedDemo({ topic }: { topic: TopicMeta }) {
  const entry = advancedEntries[topic.demoId as AdvancedAlgoId] as AdvancedEntry | undefined
  if (!entry) return <p className="adv-page">该主题暂无演示。</p>
  return <DemoInner key={entry.id} entry={entry} topic={topic} />
}

function DemoInner({ entry, topic }: { entry: AdvancedEntry; topic: TopicMeta }) {
  const [draft, setDraft] = useState<Record<string, string>>(entry.defaultDraft)
  const [errors, setErrors] = useState<ValidationIssue[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [runId, setRunId] = useState(0)
  const [solveCount, setSolveCount] = useState(0)
  const [running, setRunning] = useState(false)
  const [stale, setStale] = useState(false)
  const [inputEditing, setInputEditing] = useState(false)
  const [cursorIndex, setCursorIndex] = useState(0)
  const [seek, setSeek] = useState<{ requestId: number; target: number } | null>(null)
  const [catalog, setCatalog] = useState<CatalogBundle | null>(null)
  const [layoutPrefs, patchLayoutPrefs] = useWorkbenchPrefs()
  const cancelRef = useRef<CancelFlag>(createCancelFlag())
  const generationRef = useRef(0)
  const seekReq = useRef(0)
  const alive = useRef(true)
  const catalogId = entry.catalogId

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      cancelRef.current.cancelled = true
      generationRef.current += 1
    }
  }, [])

  useEffect(() => {
    let live = true
    void CATALOG_LOADERS[catalogId]!().then((c) => live && setCatalog(c))
    return () => {
      live = false
    }
  }, [catalogId])

  const onRun = useCallback(() => {
    const parsed = entry.parseDraft(draft)
    if (!parsed.ok) {
      setErrors(parsed.issues)
      setInputEditing(true)
      if (hasRun) setStale(true) // never present the previous result as the new run
      return
    }
    cancelRef.current.cancelled = true
    const cancel = (cancelRef.current = createCancelFlag())
    const gen = ++generationRef.current
    const rid = `adv-${entry.id}-${gen}`
    setErrors([])
    setRunning(true)
    void (async () => {
      try {
        const out = await runHeavyPreferWorker(
          () => {
            const r = solveAdvanced(entry.id, parsed.value)
            return r.ok ? r.steps : []
          },
          { cancel, runId: rid, preferWorker: true, workerRequest: { kind: 'advanced', id: entry.id, input: parsed.value, runId: rid } },
        )
        if (!alive.current || generationRef.current !== gen) return
        if (out.status === 'cancelled' || out.steps.length === 0) {
          setErrors([{ field: 'run', reason: '运行已取消或求解失败' }])
          return
        }
        const frozen = [...freezeSteps(out.steps)] as Step[]
        setSteps(frozen)
        setSolveCount((c) => c + 1)
        setRunId((r) => r + 1)
        setHasRun(true)
        setStale(false)
        setCursorIndex(0)
        seekReq.current += 1
        setSeek({ requestId: seekReq.current, target: 0 })
        setInputEditing(false)
      } finally {
        if (alive.current && generationRef.current === gen) setRunning(false)
      }
    })()
  }, [entry, draft, hasRun])

  const onCancel = () => {
    cancelRef.current.cancelled = true
  }

  const patch = (k: string, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }))
    if (hasRun) setStale(true)
  }

  const preview = useMemo(() => (hasRun ? null : buildPreview(entry.id, draft)), [hasRun, entry.id, draft])
  const displaySteps = hasRun && steps.length ? steps : preview ? [preview] : []
  const isPreview = !(hasRun && steps.length)
  const visRunId = hasRun ? `adv-run-${runId}` : 'preview'
  const player = usePlaybackController({
    steps: displaySteps,
    runId: visRunId,
    seekCommand: hasRun ? seek : null,
    onStepIndexChange: hasRun ? setCursorIndex : undefined,
  })

  const cur = isPreview ? undefined : steps[cursorIndex]
  const primary = pickPrimaryCodeRef(cur)
  const contexts = weakContextRefs(cur)
  const cppOnly = entry.languages === 'cpp-only'

  const finalAnswer =
    hasRun && steps.length ? <FinalAnswerResult result={steps[steps.length - 1]?.result} vars={steps[steps.length - 1]?.vars} /> : null

  const codeNode = catalog ? (
    <CodeBrowser
      algoId={cppOnly ? undefined : entry.catalogId}
      documents={catalog}
      singleLanguage={cppOnly ? 'cpp' : undefined}
      execAnchorId={isPreview ? undefined : primary?.anchorId}
      contextAnchorIds={contexts.map((c) => c.anchorId)}
      unmapped={false}
      numericFallback="forbidden"
    />
  ) : (
    <div className="code-stub muted" data-testid="adv-code-loading">
      加载参考代码…
    </div>
  )

  const summary = isPreview ? '预览 · 尚未运行' : stale ? '草稿已改 · 显示上一轮运行' : `步骤 ${cursorIndex + 1}/${Math.max(steps.length, 1)}`

  return (
    <div className="page algo-page" data-testid="adv-demo" data-adv-topic={topic.id} data-solve-count={solveCount} data-input-editing={inputEditing ? '1' : '0'}>
      <div className="algo-page-body">
        <div className={`input-panel algo-toolbar${errors.length ? ' has-errors' : ''}`} data-testid="input-panel" data-editing={inputEditing ? '1' : '0'}>
          <div className="input-summary-bar" data-testid="input-summary-bar">
            <h1 className="algo-title">{entry.meta.title}</h1>
            <div className="input-summary-text" data-testid="input-summary-text">
              <strong>输入</strong>
              <span className="muted"> · {summary}</span>
            </div>
            <button type="button" className="ghost" data-testid="input-edit-toggle" aria-expanded={inputEditing} aria-controls="input-panel-body" onClick={() => setInputEditing((v) => !v)}>
              {inputEditing ? '收起编辑' : '编辑输入'}
            </button>
            <div className="input-actions control-row input-actions-sticky" data-testid="input-actions">
              {inputEditing && (
                <button type="button" onClick={() => setDraft(entry.defaultDraft)}>
                  恢复默认示例
                </button>
              )}
              <button type="button" className="primary" onClick={onRun} data-testid="run-btn">
                运行
              </button>
              <button type="button" onClick={onCancel} disabled={!running} data-testid="cancel-btn">
                取消
              </button>
              {running && (
                <span className="muted" data-testid="run-status">
                  运行中…
                </span>
              )}
            </div>
          </div>
          <div className="input-panel-body" id="input-panel-body" hidden={!inputEditing && !errors.length} data-testid="input-panel-body">
            <h3 className="sr-only">输入控制</h3>
            <div className="adv-demo-input">
              <DraftFields entry={entry} draft={draft} patch={patch} />
            </div>
            {errors.length > 0 && (
              <ul className="input-errors" role="alert" data-testid="adv-errors">
                {errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.field}</strong>
                    {e.position !== undefined ? ` [@${e.position}]` : ''}: {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {cppOnly && (
            <p className="adv-notice" data-testid="stl-notice" role="note">
              {STL_NOTICE}
            </p>
          )}
        </div>
        <WorkbenchLayout
          prefs={layoutPrefs}
          onPrefsChange={patchLayoutPrefs}
          runKey={visRunId}
          scene={<Visualizer key={visRunId} algoId={entry.id} player={player} staleResult={hasRun && stale} renderAdvanced={(s, p) => <AdvancedScene step={s} prevStep={p} />} />}
          data={<CurrentStepData step={player.step} prevStep={player.prevStep} isPreview={player.isPreview} atEnd={player.atEnd} finalAnswer={finalAnswer} runKey={visRunId} />}
          dataProbes={[]}
          code={codeNode}
          transport={<PlaybackTransport key={entry.id} {...player.transportProps} />}
        />
      </div>
    </div>
  )
}

function DraftFields({ entry, draft, patch }: { entry: AdvancedEntry; draft: Record<string, string>; patch: (k: string, v: string) => void }) {
  if (entry.id === 'stl-bounds') {
    return (
      <>
        <label>
          有序数组（逗号分隔，须非降序）
          <input data-testid="adv-input-arr" value={draft.arr ?? ''} onChange={(e) => patch('arr', e.target.value)} />
        </label>
        <label>
          目标值 x
          <input data-testid="adv-input-target" value={draft.target ?? ''} onChange={(e) => patch('target', e.target.value)} />
        </label>
        <label>
          函数
          <select data-testid="adv-input-mode" value={draft.mode ?? 'lower'} onChange={(e) => patch('mode', e.target.value)}>
            <option value="lower">lower_bound（第一个 ≥ x）</option>
            <option value="upper">upper_bound（第一个 &gt; x）</option>
          </select>
        </label>
      </>
    )
  }
  if (entry.id === 'segtree' || entry.id === 'segtree-lazy') {
    return (
      <>
        <label>
          初始数组（逗号分隔，长度 1..16）
          <input data-testid="adv-input-arr" value={draft.arr ?? ''} onChange={(e) => patch('arr', e.target.value)} />
        </label>
        <label>
          操作序列（; 或换行分隔：{entry.id === 'segtree' ? 'set i v / sum l r' : 'add l r v / sum l r'}，区间为 [l,r)）
          <textarea data-testid="adv-input-ops" rows={3} value={draft.ops ?? ''} onChange={(e) => patch('ops', e.target.value)} />
        </label>
      </>
    )
  }
  const hasN = entry.id === 'dsu' || entry.id === 'fenwick'
  return (
    <>
      {hasN && (
        <label>
          {entry.id === 'dsu' ? '元素个数 n（元素为 0..n-1）' : '数组长度 n（初始全 0）'}
          <input data-testid="adv-input-n" value={draft.n ?? ''} onChange={(e) => patch('n', e.target.value)} />
        </label>
      )}
      <label>
        {entry.id === 'dsu' && '操作序列（; 或换行分隔：union a b / find a / same a b）'}
        {entry.id === 'fenwick' && '操作序列（; 或换行分隔：add i d / prefix r / range l r，区间为 [l,r)）'}
        {entry.id === 'stl-priority-queue' && '操作序列（白名单命令：push(整数) / pop() / top()）'}
        <textarea data-testid="adv-input-ops" rows={3} value={draft.ops ?? ''} onChange={(e) => patch('ops', e.target.value)} />
      </label>
    </>
  )
}
