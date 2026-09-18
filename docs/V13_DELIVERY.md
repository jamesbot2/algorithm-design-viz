# V13 Delivery — Graph readability, mergeSort anchors, settings portal, visibility asserts

**Branch:** `v13-graph-mergesort-portal-asserts`  
**Baseline HEAD:** `e38ee6f7c509ff1a702c7cf3f3858f7a2d7728e1` (main / V12)  
**Tip SHAs:** fix `01a6f4c716620e0d947fd6af03ad78fd603736b4`; docs tip on branch HEAD (this file).  
**Not pushed. Not deployed.**

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V12

Stage fill vs scroll-fallback strategies, insertion `takeKey→outer`, merge L/R remain anchors (extended in V13), `hasMoveMotion`, settings `createPortal`, range masks + run-level signed domain, run identity / cancel / snapshots / N-Queens / input validation / same-SHA gate — retained.

---

## V13-01 — Graph readability (P1)

| | |
|--|--|
| **Repro?** | Yes — after V12 fit, `viewBox meet` shrunk labels to ~5–6px in short stages; `graph-neg-warning` + `height:100%` SVG clipped bottom nodes; BFS also shared stage with `dist` arrays crushing the plot |
| **Root cause** | Meet-scale shrinks SVG user fonts; warn competed with SVG height; companion arrays + 96px inspector stole stage; narrow tabs panel `min-height:220` overflowed transport |
| **Fix** | Separate warn vs `.graph-plot` flex viewport; ResizeObserver camera; **dynamic label font** so CSS px ≈ 12–14 after meet; pan preserved when structure unchanged; prefer graph over capped arrays; hide inline inspector when graph present; narrow/tabs dock chrome + flex share with transport |
| **Files** | `src/components/GraphView.tsx`, `src/styles.css` |
| **Tests** | `tests/v13-01-graph-layout.test.ts`, `tests/e2e/v13-graph-portal-visibility.spec.ts` (BFS @1366/1024/844/390/320, Dijkstra/Prim, BF neg-warn, resize) |
| **Evidence** | `docs/screenshots/v13/bfs-visibility-*.png`, `docs/traces/v13/bfs-visibility-*.json`, `bf-neg-warn.*` |

## V13-02 — mergeSort anchors / pointers / snapshots (P1)

| | |
|--|--|
| **Repro?** | Yes — leaf `[1]` used PHASE `split`→`divide`; compare mapped `i`/`j` onto main `a` via global pointers; write snap after `i++` while catalog used `a[k++]=left[i++]` |
| **Fix** | Catalog split to `a[k]=left[i]; i++; k++`; leaf `codeRefs→return` on `if (L>=R) return`; `arrayPointers` `{a:L/mid/R/k, left:i, right:j}`; snap **before** increments |
| **Files** | `src/algorithms/mergeSort.ts`, `src/codeCatalog/mergeSort/index.ts` |
| **Tests** | `tests/v13-02-mergesort.test.ts`, updated `tests/v12-02-code-anchors.test.ts` |
| **Evidence** | unit run `docs/traces/v13/unit-run.log` |

## V13-03 — Settings portal lifecycle + in-portal overflow (P2)

| | |
|--|--|
| **Repro?** | Yes — 844×390 open → 1280×800 hides dock toggle → 0-rect panel; portal「更多」lacked `overflowStages` select |
| **Fix** | Zero/hidden toggle → close + focus restore; visualViewport/scroll listeners; clamp/sheet placement; close button + Esc; overflow select inside portal (`overflow-stages-select-dock`) |
| **Files** | `src/components/workbench/PlaybackTransport.tsx`, `src/styles.css` |
| **Tests** | `tests/v13-03-portal.test.ts`, e2e settings 844→1280 + More→seek |
| **Evidence** | `docs/traces/v13/settings-*.json`, `docs/screenshots/v13/settings-*.png` |

## V13-04 — Visibility asserts (P1)

| | |
|--|--|
| **Repro?** | Yes — `measureOverlap` clipped SVG∩stage tautology; skipped out-of-stage centers; empty hits → blockedHits=0; fault inject still green |
| **Fix** | `measureGraphVisibility`: exact node counts, multi-sample `elementsFromPoint`, readable label heights, fail empty/clipped; labeled **FAULT-INJECTION** must `pass===false`; tightened `tests/e2e/v12-stage-overlap.spec.ts` |
| **Files** | `tests/e2e/v13-graph-portal-visibility.spec.ts`, `tests/e2e/v12-stage-overlap.spec.ts` |
| **Evidence** | `docs/traces/v13/fault-inject-must-fail.json`, `e2e-v13-run.log` |

## Commands (honest)

| Command | Result |
|---------|--------|
| `npx tsc -b` | pass |
| `npx oxlint` (touched) | 0 errors (1 hooks warning cleanup) |
| `npx vitest run` | **66 files / 309 tests passed** |
| `npx playwright test tests/e2e/v13-graph-portal-visibility.spec.ts` | **12 passed** (Chromium) |
| `npx playwright test tests/e2e/v12-stage-overlap.spec.ts` | **5 passed** |
| `npm run build` | pass → `index-osdhHDTT.js` / `index-CdRSkSgx.css` |

Full e2e suite beyond v12+v13 not re-run in this session (time); targeted + unit + build green.

## Confirm

**Did not git push. Did not deploy Pages. Did not force-push.** Local branch commits only.
