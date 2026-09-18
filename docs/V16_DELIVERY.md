# V16 Delivery — Workbench space / keyboard / visibility

**Branch:** `v16-workbench-space-keyboard-visibility`  
**Baseline HEAD:** `8f430065adcdc154352567ff3c54814a7c64ddf1` (main / V15)  
**Fix tip:** `25f50f5e37d819b4c7927059adc16b42d920518f`  
**Branch tip:** (updated on commit)
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).  
Build: `index-C9n6ZreO.js` / `index-CG1DVOz8.css`

## Preserve V15

inspectorLayout; step.arrays; CTM pan+reset; Dijkstra tree/current preds; keyboardGuard for drawer inputs (extended for buttons/checkbox); drawer-internal transport; aria-modal honesty; visibility fields; mergeSort; N-Queens; FLIP/clock; same-SHA gate; single player.

---

## M0 — Layout baseline

Measured before at 1366 / 1920 / 2560 / 1024. Root causes: `--viz-max:1180px` card; fixed side sheet covering code; input/chrome eating height; flex `auto` basis leaving stage cramped.

See `docs/V16_LAYOUT_BASELINE.md`, `docs/traces/v16/m0-layout-baseline.json`, `docs/screenshots/v16/m0-*`.

---

## V16-01 — Native keyboard ownership (P1)

| | |
|--|--|
| **Repro?** | Yes — transport `BUTTON` Space returned `shouldIgnore=false` → window `preventDefault` + `togglePlay` **and** native button activation → double toggle |
| **Fix** | `isActivationControl` / `eventTargetsActivationControl`: BUTTON, checkbox, radio, ARIA roles own Space/Enter/arrows before global play |
| **Files** | `src/utils/keyboardGuard.ts` |
| **Tests** | `tests/dom/v16-01-keyboard-activation.test.ts`, e2e V16-01 |
| **Evidence** | `docs/traces/v16/v16-01-button-space.json`, `docs/screenshots/v16/v16-01-button-space.png` |

## V16-02 — Run readiness & flaky (P1)

| | |
|--|--|
| **Fix** | `waitForRunReady` / `prepareDijkstraN3Ready`: `data-preview=0`, play-btn, 1-based counter with `n ≥ minSteps` — not play-btn alone |
| **Zero-retry ×10** | Dijkstra n=3 visual audit; continuous inspect ≥10 steps; arrays inspector — all 10/10 |
| **Files** | `tests/e2e/helpers/runReadiness.ts`, e2e V16-02 |
| **Evidence** | `docs/traces/v16/v16-02-*.json` |

## V16-03 — Single visibility detector (P1)

| | |
|--|--|
| **Fix** | `measurePageGraphVisibility()` in `src/utils/strictGraphVisibility.ts`; exposed as `window.__algoVizStrictVisibility`; e2e calls same entry |
| **Faults** | pe:auto + pe:none injectors mutate page only; pe:none fails via paint fields; clear recovers |
| **Files** | `src/utils/strictGraphVisibility.ts`, `src/main.tsx`, `tests/e2e/helpers/assertStrictGraphVisible.ts` |
| **Evidence** | `docs/traces/v16/v16-03-visibility-fault.json` |

## V16-04 — Unified 1-based step counters (P2)

| | |
|--|--|
| **Repro?** | Yes — main `idx+1/stepsLen`, drawer `idx/max` (0-based) |
| **Fix** | Shared `formatStepCounter` / `displayStepNumber`; internal idx unchanged |
| **Files** | `src/utils/stepDisplay.ts`, `PlaybackTransport.tsx`, `Visualizer.tsx` |
| **Evidence** | `docs/traces/v16/v16-04-step-counters.json` |

## V16-05 — Desktop workbench uses available space (P1)

| | |
|--|--|
| **Fix** | lab-fill `.main` / `.main.wide` → `max-width: none`; full width beside sidebar |
| **Data** | `body:has(.inspector-sheet[data-inspect-mode=side])` reserves padding-right = sheet width → **sheetOverlapsCode=false** |
| **Input** | complex forms expand only if `innerHeight ≥ 820`; still collapse after run |
| **Files** | `src/styles.css`, `src/pages/AlgoPage.tsx` |

## V16-06 — Enlarge real graph/data/code (P1)

| | |
|--|--|
| **Fix** | Flex `1 1 0` chain so stage absorbs free space; compact header/banner/stats/legend on short heights; `MIN_LABEL_CSS_PX=13` (12–14 band) |
| **Honesty** | Do **not** force plot `min-height` above flex budget (that painted nodes under transport) |

## V16-07 — Layout must not break session (P1)

| | |
|--|--|
| **Verify** | Resize 1440→1920 + data toggle keeps `data-step-index` / `data-preview=0`; one player; panels clip so stage never paints into transport |
| **Evidence** | `docs/traces/v16/v16-07-session-persist.json` |

---

## Before / after layout metrics (Dijkstra after-run)

| Viewport | before main.w | after main.w | before plot.h | after plot.h | before sheet∩code | after |
|----------|---------------|--------------|---------------|--------------|-------------------|-------|
| 1366×768 | 1106 | 1106 (`max-width:none`) | **127** | **322** | true | **false** |
| 1920×1080 | **1180** (card) | **1660** | 401 | **404** (w 551→**834**) | true | **false** |
| 2560×1440 | **1180** | **2300** | 758 | **764** (w 551→**1186**) | false | **false** |
| 1024×600 | 764 | 764 | 127 | 154 (tabs) | n/a | false |

Raw after: `docs/traces/v16/after-layout-metrics.json`.

---

## Commands (honest)

| Command | Result |
|---------|--------|
| `./node_modules/.bin/tsc -b` | pass |
| `npm run lint` | exit 0 (warnings only) |
| `npx vitest run` | **78 files / 359 tests passed** |
| `npx vitest run tests/v13-02-mergesort.test.ts` | **6 passed** |
| `npx playwright test tests/e2e/v16-*.spec.ts` | **10 passed** (Chromium, retries 0) |
| `npx playwright test v15 + v13` | **17 passed** |
| `npm run build` | pass → `index-C9n6ZreO.js` / `index-CG1DVOz8.css` |

FF/WebKit not run (Chromium-only project).

## Confirm

**Did not git push. Did not deploy Pages. Did not force-push.** Local branch commits only.
