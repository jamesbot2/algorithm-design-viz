# V11 M0 — Reproduce + failing tests

**Branch:** `v11-semantic-visual`  
**Baseline HEAD:** `e51c950` (V10 on main)  
**Env (box):** Node v24.20.0 · npm 11.19.0 · Chrome 151.0.7922.169 · 2026-09-16 18:15 CST (UTC+8)  
**Screenshot attachment:** **待确认 / 附件缺失** — `attachments/` has no new「严重 bug」original; only older V8/V9 layout PNGs under `docs/screenshots/`. Do **not** claim that screenshot bug is fixed.

**Constraints:** no push, no deploy; leave `docs/traces/v4/**` dirty state alone (none present / untouched).

---

## Coverage table (registered + teach knapsack) — M0 status

| # | Algo / strategy | M0 repro notes | Tests planned |
|---|-----------------|----------------|---------------|
| 1 | bubbleSort | — | matrix later |
| 2 | insertionSort | V11-02 duplicate elementIds on right-shift `[2,1]` | unit |
| 3 | mergeSort | V11-02 write-back id collision; V11-05 mergePush anchors | unit |
| 4 | quickSort | — | matrix |
| 5 | binarySearch | — | matrix |
| 6 | kadane | V11-01 ranges + signed bars | unit/dom |
| 7 | knapsack01 | V11-04 non-int W/weights; V11-05 done ref | unit |
| 8 | lcs | — | matrix |
| 9 | editDistance | — | matrix |
| 10 | activitySelection | — | matrix |
| 11 | bfs | — | matrix |
| 12 | dijkstra | — | matrix |
| 13 | dijkstraHeap | — | matrix |
| 14 | kruskal | — | matrix |
| 15 | bellmanFord | — | matrix |
| 16 | floyd | V11-05 finish/neg-cycle → kLoop via codeLine=0 | unit |
| 17 | kmp | audit | matrix |
| 18 | prim | — | matrix |
| 19 | nQueens | V11-03 path guess; done lacks board; stats; sampling | unit |
| 20 | matrixChain | — | matrix |
| 21 | huffman | V11-05 stuck init; V11-06 forest/dup symbols | unit |
| 22 | maxSubarrayDC | — | matrix |
| T1 | knapsack bruteForce | contract via validate | unit existing |
| T2 | greedyByDensity | — | existing |
| T3 | fractionalGreedy | — | existing |
| T4 | dp1dCorrect | — | existing |
| T5 | dp1dWrongForward | — | existing |
| T6 | dp2d | — | existing |
| T7 | backtracking | — | existing |
| T8 | branchAndBound | — | existing |

Unchecked cells after M3 = **未验证**.

---

## Confirmed failing scenarios (pre-fix)

### V11-01 Signed bars / range
- `ArrayView` uses `minH + abs(n)/max*(maxH-minH)` → zero gets visual height ≥12px.
- Negatives only CSS-classed; not true y(0) domain with equal |v| geometry.
- Range bands use index-percentage, not measured slot rects.

### V11-02 Insert/merge identity
- `insertionSort` / `mergeSort` assign `elementIds[dest] = elementIds[src]` without vacating source → duplicate React keys + layerRefs Map collision on `[2,1]` shift and merge write-back when right-half wins early.

### V11-03 N-Queens
- `SearchTreeView.collectPathIds` guesses first exploring child.
- Terminal `done` step omits `matrices.board` → Visualizer drops board scene.
- `stats.comparisons/writes` misuse nodes/pruned; sampling silent when `steps.length` capped.

### V11-04 Knapsack contract
- AlgoPage `parseNumberList` accepts `1.5`; `parseIntStrict` accepts `2.5` / `Infinity` as finite numbers without integer check → solver invoked on illegal discrete DP input.

### V11-05 Code arrow
- Huffman every snap `codeRefs: ref('init')`.
- Floyd finish/neg-cycle `codeLine=0` → LINE_ANCHOR → `kLoop`.
- Knapsack done snap no `codeRefs` / done anchor.
- Merge writes still `mergeCompare` phase anchor.

### V11-08 Short-height docks
- `@media(max-height:520px)` uses `.playback-transport .phase-jump` descendant selector → hides dock copies inside `.playback-settings-panel`.

Evidence: `docs/traces/v11/`, failing test output after first `npm run test:run`.
