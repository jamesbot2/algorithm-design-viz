# V5 Final Delivery（本地，未 push）

**日期**：2026-09-15  
**起点**：`3410b5e`（M0–M2 / R1–R5，132 tests）  
**约束**：Local commits OK · **NO push** · 不改远程设置

---

## R1–R5（承接已完成）

| 项 | 结论 | 证据 |
|----|------|------|
| R1 代码页签错行号 | 通过 | 多文档 tab；TS mid ≠ pseudo mid；`data-active-doc` |
| R2 多 codeRefs | 通过 | LCS primary=`takeDiagonal` + context=`compareChars` |
| R3 快排目录=轨迹 | 通过 | `i = L - 1`；done≠partition；loopSwap≠pivotPlace |
| R4 真 FLIP | 通过 | settle `transform` none；中心漂移 ≤1.5px |
| R5 真取消 | 通过 | async cancel + stale runId 不写回；budget 截断 |

---

## Coverage（M1）

高流量 catalog 与 `generateSteps` 对齐，并加共享一致性测试：

- mergeSort / bubbleSort / insertionSort  
- dijkstra / dijkstraHeap  
- knapsack dp2d / nQueens / editDistance / kmp  
- （既有）binarySearch / LCS / quickSort  

规则：**done/return 锚点不借用** partition、mergePush、init、reconstruct、solution。  
详见 `docs/CODE_COVERAGE_MATRIX.md`（已更新诚实度：低流量算法未全部重审）。

---

## Animation / Workbench（M2–M3）

- M2 FLIP：ArrayView 分层 FLIP（承接）。  
- M3 transport：play/pause/prev/next/scrub/speed 经 `PlaybackTransport` **portal 到 Workbench 底栏**，跨双栏。  
- Inspector：步骤说明、frameId/调用栈、变量稳定区；最终答案用 `FinalAnswerResult`（非 `JSON.slice(0,600)`）。  
- Theme：lab-light / lab-dark tokens 覆盖 sidebar / surfaces / borders / accents；CM `theme={light|dark}` 同步；去掉 `#222`/`#1a1a1a` 硬编码面板。  
- 主题/动效控件：**仅 Layout topbar** 一处（Workbench 内重复入口已移除）。

---

## Worker / E2E / Deploy（M4）

1. **Worker**：nQueens（及 knapsack-brute kind）优先 `heavySolve.worker`；cancel 时 `terminate()`；不可用时 chunked fallback。  
2. **E2E**（Chrome）：binarySearch TS↔pseudo；LCS write primary；quickSort play；nQueens cancel 运行中可点；theme 可读性 smoke。  
3. **Deploy**：`.github/workflows/deploy-pages.yml` — `workflow_dispatch` 需同 SHA CI success（已实现，本轮未远程触发）。

---

## Browser checks（本机 Playwright）

```text
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome \
  npm run test:e2e -- tests/e2e/v5-r1-r4.spec.ts tests/e2e/v5-m3-m4.spec.ts
→ 7 passed
```

---

## Commands

```bash
npm run test:run          # 23 files / 152 tests
npm run build             # tsc -b && vite build（含 worker chunk）
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e -- \
  tests/e2e/v5-r1-r4.spec.ts tests/e2e/v5-m3-m4.spec.ts
```

---

## Remaining

- 未 **push**；未执行远程 Pages deploy。  
- 低流量图/DP catalog 未全部按 done-borrow 规则审计。  
- 教学页 KnapsackUnit brute 的 Worker 载荷与输入面板可再打通。  
- chunk size warning（>500kB）既有，非本轮 blocker。

---

## Done vs remaining（摘要）

| 范围 | 状态 |
|------|------|
| R1–R5 | 完成 |
| M1 高流量 catalog sync + 测试 | 完成 |
| M3 transport / theme / inspector / 控件去重 | 完成 |
| M4 Worker prefer + e2e expand + Pages SHA gate 文件 | 完成 |
| 文档 V5_STATUS + V5_FINAL_DELIVERY + matrix | 完成 |
| push / 远程部署 | **未做（按要求）** |
| 全站每一算法 done-borrow 重审 | 剩余 |
