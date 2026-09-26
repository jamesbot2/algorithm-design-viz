# V25 delivery: Kadane code location and signed bar annotation layers

Baseline: `9105ff9` (V24). Branch: `v25-kadane-signed-annotations`, local commits only. Nothing was pushed, deployed, or changed on the remote.
Authoritative brief: `/workspace/V25_FULL_BRIEF.md`, copied verbatim from the user.
Build-info now reads `V25 · <sha>`.

## 0. Pre-checks
- HEAD was `9105ff9`. The working tree already had about 281 regenerated v4–v23 artifacts under `docs/screenshots` and `docs/traces`, plus `stash@{0}`. None of them were touched, staged, or restored. Every commit used explicit paths. Full e2e runs regenerate those tracked artifacts again, including v24 ones; they stay unstaged.
- Production at https://jamesbot2.github.io/algorithm-design-viz/ serves `assets/index-DSSkHqfg.js` and `assets/index-DaxxDMYx.css`. The bundle contains `V24` / `9105ff9`.
- Reproduction ran in the full app at a normal local URL:
  - the `9105ff9` worktree `/workspace/v25-before` under `vite --port 5291`;
  - the same clicks, driven by `scripts/v25-probe.mjs` with real button clicks and no `force`.

## V25-01 (P1): Kadane's execution arrow pointed at the function declaration

**Reproduction (before, 1366×768 and every other viewport tested):** at frame 7/22, "考察 a[3] = 4", the editor's exec line was **2**: `export function kadane(a: number[]): { best: number; start: number; end: number } {`. All 8 "考察" frames of the default run point at line 2 (`docs/traces/v25/kadane-22-frames-before-after.json`). In the same run:
- reset and extend frames pointed at condition line 10;
- update frames pointed at condition line 16.

**Root cause:**
- The "考察" frames in `src/algorithms/kadane.ts` passed `codeLine: 1`. That line number belongs to the 4-line pseudocode in `meta.code` and had no `codeRefs`.
- The code browser shows the complete TypeScript `CodeDocument` from `src/codeCatalog/kadane/index.ts`. The legacy numeric path (codeLine + 1) therefore landed on the declaration.
- The `extendOrReset` and `updateBest` anchors covered only the condition lines, even though those frames had already performed the writes.

**Fix (commit a8eaa4b):**

Complete TypeScript reference in `src/codeCatalog/kadane/index.ts`. It uses the solver's variable names and contract:
- variables: `cur`, `curStart`, `best`, `bestStart`, `bestEnd`, `i`;
- `< a[i]` means a tie extends; `cur > best` means a tie keeps the earliest best;
- empty input returns `null`, the equivalent of `hasSubarray=false, best=null`. It is never treated as a sum-0 subarray.

Anchors:

| anchor | lines | statement |
|---|---|---|
| emptyInput | 3 | `if (a.length === 0) return null` |
| init | 4–8 | `let best = a[0]!` … `let curStart = 0` |
| loopVisit | 9 | `for (let i = 1; i < a.length; i++) {` |
| chooseCond | 10 | `if (cur + a[i]! < a[i]!) {` |
| resetWrite | 11–12 | `cur = a[i]!` / `curStart = i` |
| extendWrite | 14 | `cur = cur + a[i]!` |
| bestCond | 16 | `if (cur > best) {` |
| updateBest | 17–19 | `best = cur` / `bestStart = curStart` / `bestEnd = i` |
| done | 22 | `return { best, start: bestStart, end: bestEnd }` |

Every frame in `kadane.ts` now emits semantic `codeRefs`, with no `codeLine`:
- `role: 'primary'` marks the statement actually executed; the main arrow points there.
- `role: 'condition'` marks the guarding condition, which gets a weak highlight.

Frame convention (after = the frame shows the state once that statement has run):

| frame | when | primary | condition (weak) |
|---|---|---|---|
| init | after | init (4–8) | — |
| 考察 a[i] | before the body runs | loopVisit (9) | — |
| 重新开始 | after | resetWrite (11–12) | chooseCond (10) |
| 延伸 | after | extendWrite (14) | chooseCond (10) |
| 更新最优 | after | updateBest (17–19) | bestCond (16) |
| 完成 | — | done (22) | — |

