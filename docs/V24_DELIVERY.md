# V24 delivery — each stage shows its real primary object

Baseline: live V23 `3b46e9d` (before shots from a separate worktree `/workspace/v24-before` of
3b46e9d, dev server :5191, same input / frame / viewport). Branch `v24-scene-primary-objects`,
local commits only (no push / deploy / remote change). V23 workbench kept intact (scene top /
current data below / code right, wide 3-col, phone tabs, ONE `usePlaybackController`,
`CurrentStepData`, `useWorkbenchPrefs`, reading memory, input edit/cancel, immutable traces,
same-SHA gate). No inspect band, no body MutationObserver, no fixed overlay, no CSS tail wall
(all new rules live in `src/styles/scene.css`, scoped to the stage). Build-info reads **V24**.

Reported separately below: (1) layout replay, (2) algorithm values, (3) step semantics,
(4) animation process, (5) deployment.

## Presentation contract (new)

`src/types/presentation.ts` — `PresentationDescriptor`:

| field | meaning |
|---|---|
| `primaryKind` | `array \| matrix \| graph \| board \| forest \| search-tree` — the teaching primary |
| `primaryKey` | array/matrix that IS the primary (merge `a`) |
| `companions` | required compact companions for frames that carry them (`left/right`, `temp/key`, `selected`) |
| `reserveCompanions` | reserve the companion strip on every frame (ghost cards) so the primary box never jumps |
| `inputTable` | arrays shown as a compact input table next to a non-array primary (Huffman `symbols/freqs`) |
| `auxiliaries` | switchable views (`recursion-tree`, `search-tree`) — closed by default, never inside the primary box |
| `callStackVar` | var summarised in the aux bar (full call stack stays in current data) |
| `labelFormat` | per-array label presentation (`interval-card`) |

Declared per module as `export const presentation` (module metadata, next to `meta`; the solver
bodies are untouched): **mergeSort** (array `a`, companions left/right reserved, aux recursion
tree, call stack), **insertionSort** (array `a`, temp/key reserved), **quickSort** (array `a`),
**huffman** (forest, input table symbols/freqs), **activitySelection** (array `activities`,
companion `selected`, interval cards), **nQueens** (board, search-tree aux). Non-module pages:
`knapsack:backtracking` / `knapsack:branchAndBound` → search-tree primary
(`src/components/presentation/presentation.ts`). Every other module keeps the legacy inference
(graph → board → matrix → array → tree), moved verbatim into `inferLegacyScene`.
`resolvePresentation(algoId, step, …)` is a pure function of descriptor + frame: a declared
primary is stable for the whole run (a frame with/without an optional field never flips the
view) and never solves. Stage exposes `data-primary-scene`, `data-primary-kind`,
`data-primary-key`, `data-presentation="declared|legacy"`. Per-run view state (aux open) lives
in `Visualizer` (keyed by run), never in the player.

## V24-01A (P1) merge sort — `a` invisible

**Root cause.** (1) `Visualizer.primaryScene` = "whichever optional field exists first": arrays
won, but `step.searchTree && !hasBoard` then appended the full `SearchTreeView` (max-height
320px) *inside the same stage* after `a`, unconditionally. (2) `scene.css` let
`.arrays-panel[data-array-order=primary-first] > .array-view` shrink to `min-height:0` with
`overflow:hidden`, and the buffers strip took up to 88px with `overflow:hidden` while the real
cards were taller (buffer values also clipped). (3) `ArrayView` sized bars from the **whole
stage** / `window.innerHeight*0.5` and `.bars-wrap{min-height:180px}` — the content height did
not match the box it actually got (4,1,3,2: 61px frame, 215px bars-wrap). Result at 1366x768
21/55: all 7 bars / values / indices / pointers of `a` had visible height 0 through the clip
chain; the stage had no extra scroll to wheel to. The solver was fine (55/55 = [1,2,3,5,7,8,9]).

**Fix / files.**
- `Visualizer.tsx`: declared array primary → `.stage-split` > `.stage-primary-pane`
  (companions + `a`) and, only when the learner opens it, `.stage-aux-pane` with the real
  recursion tree (`展开递归树` / `收起递归树`, `aria-pressed`, `aria-controls`). The
  primary pane's DOM position never changes on toggle (no ArrayView remount → bars/cells mode,
  element identity and FLIP state survive). Aux bar also shows the call-stack top + depth.
