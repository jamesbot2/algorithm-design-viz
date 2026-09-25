# V23 delivery — learning workbench layout refactor

Branch `v23-workbench-layout-refactor`, based on `acfba1d`. **Local only.** Nothing was pushed or deployed, and no remote or config was changed.

**Version facts**
- `acfba1d` is the local V22 tip. V22 was **never pushed**.
- Live `main` is still V21: `efa23a5`, with assets `index-gmbuTtuH.js` and `index-B5gmd-0x.css`.
- The brief's "V22 已上线" does not match the repository state. This is recorded here and in `docs/V23_LAYOUT_BASELINE.md`.

**Where the evidence lives**
- Baseline and M0 root causes: `docs/V23_LAYOUT_BASELINE.md`
- Coverage: `docs/V23_COVERAGE_MATRIX.md`
- Screenshots: `docs/screenshots/v23/{before,after}/`
- Traces: `docs/traces/v23/`
- CSS removal logs: `docs/v23/v23-css-removed-{styles,animation}.json`

## 1. What changed (milestones)

| M | Commit(s) | Result |
|---|---|---|
| M0 | 1b2ac47 | `scripts/v23-inventory.mjs` measures scene, plot, graph bbox, data, code, transport, occluders and graph-inside-plot. Baseline taken from an `acfba1d` worktree (`/workspace/v23-before`, port 5190). |
| M1/M2 | 64d8201, c2132e6, b328659, c807b42, 4a876e7 | One playback controller. A `CurrentStepData` region as a real sibling. A CSS-grid `WorkbenchLayout` whose tracks come from one measured box plus page-owned prefs (pure `layoutModel.ts`). `Layout` publishes the scroll viewport through a ResizeObserver. Compact nav rail. Content-calibrated data region, calibrated once per run from inert probes. Low-height screens are one locked screen with compact chrome. Build-info. |
| M3 | 28e9e05 | CSS migration. 313 rules deleted from `styles.css` and 4 from `animation.css` (logged). New `styles/layout.css` and `styles/scene.css`. |
| M4 | 24e646e, 80f3bcd, b9257aa, b5a5972, 7de3c25, d573206, db4774c | Test migration (each replacement documented, §6). V23 e2e (tasks A–F). Static guards. Per-document code reading memory. a11y fixes. |

## 2. Layout responsibility table (after)

| concern | single owner | how |
|---|---|---|
| page scroll | `Layout.tsx` `<main>` (the only page scroller on lab routes) | CSS `overflow-y:auto`. No window scroll on lab pages. |
| scroll-viewport size | `Layout.tsx` | One ResizeObserver on `<main>` publishes `WorkspaceBudget {viewportHeight, viewportWidth}`. No MutationObserver and no visualViewport. |
| mode (docked / wide / tabbed) | `layoutModel.resolveLayoutMode` (pure) | Inputs: the workbench's measured width and `viewportHeight`. tabbed below 760px wide or below 540px of scroll viewport; wide at ≥1500px. |
| grid tracks, splitters | `WorkbenchLayout.tsx` | CSS grid. Tracks are computed from its own ResizeObserver contentRect plus prefs. Splitters only patch prefs. |
| layout intent (active tab, data visible, code width, data size) | page (`AlgoPage` / `KnapsackUnit`) via `useWorkbenchPrefs` | The workbench reads the prefs and patches them. Nothing else writes them. |
| data height (docked) | `WorkbenchLayout` | Content-calibrated. A ratchet takes the max of the live content and the inert probes for the run's largest frames plus the last frame. It is reset per `runKey` and clamped between a floor and a cap. The final-result block never drives it. |
| data scroll | `workbench-data-body` | The single data scroller. |
| cursor / timer / speed / keyboard | `usePlaybackController` (one per page) | `Visualizer` has no timer and no transport. |
| transport | `PlaybackTransport` in the grid slot `workbench-transport-slot` | One instance. It portals only the temporary settings popover. |
| scene | `Visualizer` (banner + legend popover + stage) | No portals. The stage fills its grid cell. |
| code | `CodeBrowser` (one CodeMirror) | It owns its own scroller, soft-wrap Compartment, follow intent and per-document reading memory. |
| theory | page `theoryOpen` | A real modal: inert background, Escape to close, focus restored. |

