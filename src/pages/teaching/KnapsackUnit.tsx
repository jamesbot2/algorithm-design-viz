import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Visualizer from '../../components/Visualizer'
import WorkbenchLayout from '../../components/workbench/WorkbenchLayout'
import PlaybackTransport from '../../components/workbench/PlaybackTransport'
import CurrentStepData from '../../components/data/CurrentStepData'
import { usePlaybackController } from '../../components/workbench/usePlaybackController'
import { useWorkbenchPrefs } from '../../components/workbench/useWorkbenchPrefs'
import CodeBrowser from '../../components/codeBrowser/CodeBrowser'
import { getCatalog } from '../../codeCatalog'
import {
  DEFAULT_INSTANCE,
  FORWARD_UPDATE_COUNTEREXAMPLE,
  GREEDY_COUNTEREXAMPLE,
  bruteForceKnapsack,
  fractionalGreedy,
  greedyByDensity,
  solveBacktracking,
  solveBranchAndBound,
  solveDp1dCorrect,
  solveDp1dWrongForward,
  solveDp2d,
  type KnapsackInstance,
} from '../../algorithms/knapsack'
import type { Step } from '../../types/step'
import { createKnapsackPreview } from '../../preview/createPreview'
import { pickPrimaryCodeRef, weakContextRefs } from '../../utils/codeRefs'

type Strategy =
  | 'bruteForce'
  | 'dp2d'
  | 'dp1dCorrect'
  | 'dp1dWrong'
  | 'backtracking'
  | 'branchAndBound'
  | 'greedy'

const STRATEGY_LABEL: Record<Strategy, string> = {
  bruteForce: 'A. 暴力枚举',
  dp2d: 'B. DP 二维',
  dp1dCorrect: 'C1. DP 一维正确',
  dp1dWrong: 'C2. DP 一维正向反例',
  backtracking: 'D. 回溯搜索树',
  branchAndBound: 'E. 分支限界',
  greedy: 'F. 贪心密度（反例）',
}

const STRATEGY_CATALOG: Record<Strategy, string> = {
  bruteForce: 'knapsack.brute',
  dp2d: 'knapsack.dp2d',
  dp1dCorrect: 'knapsack.dp1dCorrect',
  dp1dWrong: 'knapsack.dp1dWrong',
  backtracking: 'knapsack.backtracking',
  branchAndBound: 'knapsack.branchAndBound',
  greedy: 'knapsack.greedy',
}

type RunSnapshotLocal = {
  strategy: Strategy
  preset: 'default' | 'greedy' | 'forward'
  inst: KnapsackInstance
  steps: Step[]
  summary: string
  runKey: number
}

