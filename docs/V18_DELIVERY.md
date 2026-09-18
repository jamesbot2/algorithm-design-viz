# V18 Delivery — data body / primary scene / controls

**Branch:** `v18-data-body-primary-scene-controls`  
**Baseline HEAD:** `d1a0deb7ac4607cce4cb18a96994f2a676bf4160` (main / V17)  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).  
Build: `index-BYfPv9BV.js` / `index-DdJ3uf30.css`

## Preserve V17

code.w≠0 with data @1366; edit-mode body budget; ArrayView stage growth; run-id readiness; measurePageGraphVisibility; Dijkstra tree; keyboard; single player; same-SHA gate. V17 e2e still green after V18-04 removed `hit||isVisible` OR.

---

## Before → after (desktop Chromium)

| Metric | Before | After |
|--------|--------|-------|
| Sheet bodyH @1366 | **96px** (inherited `.viz-inspector`) | **640px** (≥~300) |
| Sheet bodyH @1920 | **96px** | **952px** (≥~500) |
| Table rows visible in sheet | **0** | **6** |
| LCS `data-primary-scene` | (none / arrays first) | **matrix** |
| LCS current cell visibleH @1366 | **0** | **36** |
| LCS current cell visibleH @1920 | **0** | **36** |
| Edit hit with data open @1920 | **false** (sheet `panel-title`) | **true** + real click |
| Compact run clip frac @1366 idle | **~0.45** | **1.0** |

Evidence: `docs/traces/v18/*.json`, `docs/screenshots/v18/*`, M0 baseline `docs/traces/v18/v18-m0-baseline.json`.

---

## V18-01 — Sidebar body not stuck at 96px (P1)

| | |
|--|--|
| **Repro?** | Yes — `.viz-inspector { height/min/max:96px }` dual-classed on `.inspector-sheet-body` |
| **Fix** | Sheet = flex column (head + transport + body). Body class `inspector-sheet-body` only (no `viz-inspector`). `height/max-height` overridden to auto/none; body scrolls |
| **Files** | `src/styles.css`, `src/components/Visualizer.tsx` |
| **Tests** | unit `v18-01-sheet-body-height`; e2e @1366/@1920 bodyH + rowsVisible |
| **Evidence** | `docs/traces/v18/v18-01-sheet-body.json`, `docs/screenshots/v18/v18-01-sheet-body-*.png` |

## V18-02 — Primary scene first (LCS DP, merge main) (P1)

| | |
|--|--|
| **Repro?** | Yes — X/Y cards ate stage; DP below fold; `currentCellVisibleH=0`; legacy 420 still in base `.matrix-scroll` |
| **Fix** | Explicit `primaryScene` (`graph\|board\|matrix\|array\|tree`); `data-primary-scene` on stage; companion X/Y as compact labels; merge `primary-first` over aux buffers; follow current cell via `matrix-scroll.scrollTo` only |
| **Files** | `Visualizer.tsx`, `ArrayView.tsx`, `MatrixView.tsx`, `styles.css` |
| **Tests** | unit `v18-02-primary-scene`; e2e LCS×2 vp + mergeSort |
| **Evidence** | `docs/traces/v18/v18-02-primary-scene.json`, `docs/screenshots/v18/v18-02-lcs-primary-*.png` |

## V18-03 — Data sheet must not cover edit/run; compact buttons fully visible (P1)

| | |
|--|--|
| **Repro?** | Yes — workbench-only `margin-right`; header/input under fixed sheet → edit hit intercepted @1920; idle panel `max-height:2.4rem; overflow:hidden` clipped run (~45%) |
| **Fix** | Propagate `data-data-open` to `.algo-page`; reserve sheet on whole page; idle compact = one flex row via `display:contents` on summary-bar (text\|edit\|run) |
| **Files** | `WorkbenchLayout.tsx`, `styles.css` |
| **Tests** | unit `v18-03-data-open-controls`; e2e compact clip + real click edit @1920 |
| **Evidence** | `docs/traces/v18/v18-03-controls-data-open.json`, `docs/screenshots/v18/v18-03-1920-data-open-edit.png` |

## V18-04 — Content assertions not shell OR (P1)

| | |
|--|--|
| **Fix** | Removed V17 `runHit \|\| isVisible()` / `editHit \|\| isVisible()`; V18 asserts sheet bodyH + rows, LCS cell visibleH (not only maxHeight string); mutation sanity (force 96px !important, cover edit, code.w=0, DP off-stage) must fail detectably; `retries=0`; no force/viewport swap in `openDataSheet` |
| **Files** | `tests/e2e/v18-*.spec.ts`, `tests/e2e/v17-*.spec.ts`, unit `v18-04-acceptance-assertions` |
| **Evidence** | `docs/traces/v18/v18-04-mutation-sanity.json` |

---

## Test counts

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| Vitest | **384** | 0 | +13 V18 static/unit |
| V18 e2e | **4** | 0 | retries=0 |
| V17 regress e2e | **10** | 0 | after OR removal |
| Lint | warnings only | 0 errors | pre-existing |
| Build | OK | | `index-BYfPv9BV.js` / `index-DdJ3uf30.css` |

## Blockers

None for the four closes. **Not pushed / not deployed** (per brief).

## Tip SHAs

- Fix tip: `cdba01082d638a224d89fda0675c5e468aab9d38`
- Branch tip: `f6512c3acea37d7833bd6d6ef9c00b3d26c4b4b3`