- `ArrayView.tsx`: new `DeclaredArrayScene` (companion strip with real buffers, or ghost cards of
  identical geometry when a frame has none, + aux bar; then `a`). Bar geometry now comes from the
  ArrayView's **own allotted border-box** minus measured chrome (label, note, index row,
  pointer rows), re-measured by ResizeObserver on the box, chart and label; re-fits land without
  the 220ms height transition (`data-refit`), so old bars never overhang mid-transition.
  Short bars (<18px) put the value just above the bar. Cells mode renders each slot's pointer
  tags **under that slot** (index / value / pointer aligned by construction); compact
  companions always reserve the pointer row. Element ids / slot keys unchanged (legal copy-back
  duplicates kept, no random keys).
- `scene.css`: declared-array rules — stage is the ONE scroll owner; primary `a` gets
  `flex:1 1 0` + readable floor (10rem); unsigned bars stretch to their slot width; aux pane uses
  `contain:size` so a tall tree never sizes the split; side-by-side at stage ≥700px (container
  query), stacked below `a` otherwise with `a` keeping its floor.
- Trace untouched: recursion tree, call stack and buffers are still in every frame.

## V24-01B (P1) Huffman — forest is the primary

**Root cause.** Same generic inference: every frame carries `arrays.symbols/freqs`, so the stage
was "array" with the forest appended as a SearchTreeView list; at 1366x768 4/10 the 5 symbol
cells had 0 visible height and 3/5 freq bars were clipped.

