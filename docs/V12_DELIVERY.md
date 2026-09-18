# V12 Delivery — Stage / graph overlap + anchors + move clock

**Branch:** `v12-stage-overlap`  
**Baseline HEAD:** `0d5b12f` (V11 on `main` — **already live / deployed**)  
**Tip:** `52541e7` on `v12-stage-overlap` (local only).  
**Not pushed. Not deployed.**

Chrome: `/usr/bin/google-chrome`.

## Screenshot status

用户原图线索已按提示词采纳（n=6/start=0/undirected）；命名文件 USER_REPORTED_GRAPH_OVERLAP.png 本会话未落盘；按同类机制在完整应用复现，不声称“用户没提供截图”。

Reproduced with BFS/Prim/Dijkstra GraphView (BFS default adj = 6 nodes, start=0, undirected). Before/after rectangles + screenshots under `docs/screenshots/v12/` and JSON under `docs/traces/v12/`.

---

## V12-01 — Graph must not paint into inspector (P1)

| | |
|--|--|
| **Repro?** | Yes — `.stage-viewport` flex-shrunk while `.graph-svg { height:auto }` + scroll-fallback `overflow:visible` → SVG paints into sibling `.viz-inspector` |
| **Strategy** | **Fill mode:** fixed workbench slot — stage `overflow:auto`, graph SVG `height:100%` fits slot. **Scroll fallback:** natural flow — stage `flex:0 0 auto; height:auto`, SVG `height:auto`, inspector follows (no hybrid). |
| **Files** | `src/styles.css` |
| **Tests** | `tests/v12-01-stage-overlap.test.ts`, `tests/e2e/v12-stage-overlap.spec.ts` (BFS/Prim/Dijkstra + elementFromPoint) |
| **Evidence** | `bfs-overlap-before.png` / `bfs-overlap-after.png` + JSON traces |

## V12-02 — Code anchors match ops (P1)

| | |
|--|--|
| **Repro?** | Yes — insertion take-key used `insert` → write-back line; merge left-take/copy used `mergePush` → else/right line |
| **Fix** | insertion `takeKey` → `outer` (`const key = …`); merge catalog rewritten to in-place L/R/k with `mergeWriteLeft/Right`, `mergeCopyLeft/Right`; trajectory refs updated. Assert **source text**, not only anchor id. |
| **Files** | `src/algorithms/insertionSort.ts`, `src/algorithms/mergeSort.ts`, `src/codeCatalog/mergeSort/index.ts` |
| **Tests** | `tests/v12-02-code-anchors.test.ts`, updated `tests/v11-05-code-arrow.test.ts` |

## V12-03 — Move clock (P1)

| | |
|--|--|
| **Repro?** | Yes — `coordinatedStepIntervalMs` only budgeted swap FLIP |
| **Fix** | `hasMoveMotion` in same protocol; Visualizer sets it from `arrayOps` move |
| **Files** | `src/utils/playbackClock.ts`, `src/components/Visualizer.tsx` |
| **Tests** | `tests/v12-03-move-clock.test.ts` (insertion `[5,4,3,2,1]`) |

## V12-04 — Settings panel clipped (P1)

| | |
|--|--|
| **Repro?** | Yes — panel absolute under transport overflow on 844×390 / 900×390 |
| **Fix** | `createPortal(…, document.body)` + `data-portaled="1"` fixed positioning; Escape/focus retained; dock「更多」overflow stages unchanged |
| **Files** | `src/components/workbench/PlaybackTransport.tsx`, `src/styles.css` |
| **Tests** | e2e settings @844×390 / 900×390 — real speed slider clickable |

## V12-05 — Range mask coords + stable scale (P2)

| | |
|--|--|
| **Repro?** | Partial — masks vs wrap not overlay host; no resize remeasure; cells lacked top/height; mid `[1,1]` doubled bar height vs `[1,-1]` |
| **Fix** | Measure in overlay-host coords; ResizeObserver; segments include top/height (cells + bars); run-level `signedDomainByArray` keeps half-span |
| **Files** | `src/components/ArrayView.tsx`, `src/components/Visualizer.tsx` |
| **Tests** | `tests/v12-05-range-scale.test.ts` |

## V12-06 — False-green visibility (P2)

| | |
|--|--|
| **Repro?** | Yes — `assertBarsPainted` used full bar `h` for `maxVisibleH` |
| **Fix** | Visible intersection height vs stage + clip ancestors + inspector occlusion |
| **Files** | `tests/e2e/v11-semantic-visual.spec.ts` |

## Preserve V11

activePathIds / board end / knapsack contract / slot keys / Huffman forest / reverse-edge normals / DP fixed frame / same-SHA CI+E2E gate / run identity — untouched.

## Coverage table (V12)

| ID | Area | Automated | Manual |
|----|------|-----------|--------|
| V12-01 | Graph ∩ inspector | unit CSS + e2e BFS/Prim/Dijkstra | Path A |
| V12-02 | Code anchors | unit source-text | Path B |
| V12-03 | Move clock | unit | Path B |
| V12-04 | Settings portal | e2e 844/900×390 | Path C |
| V12-05 | Range/scale | unit geometry | — |
| V12-06 | Bar visibility assert | e2e helper | Path C |

## Three manual paths

1. **Graph overlap:** open BFS (default 6-node undirected, start 0) @1280×800 — all nodes/weights hit-testable; inspector does not cover SVG. Repeat Prim + Dijkstra.
2. **Insert anchors + move:** insertionSort `[5,4,3,2,1]`, fast play — code arrow on take-key ≠ write-back; mid moves complete before next step.
3. **Short landscape settings:** 844×390 — open「播放设置」, change speed + phase, Escape closes;「更多」lists real overflow stages.

## Test counts (local)

| Suite | Result |
|-------|--------|
| Unit (`npm run test:run`) | **295 / 295** passed |
| `tsc -b` | clean |
| E2E V12 | **5 / 5** passed (`docs/traces/v12/e2e-v12.log`) |

**No push. No deploy.** V11 (`0d5b12f`) remains the live tip until this branch is explicitly shipped.
