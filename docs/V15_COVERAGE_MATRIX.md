# V15 Coverage Matrix

| ID | Area | Automated | Manual / notes |
|----|------|-----------|----------------|
| V15-01 | Editing controls own ArrowLeft/Right inside inspector-sheet; GraphResultPanel target; Esc focus restore | unit source + dom keyboardGuard + e2e | `docs/traces/v15/v15-01-*.json` |
| V15-02 | Dijkstra current preds from parent; success≠checking; focus overlay settled; heap+BFS/Prim regression | unit algorithm + e2e final roles | Case 0→1:10 / 0→2:1 / 2→1:1 |
| V15-03 | Continuous ≥10 steps with data open; drawer-internal transport; non-modal side | unit source + e2e @390×844 | One player controller |
| V15-04 | Field-separated visibility; pe:none / tiny label / partial clip negatives; pe:auto keep | dom helper + e2e positive/fault | `visibility-*.json` |
| V14 reg | Inspector/arrays/pan/visibility | e2e v14 (30) | Preserved |
| V13 reg | Graph portal visibility | e2e v13 (12) | Preserved |
| MergeSort | V13 return/pointers | `tests/v13-02-mergesort.test.ts` | Preserved |

## Browser

Chromium only (`/usr/bin/google-chrome`) via Playwright project config.