**Fix / files.** `src/components/forest/ForestView.tsx` (new): draws the CURRENT forest
snapshot (`step.searchTree.children`) with a deterministic tidy layout (HTML nodes + SVG edges,
0/1 edge bits = assignCodes' left/right), compact input table `a 5 · b 9 …`, forest count and
`定位当前`. Roles are derived structurally from the immutable trace (no solve, no new state):
select frame → the two top-level trees the NEXT frame merges; merge frame → the tree absent
from the previous frame (new parent) + its two children; done → final root, codes under leaves
and in the table (from `step.result.codes`). Level height fits the forest viewport using the
**run-level** max depth (stable geometry across the run); large forests pan inside
`.forest-viewport` and auto-locate / `定位当前` scroll only that viewport (focus = the frame's
role nodes, top-aligned). Primary = forest on all 10 frames (init/select/merge/done).
N-Queens stays board-primary, knapsack BT/BnB stay tree-primary (explicit descriptors, not a
generic "trees first").

## V24-02 (P2) activity selection — labels overlap

**Root cause.** Labels `A0[1,4)` rendered as one line in fixed 52px cells: text Range 60.45px
(brief measured 60.66) → neighbours overlapped by 2.06px, 5 pairs (identity/endpoint
readability, not a greedy bug).

**Fix / files.** `labelFormat: {activities:'interval-card'}` → `ArrayView` cells render a
two-line card (`.iv-id` / `.iv-range`), width from the real text (`width:auto; min-width:52px`),
no overflow clipping, no endpoint dropped; `splitIntervalLabel` keeps the text verbatim. Only
interval cells change — numeric bars keep quantity-proportional heights and slot widths.
`selected` becomes a compact companion (`已选`). Built-in example only (no custom input exists),
so "large data" = cells wrap within the stage (the stage scrolls if needed).

## V24-03 (required) acceptance checks the primary itself

**Root cause.** V23 task D read `inspector-array-a tbody td` (data table), `bufInStage`, region
intersections and `mainCount`; it never measured the stage's `a` bars/values/pointers.

**Fix / files.** `tests/e2e/helpers/primaryObjects.ts` — `measureStageObjects` (box ∩ every
clipping ancestor ∩ viewport, 0.75px tolerance, topmost hit-test; scoped to the one visible
stage, excludes inert/aria-hidden probes, `[hidden]`, display:none), `MAIN_ARRAY_GROUPS`
(slots, bars, values, indices, pointers of `a`, never buffers), `BUFFER_GROUPS` (separate),
`HUFFMAN_GROUPS`, `mainArrayFailures`, `stageArrayValues`, `measureLabelText` (Range text
rects + neighbour boxes). `tests/e2e/v24-primary-objects.spec.ts` (17 tests, see coverage
matrix) + `tests/v24-presentation-contract.test.ts` (7) + `tests/dom/v24-forest-and-companions.test.tsx` (6).
V23's stronger graph/joint tests are unchanged and still run.

**Test changes (documented migrations, not weakening):**
- `tests/v17-03-array-stage-budget.test.ts`: source check for `stageBudget`/`V17-03` replaced by
  a stronger check that the bar fit uses `self.getBoundingClientRect().height` and **not**
  `window.innerHeight` / the stage (the old stage-derived budget was the bug).
- `tests/v18-02-primary-scene.test.ts`: reads `presentation.ts` in addition to `Visualizer.tsx`
  (legacy inference moved there verbatim; same assertions).
- `tests/e2e/v23-workbench-layout.spec.ts` build-info: `/V23 · sha/` → `/V24 · sha/` (version bump).
- New V24 frame assertions run at landing (no FLIP layer in flight); mid-transition is covered by
  a dedicated rAF sampler test with clip-only checks (a moving element may legitimately pass over
  its neighbour, so hit-tests are only meaningful at rest).

## Before / after metrics (same input / frame / viewport; M0 probe `docs/traces/v24/probe/`)

Format `full/n [visible heights]/[element heights]` in px. Raw: `docs/traces/v24/m0-metrics-{before,after}.json`.

| scene | viewport | before (3b46e9d) | after (V24) |
|---|---|---|---|
| merge7 bars | 1366x768 | bars 0/7 [0,0,0,0,0,0,0]/[18,89,18,143,161,54,125] · values 0/7 [0,0,0,0,0,0,0]/[11,11,11,11,11,11,11] | bars 7/7 [12,59,12,95,107,36,83]/[12,59,12,95,107,36,83] · values 7/7 [11,11,11,11,11,11,11]/[11,11,11,11,11,11,11] |
| merge7 cells | 1366x768 | bars — · values 0/7 [0,0,0,0,0,0,0]/[24,24,24,24,24,24,24] | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] |
| merge4 bars | 1366x768 | bars 0/4 [0,5,0,0]/[40,161,120,80] · values 0/4 [0,0,0,0]/[11,11,11,11] | bars 4/4 [27,107,80,54]/[27,107,80,54] · values 4/4 [11,11,11,11]/[11,11,11,11] |
| merge4 cells | 1366x768 | bars — · values 0/4 [0,0,0,0]/[24,24,24,24] | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] |
| huffman 4/10 | 1366x768 | symbols 0/5 [0,0,0,0,0]/[24,24,24,24,24] · freqs 2/5 [0,0,0,11,11]/[11,11,11,11,11] | forest labels 6/6 [21,21,21,21,21,21]/[21,21,21,21,21,21] · input 5/5 [21,21,21,21,21]/[21,21,21,21,21] |
| activity 4/14 | 1366x768 | 5 overlapping pairs (dx 2.06px, text w 60.45px in 52px cells) | 0 overlaps, 0 clipped (text w 37.42px) |
| merge7 bars | 1920x1080 | bars 0/7 [0,128,0,308,368,8,248]/[60,300,60,480,540,180,420] · values 4/7 [0,11,0,11,11,3,11]/[11,11,11,11,11,11,11] | bars 7/7 [63,314,63,502,565,188,439]/[63,314,63,502,565,188,439] · values 7/7 [11,11,11,11,11,11,11]/[11,11,11,11,11,11,11] |
| merge7 cells | 1920x1080 | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] |
| merge4 bars | 1920x1080 | bars 0/4 [0,381,262,111]/[135,540,405,270] · values 3/4 [0,11,11,11]/[11,11,11,11] | bars 4/4 [142,566,425,283]/[142,566,425,283] · values 4/4 [11,11,11,11]/[11,11,11,11] |
| merge4 cells | 1920x1080 | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] |
| huffman 4/10 | 1920x1080 | symbols 0/5 [18,18,18,18,18]/[24,24,24,24,24] · freqs 5/5 [11,11,11,11,11]/[11,11,11,11,11] | forest labels 6/6 [21,21,21,21,21,21]/[21,21,21,21,21,21] · input 5/5 [21,21,21,21,21]/[21,21,21,21,21] |
| activity 4/14 | 1920x1080 | 5 overlapping pairs (dx 2.06px, text w 60.45px in 52px cells) | 0 overlaps, 0 clipped (text w 37.42px) |
| merge7 bars | 390x844 | bars 0/7 [0,0,0,92,129,0,56]/[36,181,36,290,327,109,254] · values 3/7 [0,0,0,11,11,0,11]/[11,11,11,11,11,11,11] | bars 7/7 [25,126,25,201,226,75,176]/[25,126,25,201,226,75,176] · values 7/7 [11,11,11,11,11,11,11]/[11,11,11,11,11,11,11] |
| merge7 cells | 390x844 | bars — · values 5/7 [24,24,24,24,24,0,0]/[24,24,24,24,24,24,24] | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] |
| merge4 bars | 390x844 | bars 0/4 [0,138,72,0]/[82,327,245,163] · values 2/4 [0,11,11,0]/[11,11,11,11] | bars 4/4 [61,244,183,122]/[61,244,183,122] · values 4/4 [11,11,11,11]/[11,11,11,11] |
| merge4 cells | 390x844 | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] |
| huffman 4/10 | 390x844 | symbols 0/5 [0,0,0,0,0]/[24,24,24,24,24] · freqs 3/5 [0,3,11,11,11]/[11,11,11,11,11] | forest labels 6/6 [21,21,21,21,21,21]/[21,21,21,21,21,21] · input 5/5 [21,21,21,21,21]/[21,21,21,21,21] |
| activity 4/14 | 390x844 | 4 overlapping pairs (dx 2.06px, text w 60.45px in 52px cells) | 0 overlaps, 0 clipped (text w 37.42px) |
| merge7 bars | 1024x600 | bars 0/7 [0,0,0,0,0,0,0]/[13,67,13,107,121,40,94] · values 0/7 [0,0,0,0,0,0,0]/[11,11,11,11,11,11,11] | bars 7/7 [4,21,4,34,38,13,30]/[4,21,4,34,38,13,30] · values 7/7 [11,11,11,11,11,11,11]/[11,11,11,11,11,11,11] |
| merge7 cells | 1024x600 | bars — · values 0/7 [0,0,0,0,0,0,0]/[24,24,24,24,24,24,24] | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] |
| merge4 bars | 1024x600 | bars 0/4 [0,0,0,0]/[30,121,90,60] · values 0/4 [0,0,0,0]/[11,11,11,11] | bars 4/4 [17,68,51,34]/[17,68,51,34] · values 4/4 [11,11,11,11]/[11,11,11,11] |
| merge4 cells | 1024x600 | bars — · values 0/4 [0,0,0,0]/[24,24,24,24] | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] |
| huffman 4/10 | 1024x600 | symbols 0/5 [0,0,0,0,0]/[24,24,24,24,24] · freqs 1/5 [0,0,0,0,11]/[11,11,11,11,11] | forest labels 6/6 [21,21,21,21,21,21]/[21,21,21,21,21,21] · input 5/5 [21,21,21,21,21]/[21,21,21,21,21] |
| activity 4/14 | 1024x600 | 5 overlapping pairs (dx 2.06px, text w 60.45px in 52px cells) | 0 overlaps, 0 clipped (text w 37.42px) |
| merge7 bars | 844x390 | bars 0/7 [0,0,0,0,0,0,0]/[16,78,16,124,140,47,109] · values 0/7 [0,0,0,0,0,0,0]/[11,11,11,11,11,11,11] | bars 7/7 [4,18,4,28,32,11,25]/[4,18,4,28,32,11,25] · values 7/7 [11,11,11,11,11,11,11]/[11,11,11,11,11,11,11] |
| merge7 cells | 844x390 | bars — · values 0/7 [0,0,0,0,0,0,0]/[24,24,24,24,24,24,24] | bars — · values 7/7 [24,24,24,24,24,24,24]/[24,24,24,24,24,24,24] |
| merge4 bars | 844x390 | bars 0/4 [0,0,0,0]/[35,140,105,70] · values 0/4 [0,0,0,0]/[11,11,11,11] | bars 4/4 [8,32,24,16]/[8,32,24,16] · values 4/4 [11,11,11,11]/[11,11,11,11] |
| merge4 cells | 844x390 | bars — · values 0/4 [0,0,0,0]/[24,24,24,24] | bars — · values 4/4 [24,24,24,24]/[24,24,24,24] |
| huffman 4/10 | 844x390 | symbols 0/5 [0,0,0,0,0]/[24,24,24,24,24] · freqs 0/5 [0,0,0,0,0]/[11,11,11,11,11] | forest labels 6/6 [21,21,21,21,21,21]/[21,21,21,21,21,21] · input 5/5 [21,21,21,21,21]/[21,21,21,21,21] |
| activity 4/14 | 844x390 | 5 overlapping pairs (dx 2.06px, text w 60.45px in 52px cells) | 0 overlaps, 0 clipped (text w 37.42px) |

