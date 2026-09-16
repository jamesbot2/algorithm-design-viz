# V11 Full algorithm coverage matrix

Baseline: `e51c950` → branch `v11-semantic-visual`.  
Screenshot attachment bug: **待确认 / 附件缺失** (not claimed fixed).  
Viewports exercised in e2e (subset): 1366×768, 1280×800, 390×844, 1024×520/500, 844×390. Others marked 未验证 where not run.

Legend: ✅ verified · 🔶 partial · ⬜ 未验证 · ❌ fail

| Algo / strategy | Final answer | Step semantics | Code sync | Main canvas | Mid anim | Mobile/desktop | Boundary inputs |
|-----------------|-------------|----------------|-----------|-------------|----------|----------------|-----------------|
| bubbleSort | ✅ unit | ✅ | 🔶 | 🔶 e2e legacy | ✅ V11-09 | ⬜ | ⬜ |
| insertionSort | ✅ | ✅ V11-02 | ✅ | ✅ e2e | ✅ | 🔶 | ✅ [2,1][3,2,1] |
| mergeSort | ✅ | ✅ V11-02 | ✅ V11-05 | 🔶 | ✅ | ⬜ | ✅ |
| quickSort | 🔶 legacy | 🔶 | 🔶 | 🔶 v10 e2e | ⬜ | 🔶 | ⬜ |
| binarySearch | 🔶 | 🔶 | 🔶 | 🔶 v10 | ⬜ | 🔶 | ⬜ |
| kadane | ✅ | ✅ ranges | 🔶 | ✅ e2e docks | ⬜ | ✅ short-h | ✅ signed |
| knapsack01 | ✅ | ✅ | ✅ done | 🔶 | ⬜ | ⬜ | ✅ V11-04 |
| lcs | ✅ V11-07 | 🔶 | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ |
| editDistance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| activitySelection | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| bfs | ✅ V11-07 | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| dijkstra | ✅ V11-07 | 🔶 | 🔶 | 🔶 v10 | ⬜ | ⬜ | ⬜ |
| dijkstraHeap | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| kruskal | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| bellmanFord | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| floyd | ✅ | ✅ | ✅ V11-05 | ⬜ | ⬜ | ⬜ | 🔶 |
| kmp | ✅ V11-07 | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| prim | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| nQueens | ✅ oracle | ✅ V11-03 | ✅ | ✅ e2e end board | ⬜ | 🔶 | ✅ n=1..8 |
| matrixChain | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| huffman | ✅ | ✅ forest | ✅ | 🔶 | ⬜ | ⬜ | ✅ dup |
| maxSubarrayDC | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| teach bruteForce | ✅ m2 | 🔶 | 🔶 | 🔶 | ⬜ | ⬜ | ✅ validate |
| teach greedy | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| teach fractional | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| teach dp1dCorrect | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| teach dp1dWrong | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| teach dp2d | ✅ | 🔶 | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ |
| teach backtracking | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |
| teach branchAndBound | ✅ | 🔶 | 🔶 | ⬜ | ⬜ | ⬜ | ⬜ |

Viewports **未验证** in this pass: 360×640, 320×568, 768×1024 (covered by prior V10), 1024×521 (close to 520).
