# V9 Delivery — Viewport visibility + animation authenticity

Branch: `v9-viewport-motion`  
Baseline HEAD: `f3ba638` (V8)  
**Not pushed. Not deployed.**

M0 evidence: `docs/V9_M0_REPRO.md`, `docs/traces/v9/m0-*.json`, `docs/screenshots/v9/`.

---

## V9-01 Root causes (with measurement evidence)

| Cause | Evidence (M0) | Fix area |
|-------|---------------|----------|
| Locked `lab-fill` `overflow:hidden` + estimated `--wb-chrome: 14rem` | 147/148 samples `lab_fill_overflow_hidden`; LCS/knapsack/Dijkstra stage∩VP often &lt;0.5 | M2 measured budget + scroll/compact fallback |
| Aux GraphResultPanel stacked above SVG | Dijkstra mid: panel h≈225px, stage∩VP **0.061** | M1 move result into final-answer / inspector |
| N-Queens full search tree above board | 16 samples `search_tree_above_board` | M1 board first; tree in collapsed aux |
| Input `max-height` ~80–130px scroll box | 45 samples `input_actions_outside_scroll_box` | M1 summary + sticky Run/Cancel |
| Theory expands in header inside locked shell | 1024×500+theory: stage∩VP **0**, runOk false | M1 theory drawer overlay |
| FLIP X-only; speed tied to fixed 600; no transition identity | Source: `ArrayView` centers scalar + `resolveDuration(...,600)`; interval can be 80ms vs swap 150–280ms | M3 XY FLIP + playback clock + epoch |
| DP `current` early-return swallows write/path | Source: `MatrixView.cellClass` | M3 composable roles |
| Reverse edges share midpoints; fixed viewBox | Source: `GraphView` bidirectional curve | M3 channel offsets + fit margins |

---

## V9-02 Workbench reorganization

- **Main scene priority** in `Visualizer`: graph → arrays → matrices/board; N-Queens search tree defaults to collapsed `search-tree-aux` when board present.
- **GraphResultPanel** removed from viz column; lives under Visualizer `finalAnswer` (with FinalAnswerResult).
- **Input**: summary bar +「编辑输入」; sticky Run/Cancel always outside body scroll; complex algos (graph/DP/nQueens/…) start expanded for operability; simple array stays summary-first.
- **Theory**: overlay drawer (`theory-drawer`) — does not expand inside non-shrinking header.
- **Single playback bar**: workbench transport only; removed duplicate input「重置播放」and duplicate inspector message strip under transport.

---

## V9-03 Viewport budget / fallback

- `WorkbenchLayout` ResizeObserver writes `--wb-measured-w/h`, `data-height-mode`, absolute px-informed panel mins (≈180/160), **stable panel tree** preserved (R4).
- `Layout` uses `visualViewport` + width/height to choose `data-height-fallback=fill|scroll` (safe-area padding on lab-fill).
- Short height (`max-height: 520px`): collapse aux (inspector/stats/legend/phase extras) first; keep fill so Run + stage share the viewport; extreme short/narrow may scroll.
- Scroll ownership: `[data-scroll-owner=viz|code|matrix|inspector]` with `overscroll-behavior: contain`.
- Theme/density/font changes do not re-solve (unchanged run identity).

---

## V9-04 Animation fixes

- **FLIP XY**: measure `{x,y}`; `translate(dx,dy)`; invalidate on bars↔cells, ResizeObserver, snap/epoch.
- **Playback clock**: `coordinatedStepIntervalMs` — step interval ≥ decorative swap at current speed; MotionContext `speedIntervalMs` driven by Visualizer (no hard-coded 600 for FLIP).
- **Cancel identity**: `transitionEpoch` bumped on pause/seek/runId/reset/step; FLIP timeouts gated by token + `data-transition-id`.
- **DP**: `dpCellClassNames` composable; `data-prev` from real previous step matrix.
- **Graph**: parallel/reverse channels via stable id order; endpoint insets; self-loops supported; dynamic `viewBox` fit including labels/nodes.
- Main scene fit without painting motion onto the code pane (unchanged chrome placement).