Other details of the fix:
- "Best not updated" has no frame of its own, and V24 did not have one either. The next frame shows `best` unchanged, and the default run stays at 22 frames.
- Banners and variables use the same names as the code (`curStart ← i` was added to the reset banner).

Numeric fallback policy:
- `src/codeCatalog/index.ts` defines `NUMERIC_LINE_FALLBACK` / `numericLineFallback(algoId)`. `kadane: 'forbidden'`; every other module defaults to `'legacy-unverified'`.
- `AlgoPage` and `CodeBrowser` (`numericFallback` prop) never map a numeric line to a `forbidden` module. A frame with no primary ref shows as "unmapped" instead of pointing at an arbitrary line.
- There is no global +1 change, so the other algorithms behave exactly as before.

Supported inputs and results:
- Solver: an empty array returns `hasSubarray:false, best:null`. This is unit-tested.
- Page: the array input rejects empty input with「数组不能为空」, and no run is created. The e2e test checks exactly that: no new runId and no fake sum-0 answer.
- `[1,-1]` gives 1 on [0,0]. `[-4,-2,-5]` gives −2 on [1,1], the non-empty best for an all-negative array. `[0,0]` gives 0 on [0,0], the earliest of the tied best subarrays.

**After (every viewport):** frame 7/22 has exec line 9, `for (let i = 1; i < a.length; i++) {`, and the code header shows `▶ loopVisit @kadane.ts:9`.

**Legacy numeric-ref inventory** (static audit plus a runtime sample, `docs/traces/v25/legacy-numeric-inventory.json`, generated by `tests/v25-numeric-ref-inventory.test.ts`):
- Verified: kadane (policy forbidden, 22/22 frames have semantic refs).
- **Needs verification:** these modules still pass a static numeric `codeLine`. On the sampled input every frame also has a codeRef, but the line mapping was not audited this round: bubbleSort, insertionSort, mergeSort, quickSort, binarySearch, lcs, editDistance, floyd, knapsack01.
- Frames with no ref at all on the sampled input: kmp has 5 of 33, bfs has 1 of 25. Needs verification.
- dijkstra, dijkstraHeap, maxSubarrayDC, nQueens, kruskal, prim, bellmanFord, matrixChain, huffman and activitySelection had no numeric-only frames on the sampled input. They were **not audited** and are not claimed as fixed.

**Tests:**
- `tests/v25-kadane-semantic.test.ts`: each frame maps to the CodeDocument statement text; covers the reset, extend, update and done branches, small inputs, the empty contract, and ties.
- `tests/dom/v25-code-numeric-fallback.test.tsx`: the forbidden policy never maps a numeric line; legacy modules are unchanged.
- `tests/v25-numeric-ref-inventory.test.ts`.
- E2E `tests/e2e/v25-kadane-signed.spec.ts` (V25-01 block):
  - reads the real banner, variable chips, `data-exec-line` and the text of `.cm-exec-line`, and compares them with the expected CodeDocument statement for all 22 frames;
  - frame 7 stays on the same statement after 上一步 / 下一步, 重置播放 and replay, progress-slider seek, code font 18 and 11, and soft wrap off and on (runId unchanged);
  - checks the small inputs frame by frame;
  - checks the empty-input page contract.

**Negative controls:**
- Old `kadane.ts` under the new unit test: 6 of 7 tests fail.
- V25 spec against the V24 build (`V25_BASE=http://127.0.0.1:5291/...`, `docs/traces/v25/v25-e2e-nc-v24-build.json`): 23 failed, 2 passed. The 2 that pass are the empty-input page contract and "same value keeps the same height", which V24 also satisfies.

**Not verified:**
- The other modules' numeric refs; see the inventory.
- Pseudocode view alignment, since Kadane's catalog provides only TypeScript.

## V25-02 (P2): pointer labels intruded on signed bars and value labels

**Reproduction (before):** measured with the text Range of the value labels, the label boxes, and the bar rects (`docs/traces/v25/m0-metrics-before.json`).

| case | 1366×768 before | after |
|---|---|---|
| Kadane default 7/22 | `i`@3 ∩ value "4" text 6.53×8.53, ∩ value box 6.53×6.53, ∩ bar 19.42×11.53 | 0 conflicts |
| insertion [1,-1] 3/6 | `j`@0 ∩ "1" text 6.53×7.86, box 6.53×6.73, bar 19.42×17.67; index glyph ∩ value 6.23×0.8 | 0 |
| quick [5,-5,0] 3/10 | `L`@0 ∩ "5" text 6.53×7.86, box 6.53×6.73, bar 19.42×17.67; index ∩ value 6.23×0.8 | 0 |

