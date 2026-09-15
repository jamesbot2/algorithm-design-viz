# V5 实施状态（代号，非已发布版本）

审查基线：`ce52559fb137c9cddf3f514734af140234847ef5`  
本轮父提交起点：`3410b5e`（R1–R5 + 132 tests）  
约定：未开始 / 进行中 / 已实现待验证 / 已验证 / 受阻  
本轮：**不 push / 不部署 / 不改远程设置**

| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M0 | 先写失败测试 | 已验证 | `tests/v5-r*.test.ts` + dom R4 |
| R1 | 代码页签错行号 | 已验证 | 多文档 + tab 锚点；e2e 通过 |
| R2 | 多 codeRefs | 已验证 | primary/context；LCS 微步 |
| R3 | 快排目录≠轨迹 | 已验证 | i=L-1 同源；loopSwap/pivotPlace/done |
| R4 | 真 FLIP 交换 | 已验证 | settle transform none；e2e 坐标 |
| R5 | 真取消 | 已验证 | asyncRun + chunked；runId 守卫 |
| M1 | 全站代码同步 | 已验证 | 高流量 9 算法 + 既有 BS/LCS/QS；一致性测试 |
| M2 | FLIP 动画 | 已验证 | ArrayView 分层 FLIP |
| M3 | 工作台/主题 | 已验证 | 统一 transport 跨双栏；主题 tokens；inspector；控件去重 |
| M4 | Worker/E2E/CI门禁 | 已验证 | Worker 优先 + terminate；e2e 扩展；Pages SHA gate |

## 验证记录

- `npm run test:run` → 23 files / **152** tests passed（2026-09-15）
- `npm run build` → tsc + vite OK（含 `heavySolve.worker` chunk）
- `PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e -- tests/e2e/v5-r1-r4.spec.ts tests/e2e/v5-m3-m4.spec.ts` → **7 passed**
- M3：`data-testid=workbench-transport` + `playback-transport`；Layout topbar 为唯一主题/动效入口
- M1：`tests/v5-m1-catalog-consistency.test.ts` — done/return 不借用 mergePush/init/reconstruct/solution
- M4：nQueens Worker prefer + cancel terminate；chunked fallback；deploy-pages `workflow_dispatch` 同 SHA CI gate 已落地

## 关键文件（摘）

- `src/components/workbench/{WorkbenchLayout,PlaybackTransport}.tsx`
- `src/components/Visualizer.tsx` / `src/components/result/FinalAnswerResult.tsx`
- `src/theme` + `src/styles.css` lab light/dark tokens
- `src/algorithms/{mergeSort,dijkstra,dijkstraHeap,nQueens,kmp}.ts` / `knapsack/dp2d.ts`
- `src/codeCatalog/{mergeSort,bubbleSort,insertionSort,dijkstra,dijkstraHeap,nQueens,editDistance,kmp,knapsack}/`
- `src/core/runner/{runHeavy,heavySolve.worker,heavyTypes}.ts`
- `tests/v5-m1-catalog-consistency.test.ts` / `tests/v5-m4-worker.test.ts` / `tests/e2e/v5-m3-m4.spec.ts`
- `docs/{V5_STATUS,V5_FINAL_DELIVERY,CODE_COVERAGE_MATRIX}.md`

## 剩余（诚实）

- 低流量图算法 catalog 未全部按 done-borrow 规则重审
- KnapsackUnit 内 brute 策略的 Worker 请求体可再对齐教学页输入
- 未 push / 未触发远程 Pages 部署
