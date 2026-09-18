# V16 Layout Baseline (M0) — measured before changes

**Branch tip at measure:** `8f430065adcdc154352567ff3c54814a7c64ddf1` (V15 main)  
**Route:** `#/algo/dijkstra` (lab-fill workbench)  
**Chrome:** `/usr/bin/google-chrome` headless  
**Raw JSON:** `docs/traces/v16/m0-layout-baseline.json`  
**Screenshots:** `docs/screenshots/v16/m0-*-{closed,data-open,after-run}.png`  
**Timezone:** Asia/Shanghai (UTC+8)

## Root causes (honest)

1. **Article / card max-width** — `.main` / `.main.wide` use `--content-max: 980px` / `--viz-max: 1180px`. On lab-fill algo pages the workbench is still capped at **1180px**, so wide desktops grow **blank margins**, not plot/code.
2. **Fixed body overlay for data** — `.inspector-sheet[data-inspect-mode="side"]` is `position: fixed; right: 0; width: min(360px,38vw); height: 100vh`. It does **not** participate in flex layout and **overlaps the code panel** at 1366 and 1920.
3. **Input chrome steals height** — complex algos (graph) start with `inputEditing=true`; `.input-panel-body` up to `min(42vh,320px)` → ~440px input band before run, crushing workbench (1366 wb height ~200px until collapse after run).
4. **Stage/plot budget too small on laptop** — after run at 1366×768, plot height measured **127px** (design goal ≥~320px). Stage flex loses to transport + banner + split code under a short remaining budget.
5. **2560 grows card margins, not content width** — main stays 1180px; `blankRight=560`, `unusedBesideSidebar=1120`.

## Before rects (after-run where noted; closed for width)

| Viewport | main.w | wb.w | plot.h (after-run) | blankRight | unusedBesideSidebar | sheet∩code |
|----------|--------|------|--------------------|------------|---------------------|------------|
| 1366×768 | 1106 | 1050 | **127** | 0 | 0 | **true** (360×768 side sheet) |
| 1920×1080 | **1180** (capped) | 1124 | 401 | **240** | **480** | **true** |
| 2560×1440 | **1180** (capped) | 1124 | 758 | **560** | **1120** | false (sheet in blank) |
| 1024×600 | 764 | 708 | **127** | 0 | 0 | n/a (tabs; open failed/force) |

### 1920×1080 closed (representative card)

- viewport 1920×1080; sidebar ~260; main `{x:500,w:1180}` margin `0 240px`; `max-width:1180px`
- workbench `{w:1124,h:445}` (~41% vh); stage h≈98; plot h≈127 before run
- after-run: wb h=771; plot `{w:551,h:401}`; code `{w:479,h:596}`
- data-open sheet `{x:1560,w:360,h:1080}` overlaps code (`sheetOverlapsCode: true`)

### 2560×1440 closed

- main still `{w:1180}` with margin `0 560px` — **content does not grow with viewport**
- after-run plot h=758 (height OK) but plot/code **width** stuck (~551 / ~479)

### 1366×768 after-run

- plot `{w:510,h:127}` — fails ≥320 design goal
- wb `{w:1050,h:459}`; stage h=110
- CSS: `contentMax=980px`, `vizMax=1180px`

### 1024×600

- `data-layout=tabs` (correct for narrow); plot still 127; height-mode scroll

## Computed layout CSS (before)

- `--content-max: 980px`; `--viz-max: 1180px`
- `.main.wide { max-width: var(--viz-max) }` even under `[data-lab-fill="1"]`
- lab-fill main is flex column with overflow hidden; workbench `flex:1` but height remaining after expanded input is small
- scroll owners: `cm-scroller` auto; stage/workbench often `overflow:hidden` (fill mode)

## Scroll owners

- CodeMirror `.cm-scroller` is the primary code scroll owner (good).
- Stage/plot clip via overflow hidden in fill mode (nodes must fit slot — V13 contract).
- When input expanded + short viewport, workbench may enter `data-height-mode=scroll`.

## Data panel occlusion

- Side sheet is a **viewport-fixed overlay**, not a layout participant → covers code at mid widths.
- V15 continuous-inspect kept transport usable (`aria-modal=false`) but did **not** reclaim space for code.

## Design targets (V16-05/06) — for after comparison

- workbench ≥~95% of main width; main uses width beside sidebar (no 1180 card on lab-fill)
- core (stage) ≥~65% viewport height when input collapsed
- 1366 plot ≥~320px; 1920 ≥~420px; 2560 grows **content**, not blank
- data in layout (no cover of code); labels ~12–14 CSS px; code own scroll

## Routes measured

- Primary: `/algo/dijkstra`
- Layout rules apply to all `data-lab-fill="1"` algo pages

## Next

Implement immediately: width reclaim → dock data → enlarge plot/code budgets → preserve session geometry (V16-05..07), plus keyboard/readiness/visibility/counters (V16-01..04).