Fallback viewports:
- 1920×1080 and 390×844: Kadane had 0 conflicts before and after. Insertion and quick had the same conflicts as at 1366 before, and 0 after.
- 844×390: Kadane `i` ∩ "4" text 6.53×13.36 before, 0 after. Insertion and quick had the same conflicts before, 0 after.
- Reduced motion (switched through the real 动效 selector) at 1366: 0 conflicts after (`m0-metrics-after-reduced.json`).

Rect intersection is not the same as a hidden glyph. The screenshots show the pointer chip border and fill competing with the bar top and the value. The digits were readable before. This was a layering problem, not data loss.

**Root cause:**
- In `ArrayView` signed mode, `.bar-flip-layer` was absolutely positioned around the zero line.
- In the same `.bar-col`, `.bar-idx` and `.pointer-row` flowed from the top of the column.
- The only space compensation was a global `hasPositive && hasNegative ? 40 : 24`. No track was reserved for annotations, so the index and pointer rows fell inside the plot and crossed tall positive bars.

**Fix (commits 77b21f8 and 58a3622):** the chart model is now explicit.
- Each signed column has two stacked regions:
  1. **Plot area** `.bar-plot`: explicit height = `laneTop + span + laneBottom`. The zero line sits at `laneTop + zeroRatio·span`. Bar heights come only from |v| over the run-level domain (`computeBarGeometry`, unchanged), and the zero line is never moved to avoid labels.
  2. **Annotation tracks** in normal flow below the plot: the index row, then the pointer track. Tags for the same slot wrap under their own slot, and `data-ptr-count` records how many there are. The measured height of the tracks counts against the budget.
- `src/components/signedPlot.ts` defines the value-label placement for each bar:
  - `inside`: bar ≥ 18px; the label sits inside the bar at its tip.
  - `tip`: short bar with room in its own half; the label sits just beyond the tip.
  - `across`: short bar in a mixed-sign plot with no room in its own half; the label sits just across y(0), in the empty opposite half of its own column.
- Also in `signedPlot.ts`, `signedPlotLanes` reserves lanes only where they are needed. Edge lanes appear only when the zero line meets a plot edge (all negative, or all zero), so the centred zero marker fits.
- The fit step (`fitSpanRef`) picks the largest span whose `span + lanes(span)` fits the budget minus the measured annotation tracks. No blanket top padding was added. At 844×390 the Kadane plot span is 48px, not the 32px of the first V25 attempt.
- Zero values:
  - The data height is 0.
  - They render as a centred 22px dashed marker on y(0), which gives a readable "0" and a click target independent of the data height.
  - The marker is centred with `top:-11px` because the FLIP inline `transform:none` cancelled the old `translateY(-50%)`. That was an incidental V24 bug.
- Removed the wrap's inline `top:%` baseline. It sat about 3.5px off y(0), another incidental V24 bug. The baseline is now drawn in the plot at the zero line.
- The swap "lift" is disabled for signed `.bar.hl-swap` and zero markers, because it moved bars about 2px off the zero line at rest.
- The changes are in `ArrayView` and CSS, so the legacy path (Kadane, insertion, quick) and the declared-primary path (mergeSort) both get them. The mergeSort signed case is tested with the recursion tree open and closed.
- Unchanged:
  - the run-level signed domain;
  - main array and temp buffer identity;
  - 2D FLIP, and cancelling of runs and transitions;
  - resize only re-measures geometry and does not re-solve or change the step (the e2e test checks cursor, runId and speed).

**Tests:**
- `tests/v25-signed-geometry.test.ts`:
  - equal-magnitude opposite values give equal lengths;
  - zero has height 0;
  - [100,1,-100,0];
  - the run-level domain is kept across frames;
  - lanes and placement rules, including inside / tip / across and single-sign plots.
