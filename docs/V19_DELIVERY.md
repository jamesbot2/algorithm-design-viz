# V19 Delivery — matrix follow / CodeMirror scroll / compact labels

**Branch:** `v19-matrix-follow-cm-scroll-compact`  
**Baseline HEAD:** `3412f71911c3b3d6691af6b8a7a528fd4cff3502` (V18.1)  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).  
Build: `index-D0HTcY20.js` / `index-CxO52rU7.css`

## Preserve V18

Sheet body ~620+/932+ (not 96px); edit click with data open; LCS DP in stage; code.w≠0; run btn full; Dijkstra/merge/keyboard/single player/same-SHA gate; CI artifact upload `docs/screenshots/` + `docs/traces/`.

Evidence baseline (reviewer): Pages ZIP SHA-256 `ff82316e…`; live `index-BTIio7x9.js` / `index-BL8zxhmK.css`; workflow 35354889228.

---

## Before → after (desktop Chromium @1366×768)

| Metric | Before | After |
|--------|--------|-------|
| LCS cell visibleH @14/95 (inner+sticky) | **0** (scrollTop≈141 overscroll) | **35** (scrollTop≈19) |
| cm-scroller clientH / scrollH @ Dijkstra 16/25 | **681 / 681** (no real scrollport) | **322 / 681** |
| Line 19 execVisWrap | **0** | **18** (full line) |
| LCS `.cell-val` / compact-ch readable | **0 / 13** (40px clip) | **13 / 13** (semantic strip) |
| Vars button visibleFrac | **~0.52** (19/36px) | **1.0** (28/28) |

Evidence: `docs/traces/v19/v19-m0-baseline.json`, `v19-after-metrics.json`, `docs/screenshots/v19/{before,after}/`.

---

## V19-01 — Matrix auto-follow mixed coordinates (P1)

| | |
|--|--|
| **Root cause** | Follow used `getBoundingClientRect` for out-of-view check then `cell.offsetTop/Left` as if relative to `.matrix-scroll`; `offsetParent` is `.viz-main.stage-viewport` → overscroll (scrollTop≈141) so current cell `visibleH→0` at 13→14. Rapid step also cleared `programmaticScroll` in effect cleanup → scroll events looked “user” and paused follow. |
| **Fix** | `cellContentBox` = `scrollTop + (cRect.top - sRect.top)`; sticky insets; pause on real user scroll; 「定位当前格」「恢复跟随」; followGen + programmatic depth; only scroll `.matrix-scroll`. |
| **Files** | `src/components/MatrixView.tsx`, `src/styles.css` |
| **Min repro** | LCS default @1366, step to 14/95, measure current cell vs `.matrix-scroll` (sticky). |
| **Verify** | e2e V19-01 full 95 + frame 14 @1366/1920/390; locate after manual scroll. |
| **Limits** | Very rapid scrub may still need a settle frame; sticky inset assumes thead/left th present. |

## V19-02 — CodeMirror height chain / real scrollport (P1)

| | |
|--|--|
| **Root cause** | `.cm-scroller` expanded to content (`clientH≈scrollH≈681`); real clip was `.code-browser-cm-wrap` (~322). `scrollLineNearest` on `view.scrollDOM` no-op’d. Also `markProgrammatic()` before scheduled follow bumped `scrollGen` and cancelled post-layout scroll. |
| **Fix** | CSS height chain: toolbar/meta `flex:0`; wrap fills; theme/editor `max-height:100%`; `.cm-scroller` is ONE scrollport (`overflow:auto`). Scroll after `requestMeasure` + double rAF; pause only on real `scrollDOM` scroll. |
| **Files** | `src/styles.css`, `src/components/codeBrowser/CodeBrowser.tsx` |
| **Min repro** | Dijkstra default → 16/25; line 19 vs wrap; wheel to end → 「回到执行行」. |
| **Verify** | e2e V19-02; unconstrained `!important` fault inject must fail contract. |
| **Limits** | Firefox/WebKit/device not run (Chromium only). Short docs (insertionSort) may have `clientH≈scrollH` when content fits. |

