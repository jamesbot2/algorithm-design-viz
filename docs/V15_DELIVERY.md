# V15 Delivery — Keyboard, Dijkstra roles, continuous inspect, visibility fields

**Branch:** `v15-keyboard-dijkstra-inspect-visibility`  
**Baseline HEAD:** `f414430794829dba7c2c68e76a4bd36c399cdc9f` (main / V14 live)  
**Fix tip:** `09a3e220ed632e703bd160dca9d5109982e0cc6e`  
**Docs tip:** `9ac4f312f2a9ef5e58a1f7b378af588f8858ce32`  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V14

inspectorLayout inline/drawer + alternate entry; VarsPanel step.arrays; CTM pan + reset-view; warn/plot split; mergeSort anchors/arrayPointers; portal; range masks; run identity; same-SHA gate; SVG must not paint into inspector.

---

## V15-01 — Drawer inputs own Arrow keys (P1)

| | |
|--|--|
| **Repro?** | Yes — `shouldIgnoreKeyboard` returned false for ArrowLeft/Right inside `.inspector-sheet` *before* checking INPUT/TEXTAREA/SELECT/contenteditable → `preventDefault` + goPrev/goNext |
| **Fix** | Shared `src/utils/keyboardGuard.ts`: editing controls always own first (composedPath, defaultPrevented, isComposing, modifiers); drawer is not a reason to steal from inputs; reading area still scrubs; Esc closes + restores focus to toggle without changing cursor |
| **Files** | `src/utils/keyboardGuard.ts`, `src/components/Visualizer.tsx`, `src/components/graph/GraphResultPanel.tsx` |
| **Tests** | `tests/v15-01-keyboard-inspector.test.ts`, `tests/dom/v15-01-keyboard-guard.test.ts`, e2e V15-01 |
| **Evidence** | `docs/screenshots/v15/v15-01-target-input.png`, `docs/traces/v15/v15-01-keyboard-target.json` |

## V15-02 — Dijkstra visual semantics (P1)

| | |
|--|--|
| **Case** | directed n=3 start=0 edges `0→1:10`, `0→2:1`, `2→1:1` → dist `[0,2,1]` parent `[-1,2,0]` |
| **Repro?** | Yes — historical accepted kept as current; extract settled swallowed highlight; success snap ended with checking overwriting accepted |
| **Fix** | Current predecessors derived from `parent[]` → `tree`; historical successful relax not styled as current accepted/path; success frame uses `accepted` (not checking); focus ring overlays settled via `role-focus` + highlightNodes; path query unchanged; heap Dijkstra heavy frames aligned; BFS/Prim regression |
| **Numeric** | `solveDijkstraNaive` unchanged; vitest solver asserts |
| **Files** | `src/algorithms/dijkstra.ts`, `src/algorithms/dijkstraHeap.ts`, `src/components/GraphView.tsx`, `src/styles/animation.css` |
| **Evidence** | `docs/traces/v15/v15-02-final-edge-roles.json`, `docs/screenshots/v15/v15-02-dijkstra-final.png` |

## V15-03 — Continuous inspect with data open (P2)

| | |
|--|--|
| **Repro?** | Yes — modal drawer covered transport; e2e had to close drawer between steps |
| **Fix** | Drawer-internal prev/next/counter calling **same** `goPrev`/`goNext`/`idx` (one player); `aria-modal="false"`; desktop side inspect CSS (`data-inspect-mode="side"`); arrays follow cursor; inline finalAnswer gated while drawer open (single GraphResultPanel) |
| **Files** | `src/components/Visualizer.tsx`, `src/styles.css` |
| **Evidence** | `docs/traces/v15/v15-03-continuous-inspect.json`, `docs/screenshots/v15/v15-03-continuous-drawer.png` |

## V15-04 — strictGraphVisibility field gaps (P1)

| | |
|--|--|
| **Repro?** | Yes — pe:none opaque still ok; 4px-tall wide label ok; center-in but ~35% clipped ok |
| **Fix** | Separate `geometryVisible` / `hitReachable` / `textReadable` / `paintOcclusionChecked`; multi-point + overflow auto/scroll clip; text by font-size/height not width; pe:none paint occluder scan; empty/stale sample fails; keep pe:auto opaque fail |
| **Files** | `src/utils/strictGraphVisibility.ts`, e2e helper label font-size, `tests/dom/v15-04-visibility-fields.test.ts` |
| **Evidence** | `docs/traces/v15/v15-04-visibility-*.json`, `docs/screenshots/v15/v15-04-visibility-fault.png` |

---

## Commands (honest)

| Command | Result |
|---------|--------|
| `./node_modules/.bin/tsc -b` | pass |
| `npm run lint` | exit 0 (warnings only) |
| `npx vitest run` | **75 files / 350 tests passed** |
| `npx vitest run tests/v15-*.test.ts tests/dom/v15-*.test.ts` | targeted V15 green |
| `npx playwright test tests/e2e/v15-keyboard-dijkstra-inspect-visibility.spec.ts` | **5 passed** (Chromium) |
| `npx playwright test tests/e2e/v14-inspector-arrays-pan-visibility.spec.ts tests/e2e/v13-graph-portal-visibility.spec.ts` | **42 passed** |
| `npx vitest run tests/v13-02-mergesort.test.ts` | **6 passed** |
| `npm run build` | pass → `index-Csr3AbXr.js` / `index-C1P4u7wI.css` |

FF/WebKit not run (Chromium-only project).

## Confirm

**Did not git push. Did not deploy Pages. Did not force-push.** Local branch commits only.
