# V19 Coverage Matrix

| ID | Risk | Viewport / case | Assert type | Evidence | Status |
|----|------|-----------------|-------------|----------|--------|
| V19-01 | Matrix follow wrong coords | LCS 14/95 @1366/1920/390; full 95; row samples; locate/resume | geometry (inner+sticky visibleH); not stage-only | `v19-01-matrix-follow.json`, after screenshots | PASS |
| V19-02 | CM no real scrollport | Dijkstra 16/25 line 19; data open; wheel+goto; unconstrained fault | code semantics + geometry (clientH&lt;scrollH, execVisWrap) | `v19-02-cm-scroll.json` | PASS |
| V19-03 | Compact strip clip | LCS X/Y; knapsack w/v; 40px negative | text readable; matrixH floor; neg fail | `v19-03-compact-labels.json` | PASS |
| V19-04 | Vars half-clip | Dijkstra drawer @1366 before click | hit target + visibleFrac≥0.95; run clip | `v19-04-vars-banner.json` | PASS |
| V19-05 | Flaky / acceptance | ×10 key paths retries=0; V15 edge roles; plot attach; mutation | algo result / geometry / hit separated | `v19-05-keypaths-x10.json` | PASS |
| Preserve | V18 sheet/body/scene | @1366/@1920 sheet body; LCS primary; edit hit | geometry | V18 e2e re-run | PASS |
| Smoke | Shared components | LCS, editDistance, knapsack01, matrixChain, nQueens, merge/insertion, dijkstra/bfs/prim | load+5 steps+code.w | `shared-component-smoke.json` | PASS (ran) |
| Browsers | FF/WK/device | — | — | — | **Unverified** |
| Zoom | 125%/150% | — | — | — | **Unverified** (continuous resize not automated) |
