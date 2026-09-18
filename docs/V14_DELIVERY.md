# V14 Delivery — Inspector entry, arrays, pan meet, strict visibility

**Branch:** `v14-inspector-arrays-pan-visibility`  
**Baseline HEAD:** `dc40e1679e6fad3f37236146a72d6d6f8a28f771` (main / V13)  
**Tip SHA:** `65d72e1b07b4616e327aadaa609d90f0ab3b58f2` (docs tip; fix=`1cc141227db12614154b8fd17c3405260511c71a`).
**Not pushed. Not deployed. No force-push.**

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V13 / prior

Graph warn vs plot; dynamic ~12–14px labels; camera preserve across steps when structure unchanged; mergeSort return/arrayPointers/pre-inc write snaps; settings portal zero-rect close + in-portal overflowStages; range masks + signed domain; run identity/cancel/snapshots; N-Queens; same-SHA gate; SVG must not paint into inspector. MergeSort unit regression green (`tests/v13-02-mergesort.test.ts`, 6 passed).

---

## V14-01 — Inspector entry when lab-fill hides inline (P1)

| | |
|--|--|
| **Repro?** | Yes — CSS hid `.viz-inspector` under lab-fill+graph; toggle only under short/narrow media → desktop 1280×800 lost 变量/结果 |
| **Fix** | Unified `inspectorLayout: 'inline' \| 'drawer'` measured from inline computed style; whenever drawer, focusable `inspector-sheet-toggle` (aria-label 变量与结果); CSS also forces toggle for lab-fill+graph; single VarsPanel mount (inline gated off while drawer open); resize/toggle does not change runId/cursor |
| **Files** | `src/components/Visualizer.tsx`, `src/styles.css` |
| **Tests** | `tests/v14-01-inspector-layout.test.ts`; e2e V14-01 × 5 algos × 5 viewports |
| **Evidence** | `docs/screenshots/v14/inspector-*-*.png`, `docs/traces/v14/inspector-*-*.json` |

## V14-02 — Arrays in same inspector; cursor-synced (P1)

| | |
|--|--|
| **Repro?** | Yes — tabs hide `.arrays-panel`; VarsPanel ignored `step.arrays` (Dijkstra dist/parent/done) |
| **Fix** | VarsPanel renders compact `inspector-arrays` tables from `step.arrays`; stage arrays omitted when graph present; e2e closes drawer before next-step so transport is never covered mid-scrub; Esc/关闭 close sheet; ArrowLeft/Right still scrub while focus is inside sheet |
| **Case** | Dijkstra n=3 start=0 edges `0 1 10` / `0 2 1` / `2 1 1` → dist[1] ∞→10→2, parent[1]=2 @1280/768/390 |
| **Files** | `src/components/VarsPanel.tsx`, `src/components/Visualizer.tsx`, e2e |
| **Evidence** | `docs/traces/v14/dijkstra-arrays-*.json` (seen ∞,10,2 + parentAt2=2), screenshots |

## V14-03 — Pan meet / CTM (P2)

| | |
|--|--|
| **Repro?** | Yes — pan used `camera.w/plot.w` and `camera.h/plot.h` separately vs `xMidYMid meet` |
| **Fix** | `getScreenCTM().inverse()` (+ uniform `Math.min` fallback); pointer capture on plot host; `touch-action: none`; **重置视图** resets pan only; runId/cursor unchanged |
| **Files** | `src/components/GraphView.tsx`, `src/styles.css` |
| **Evidence** | e2e V14-03 + `docs/traces/v14/pan-100px.json` |

## V14-04 — Strict visibility topmost hit (P1)

| | |
|--|--|
| **Repro?** | Yes — stack “contains `.graph-svg`” passed under opaque overlays |
| **Fix** | Shared `src/utils/strictGraphVisibility.ts` + e2e helper: topmost must be target node/label; opaque overlay any class must fail; positive control still passes |
| **Files** | `src/utils/strictGraphVisibility.ts`, `tests/e2e/helpers/assertStrictGraphVisible.ts`, `tests/dom/v14-04-visibility-helper.test.ts` |
| **Evidence** | `docs/traces/v14/visibility-positive.json`, `visibility-fault-opaque.json` |

---

## Commands (honest)

| Command | Result |
|---------|--------|
| `npx tsc -b` | pass |
| `npm run lint` | exit 0 (warnings only; VarsPanel hooks deps warnings) |
| `npx vitest run` | **70 files / 324 tests passed** |
| `npx vitest run tests/v14-*.test.ts tests/dom/v14-04-visibility-helper.test.ts` | **15 passed** |
| `npx vitest run tests/v13-02-mergesort.test.ts` | **6 passed** |
| `npx playwright test tests/e2e/v14-inspector-arrays-pan-visibility.spec.ts` | **30 passed** (Chromium) |
| `npx playwright test tests/e2e/v13-graph-portal-visibility.spec.ts tests/e2e/v12-stage-overlap.spec.ts` | **17 passed** |
| `npm run build` | pass → `index-CrE708Tk.js` / `index-B0Q3Gwv3.css` |

FF/WebKit not run (Chromium-only project).

## Confirm

**Did not git push. Did not deploy Pages. Did not force-push.** Local branch commits only.