## 3. Removed / replaced layout paths

| baseline path | V23 |
|---|---|
| `Visualizer.tsx` `createPortal` for the transport (≈l.505) and the inspector sheet (≈l.671); 746 lines | Removed. `Visualizer` is now 268 lines: banner, legend and stage only. |
| Inspector sheet mini transport (`inspector-prev/next`, its own counter) | Removed. There is one shared transport. |
| `WorkbenchLayout.tsx` MutationObserver reading `data-open` (≈l.72); react-resizable-panels | Replaced by page prefs, a CSS grid and a ResizeObserver. |
| `Layout.tsx` MutationObserver (≈l.104), visualViewport guessing, `data-height-fallback` | Replaced by one ResizeObserver on `<main>`. The document-page fallback uses `documentElement.clientHeight`. |
| `PlaybackTransport.tsx` portal of the transport (≈l.366) | The transport renders in place. Only the settings popover portals (a temporary layer). |
| Fixed data sheet with `margin-right:min(360px,38vw)`; 96px inline inspect band | Replaced by the data region: docked below the scene, a column in wide mode, a tab in tabbed mode. |
| Natural-scroll low-height tabs (intermediate V23 attempt, c807b42) | Replaced in 4a876e7 by one locked screen plus `@media (max-height:640px)` compact chrome (the transport is never below the fold). |

### CSS

- **`styles.css`**: 3720 → 1813 lines. **`animation.css`**: 468 → 454. **New files**: `layout.css` (727) and `scene.css` (192).
- **Removed rules by category** (313 + 4, one per line in the JSON logs):

| category | rules |
|---|---|
| lab-fill chain | 212 |
| inspector sheet | 21 |
| other | 18 |
| viz shell | 15 |
| input panel | 10 |
| layout shell | 10 |
| resizable panels | 8 |
| inline inspect band | 7 |
| banner | 5 |
| code | 4 |
| transport | 4 |
| scene | 3 |

- **`!important`**: 102 → 20 declarations (17 in `styles.css`, 3 reduced-motion declarations in `animation.css`). 84 were removed with the deleted rules.
- **z-index**: max is 80; the modal is 60/61. There is no universal `*` layout selector. `tests/v23-layout-guards.test.ts` guards all of this.

## 4. Metrics (BFS six-node graph, real app, Chrome)

Sources:
- Before: `acfba1d` worktree, `docs/screenshots/v23/before/before-bfs-inventory.json`
- After: `docs/screenshots/v23/after/after-bfs-inventory.json`

Both come from the same script and the same states. "Plot" is the graph drawing area; "data" is the data region; "code" is the code column width.

### 1366×768

| state | before | after |
|---|---|---|
| preview | stage 543×326, plot 530×313, graph 206×235, code 462 | stage 771×405, **plot 745×379**, graph 249×284, data 787×102 (below the scene), **code 487** |
| mid (frame 8) | plot 530×313, code 462 | **plot 745×305**, graph 202×229, **data 787×171**, code 487 |
| data open | stage squeezed to 345; plot 332×313; code **300** (fixed sheet 360×768) | data is always visible in docked mode: same as mid, no squeeze |
| edit open | stage **0**, graph drawn **outside** the plot | plot 745×230; graph 153×173 inside the plot; the page scrolls |

Occluders are 0 and the graph is inside the plot in every after state.

### Other viewports (after)

| viewport | mode | preview plot / graph | mid plot | data | code |
|---|---|---|---|---|---|
| 1440×900 | docked | 667×479 / 315×360 | 396 | 709×180 (mid) | 439 |
| 1920×1080 | wide | 727×769 / 506×577 | 764 | column 360×851 | 491 |
| 2560×1440 | wide | 1034×1129 / 744×848 | 1124 | column 501×1211 | 683 |
| 1024×600 | docked | 549×284 / 187×213 (before 342×145 / 95×113) | 281 | 567×96 | 357 (before 308) |
| 900×500 | tabbed, low tabs | 858×296 / 195×223 | 294 | tab 876×350 | tab |
| 390×844 | tabbed | 335×434 / 241×275 (before 302×125 / 82×100) | 436 | tab 377×523, 0 occluders (before: 5 occluders; 25 455 px² overlap) | tab |
| 360×640 | tabbed | 329×288 / 190×217 | 286 | tab 347×341 | tab |
| 844×390 | tabbed, low tabs | **802×186** (before 756×139) / 123×142 | 184 | tab 820×240 | tab |