1024x600: `a` fully visible without scrolling (bars 4–38px, values 11px). 844x390 (explicit
fallback): the stage scrolls; before the wheel the lower part of `a` is below the fold (table
row above), after a normal wheel `a` passes the detector; companions are reached by wheeling
back up (`fallback-*` tests).

## Screenshots

`docs/screenshots/v24/before/` and `docs/screenshots/v24/after/`, identical names for the same
input / frame / viewport: `merge7-21of55-{bars,cells}-<vp>.png`, `merge4132-13of25-{bars,cells}-<vp>.png`,
`huffman-4of10-<vp>.png`, `activity-4of14-<vp>.png` for 1366x768, 1920x1080, 390x844, 1024x600,
844x390. After-only: `merge7-21of55-tree-open-1366x768.png`, `huffman-final-10of10-1366x768.png`,
`huffman-14sym-located-1366x768.png`, `activity-end-light-1366x768.png`,
`activity-end-largefont-1366x768.png`, `fallback-*`. Fault shots are labelled
`FAULT-INJECTED-*.png`. All are real-app screenshots (Chrome, last full run).

## Test runs (Chrome /usr/bin/google-chrome, retries 0)

| command | result |
|---|---|
| `npx tsc -b` | OK |
| `npm run build` | OK (chunk-size warning only) |
| `npx vitest run` | 99 files, 446 passed, 0 failed |
| `V24_TRACE_TAG=final npx playwright test --retries=0` (full suite, incl. V21 9 / V22 6 / V23 12 / V24 17) | 191 passed, 0 failed, 0 flaky, 0 skipped (12.5 min) |
| `V24_TRACE_TAG=rep3 npx playwright test tests/e2e/v24-primary-objects.spec.ts --repeat-each=3 --retries=0` | 51 passed, 0 failed, 0 flaky, 0 skipped |
| `npx playwright test -c /workspace/pw-firefox.config.mjs v24-primary-objects` (Firefox, earlier run) | 17 passed |
| `vite preview` of `dist` (base `/algorithm-design-viz/`) | `#/algo/mergeSort` → array `a`, `#/algo/huffman` → forest, `#/algo/activitySelection` → array `activities` |

