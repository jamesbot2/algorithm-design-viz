import { Link } from 'react-router-dom'
import { knapsackDp2dCpp, knapsackDp2dPseudo } from '../reference/knapsackDp2d'
import { dijkstraNaiveCpp, dijkstraNaivePseudo } from '../reference/dijkstraNaive'
import { nQueensCpp, nQueensPseudo } from '../reference/nQueens'

/**
 * Lab task sheet (markdown-like TSX).
 * C++ snippets are reference-only — not executed in CI when no compiler.
 */
export default function LabKnapsackDijkstraQueens() {
  return (
    <div className="page lab-page">
      <div className="page-header">
        <Link to="/" className="back">
          ← 首页
        </Link>
        <h1>实验讲义：背包 / Dijkstra / N 皇后</h1>
        <p className="subtitle">
          本地自学材料。进度与练习判定存于浏览器，<strong>不是 LMS 成绩</strong>。C++ 代码仅供对照，CI
          不编译执行。
        </p>
      </div>

      <section className="lab-section">
        <h2>1. 0-1 背包 DP2D</h2>
        <p>
          <strong>问题</strong>：n 件物品，重量 w、价值 v，容量 W；每件至多一次。求最大价值并给出一组选中下标。
        </p>
        <p>
          <strong>输入/输出</strong>：w[], v[], W → maxValue, selectedIds（0-based）。
        </p>
        <p>
          <strong>约束</strong>：演示 n≤12，W≤40；暴力对照 n≤16。
        </p>
        <p>
          <strong>正确性思考</strong>：为何 dp[i][c] 只依赖 i-1？逆向 1D 压缩为何正确、正向为何出错？
        </p>
        <pre className="code-block">{knapsackDp2dPseudo}</pre>
        <pre className="code-block">{knapsackDp2dCpp}</pre>
        <p>
          演示：<Link to="/teach/knapsack">教学单元</Link> · <Link to="/algo/knapsack01">AlgoPage</Link>
        </p>
      </section>

      <section className="lab-section">
        <h2>2. 朴素 Dijkstra</h2>
        <p>
          <strong>问题</strong>：非负权有向图单源最短路。
        </p>
        <p>
          <strong>I/O</strong>：n, edges(u,v,w), start → dist[], parent[]。
        </p>
        <p>
          <strong>约束</strong>：演示 n≤12；实验台可至更大但封顶。
        </p>
        <p>
          <strong>正确性</strong>：为何负权不可？与堆优化在同一图上 dist 是否一致？
        </p>
        <pre className="code-block">{dijkstraNaivePseudo}</pre>
        <pre className="code-block">{dijkstraNaiveCpp}</pre>
        <p>
          演示：<Link to="/algo/dijkstra">朴素</Link> · <Link to="/algo/dijkstraHeap">堆</Link> ·{' '}
          <Link to="/experiment">实验台</Link>
        </p>
      </section>

      <section className="lab-section">
        <h2>3. N 皇后</h2>
        <p>
          <strong>问题</strong>：在 n×n 棋盘放置 n 个皇后互不攻击；统计解数或找一解。
        </p>
        <p>
          <strong>I/O</strong>：n, mode(one|all) → solutions / count。
        </p>
        <p>
          <strong>约束</strong>：完整枚举建议 n≤8（92 解）；更大需截断声明。
        </p>
        <p>
          <strong>正确性</strong>：行唯一后，列与对角线检查是否充分？n=2,3 为何为 0？
        </p>
        <pre className="code-block">{nQueensPseudo}</pre>
        <pre className="code-block">{nQueensCpp}</pre>
        <p>
          演示：<Link to="/algo/nQueens">N 皇后</Link> · <Link to="/practice">练习台</Link>
        </p>
      </section>
    </div>
  )
}
