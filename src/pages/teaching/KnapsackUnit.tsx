import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Visualizer from '../../components/Visualizer'
import WorkbenchLayout from '../../components/workbench/WorkbenchLayout'
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

export default function KnapsackUnit() {
  const [strategy, setStrategy] = useState<Strategy>('dp2d')
  const [preset, setPreset] = useState<'default' | 'greedy' | 'forward'>('default')
  const [steps, setSteps] = useState<Step[]>([])
  const [summary, setSummary] = useState<string>('')
  const [hasRun, setHasRun] = useState(false)
  const [cursorIndex, setCursorIndex] = useState(0)

  const inst: KnapsackInstance = useMemo(() => {
    if (preset === 'greedy') return GREEDY_COUNTEREXAMPLE
    if (preset === 'forward') return FORWARD_UPDATE_COUNTEREXAMPLE
    return DEFAULT_INSTANCE
  }, [preset])

  const catalog = getCatalog(STRATEGY_CATALOG[strategy])

  const onRun = () => {
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
    setSteps(s)
    setSummary(msg)
    setHasRun(true)
    setCursorIndex(0)
  }

  return (
    <div className="page teach-page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>0-1 背包 · 多策略教学单元</h1>
        <p className="subtitle">
          统一输入：物品 id/weight/value 列表与容量 W（正整数重量、非负整数价值；W=0 与空物品合法）。
          复杂度：伪多项式 <strong>O(nW)</strong>。切换策略会切换 CodeDocument 与轨迹。
        </p>
      </div>

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

      <div className="input-panel">
        <h3>策略与预设</h3>
        <label>
          策略
          <select
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value as Strategy)
              setHasRun(false)
              setSteps([])
            }}
          >
            {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((k) => (
              <option key={k} value={k}>
                {STRATEGY_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          输入预设
          <select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
            <option value="default">默认 (W=8)</option>
            <option value="greedy">贪心反例 w[10,20,30] v[60,100,120] W=50</option>
            <option value="forward">一维正向更新反例 w=2 v=3 W=4</option>
          </select>
        </label>
        <p className="hint">
          当前物品：
          {inst.items.map((it) => `${it.id}(w=${it.weight},v=${it.value})`).join(', ')}；W=
          {inst.capacity}
          {catalog ? ` · documentId=${catalog.typescript.documentId}` : ''}
        </p>
        <div className="input-actions">
          <button type="button" className="primary" onClick={onRun}>
            运行
          </button>
        </div>
        {summary && <p className="hint">{summary}</p>}
      </div>

      <section className="teach-section">
        <h2>可视化</h2>
        {hasRun ? (
          <WorkbenchLayout
            title={`背包 · ${STRATEGY_LABEL[strategy]}`}
            inputSummary={`W=${inst.capacity} · n=${inst.items.length} · ${catalog?.typescript.documentId ?? 'no-catalog'}`}
            viz={
              <Visualizer steps={steps} onStepIndexChange={(i) => setCursorIndex(i)} />
            }
            code={
              catalog ? (
                <CodeBrowser
                  document={catalog.typescript}
                  execAnchorId={
                    steps[cursorIndex]?.codeRefs?.[0]?.anchorId ?? steps[cursorIndex]?.phase
                  }
                  activeLine={steps[cursorIndex]?.codeLine}
                  pseudocode={catalog.pseudocode?.source}
                />
              ) : (
                <div className="code-stub">
                  <div className="panel-title">策略代码（无目录）</div>
                  <pre className="code-pre">{`// strategy: ${strategy}`}</pre>
                </div>
              )
            }
          />
        ) : (
          <div className="viz-empty">选择策略后点击运行。</div>
        )}
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
