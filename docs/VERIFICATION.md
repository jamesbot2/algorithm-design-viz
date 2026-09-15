# Verification log

Date: 2026-09-15  
Workspace: `/workspace/algorithm-design-viz`  
Baseline: `35709de7559ef9678bbb66ca59ffc33bf0780516`

## Commands

```bash
npm run test:run
npm run build
```

## Results

### `npm run test:run`

```
Test Files  6 passed (6)
     Tests  44 passed (44)
```

Suites:
- `tests/p0-binarySearch.test.ts` — unsorted refuse, empty/single/ends/duplicates/leftmost, sortThenSearch
- `tests/p0-semantics.test.ts` — Dijkstra/BF/Floyd/Prim/Kruskal/Kadane/KMP/knapsack0/sort multiset/edge ids/matrixTargets
- `tests/p0-parse.test.ts` — `1,abc,3` validation
- `tests/m1-registry.test.ts` — typed registry (priority algos), freeze immutability, ∞ encoding, runner budget/cancel/validation
- `tests/m2-knapsack.test.ts` — strategy agreement, forward反例 6vs3, greedy 160vs220, dp2d reconstruct
- `tests/m2-algos.test.ts` — nQueens counts (+ n=8→92), matrixChain 4500, huffman WPL, max-subarray 6, LCS/edit reconstruct

### `npm run build`

```
tsc -b && vite build → success
dist/assets/index-*.js ~371 kB
```

### Preserved

- ChatGPT-style UI, HashRouter, vite `base: '/algorithm-design-viz/'`
- Local commits only — **no `git push`**

### Not run / out of scope this turn

- Browser E2E / Playwright
- M3 graph editor / exercises platform / share
- M4 CI
- Edmonds-Karp / Strassen / closest pair (listed as 拓展规划)
