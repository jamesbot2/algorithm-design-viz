# Verification log

Date: 2026-09-15  
Workspace: `/workspace/algorithm-design-viz`  
Baseline: `35709de7559ef9678bbb66ca59ffc33bf0780516`  
M4 local work: Chapter XSS-hardening + CI workflow + docs（见 git log）

## Commands（本机已跑）

```bash
npm run lint
npm run test:run
npm run build
```

`npm ci` 在本环境未强制重装（已有 `node_modules` + 一致 `package-lock.json` lockfileVersion 3）；CI 工作流使用 `npm ci`。

## V2 Animation（本轮追加）

Date: 2026-09-15（M2 finish + M3 + M4）

```bash
npm run lint      # exit 0
npm run test:run  # 10 files / 92 tests
npm run build     # OK
```

新增：`tests/v2-animation.test.ts`（tokens、Kadane ranges、BF neg-cycle warning）。  
动效细节见 `docs/V2_ANIMATION.md`。deploy-pages 仍 gated on CI `workflow_run`（未 push）。

## Results

### `npm run lint`

```
oxlint → exit 0
```

若干 `react(set-state-in-effect)` / hooks **warning**（VarsPanel、Visualizer、Layout、AlgoPage、PracticePage、GraphInput）。无 error，CI 视为通过。

### `npm run test:run`

```
Test Files  8 passed (8)
     Tests  64 passed (64)
Duration  ~1.6s
```

Suites:

- `tests/p0-binarySearch.test.ts` — unsorted refuse, empty/single/ends/duplicates/leftmost, sortThenSearch
- `tests/p0-semantics.test.ts` — Dijkstra/BF/Floyd/Prim/Kruskal/Kadane/KMP/knapsack0/sort multiset/edge ids/matrixTargets
- `tests/p0-parse.test.ts` — `1,abc,3` validation
- `tests/m1-registry.test.ts` — typed registry, freeze, ∞ encoding, runner budget/cancel/validation
- `tests/m2-knapsack.test.ts` — strategy agreement, 反例, greedy 160vs220, dp2d reconstruct
- `tests/m2-algos.test.ts` — nQueens (+ n=8→92), matrixChain 4500, huffman WPL, max-subarray 6, LCS/edit
- `tests/m3-graph.test.ts` — graph validate, dijkstraHeap vs naive dist, stale filter, registry
- `tests/m3-practice-scene-exp.test.ts` — judges, scene roundtrip, experiment CSV/JSON

### `npm run build`

```
tsc -b && vite build → success
dist/assets/index-*.js ~419 kB │ gzip ~136 kB
```

### package-lock

- `lockfileVersion: 3`，与 `package.json` 依赖可解析（`npm ls --depth=0` OK）
- 未改依赖版本于本 M4 轮次

### 内容安全抽查

- 全仓 `dangerouslySetInnerHTML`：**已清除**（Chapter 改为 React 节点解析 `**` / `` ` ``）
- 无 markdown-it / 用户 MD→HTML 路径
- 用户输入走草稿校验 + 算法 validate，不注入 DOM HTML

### 性能随记（诚实、含 step 快照开销）

环境：本机 Node + `tsx` 直接调用 `generateSteps`（**非**浏览器 DOM 计时；**非**纯算法内核计时）。中位数（7 次）：

| 输入 | median |
|------|--------|
| 朴素 Dijkstra V=40 band 稀疏 | ~1.5 ms |
| 堆 Dijkstra 同图 | ~1.9 ms |
| knapsack01 n=20 W=80 | ~27 ms |
| mergeSort n=200 | ~107 ms |
| nQueens n=8 全解 | ~3.1 ms |

小图上堆版未必更快：可视化逐步快照 / 堆结构开销可盖过理论优势。实验台声明同样成立。

## CI / Pages（文档语义）

| Workflow | 触发 | 行为 |
|----------|------|------|
| `.github/workflows/ci.yml` | PR + push→`main` | npm ci → lint → test:run → build |
| `.github/workflows/deploy-pages.yml` | push→`main` + manual | npm ci → build → Pages 产物（**未改**；**不** `needs` CI） |

二者在 push 时并行。未配置「部署必须 CI 绿」——避免改远程环境/分支保护。概念上合并前应以 CI 为准。

**未 `git push`**：远程 Actions / Pages 不会因本机 commits 更新。

## Playwright / E2E — 推迟

未安装 Playwright（避免不可靠的浏览器依赖拖垮 CI）。

### 手工冒烟清单（授权部署或本地 `npm run preview` 后）

1. `/#/` 双导航可点；章节与算法芯片跳转正常  
2. `/#/algo/binarySearch`：未排序数组运行报错；勾选先排序可跑  
3. `/#/algo/dijkstra`：图编辑器改边 → 运行 → 路径结果面板  
4. `/#/teach/knapsack`：策略切换有可视化  
5. `/#/practice`：答题、导出进度  
6. `/#/experiment`：导出 CSV/JSON  
7. `/#/lab/core`：讲义可打开  
8. 非法数组输入 `1,abc,3` 不静默丢弃  

## Preserved

- ChatGPT-style UI, HashRouter, vite `base: '/algorithm-design-viz/'`
- Local commits only — **no `git push`**
