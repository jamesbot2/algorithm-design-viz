# V25 coverage matrix

Specs: `tests/e2e/v25-kadane-signed.spec.ts`, with retries 0 and Chrome at `/usr/bin/google-chrome`.
Detectors:
- V24 `tests/e2e/helpers/primaryObjects.ts`, extended with `measureSignedAnnotations` and `signedAnnotationFailures`.
- The Kadane assertions read the CodeDocument statement text and the real `.cm-exec-line` text. They do not use CodeMirror DOM line indices.

| # | Brief requirement | Test | Viewport | Asserted |
|---|---|---|---|---|
| K1 | Default 22 frames: banner, variables, semantic ref, statement | `default 22 frames @1366x768` | 1366x768 | Each frame via real 下一步: banner equals the solver message; variable chips (i/cur/curStart/best/bestStart/bestEnd) equal the frame vars; `data-exec-line` and the exec-line text equal the CodeDocument statement of the frame's primary anchor. Frame 7 is line 9 `for (...)`, not the declaration. |
| K2 | Branches: reset, extend, update best, no update, done | K1, plus the unit test `tests/v25-kadane-semantic.test.ts` | — | Reset → 11–12 (condition 10); extend → 14 (condition 10); update → 17–19 (condition 16); no-update → the next loopVisit frame has best unchanged; done → 22 |
| K3 | Robustness after back, replay, seek, font size and soft wrap | `frame 7 stays on the same statement…` | 1366x768 | Same statement text and line after each action; runId unchanged |
| K4 | Small inputs [1,-1], [-4,-2,-5], [0,0] | `small input […]` ×3 | 1366x768 | Every frame's statement; non-empty results 1@[0,0], −2@[1,1], 0@[0,0] (earliest of tied bests) |
| K5 | Empty-input contract | `empty input: the page contract rejects it` plus a unit test | 1366x768 | Page shows「数组不能为空」, with no new run and no sum-0 answer; the solver returns hasSubarray=false, best=null |
| K6 | Numeric fallback policy | `tests/dom/v25-code-numeric-fallback.test.tsx` | DOM | `forbidden` (kadane) never maps a numeric line; legacy modules keep the old mapping |
| K7 | Inventory of modules with legacy numeric refs | `tests/v25-numeric-ref-inventory.test.ts` → `docs/traces/v25/legacy-numeric-inventory.json` | — | Kadane verified; 9 modules "needs verification"; kmp and bfs have frames with no ref |
| S1 | Three fixed cases, standard and reduced motion, after landing | `… @1366x768 standard/reduced` ×6 | 1366x768 | No pointer/index text Range ∩ value text, value box or bar; pointer and index aligned to their slot; value inside the plot; bars and zero marker on one zero line (±1.5px) |
| S2 | Fallback viewports | `fixed cases @1920x1080/390x844/844x390` | 3 viewports | Same as S1; the stage may scroll |
| S3 | [5,-5,0], [100,1,-100,0], all negative, all zero, several pointers on one slot | `every landed frame of …` ×6 (binarySearch negative sorted: lo and mid on one slot) | 1366x768 | S1 checks on every landed frame |
| S4 | Value domain: equal magnitude, zero is 0, same value keeps its height across frames | `tests/v25-signed-geometry.test.ts`; `same value keeps the same drawn height…` | unit + 1366x768 | Equal lengths; zero data height 0; run-level domain |
| S5 | bars↔cells, collapse data, narrower window, code size; cursor/runId/speed unchanged | `bars↔cells, data collapse, …` | 1366→1180→1024 | S1 checks after each change; cursor, runId and speed unchanged |
| S6 | Declared-primary branch | `declared-primary branch (mergeSort, signed input)` | 1366x768 | S1 checks with the recursion tree closed, open, and closed again |
| S7 | Label placement rule (inside/tip/across), lanes only where needed | `tests/v25-signed-geometry.test.ts` | unit | Rules as specified; single-sign plots never use `across` |
| N1 | Pointer row laid over the plot (V24-like) → fail | negative controls | 1366x768 | Detected; removing the fault passes |
| N2 | Plot squeezed to 24px → fail | negative controls | 1366x768 | Detected; removing the fault passes |
| N3 | Zero line shifted 14px → fail | negative controls | 1366x768 | Detected; removing the fault passes |
| N4 | Whole V25 spec against the V24 build | `V25_BASE=…5291…` | — | 23 of 25 fail; the 2 that pass (empty-input page contract, same height across frames) are behaviours V24 already had |
| N5 | Old kadane.ts under the new unit test | — | — | 6 of 7 fail |
| R1 | V24 regressions: merge 55, Huffman 10, activity | `v24-primary-objects.spec.ts` (full run 2) | as in V24 | All pass |
| R2 | Short-height docks (V11) with signed bars | `v11-semantic-visual.spec.ts:224` | 844x390 | Failed in full run 1, passes after 58a3622 (product fix) |

Runs:
- Full Chromium suite, retries 0: run 1 was 215 passed and 1 failed; run 2 was 216 passed, 0 failed, 0 flaky, 0 skipped.
- V25 spec ×3: 75/75.
- Firefox, V25 spec: 25/25.

Not run: WebKit (missing host libraries), real devices, real browser or OS zoom. Firefox covered only the V25 spec.