Data-region stability during playback (binarySearch, 1440×900): the region is constant from 1/8 to 8/8, so the outer drift is 0. The pre-fix full run measured a drift of 53.

## 5. Screenshots (real app, Chrome `/usr/bin/google-chrome`)

| scenario | before | after |
|---|---|---|
| desktop 1366 | `before/before-bfs-1366x768-mid.png` | `after/after-bfs-1366x768-mid.png`, `after/v23-A-bfs-1366x768-{preview,mid,end}.png` |
| wide 1920 | `before/before-bfs-1920x1080-mid.png` | `after/after-bfs-1920x1080-mid.png`, `after/v23-A-bfs-1920x1080-*.png`, `after/after-bfs-2560x1440-mid.png` |
| narrow 390 | `before/before-bfs-390x844-mid.png` | `after/after-bfs-390x844-mid.png`, `after/after-bfs-360x640-mid.png` |
| data open | `before/before-bfs-1366x768-dataopen.png`, `before/before-bfs-390x844-dataopen.png` | `after/after-bfs-1366x768-dataopen.png`, `after/after-bfs-390x844-dataopen.png`, `after/v23-A-bfs-*-dataopen.png` |
| edit open | `before/before-bfs-1366x768-editopen.png` (stage 0) | `after/after-bfs-1366x768-editopen.png`, `after/v23-A2-bfs-{1366x768,1920x1080,390x844}-editopen.png` |
| six-node regression (vars crossing graph) | `before/before-bfs-390x844-previewdata.png` (5 occluders, pills on nodes) | `after/after-bfs-390x844-previewdata.png`, `after/after-bfs-390x844-preview.png` |
| low height | `before/before-bfs-844x390-mid.png` | `after/after-bfs-844x390-mid.png`, `after/after-bfs-900x500-mid.png` |
| tasks | – | `after/v23-B-dijkstra3-end-1366x768.png`, `after/v23-C-lcs-f{1,31,95}-1366x768.png`, `after/v23-D-*.png`, `after/v23-E-dijkstra-back-1366x768.png` |
| **fault injection (labelled)** | – | `after/v23-F-FAULT-INJECTED-{strip-10px,toolbar-6px,matrix-overhang,code-w0}-{1366x768,1024x600}.png` (red on-page label) |

No design images were used.

## 6. Test replacements (obsolete pixel/structure tests → stronger contracts)

Every replaced unit or DOM file carries a "V23 replacement note" header. The e2e replacements are commented inline.

### Unit / DOM

- **v11-08:** now asserts one locked low-height screen plus `max-height:640px` compact chrome, and that tabs share the transport row. It previously checked a media ladder.
- **v12-01, v14-01, v15-01, v15-03, v17-01..03, v18-01, v18-03, v19-04:**
  - Sheet, lab-fill and height-fallback checks were replaced by grid / region / single-controller contracts.
  - v15-03 now requires exactly **one live** `CurrentStepData`, plus inert probes (aria-hidden, inert, no test ids, no player wiring).
  - v15-01 checks that `graph-result-target` is emitted through `useTestId`.
- **dom v8:** tab/tabpanel a11y. **dom v9:** `data-layout-mode` and slot identity across remeasure.
- **playback-no-autopause, v7-r3, v10-flip:** mount the production `PlayerHarness`. **v7-r4:** `LayoutHarness`.
- **v18-02, v19-01, v19-03, v20, v21, v22 static guards:** read all CSS through `readAllCss` (the rules moved files).

### e2e

- **v4 – v9:**
  - v5: `workbench-transport` → `workbench-transport-slot`.
  - v6: phase chips via `visiblePhaseJump`.
  - v8: `[data-panel][data-tab-active]` → exactly one visible `[role=tabpanel]`; inactive panels are `hidden` with a 0 box; a swap check was added.
  - v9: tabpanel contract.
  - `runReadiness.openDataSheet` → `openCurrentData`.