- `tests/e2e/helpers/primaryObjects.ts` adds `measureSignedAnnotations` and `signedAnnotationFailures`, alongside the existing V24 detector:
  - pointer and index text Range rects are compared with value text Ranges, value boxes, and bars of the same and neighbouring slots;
  - pointer/index alignment with their slot;
  - the value stays inside the plot;
  - positive bar bottoms, negative bar tops, and zero-marker centres lie on the zero line within 1.5px;
  - a zero value has data height 0.
  - Range highlights, state colours, and focus outlines are deliberately not treated as conflicts.
- E2E (V25-02 block):
  - the 3 fixed cases in standard and reduced motion, checked after the step lands;
  - 1920×1080, 390×844 and 844×390; a small window may scroll;
  - every landed frame of quick [5,-5,0], insertion [100,1,-100,0], bubble all-negative, insertion all-zero, and Kadane default;
  - binarySearch on a negative sorted input, where `lo` and `mid` stack on the same slot;
  - same value gives the same drawn height across frames;
  - bars↔cells, collapsing the data panel, narrower windows (1180 and 1024), and code font changes, with cursor, runId and speed unchanged;
  - mergeSort declared-primary with a signed input, tree open and closed;
  - negative controls.
- **Negative controls:** CSS faults injected in the real app all fail the detector, and removing each fault passes again. The faults are:
  - `pointer-row-over-plot`, the V24-like case;
  - `plot-squeezed` to 24px;
  - `zero-line-shifted` by 14px.

**Not verified:**
- Real browser zoom: I only varied `html` font size and the code font; DPR is not zoom.
- Real devices.
- WebKit, which cannot run here because host libraries are missing and there is no root.
- Cells mode was only regression-checked through the round trip.

## Before / after screenshots (same input, frame, and viewport; from the real app)
`docs/screenshots/v25/{before,after}/`, with matching names:
- `kadane-default-7of22-{1366x768,1920x1080,390x844,844x390}.png`
- `insertion-1_-1-3of6-…`
- `quick-5_-5_0-3of10-…`

Before was taken on 5291 (`9105ff9` worktree), after on 5292 (this branch). Metrics are in `docs/traces/v25/m0-metrics-{before,after,after-reduced}.json`.

## Checks
| command | result |
|---|---|
| `npx tsc -b` | OK |
| `npm run lint` (oxlint) | 0 errors, 47 warnings; the same warnings per file as `9105ff9` |
| `npx vitest run` | 103 files, 465 passed, 0 failed |
| `npm run build` | OK (only the existing chunk-size warning) |
| Full Playwright, Chromium, `--retries=0`, run 1 (before 58a3622) | 215 passed, **1 failed**, 0 flaky, 0 skipped. First failure: `v11-semantic-visual.spec.ts:224` short-height docks @844x390, "bar height too small 16 < 24". Cause: the first lane model starved the plot. The product was fixed in 58a3622; the test was not changed. |
| Full Playwright, Chromium, `--retries=0`, run 2 (tip code) | **216 passed, 0 failed, 0 flaky, 0 skipped** (14.2 min) |
| V25 spec `--repeat-each=3 --retries=0` | 75 passed, 0 failed, 0 flaky |
| V25 spec on Firefox (Playwright, `/workspace/pw-firefox.config.mjs`) | 25 passed |
| V25 spec against the V24 build (negative control) | 23 failed, 2 passed (expected) |

Counts are in `docs/traces/v25/e2e-run-summaries.json`. `docs/traces/v25/v25-e2e-run.json` holds the per-test records from the last V25 spec run, which was the Firefox run.

V24 regressions are covered by `v24-primary-objects.spec.ts` in full run 2, and all passed:
- the merge default 55 frames, with stage `a` equal to current-data `a` on every frame and end state [1,2,3,5,7,8,9];
- Huffman's 10 frames: the forest, the selected pair ≤ the other roots, the merge sums, and the final one tree with leaf codes equal to table codes;
- activity interval cards with no neighbour overlap;
- the V23 workbench specs.

## Test migration
`tests/e2e/v23-workbench-layout.spec.ts:534`: the build-info regex changed from `/V24 ·/` to `/V25 ·/`. It is a version-string assertion that follows the current version, as in previous rounds.

## Not done / out of scope
- No refactor of all algorithms' code refs. Only Kadane is locked; the others are in the inventory as "needs verification".
- No workbench refactor, no fixed data sidebar, no body MutationObserver, no theme change, no new algorithms.
- No push or deploy.
