# V5 实施状态（代号，非已发布版本）

审查基线：`ce52559fb137c9cddf3f514734af140234847ef5`  
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
| M1 | 全站代码同步 | 已实现待验证 | 二分/LCS/快排一致；registry 测试 |
| M2 | FLIP 动画 | 已验证 | ArrayView 分层 FLIP |
| M3 | 工作台/主题 | 进行中 | inspector 条 + light/dark sem tokens |
| M4 | Worker/E2E/CI门禁 | 进行中 | Pages workflow_dispatch 需同 SHA CI；e2e R1/R4 |

## 验证记录

- `npm run test:run` → 21 files / 132 tests passed（2026-09-15）
- `npm run build` → tsc + vite OK
- `PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e -- tests/e2e/v5-r1-r4.spec.ts` → 2 passed
- R1 证据：TS mid L7 vs pseudo L3；`data-active-doc` 随 tab 切换；LCS `lcs.ts`≠`lcs.pseudo`
- R2 证据：对角写入步 primary=`takeDiagonal`，context=`compareChars`
- R3 证据：catalog `let i = L - 1`；done≠partition；loopSwap≠pivotPlace；frameId 存在
- R4 证据：`docs/traces/v5/r4-swap-settle.json`；无 abs(j-i)*28 残留
- R5 证据：`tests/v5-r5-cancel.test.ts` cancelled + stale runId 不写回；budget 录制中截断
- 未做：全算法 catalog 对齐、transport 完全迁出 Visualizer、Worker 真 terminate 路径默认启用

## 关键文件（摘）

- `src/components/codeBrowser/CodeBrowser.tsx` + `resolveExec.ts`
- `src/components/ArrayView.tsx`
- `src/algorithms/{quickSort,lcs}.ts` / `src/codeCatalog/{quickSort,lcs}/`
- `src/core/runner/{asyncRun,chunkedSolve,runHeavy}.ts`
- `src/pages/AlgoPage.tsx` / `.github/workflows/deploy-pages.yml`
- `tests/v5-*.test.ts` / `tests/e2e/v5-r1-r4.spec.ts` / `tests/dom/v5-r4-*.tsx`