Negative controls (trace `docs/traces/v24/v24-e2e-final.json`), all FAIL while injected and PASS after restore:
- `a` squeezed to 56px (data table unchanged): slots/bars/values/indices 7/7 clipped, pointers 4/4.
- `a` hidden, buffers + tree kept: same 7/7 failures; buffers still fully visible.
- Forest nodes + input chips squeezed to 9px: 6 forest labels + 10 input glyphs (5 symbols, 5 freqs) fail.
  (Added in a follow-up commit: the check now measures the glyphs inside each chip, because in an earlier run the 9px chip boxes still counted as fully visible.)
- Activity cells at 52px, single-line, 0.9rem: 5 neighbour overlaps (dx 2.08px).

## Separately reported

1. **Layout replay** — see metrics + coverage matrix; V23 regions / tabs / wide mode unchanged
   (V23/V22/V21 specs pass).
2. **Algorithm values** — no solver code changed (`git diff 3b46e9d -- src/algorithms` contains only
   the added `presentation` descriptors + type import); merge 55/55 = [1,2,3,5,7,8,9]; 4,1,3,2 →
   [1,2,3,4]; Huffman WPL 124, codes a=100 b=101 c=00 d=01 e=11; activity answer 3
   (unit-tested in `v24-presentation-contract.test.ts`).
3. **Step semantics** — frame counts unchanged (55 / 25 / 10 / 14); every merge frame stepped
   with real clicks, stage `a` == current-data `a` and exec line set on each frame; Huffman
   select/merge roles checked against weights; no extra solve (`data-solve-count` unchanged across
   tree toggle, mode switch, resize).
4. **Animation** — merge write + insertion move: worst visible ratio of `a`'s flip layers / values
   sampled every rAF from click to landing ≥0.98 (recorded 1.0); re-fits land without transition.
5. **Deployment** — none (local commits only).

## Unverified

- WebKit (no host libs), real phones / tablets, OS-level zoom and real browser default-font
  settings (larger font was simulated with `html{font-size:20px}` + the code font slider).
- Firefox: only the V24 spec was run (17/17 passed) — not the full suite.
- Very large merge inputs (>24 values fall back to cells by the existing rule) not screenshot-reviewed.
