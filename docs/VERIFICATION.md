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
Test Files  8 passed (8)
     Tests  64 passed (64)
```

Suites:
- `tests/p0-binarySearch.test.ts` — unsorted refuse, empty/single/ends/duplicates/leftmost, sortThenSearch
- `tests/p0-semantics.test.ts` — Dijkstra/BF/Floyd/Prim/Kruskal/Kadane/KMP/knapsack0/sort multiset/edge ids/matrixTargets
- `tests/p0-parse.test.ts` — `1,abc,3` validation
- `tests/m1-registry.test.ts` — typed registry (priority algos), freeze immutability, ∞ encoding, runner budget/cancel/validation
- `tests/m2-knapsack.test.ts` — strategy agreement, forward反例 6vs3, greedy 160vs220, dp2d reconstruct
- `tests/m2-algos.test.ts` — nQueens counts (+ n=8→92), matrixChain 4500, huffman WPL, max-subarray 6, LCS/edit reconstruct
- `tests/m3-graph.test.ts` — graph validate (direction/weights/bounds), dijkstraHeap vs naive dist agree, stale filter, registry
- `tests/m3-practice-scene-exp.test.ts` — LCS/knapsack/path/MST multi-answer judges, seeded pick, scene roundtrip + version mismatch, experiment CSV/JSON shape

### `npm run build`

```
tsc -b && vite build → success
dist/assets/index-*.js ~419 kB
```

### Preserved

- ChatGPT-style UI, HashRouter, vite `base: '/algorithm-design-viz/'`
- Local commits only — **no `git push`**

### Not run / deferred to M4

- Browser E2E / Playwright（刻意未加，避免拖 CI）
- M4 CI workflow hardening
- Edmonds-Karp / Strassen / closest pair（拓展规划）
