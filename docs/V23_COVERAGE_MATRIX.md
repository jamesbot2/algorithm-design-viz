# V23 coverage matrix

**Legend**
- ✅ automated and passing on Chrome (`/usr/bin/google-chrome`), zero retries
- 🦊 also run on Playwright Firefox: the whole V23 spec (A–F, ×3) and the whole V22 spec, 18/18 passed (see DELIVERY §7)
- ⚠️ covered with a documented limitation
- ❌ not verified

Screenshots referred to as `after/…` are in `docs/screenshots/v23/after/`, and the matching `before/…` shots are in `docs/screenshots/v23/before/`. Both sets come from the same inventory script under the same conditions.

## Viewports × states (BFS six-node graph unless noted)

The inventory covers preview, previewdata, mid, dataopen and editopen at every viewport listed below (`scripts/v23-inventory.mjs`).

- **Spec:** `tests/e2e/v23-workbench-layout.spec.ts`.
- **A** exercises every viewport in the list through preview → run → mid → data → +10 → end → replay.
- **A2** covers edit open at 1366×768, 1920×1080 and 390×844.

| viewport | mode | desktop default | data open | edit open | narrow / tabs | low-height fallback | cross-mode | before shot |
|---|---|---|---|---|---|---|---|---|
| 1366×768 | docked | ✅ A, ×3 rep, inventory | ✅ A (collapse / re-open), inventory | ✅ A2, inventory | – | – | ✅ E (1366→700 tabs→1366) | ✅ |
| 1440×900 | docked | ✅ A, inventory | ✅ A | ✅ inventory | – | – | – | – (baseline inventory had 5 viewports) |
| 1920×1080 | wide (3 columns) | ✅ A, inventory | ✅ A (collapse → vertical strip) | ✅ A2, inventory | – | – | – | ✅ |
| 2560×1440 | wide | ✅ A, inventory | ✅ A | ✅ inventory | – | – | – | – |
| 1024×600 | docked | ✅ A, ×3 rep, F | ✅ A | ✅ inventory | – | – | – | ✅ |
| 900×500 | tabbed (low height) | – | ✅ A (数据 tab) | ✅ inventory | ✅ | ✅ locked screen + compact chrome (plot 296) | – | – |
| 390×844 | tabbed | – | ✅ A, ×3 rep | ✅ A2 | ✅ V9 tab-panel contract, V15/V16 | – | – | ✅ (reproduces the user's screenshot) |
| 360×640 | tabbed | – | ✅ A | ✅ inventory | ✅ | – | – | – |
| 844×390 | tabbed (low tabs: tabs share the transport row) | – | ✅ A | ✅ inventory | ✅ | ✅ locked screen + compact chrome (plot 186, before 139) | ✅ V10-07 matrix | ✅ |

## Five real tasks

| task | what is asserted | spec / test |
|---|---|---|
| A six-node graph | Default fit shows 6 nodes with labels ≥9px glyphs. Every node, label and weight lies inside the plot and is topmost at its centre (elementFromPoint, not elementsFromPoint). The data region is placed below or beside the scene, never over it. The scene, data, code, transport and toolbar regions have zero pairwise intersection. There is exactly one visualizer, one transport and at most one CodeMirror. Code is ≥340px wide in docked/wide mode. The config summary replaces the ready/n/start/directed pills. The final result opens at the end. Replay does not re-solve (`data-solve-count`). | v23 `A` + `six-node … rep 1..3` |
| A2 edit open | The scene is not crushed (plot ≥140px), nothing overlaps, and the page scroll viewport scrolls instead. | v23 `A2` |
| B Dijkstra 3-node directed | dist[1] is observed as ∞ → 10 → 2; final dist=[0,2,1], parent=[-1,2,0]; the only valid predecessor edges are 0→2 and 2→1; mid-run data is not the end state. | v23 `B`, plus V15-02 and V17-04 |
| C LCS 95 frames | At frames 1/14/31/74/75/94/95, these are all fully readable against every clip ancestor and the viewport: the 13 input glyphs, the current cell, locate/resume, the data chips, the exec line and the step text. Code is ≥340px. End length is 4. An unassisted walk runs with no locate/resume rescue. | v23 `C`, V22-03a/b, V19-01 |
| D merge / insertion | The main array keeps its length every frame; buffers (left/right, temp) stay inside the stage; the transient duplicate during merge copy-back is kept (never deduped); the final array is correct. | v23 `D`, V22-03d, V11 insertion temp |
| E reading & adjusting | Covers two manual TS reading positions, data collapse/re-open, a height change, a TS→pseudo→TS round trip (the reading position is restored), a split drag of +60px, narrow tabs (700px) including the code tab, and a return to desktop. runId, cursor, speed, query target, reading position and solve count are all unchanged, and the split preference survives. | v23 `E` |

## V22 requirements

| requirement | coverage |
|---|---|
| V22-01 strip glyphs (LCS 13 chars, edit distance, knapsack) | V22-01 across key viewports, and v23 `C` |
| V22-02 locate / resume geometry, hit, disabled state, pause | V22-02; V19-01 (pause contract honours the physical scroll range); V21-04 |
| V22-03 joint check at the same runId, cursor and viewport | V22-03a/b/c/d |
| Four fault injections (strip 10px, toolbar 6px, matrix overhang, code w=0) | V22-03c (original; matrix fault height now stage+200px), plus v23 `F`, which runs the **same** detector (`helpers/jointReadable.ts`, moved verbatim from V22). F expects a failure while each fault is injected and a pass after restore, at 1366×768 and 1024×600. Its screenshots are labelled `after/v23-F-FAULT-INJECTED-*.png`. |

## Structure guards (vitest)

| guard | file |
|---|---|
| Exactly one live CurrentStepData; data probes inert / aria-hidden / no test ids | `tests/v15-03-continuous-inspect.test.ts` |
| No MutationObserver, visualViewport or window.innerWidth in Layout / WorkbenchLayout; ResizeObserver is used | `tests/v23-layout-guards.test.ts` |
| Visualizer has no portal, timer or transport; one playback owner; the transport may portal only the temporary settings popover | same |
| No universal layout selector; max z-index ≤100; `!important` ≤20 (19 in production CSS, down from 102); the removed patch layers stay removed | same |
| Layout model numbers at all 9 viewports (mode, code ≥340, scene ≥420, data ≥280 in wide) | same |
| Tab / tabpanel / hidden a11y contract; slot identity across remeasure | `tests/dom/v8-preview-layout.test.tsx`, `tests/dom/v9-workbench-viewport.test.tsx` |

## Historical semantics kept

These specs run unchanged except for the selector migrations listed in DELIVERY:

- V4–V9 smokes
- V10 workflow matrix
- V11 semantic visuals (nQueens board, insertion temp, knapsack validation)
- V12 stage overlap
- V13 graph visibility
- V14 arrays and pan
- V15 keyboard
- V16 space/keyboard/visibility
- V17 input editing
- V18 primary scene
- V19 matrix follow and CodeMirror scroll
- V20 follow intent, banner and soft wrap
- V21 pseudo pin and matrix viewport

Reduced motion, runId isolation and keyboard ownership are covered by the existing unit and DOM tests (97 files, 433 tests).

## Data-region stability

- v4 play sampling at 1357×743, 1280×800, 1440×900, 768×1024 and 390×844: outer drift within limits. At 1440×900 the data region is constant from 1/8 to 8/8, where the pre-fix drift was 53.

## Not verified

- ❌ WebKit: Playwright WebKit downloaded, but the host lacks its system libraries (libgtk-4, libgraphene, libsoup-3 and others). Installing them needs root, so WebKit was not run.
- ❌ Browser zoom at 125% / 150% (real zoom, not deviceScaleFactor). Not run.
- ❌ Physical mobile devices; only emulated viewports were used.