- **v10 – v14:**
  - v10: `openCurrentData`; theory button `/说明/`.
  - v11: nQueens seek via `clickPhase`; occluder = the data slot.
  - v12 / v13: occluder = the data slot. The v13 settings test now checks "anchored in viewport, or closed".
  - v14: helpers via currentData.
- **v15:**
  - Drawer → data region or tab; the target is reached via `openFinalResult`.
  - The Esc test covers the data tab plus theory-modal focus restore.
  - Continuous inspect uses the shared next button with the data tab kept selected.
- **v16:** data region; one 1-based step counter, which replaces the drawer counter; collapse/expand.
- **v17:** code floor 360 (was 160); `data-data-visible`.
- **v18:**
  - v18-01: the 1366 data body shows the default 3-node state without scrolling, with the graph ≥300 (was a fixed 280 body). 1920 keeps ≥480.
  - v18-03: zero intersection of header/input with the data region.
- **v19:**
  - v19-01: the pause contract honours the physical scroll range.
  - v19-04: data toggle in the data header.
  - v19-05: content-calibrated body. The matrix fault is constrained to a 64px scrollport so the fault can manifest.
- **v20:** data toggle.
- **v21:** collapse / re-open as a real layout change. The pseudo wrong-coordinate fault is constrained to 64px.
- **V22-03c:** the matrix-overhang fault height is `stage height + 200px`. The fixed 240px no longer exceeded V23's taller stage (overhang 0.45): same fault class, and it now manifests (overhang ~1760px).
- **`measureJoint`:** moved verbatim to `tests/e2e/helpers/jointReadable.ts`. V22 and V23-F share the one detector.

## 7. Test results

All runs use Chrome and the dev server on port 5173, with **retries 0**.

| gate | command | result |
|---|---|---|
| types | `npx tsc -b` | pass |
| build | `npm run build` | pass (see §9 for assets and build-info) |
| unit / DOM | `npx vitest run` | **97 files, 433 passed, 0 failed, 0 skipped** |
| full e2e | `npx playwright test` (full suite, 1 worker) | **174 passed, 0 failed, 0 flaky, 0 skipped** (10.6 min; `/workspace/pw-full2.json`) |
| key joint paths, repeated | `npx playwright test v23 v22 v21 v19 --retries=0 --repeat-each=3` | **96 passed, 0 failed, 0 flaky** (V23 36, V22 18, V21 27, V19 15) |
| V23 spec (final evidence run) | `V23_TRACE_TAG=chrome-final npx playwright test tests/e2e/v23-workbench-layout.spec.ts` | 12 passed |
| Firefox (Playwright) | `npx playwright test --config pw-firefox.config.mjs v23 v22` | **18 passed** (V23 12, V22 6) |

The full-suite count includes V20 17, V21 9, V22 6, V19 5 and V23 12.

**Baseline for comparison** (`acfba1d`): vitest 96 files / 415 tests passed; full e2e 162 passed.

**Earlier V23 full run** (`d573206`): 168 passed, 5 failed. Those failures are fixed in 4a876e7 and db4774c:
- V22-03c fault did not manifest → the fault now derives from the stage.
- 900×500 transport below the fold → locked screen with compact chrome.
- v4 drift 53 → probes.
- v5 and v8 stale selectors.

### Tasks (trace `docs/traces/v23/v23-e2e-chrome-final.json`)

- **A (six-node BFS + Dijkstra, 9 viewports):**
  - preview → run → mid → data → +10 → end → replay all pass.
  - 0 occluders; graph inside the plot; labels ≥9px.
  - Pairwise-disjoint regions; one visualizer / transport / CodeMirror.
  - The final result opens at the end.
  - Replay keeps `data-solve-count` = solve0 + 1 (no re-solve).