---

## V9-05 Style ownership

- Viewport/lab-fill/input/theory rules live in `styles.css` (V8 block replaced/merged into V8/V9 section — not a third mega override file).
- `animation.css` still owns motion/keyframes/semantic pulses; does **not** set root height, split ratios, or toolbar layout (kept transform:none shell guard only).
- Third-party panel selectors remain `[data-panel][data-tab-active]` (V8) with e2e regression.
- Short-height prefers fewer modules over shrinking fonts + touch targets together.

---

## V9-06 Files changed

| Path | Role |
|------|------|
| `src/pages/AlgoPage.tsx` | Input summary/edit, theory drawer, GraphResult placement |
| `src/components/Visualizer.tsx` | Scene order, clock sync, epoch bumps, stage viewport |
| `src/components/ArrayView.tsx` | FLIP XY + invalidate + transition id |
| `src/components/MatrixView.tsx` | Composable DP + real prev |
| `src/components/GraphView.tsx` | Reverse edges / self-loop / fit |
| `src/components/workbench/WorkbenchLayout.tsx` | Measured budget, height mode |
| `src/components/Layout.tsx` | visualViewport height fallback |
| `src/theme/MotionContext.tsx` | speedIntervalMs + transitionEpoch |
| `src/utils/playbackClock.ts` | Coordinated step interval |
| `src/utils/dpCellRoles.ts` | Composable cell classes |
| `src/utils/graphEdgeGeometry.ts` | Edge channel helpers |
| `src/styles.css` | V9 viewport / input / theory / short-height |
| `docs/V9_M0_REPRO.md`, `docs/V9_DELIVERY.md` | Docs |
| `docs/traces/v9/*`, `docs/screenshots/v9/*` | M0 evidence |
| `tests/v9-*.ts`, `tests/dom/v9-*.tsx`, `tests/e2e/v9-*.spec.ts` | Acceptance |

Left untouched (dirty noise): `docs/traces/v4/playwright-report.json` — **not committed**.

---

## V9-07 Real verification matrix

Commands: `npm run test:run` (**222**/222), `npm run build` pass, `npm run lint` warnings-only,  
`npm run test:e2e -- tests/e2e/v9-viewport-motion.spec.ts tests/e2e/v8-preview-layout.spec.ts tests/e2e/v7-state.spec.ts` (**17**/17).

Chrome: `/usr/bin/google-chrome`. Soft keyboard: **simulated via visualViewport/resize only** — not a real device.

| Viewport | Kadane stage+run | Notes |
|----------|------------------|-------|
| 1366×768 | pass | split |
| 1280×800 | pass | split |
| 1024×500 | pass | theory drawer; stage stays &gt;40px visible |
| 900×500 | pass | |
| 390×844 | pass | tabs; V8 selector still green |
| 360×640 | pass | |
| 320×568 | pass | |
| 844×390 | pass | short-height compact fill |

| Algo check | Result |
|------------|--------|
| Dijkstra graph main / result not above SVG | pass (e2e) |
| N-Queens board before tree aux | pass (e2e) |
| V8 mobile `[data-panel][data-tab-active]` | pass |
| V7 R2/R3/R4/R6 smokes | pass |
| Unit: FLIP/clock/DP/edges | pass |

---

## V9-08 Unverified / residual risks

- Real iOS/Android soft keyboard + URL-bar show/hide not measured on device (viewport simulation only).
- Continuous browser-zoom matrix beyond one M0 zoom125 sample (layout may still clip at extreme zoom).
- Splitter-drag FLIP invalidate covered by ResizeObserver unit path; not every algo e2e.
- Parallel edges with &gt;2 siblings visually OK via channel formula; no dedicated e2e screenshot golden.
- Teach/knapsack multi-strategy page measured in M0 only (not full e2e matrix).
- `docs/traces/v4/playwright-report.json` may be dirty locally from Playwright reporter — ignored for commits.
