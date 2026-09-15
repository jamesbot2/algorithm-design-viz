# Code coverage matrix (catalog ↔ viz)

Updated for **V5** (local). Status reflects `getCatalog(algoId)` + generator `codeRefs` as of this commit.

| Algorithm | Catalog doc | Anchors (≥3) | `codeRefs` on steps | CodeBrowser wired | Notes |
|-----------|-------------|--------------|---------------------|-------------------|-------|
| Dijkstra (naive) | `dijkstra.naive.ts` + pseudo | init, selectMin, relax.condition, relax.update, **done/return** | yes | AlgoPage via `getCatalog` | done ≠ borrowed init |
| Dijkstra heap | `dijkstraHeap.ts` | init, extract, stale, relax, **done/return** | yes | AlgoPage | PHASE_ANCHOR done→done |
| Bubble sort | `bubbleSort.ts` + pseudo | init, compare, swap, done, return | yes | AlgoPage | markers ↔ generateSteps |
| Insertion sort | `insertionSort.ts` | outer, shift, insert, done, return | yes | AlgoPage | |
| Merge sort | `mergeSort.ts` | divide, recurse, mergeCompare, mergePush, **done/return** | yes | AlgoPage | done ≠ mergePush |
| Quick sort | `quickSort.ts` | partition, compare, loopSwap, pivotPlace, recurse, done | yes | AlgoPage | V5 R3 i=L-1 |
| Binary search | `binarySearch.ts` + pseudo | init, mid, compare, narrow, miss | yes | AlgoPage | multi-doc R1 |
| Kadane | `kadane.ts` | init, extendOrReset, updateBest, done | yes | AlgoPage | |
| Max subarray DC | `maxSubarrayDC.ts` | base, divide, cross, combine | yes | AlgoPage | default anchor on snaps |
| LCS | `lcs.ts` + pseudo | init, compareChars, takeDiagonal, dpFill, reconstruct, reconstructMove | yes | AlgoPage | primary/context micro-steps |
| N-Queens | `nQueens.ts` | call, conflict, place, recurse, backtrack, solution, **done/return** | yes | AlgoPage | terminal done ≠ solution |
| Edit distance | `editDistance.ts` | init, equal, replace, done, return | yes | AlgoPage | |
| KMP | `kmp.ts` | buildLps, match, hit, fallback, **done/return** | yes | AlgoPage | hit on match success |
| BFS | `bfs.ts` | init, dequeue, visit, enqueue | yes | AlgoPage | |
| Kruskal | `kruskal.ts` | sort, find, skip, union | yes | AlgoPage | |
| Prim | `prim.ts` | init, selectMin, add, relax | yes | AlgoPage | |
| Bellman-Ford | `bellmanFord.ts` | init, relax, update, negCycle | yes | AlgoPage | |
| Floyd | `floyd.ts` | kLoop, relax, update, done | yes | AlgoPage | |
| Matrix chain | `matrixChain.ts` | lenLoop, trySplit, cost, update | yes | AlgoPage | dims input editor |
| Huffman | `huffman.ts` | init, sort, merge, done | yes | AlgoPage | symbols/freqs editors |
| Activity selection | `activitySelection.ts` | sort, check, pick, done | yes | AlgoPage | built-in sample |
| Knapsack 01 (AlgoPage) | `knapsack.dp2d.ts` | init, fill, take, reconstruct, **done/return** | yes | AlgoPage | reconstruct ≠ done |
| Knapsack dp2d | `knapsack.dp2d.ts` | same | yes | KnapsackUnit | strategy switch |
| Knapsack dp1dCorrect | `knapsack.dp1dCorrect.ts` | init, reverse, update, done | yes | KnapsackUnit | |
| Knapsack dp1dWrong (反例) | `knapsack.dp1dWrong.ts` | init, forward, update, done | yes | KnapsackUnit | labeled 反例 |
| Knapsack brute | `knapsack.brute.ts` | enum, sum, feasible, done | yes | KnapsackUnit | Worker preferred when available |
| Knapsack backtracking | `knapsack.backtracking.ts` | call, skip, take, best | yes | KnapsackUnit | |
| Knapsack branchAndBound | `knapsack.branchAndBound.ts` | bound, prune, take, skip | yes | KnapsackUnit | |
| Knapsack greedy | `knapsack.greedy.ts` | sort, check, pick, done | yes | KnapsackUnit | |

## Anchor convention

- `CodeDocument.anchors[].range` uses **1-based** inclusive line numbers.
- Generators attach `codeRefs: [{ documentId, anchorId }]` at the op that corresponds to that anchor — never by parsing `message` text.
- `getCatalog(algoId)` returns `{ typescript, pseudocode? } | null`. Knapsack strategies use ids `knapsack.<strategy>`.
- **done/return** must not be borrowed from unrelated ops (partition / mergePush / init / reconstruct / solution).

## Gaps / honesty

- Some graph/DP generators still attach a **default** catalog anchor on every snap when fine-grained phase maps are thin (still valid `anchorId`s; not message-parsed).
- Activity selection on AlgoPage still uses built-in sample (no custom activity table editor yet).
- High-traffic set with shared consistency tests (`tests/v5-m1-catalog-consistency.test.ts`): mergeSort, bubbleSort, insertionSort, dijkstra, dijkstraHeap, knapsack.dp2d, nQueens, editDistance, kmp (+ prior binarySearch / LCS / quickSort).
- Lower-traffic catalogs (BFS/MST/Floyd/…) still have anchors + wiring; not all re-audited in V5 for done-borrow rules.
- Playwright e2e **do run** in this environment with `PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome` (V5 R1/R4 + M3/M4).
