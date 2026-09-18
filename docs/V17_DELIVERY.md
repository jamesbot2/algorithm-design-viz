# V17 Delivery — Input edit / data+code / arrays / acceptance

**Branch:** `v17-input-edit-code-arrays-acceptance`  
**Baseline HEAD:** `4172ead39d7a9c9cb08190ae350e530f18fb424f` (main / V16 + input-edit e2e fix)  
**Fix tip:** `f6c1da9b59d725e516a7290406afe230bd1ec575`  
**Branch tip:** `a9a1f63e8337f5f7056f9e91646094e2a6cf3b31`  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).  
Build: `index-Uyu0bdQr.js` / `index-BdH-b8Q7.css`

## Preserve V16

lab-fill max-width none; stage budget; keyboardGuard activation; run readiness basics; 1-based stepDisplay; measurePageGraphVisibility; Dijkstra tree preds; mergeSort; N-Queens; single player; CTM pan; same-SHA gate. Do **not** always-expand input on load.

---

## V17-01 — Edit mode needs real body budget (P1)

| | |
|--|--|
| **Repro?** | Yes — `@media (max-height: 900px)` applied `.input-panel-v9 { max-height:4.5rem; overflow:hidden }` even while `data-input-editing=1` → body height ~0 @1366/1440×900 |
| **Fix** | Separate collapsed vs editing vs error: idle may compact to 2.8rem; editing/error → `max-height:none`, body `min-height:4.5rem` + `min(40vh,300px)` scroll |
| **Files** | `src/styles.css` |
| **Tests** | unit `v17-01-input-edit-css`; e2e @1366×768,1280×800,1440×900,1440×901,1024×600,390×844 + resize 768→900→901 |
| **Evidence** | `docs/traces/v17/v17-01-*.json`, `docs/screenshots/v17/v17-01-*` |

**After @1440×900 editing:** `bodyH=300`, `panelMaxH=none`, run/edit hittable; theory toggle clickable.

## V17-02 — Data open must keep code readable on desktop (P1)

| | |
|--|--|
| **Repro?** | Yes — body gutter `padding-right:min(360px,38vw)` shrunk workbench &lt;720 → tabs → `code.w=0` while `sheetOverlapsCode=false` |
| **Fix** | Remove body:has gutter; Workbench owns `data-data-open` + `data-layout-profile`; force split when data open && `vw≥1100`; workbench `margin-right` reserves sheet |
| **Files** | `WorkbenchLayout.tsx`, `src/styles.css` |
| **Tests** | unit `v17-02-workbench-data-open`; e2e asserts code.w≥160 **before** sheetOverlapsCode; zero-width fault fails; ≥10 steps with data open |
| **Evidence** | `docs/traces/v17/v17-02-1366-data-open.json` |

**Before/after @1366 with data open:** `code.w` **0 → 300**; layout `split`; `dataOpen=1`; `sheetOverlapsCode=false`.

## V17-03 — Array/DP use real stage budget (P2)

| | |
|--|--|
| **Repro?** | Yes — ArrayView desktop `maxBudget=160`; `.matrix-scroll { max-height:420px }` early cap |
| **Fix** | Main array `maxH` from usable stage (soft cap 50vh); lab-fill matrix-scroll `min(70vh, …)`; aux buffers stay `compact` |
| **Files** | `ArrayView.tsx`, `src/styles.css` |
| **Evidence** | `docs/traces/v17/v17-03-array-stage.json` |

| Viewport | barChartH (after) | notes |
|----------|-------------------|-------|
| 1366×768 | **174px** | was hard ~160 chart |
| 1920×1080 | **256px** | |
| 2560×1440 | **616px** | |
| LCS matrix maxH | **525px** | was 420 |
| mergeSort | compactBuffers=2 | aux stay compact |

## V17-04 — Acceptance quality (P1)

| | |
|--|--|
| **Fix** | `data-run-id` on Visualizer; `waitForRunReady({ expectRunId })` binds THIS run; `openDataSheet` no `force:true` / no 390 swap; Dijkstra×10 asserts `vis.ok` + tree edge roles + dist; same visibility entry pos/neg; `e2e.yml` uploads `test-results/` + traces; `retries=0` on V17 describe; cleaned V16 `openDrawer` cheats |
| **Files** | `runReadiness.ts`, `Visualizer.tsx`, `e2e.yml`, v16/v17 specs |
| **Evidence** | `docs/traces/v17/v17-04-*.json` |

---

## Test counts

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Vitest | **371** | 0 | +12 V17 static/unit |
| V17 e2e | **10** | 0 | retries=0 |
| V16 regress e2e | **10** | 0 | after cheat removal |
| Lint | warnings only | 0 errors | pre-existing + cleaned |
| Build | OK | | |

## Blockers

None for the four closes. Not pushed / not deployed (per brief).

## Tip SHAs

- Fix tip: `f6c1da9b59d725e516a7290406afe230bd1ec575`
- Branch tip: `a9a1f63e8337f5f7056f9e91646094e2a6cf3b31`