- **A2 (edit open 1366 / 1920 / 390):** scene plot ≥140px; nothing overlaps; the page scrolls.
- **B (Dijkstra, 3 nodes, directed):** dist[1] observed as `∞ → 10 → 2`; tree edges `0->2`, `2->1`; 11 frames. Final dist=[0,2,1], parent=[-1,2,0]. Mid-run data is not the end state.
- **C (LCS, frames 1/14/31/74/75/94/95):** at every frame, 13/13 strip glyphs are fully readable, and so are the current cell, locate/resume, the data chips (2/2 at 95/95), the exec line and the step text. Code is 487px. The final panel contains 4.
- **D (merge [4,1,3,2], 25 frames; insertion [2,1], 6 frames):** the main array keeps its length; buffers stay inside the stage; transient duplicates are kept; the final array is correct.
- **E (reading & adjusting):**
  - Actions: TS reading positions 233 and 113; data collapse and re-open; height change; TS → pseudo → TS restores the reading position; split drag +60 (code 487 → 547); 700px tabs including the code tab; back to desktop.
  - Unchanged throughout: runId, cursor 6, speed, query target, reading position, solve count.
- **F:** see §8.

## 8. V22 fault injections (same detector, `helpers/jointReadable.ts`)

| fault | 1366×768 while injected | 1024×600 while injected | after restore |
|---|---|---|---|
| strip height 10px | `glyphs:clipped 13/13` | `glyphs:clipped 13/13` | pass (no failures) |
| toolbar height 6px | `locate:clipped, resume:clipped, locate:not-hit` | same | pass |
| matrix scroll overhang | `matrix:overhang 1760.5` | `matrix:overhang 1799.6` | pass |
| code wrap width 0 | `code:width 0` | `code:width 0` | pass |

V22-03c (the original V22 test) also fails under all four faults and passes after restore. The labelled screenshots are listed in §5.

## 9. Build-info

- `src/buildInfo.ts` is populated through vite `define`: `__APP_VERSION__ = 'V23'`, plus the short git SHA and ISO build time at build time.
- It is shown in the sidebar footer (`data-testid="build-info"`, e.g. `V23 · <sha>`) and asserted by the V23 e2e test "build-info".
- Build output: `dist/assets/index-*.js` / `index-*.css`. The names change per build and dist is not committed. The final build's names are listed in the final report.

## 10. Guarantees

- **Algorithms, routes and backend:** no algorithm files were rewritten, and routes are unchanged.
- **Solves:** one solve per Run (`data-solve-count` observable; replay, seek, layout change, tab switch and TS/pseudo switch do not add solves — asserted in A and E).
- **Data probes:** they render presentation only, from the existing trace (`pickDataProbeSteps` is a pure selection). Their final-result slot is an empty placeholder, so no result panel is recomputed.
- **One live instance each:** one controller/timer (`usePlaybackController`), one `PlaybackTransport`, one `Visualizer` and one CodeMirror per page, asserted by vitest guards and e2e counts.
- **Helpers from earlier versions:** `scrollFollowIntent` (only real user browsing pauses follow), the CodeMirror soft-wrap Compartment, pseudo `.code-pre` content-coordinate scrolling and matrix content-coordinate follow are unchanged. V19/V20/V21/V22 pass.
- **Git hygiene:** `stash@{0}` was not touched. No unrelated files were committed or deleted. Old v1x/v2x evidence files that e2e runs rewrite were restored (`git checkout -- docs/screenshots docs/traces`), not committed.

## 11. Not verified / remaining work

- **WebKit:** not run. The Playwright WebKit build is downloaded, but the host lacks its system libraries (libgtk-4, libgraphene, libsoup-3, …) and installing them needs root.
- **Real browser zoom 125% / 150%:** not run.
- **Physical phones:** not tested; viewports were emulated only.
- **The user's original screenshot:** not available on this machine. The symptom was reproduced on the baseline instead (`before/before-bfs-390x844-previewdata.png`).
- **Data region calibration:**
  - It covers the largest frames by a heuristic score (vars, long values, array cells; top 3) plus the last frame.
  - A frame that is larger in some other way can still grow the region once (the ratchet never shrinks mid-run). v4 sampling at 5 viewports is stable.
  - User-opened "全部字段" also grows it once (user intent).
- **Final result at the end:** it opens in place and the data body scrolls. It is not auto-scrolled into view, so the current-step chips stay visible (task C).
- **Bundle size:** the JS bundle is >500 kB (pre-existing warning). This refactor did not add code-splitting.
- **V22 status:** V22 was never pushed. Publishing V22/V23 is left to the owner; nothing was pushed or deployed from here.
