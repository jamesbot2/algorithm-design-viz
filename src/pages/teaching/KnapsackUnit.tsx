import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Visualizer from '../../components/Visualizer'
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

type Strategy = 'bruteForce' | 'dp2d' | 'dp1d' | 'backtracking' | 'branchAndBound' | 'greedy'

const STRATEGY_LABEL: Record<Strategy, string> = {
  bruteForce: 'A. 暴力枚举',
  dp2d: 'B. DP 二维',
  dp1d: 'C. DP 一维（含反例）',
  backtracking: 'D. 回溯搜索树',
  branchAndBound: 'E. 分支限界',
  greedy: 'F. 贪心密度（反例）',
}

export default function KnapsackUnit() {
  const [strategy, setStrategy] = useState<Strategy>('dp2d')
  const [preset, setPreset] = useState<'default' | 'greedy' | 'forward'>('default')
  const [steps, setSteps] = useState<Step[]>([])
  const [summary, setSummary] = useState<string>('')
  const [hasRun, setHasRun] = useState(false)

  const inst: KnapsackInstance = useMemo(() => {
    if (preset === 'greedy') return GREEDY_COUNTEREXAMPLE
    if (preset === 'forward') return FORWARD_UPDATE_COUNTEREXAMPLE
    return DEFAULT_INSTANCE
  }, [preset])

  const onRun = () => {
    let s: Step[] = []
    let msg = ''
    if (strategy === 'bruteForce') {
      const sol = bruteForceKnapsack(inst)
      msg = `暴力：max=${sol.maxValue} selected=[${(sol.selectedIds ?? []).join(',')}]${sol.truncated ? ' (截断)' : ''}`
      s = [{ id: 0, message: msg, vars: { maxValue: sol.maxValue }, result: sol }]
    } else if (strategy === 'dp2d') {
      const { steps: st, solution } = solveDp2d(inst)
      s = st
      msg = `DP2D：max=${solution.maxValue} selected=[${(solution.selectedIds ?? []).join(',')}]`
    } else if (strategy === 'dp1d') {
      const correct = solveDp1dCorrect(inst)
      const wrong = solveDp1dWrongForward(inst)
      msg = `正确一维滚动 max=${correct.maxValue}；【反例】正向更新得 ${wrong.maxValue}（正确应为 ${wrong.correctValue}）`
      s = [
        {
          id: 0,
          message: msg,
          vars: {
            correct: correct.maxValue,
            wrongForward: wrong.maxValue,
            label: '反例',
          },
          result: { correct, wrong },
          labelHints: {
            antiExample: true,
            antiNote: '正向更新把 0-1 背包算成可重复选取，结果不可信',
          },
          matrices: {
            compare: [
              ['正确一维', String(correct.maxValue)],
              ['正向反例', String(wrong.maxValue)],
            ],
          },
          matrixTargets: { compare: { writes: [[1, 1]], reads: [[0, 1]] } },
        },
      ]
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
      s = [
        {
          id: 0,
          message: msg,
          vars: {
            greedy01: g.maxValue,
            fractional: f.value,
            optimal: opt.maxValue,
          },
          result: { g, f, opt },
        },
      ]
    }
    setSteps(s)
    setSummary(msg)
    setHasRun(true)
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
          复杂度：伪多项式 <strong>O(nW)</strong>。
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
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
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
          <Visualizer steps={steps} code={undefined} />
        ) : (
          <div className="viz-empty">选择策略后点击运行。</div>
        )}
      </section>

      <section className="teach-section">
        <h2>正确性要点</h2>
        <p>
          暴力与 DP / 回溯 / B&amp;B 在规模允许时应得到相同最优值。一维<strong>正向</strong>更新是<strong>反例</strong>演示，不是正确算法。
          贪心密度反例：贪心 160，最优 220；分数背包另当别论。
        </p>
      </section>

      <section className="teach-section">
        <h2>复杂度</h2>
        <p>DP：时间/空间 O(nW)（伪多项式）。暴力 O(2^n)。B&amp;B 最坏仍指数，上界剪枝依赖实例。</p>
      </section>

      <section className="teach-section">
        <h2>边界 / 反例</h2>
        <ul>
          <li>空物品 → 最优 0；W=0 → 只能空选。</li>
          <li>一维正向：item(2,3) W=4 → 错得 6，正应为 3。</li>
          <li>贪心：W=50 三物品 → 160 vs 220。</li>
        </ul>
      </section>

      <section className="teach-section">
        <h2>代码（二维 DP 骨架）</h2>
        <pre className="code-block">{`for i = 1..n:
  for w = 0..W:
    dp[i][w] = dp[i-1][w]
    if w >= wt[i]:
      dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i]] + val[i])
# 一维正确写法：for w = W..wt 逆序`}</pre>
      </section>

      <section className="teach-section">
        <h2>练习（占位）</h2>
        <p className="muted">M2 练习平台未建：可自测小实例上各策略最优值是否一致。</p>
      </section>
    </div>
  )
}
