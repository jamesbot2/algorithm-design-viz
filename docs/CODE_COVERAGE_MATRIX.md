# Code coverage matrix (catalog ↔ viz)

Updated for **V3 Phase D** (local). Status reflects `getCatalog(algoId)` + generator `codeRefs` as of this commit.

| Algorithm | Catalog doc | Anchors (≥3) | `codeRefs` on steps | CodeBrowser wired | Notes |
|-----------|-------------|--------------|---------------------|-------------------|-------|
| Dijkstra (naive) | `dijkstra.naive.ts` + pseudo | init, selectMin, relax.condition, relax.update | yes | AlgoPage via `getCatalog` | V3 B vertical sample kept |
| Dijkstra heap | `dijkstraHeap.ts` | init, extract, stale, relax | yes | AlgoPage | phase→anchor |
| Bubble sort | `bubbleSort.ts` + pseudo | init, compare, swap, done | yes | AlgoPage | A3 ops + codeRefs |
| Insertion sort | `insertionSort.ts` | outer, shift, insert, done | yes | AlgoPage | |
| Merge sort | `mergeSort.ts` | divide, recurse, mergeCompare, mergePush | yes | AlgoPage | |
| Quick sort | `quickSort.ts` | partition, compare, swap, recurse | yes | AlgoPage | |
| Binary search | `binarySearch.ts` | init, mid, compare, narrow, miss | yes | AlgoPage | |
| Kadane | `kadane.ts` | init, extendOrReset, updateBest, done | yes | AlgoPage | |
| Max subarray DC | `maxSubarrayDC.ts` | base, divide, cross, combine | yes | AlgoPage | default anchor on snaps |
| LCS | `lcs.ts` + pseudo | init, compareChars, takeDiagonal, dpFill, reconstruct, reconstructMove | yes | AlgoPage | fill + **reconstruct playable phase** |
| N-Queens | `nQueens.ts` | call, conflict, place, recurse, backtrack, solution | yes | AlgoPage | `frameId`; tree snapshot immutable |
| Edit distance | `editDistance.ts` | init, equal, replace, done | yes | AlgoPage | |
| KMP | `kmp.ts` | buildLps, match, hit, fallback | yes | AlgoPage | |
| BFS | `bfs.ts` | init, dequeue, visit, enqueue | yes | AlgoPage | |
| Kruskal | `kruskal.ts` | sort, find, skip, union | yes | AlgoPage | |
| Prim | `prim.ts` | init, selectMin, add, relax | yes | AlgoPage | |
| Bellman-Ford | `bellmanFord.ts` | init, relax, update, negCycle | yes | AlgoPage | |
| Floyd | `floyd.ts` | kLoop, relax, update, done | yes | AlgoPage | |
| Matrix chain | `matrixChain.ts` | lenLoop, trySplit, cost, update | yes | AlgoPage | dims input editor |
| Huffman | `huffman.ts` | init, sort, merge, done | yes | AlgoPage | symbols/freqs editors |
| Activity selection | `activitySelection.ts` | sort, check, pick, done | yes | AlgoPage | built-in sample |
| Knapsack 01 (AlgoPage) | `knapsack.dp2d.ts` | init, fill, take, reconstruct | yes | AlgoPage | weights/values/W editors |
| Knapsack dp2d | `knapsack.dp2d.ts` | same | yes | KnapsackUnit | strategy switch |
| Knapsack dp1dCorrect | `knapsack.dp1dCorrect.ts` | init, reverse, update, done | yes | KnapsackUnit | |
| Knapsack dp1dWrong (反例) | `knapsack.dp1dWrong.ts` | init, forward, update, done | yes | KnapsackUnit | labeled 反例 |
| Knapsack brute | `knapsack.brute.ts` | enum, sum, feasible, done | yes | KnapsackUnit | |
| Knapsack backtracking | `knapsack.backtracking.ts` | call, skip, take, best | yes | KnapsackUnit | |
| Knapsack branchAndBound | `knapsack.branchAndBound.ts` | bound, prune, take, skip | yes | KnapsackUnit | |
| Knapsack greedy | `knapsack.greedy.ts` | sort, check, pick, done | yes | KnapsackUnit | |

## Anchor convention

- `CodeDocument.anchors[].range` uses **1-based** inclusive line numbers.
- Generators attach `codeRefs: [{ documentId, anchorId }]` at the op that corresponds to that anchor — never by parsing `message` text.
- `getCatalog(algoId)` returns `{ typescript, pseudocode? } | null`. Knapsack strategies use ids `knapsack.<strategy>`.

## Gaps / honesty

- Some graph/DP generators attach a **default** catalog anchor on every snap when fine-grained phase maps are thin (still valid `anchorId`s; not message-parsed).
- Activity selection on AlgoPage still uses built-in sample (no custom activity table editor yet).
- Phase E: **Playwright not installed** in this environment; Vitest DOM smoke covers Dijkstra run + code presence (`tests/dom/v3-phase-e-codebrowser.test.tsx`). **No claim of E2E/Playwright pass.** Screenshots skipped (no headless screenshot run).