export default function KnapsackUnit() {
  const [strategy, setStrategy] = useState<Strategy>('dp2d')
  const [preset, setPreset] = useState<'default' | 'greedy' | 'forward'>('default')
  const [runSnap, setRunSnap] = useState<RunSnapshotLocal | null>(null)
  const [cursorIndex, setCursorIndex] = useState(0)
  const [theoryOpen, setTheoryOpen] = useState(false)
  const runKeyRef = useRef(0)

  const draftInst: KnapsackInstance = useMemo(() => {
    if (preset === 'greedy') return GREEDY_COUNTEREXAMPLE
    if (preset === 'forward') return FORWARD_UPDATE_COUNTEREXAMPLE
    return DEFAULT_INSTANCE
  }, [preset])

  const catalog = getCatalog(STRATEGY_CATALOG[strategy])

  const previewStep = useMemo(
    () =>
      createKnapsackPreview({
        weights: draftInst.items.map((it) => it.weight),
        values: draftInst.items.map((it) => it.value),
        capacity: draftInst.capacity,
      }),
    [draftInst],
  )

  const draftMatchesRun =
    runSnap != null && runSnap.strategy === strategy && runSnap.preset === preset
  const dirty = runSnap != null && !draftMatchesRun
  const hasRun = runSnap != null

  // Display: when dirty, keep old trace but mark stale; summary from snapshot
  const displaySteps = hasRun && runSnap.steps.length ? runSnap.steps : [previewStep]
  const visRunId = hasRun ? runSnap!.runKey : 'preview'
  const onCursor = useCallback((i: number) => setCursorIndex(i), [])
  /** V23: the ONE playback controller for this page. */
  const player = usePlaybackController({
    steps: displaySteps,
    runId: visRunId,
    onStepIndexChange: hasRun ? onCursor : undefined,
  })
  const [layoutPrefs, patchLayoutPrefs] = useWorkbenchPrefs()
  const summary = runSnap?.summary ?? ''
  const snapInst = runSnap?.inst

  const onRun = () => {
    const inst = draftInst
    let s: Step[] = []
    let msg = ''
    if (strategy === 'bruteForce') {
      const sol = bruteForceKnapsack(inst)
      msg = `暴力：max=${sol.maxValue} selected=[${(sol.selectedIds ?? []).join(',')}]${sol.truncated ? ' (截断)' : ''}`
      s = sol.steps ?? [{ id: 0, message: msg, vars: { maxValue: sol.maxValue }, result: sol }]
    } else if (strategy === 'dp2d') {
      const { steps: st, solution } = solveDp2d(inst)
      s = st
      msg = `DP2D：max=${solution.maxValue} selected=[${(solution.selectedIds ?? []).join(',')}]`
    } else if (strategy === 'dp1dCorrect') {
      const correct = solveDp1dCorrect(inst)
      msg = `正确一维滚动 max=${correct.maxValue}`
      s = correct.steps
    } else if (strategy === 'dp1dWrong') {
      const wrong = solveDp1dWrongForward(inst)
      msg = `【反例】正向更新得 ${wrong.maxValue}（正确应为 ${wrong.correctValue}）`
      s = wrong.steps
    } else if (strategy === 'backtracking') {
      const { steps: st, solution } = solveBacktracking(inst)
      s = st
      msg = `回溯：max=${solution.maxValue}`
    } else if (strategy === 'branchAndBound') {
      const { steps: st, solution } = solveBranchAndBound(inst)
      s = st
      msg = `B&B：max=${solution.maxValue}（分数上界，注意 float）`
    } else {
      const g = greedyByDensity(inst)
      const f = fractionalGreedy(inst)
      const opt = bruteForceKnapsack(inst)
      msg = `0-1 贪心=${g.maxValue}；分数贪心≈${f.value}；最优(暴力)=${opt.maxValue}。反例预设期望 160 vs 220。`
      s = g.steps
    }
    runKeyRef.current += 1
    setRunSnap({
      strategy,
      preset,
      inst: structuredClone(inst),
      steps: s,
      summary: msg,
      runKey: runKeyRef.current,
    })
    setCursorIndex(0)
  }

  const onStrategyChange = (next: Strategy) => {
    setStrategy(next)
    // Clear old result when strategy changes — new code must not pair with old summary
    setRunSnap(null)
    setCursorIndex(0)
  }

  const step = hasRun ? runSnap!.steps[cursorIndex] : undefined
  const primary = step ? pickPrimaryCodeRef(step) : undefined
  const contexts = step ? weakContextRefs(step) : []

  return (
    <div className="page teach-page">
      <div className="page-header page-header-compact">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>0-1 背包 · 多策略教学单元</h1>
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
            <p className="subtitle">
              统一输入：物品 id/weight/value 列表与容量 W（正整数重量、非负整数价值；W=0 与空物品合法）。
              复杂度：伪多项式 <strong>O(nW)</strong>。切换策略会切换 CodeDocument 与轨迹。
            </p>
            <section className="teach-section">
              <h2>问题</h2>
              <p>每件物品至多选一次，在容量约束下最大化总价值。与分数背包（可分割）不同。</p>
            </section>
            <section className="teach-section">
              <h2>状态 / 思想</h2>
              <ul>
                <li>DP：dp[i][w] = 前 i 件、容量 w 的最优值；一维滚动须逆序更新。</li>
                <li>回溯 / 分支限界：搜索选或不选；B&B 用分数背包上界剪枝。</li>
                <li>贪心按密度对 0-1 不正确（见反例）。</li>
              </ul>
            </section>
          </div>
        )}
      </div>

      <div className="input-panel input-panel-v4">
        <h3>策略与预设</h3>
        <div className="input-grid">
          <label className="field-mode">
            策略
            <select
              value={strategy}
              onChange={(e) => onStrategyChange(e.target.value as Strategy)}
              data-testid="knapsack-strategy"
            >
              {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((k) => (
                <option key={k} value={k}>
                  {STRATEGY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field-array">
            输入预设
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as typeof preset)}
              data-testid="knapsack-preset"
            >
              <option value="default">默认 (W=8)</option>
              <option value="greedy">贪心反例 w[10,20,30] v[60,100,120] W=50</option>
              <option value="forward">一维正向更新反例 w=2 v=3 W=4</option>
            </select>
          </label>
        </div>
        <p className="hint" data-testid="knapsack-draft-summary">
          草稿物品：
          {draftInst.items.map((it) => `${it.id}(w=${it.weight},v=${it.value})`).join(', ')}；W=
          {draftInst.capacity}
        </p>
        {dirty && snapInst && (
          <p className="dirty-banner" role="status" data-testid="knapsack-dirty-banner">
            草稿已改（W={draftInst.capacity}），下方轨迹仍属上一轮运行（W={snapInst.capacity}）。请重新运行。
          </p>
        )}
        <div className="input-actions control-row">
          <button type="button" className="primary" onClick={onRun} data-testid="run-btn">
            运行
          </button>
        </div>
        {summary && (
          <p className="hint" data-testid="knapsack-run-summary">
            {dirty ? '上一轮结果：' : ''}
            {summary}
          </p>
        )}
        <details className="debug-details muted">
          <summary>调试信息</summary>
          <p className="hint">{catalog ? `documentId=${catalog.typescript.documentId}` : 'no-catalog'}</p>
        </details>
      </div>

      <section className="teach-section">
        <h2>可视化</h2>
        <WorkbenchLayout
          fill="section"
          prefs={layoutPrefs}
          onPrefsChange={patchLayoutPrefs}
          runKey={visRunId}
          scene={
            <Visualizer
              key={visRunId}
              algoId={`knapsack:${runSnap?.strategy ?? strategy}`}
              player={player}
              staleResult={dirty}
              context={
                /* V23: the needed input context lives in the demo column, next to the step text */
                <p className="viz-context muted" data-testid="knapsack-input-summary">
                  背包 · {STRATEGY_LABEL[strategy]} ·{' '}
                  {hasRun && snapInst
                    ? dirty
                      ? `上一轮 W=${snapInst.capacity} · n=${snapInst.items.length}（草稿 W=${draftInst.capacity} 待运行）`
                      : `W=${snapInst.capacity} · n=${snapInst.items.length}`
                    : `预览 · W=${draftInst.capacity} · n=${draftInst.items.length}`}
                </p>
              }
            />
          }
          data={
            <CurrentStepData
              step={player.step}
              prevStep={player.prevStep}
              isPreview={player.isPreview}
              atEnd={player.atEnd}
              runKey={visRunId}
            />
          }
          code={
            catalog ? (
              <CodeBrowser
                documents={catalog}
                execAnchorId={hasRun && !dirty ? primary?.anchorId : undefined}
                contextAnchorIds={hasRun && !dirty ? contexts.map((c) => c.anchorId) : []}
                activeLine={hasRun && !dirty ? step?.codeLine : undefined}
              />
            ) : (
              <div className="code-stub">
                <div className="panel-title">策略代码（无目录）</div>
                <pre className="code-pre">{`// strategy: ${strategy}`}</pre>
              </div>
            )
          }
          transport={<PlaybackTransport {...player.transportProps} />}
        />
      </section>

      <section className="teach-section">
        <h2>正确性要点</h2>
        <ul>
          <li>一维正确写法：容量逆序；正向更新是反例（可重复选取）。</li>
          <li>贪心密度对 0-1 非最优；分数背包才最优。</li>
          <li>B&amp;B 上界为分数松弛，浮点比较需容差。</li>
        </ul>
      </section>
    </div>
  )
}
