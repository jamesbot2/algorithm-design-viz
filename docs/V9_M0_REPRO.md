# V9 M0 — Viewport visibility & animation authenticity reproduction

Baseline HEAD: `f3ba638` (V8 preview height).  
Branch: `v9-viewport-motion`.  
Measurement script: `scripts-v9-m0-measure.mjs` → `docs/traces/v9/m0-measurements.json` / `m0-summary.json`.  
Screenshots: `docs/screenshots/v9/`.  
Chrome: `/usr/bin/google-chrome`. Soft keyboard: **not** measured on a real device (simulated viewport only).

## Scope measured

Algorithms: Kadane, quickSort, LCS, knapsack01, Dijkstra, N-Queens, teach/knapsack.  
States: preview / mid-run / end (+ theory open, input scroll, browser zoom 125%).  
Viewports: 1366×768, 1280×800, 1024×500, 900×500, 390×844, 360×640, 320×568, 844×390.

Layers recorded per sample: workbench, viz-slot, viz-canvas (stage), main graphics (bars/matrix/svg/tree), GraphResultPanel, search tree, board, transport, input panel/actions, run/play hit-tests, overflow ancestors, visualViewport size, computed overflow/height.

## Aggregate classifications (148 samples)

| Class | Count | Meaning |
|-------|------:|---------|
| `lab_fill_overflow_hidden` | 147 | `.main-wrap[data-lab-fill=1]` locks `overflow:hidden` + `100dvh` |
| `stage_offscreen_or_clipped` | 106 | Stage∩viewport ratio &lt; 0.5 (content taller than locked shell) |
| `input_actions_outside_scroll_box` | 45 | Run/Cancel sit below clipped `max-height` input scrollport |
| `aux_graph_result_above_main` | 16 | GraphResultPanel (~225px) stacked above SVG in viz slot |
| `search_tree_above_board` | 16 | Full N-Queens search tree defaults above board matrix |

## Representative numbers (desktop 1366×768)

| Algo | State | Stage H | Main H | Stage∩VP | Notes |
|------|-------|--------:|-------:|---------:|-------|
| Kadane | preview | 283.5 | 222.3 | 1.00 | Input panel max-height **122.9px**; actions can sit outside scrollport |
| Dijkstra | mid | 796.7 | 267.9 | **0.061** | GraphResultPanel h≈**225.3** above graph → flex crush / clip |
| N-Queens | mid | 438.8 | 149.9 | 0.65 | `search_tree_above_board` |
| LCS | mid | 710.8 | 54 | **0.40** | Tall matrix + inspector; locked shell clips |
| knapsack01 | mid | 888.5 | 219 | **0.32** | Same pattern |

## Low height / phone / zoom

| Stress | Observation |
|--------|-------------|
| 1024×500 + theory open (Kadane) | Stage∩VP **0**; runOk **false**; inputPanelH **61.3** / max-height **80px** — theory in non-shrinking header + locked shell |
| 390×844 Dijkstra mid | Stage∩VP **0.117**; aux_graph_result_above_main |
| 390×844 input max-height | **130px** (`min(16vh,130px)`) — graph form / errors / run compete inside scroll box |
| 1280×800 zoom 125% | layout flips tabs; playOk **false**; stage clipped |
| 844×390 landscape | Same overflow-hidden lab-fill; transport competes with stage |

## Scroll ownership

- Page/`main-wrap`: **hidden** under lab-fill (no natural vertical escape).
- Input panel: **own** `overflow:auto` with tiny max-height → Run/Cancel/errors not always in view without scrolling *and* can measure outside the clip box.
- Viz body: `overflow:auto` nested inside overflow-hidden ancestors → multi-layer same-axis scroll risk.
- CodeMirror scroller: separate (OK) but height chain still depends on panel flex mins.

## Animation authenticity (source + behavior, not only CSS height)

| Issue | Evidence |
|-------|----------|
| FLIP X-only | `ArrayView` stores `prevCenters` as scalar X; `translateX` only — cross-row wrap has no Y continuity |
| Speed desync | `resolveDuration(..., 600)` hardcoded; Visualizer `effectiveInterval` can be **80ms** while swap ≈ **154–280ms** |
| Transition identity | `animToken` local only; pause/scrub/runId not bound as `transitionId`; stale timeout can clear wrong frame |
| Geometry cache | No invalidate on bars↔cells, zoom, splitter resize |
| DP cellClass | Early `current` return swallows concurrent write/path/read classes |
| Reverse edges | Bidirectional curve sign from string compare; no endpoint inset; weights share midpoints; fixed viewBox 520×280; no self-loop policy |
| Aux ahead of scene | GraphResultPanel + SearchTree default above primary viz |

## Root-cause map (for V9-01)

1. **Locked overflow shell + estimated chrome (`--wb-chrome: 14rem` / fixed vh caps)** → stage clipped when aux/theory/matrix tall; no honest fallback to natural scroll.
2. **Aux result/search tree in the same flex column as the main scene** → fights height before StageViewport (viz-canvas) gets budget.
3. **Input compact max-height without sticky actions** → operability failure under graph/edit/error.
4. **Theory expands in page header inside non-scroll lab-fill** → crushes remaining stage to unusable.
5. **Motion clock ≠ playback clock** + X-only FLIP + non-composable DP highlights + crude reverse-edge channels.

## Proposed fix direction (M1–M3)

- Reorganize: main scene first (array/matrix/graph/board); aux → inspector/details; sticky input actions; theory drawer or scroll-mode escape.
- Budget from **measured** available H/W; collapse aux first; allow natural scroll when still insufficient — never raise min-height inside locked hidden shell.
- FLIP XY + cache invalidate; bind transitions to runId/transitionId; unify speed; composable DP roles; normalize reverse-edge geometry + fit margins.
