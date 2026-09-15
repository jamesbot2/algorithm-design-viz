# Verification log

Date: 2026-09-15  
Workspace: `/workspace/algorithm-design-viz`  
Baseline: `35709de7559ef9678bbb66ca59ffc33bf0780516`

## Commands

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm run test:run
npm run build
```

## Results

### `npm run test:run`

```
Test Files  4 passed (4)
     Tests  25 passed (25)
```

Suites:
- `tests/p0-binarySearch.test.ts` — unsorted refuse, empty/single/ends/duplicates/leftmost, sortThenSearch
- `tests/p0-semantics.test.ts` — Dijkstra/BF/Floyd/Prim/Kruskal/Kadane/KMP/knapsack0/sort multiset/edge ids/matrixTargets
- `tests/p0-parse.test.ts` — `1,abc,3` validation
- `tests/m1-registry.test.ts` — typed registry adapters

### `npm run build`

```
tsc -b && vite build → success
dist/assets/index-*.js ~330 kB
```

### Not run / not done

- `git push` — intentionally not performed
- Browser E2E / Playwright — not in M0 scope
- Full M1 migration of all algorithms — only knapsack01, lcs, dijkstra typed