## V19-03 — Compact input strip clips chars/values (P1)

| | |
|--|--|
| **Root cause** | `.array-labels-strip { max-height:40px; overflow:hidden }` still hosted full `ArrayView` cards → `.cell-val` at top≈48 → `visibleH=0`. |
| **Fix** | `CompactSequenceStrip` semantic UI (inline chars + pointer context); strip no longer 40px-clipped; buffers remain dynamic aux with identity. |
| **Files** | `src/components/ArrayView.tsx`, `src/styles.css` |
| **Min repro** | LCS / knapsack01 with matrix primary; measure `.compact-ch` vs strip. |
| **Verify** | e2e V19-03; negative 40px clip fault fails. |
| **Limits** | Very long sequences wrap; strip grows naturally (~25–40px) without pushing matrix below usable (~120px+). |

## V19-04 — Vars button half-clipped (P2)

| | |
|--|--|
| **Root cause** | `@media (max-height:800px)` set `.viz-banner-slot` to **2rem (32px)** while toggle ~36px → ~19px visible (~0.52). |
| **Fix** | Separate `.viz-banner-text` vs `.viz-banner-controls`; when toggle `:not([hidden])`, banner `min-height` fits full button. |
| **Files** | `src/components/Visualizer.tsx`, `src/styles.css` |
| **Verify** | e2e V19-04 before click; run btn clip ≥0.9. |

## V19-05 — Acceptance / flaky cleanup

- LCS e2e walks full 95; frame 14 asserts **inner scroll + sticky** (not only stage intersect).
- V15-02: `prepareDijkstraN3Ready` + phase-jump/End seek + wait for edge roles (not empty pre-terminal).
- V15-04 / V13: `scrollPlotStable` waits attached+layout before `scrollIntoViewIfNeeded`.
- Separate asserts; no force click; no `isVisible` OR rescue; no test pre-scroll of current cell; mutation sanity; `--retries=0` ×10 on 5 key paths.
- CI artifact paths unchanged: `docs/screenshots/`, `docs/traces/`.

---

## Test counts (honest)

| Suite | Pass | Fail | Flaky | Skipped | Notes |
|-------|------|------|-------|---------|-------|
| Vitest | **395** | 0 | — | 0 | +11 V19 static/unit |
| V19 e2e | **5** | 0 | 0 | 0 | retries=0 |
| V15 e2e | **5** | 0 | 0 | 0 | after run-ready/plot-stable |
| V18 e2e | **4** | 0 | 0 | 0 | preserve |
| Lint (touched) | warnings only | 0 errors | | | pre-existing react hooks noise |
| Prod build | ok | | | | `index-D0HTcY20.js` |

Commands:

```bash
npx tsc -b
npx vitest run
npx playwright test tests/e2e/v19-matrix-cm-compact-acceptance.spec.ts --retries=0
npx playwright test tests/e2e/v15-keyboard-dijkstra-inspect-visibility.spec.ts tests/e2e/v18-data-body-primary-scene-controls.spec.ts --retries=0
npx vite build
```

Full e2e suite beyond V15/V18/V19 not re-run in this session (time). Firefox/WebKit/device: **unverified**.

## Shared-component smoke (actually run)

LCS, editDistance, knapsack01, matrixChain, N-queens, mergeSort, insertionSort, Dijkstra, BFS, Prim — see `docs/traces/v19/shared-component-smoke.json`.

## Docs / screenshots

- `docs/V19_DELIVERY.md` (this file)
- `docs/V19_COVERAGE_MATRIX.md`
- `docs/screenshots/v19/before/`, `docs/screenshots/v19/after/`
- `docs/traces/v19/*.json`

## Confirm

**No push. No deploy. No force-push. Remotes untouched.**
