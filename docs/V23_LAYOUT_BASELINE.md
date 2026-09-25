# V23 layout baseline (M0)

All numbers and screenshots in this file come from the **real running baseline app**
(`acfba1d`, local V22 tip) served by Vite from a separate worktree
(`/workspace/v23-before`, port 5190), driven by Chrome `/usr/bin/google-chrome`
through Playwright (`scripts/v23-inventory.mjs`). No design images.

## Version facts (honest record)

| item | value |
|---|---|
| Baseline commit (V22 local tip) | `acfba1d5679cd323c494b68cdbb061fd2cfe9acd` — "docs(V22): align tip lines with final HEAD" (2026-09-20 16:30 UTC+8) |
| Was V22 deployed? | **No.** V22 was never pushed. The request text says "V22 已上线", but it is not live. |
| Live GitHub Pages `main` | V21 `efa23a5` (2026-09-20 14:54 UTC+8), assets `index-gmbuTtuH.js` / `index-B5gmd-0x.css` |
| V23 branch | `v23-workbench-layout-refactor`, created from `acfba1d`. Local only, never pushed. |
| User's original screenshot | Not available on this machine. It was reproduced in the real baseline app instead (see "Six-node graph regression" below). |
| Baseline test status | vitest: 96 files, 415 tests, all passed. Full Playwright: **162 passed** (9.2 min) on Chrome (`/workspace/baseline-e2e.log`). |

## Method

`node scripts/v23-inventory.mjs http://127.0.0.1:5190/algorithm-design-viz/ docs/screenshots/v23/before before`

- **Page:** BFS default six-node graph (`#/algo/bfs`).
- **Viewports:** 1366×768, 1920×1080, 1024×600, 390×844, 844×390.
- **States:**
  - `preview`: nothing run yet.
  - `previewdata`: the data entry clicked before running.
  - `mid`: run, then frame 8.
  - `dataopen`: frame 8 with data open.
  - `editopen`: frame 8 with the input editor open.
- **Recorded:**
  - rect, position, overflow, flex, min/max height, and scroll owner for: header, nav, input summary/body, step text, stage, graph plot, inline data band, data sheet, code slot, code scroller, transport
  - graph content bbox vs plot
  - elements painted over graph nodes/edges (elementsFromPoint on node centres + label glyph boxes, excluding the SVG's own children)
  - var pills

Raw data: `docs/screenshots/v23/before/before-bfs-inventory.json`.

## Before metrics (BFS six-node graph)

| viewport | state | stage | graph plot | graph bbox | data surface | code scroller | transport h | occluders | graph inside plot | screenshot |
|---|---|---|---|---|---|---|---|---|---|---|
| 1366x768 | preview | 543×326 | 530×313 | 206×235 | — | 462×336 | 113 | 0 | yes | `before/before-bfs-1366x768-preview.png` |
| 1366x768 | previewdata | 345×326 | 332×313 | 206×235 | sheet 360×768 | 300×297 | 113 | 0 | yes | `before/before-bfs-1366x768-previewdata.png` |
| 1366x768 | mid | 543×326 | 530×313 | 208×235 | — | 462×336 | 113 | 0 | yes | `before/before-bfs-1366x768-mid.png` |
| 1366x768 | dataopen | 345×326 | 332×313 | 208×235 | sheet 360×768 | 300×297 | 113 | 0 | yes | `before/before-bfs-1366x768-dataopen.png` |
| 1366x768 | editopen | — | — | 209×236 | — | — | 113 | 1 | **no** | `before/before-bfs-1366x768-editopen.png` |
| 1920x1080 | preview | 848×216 | 834×203 | 134×153 | — | 711×331 | 115 | 0 | yes | `before/before-bfs-1920x1080-preview.png` |
| 1920x1080 | previewdata | 650×216 | 636×203 | 134×153 | sheet 360×1080 | 549×303 | 115 | 0 | yes | `before/before-bfs-1920x1080-previewdata.png` |
| 1920x1080 | mid | 848×422 | 834×409 | 272×307 | — | 711×537 | 115 | 0 | yes | `before/before-bfs-1920x1080-mid.png` |
| 1920x1080 | dataopen | 650×422 | 636×409 | 272×307 | sheet 360×1080 | 549×509 | 115 | 0 | yes | `before/before-bfs-1920x1080-dataopen.png` |
| 1920x1080 | editopen | 848×216 | 834×203 | 135×153 | — | 711×331 | 115 | 0 | yes | `before/before-bfs-1920x1080-editopen.png` |
| 1024x600 | preview | 355×158 | 342×145 | 95×113 | — | 308×157 | 113 | 0 | yes | `before/before-bfs-1024x600-preview.png` |
| 1024x600 | previewdata | 330×132 | 316×119 | 78×96 | sheet 360×600 | — | 138 | 0 | yes | `before/before-bfs-1024x600-previewdata.png` |
| 1024x600 | mid | 355×158 | 342×145 | 96×112 | — | 308×157 | 113 | 0 | yes | `before/before-bfs-1024x600-mid.png` |
| 1024x600 | dataopen | 330×132 | 316×119 | 79×95 | sheet 360×600 | — | 138 | 0 | yes | `before/before-bfs-1024x600-dataopen.png` |
| 1024x600 | editopen | — | — | 209×245 | — | — | 113 | 1 | **no** | `before/before-bfs-1024x600-editopen.png` |
| 390x844 | preview | 316×138 | 302×125 | 82×100 | — | — | 91 | 1 | yes | `before/before-bfs-390x844-preview.png` |
| 390x844 | previewdata | 316×138 | 302×125 | 82×100 | sheet 390×290 | — | 91 | 5 | yes | `before/before-bfs-390x844-previewdata.png` |
| 390x844 | mid | 316×445 | 302×432 | 220×249 | — | — | 91 | 0 | yes | `before/before-bfs-390x844-mid.png` |
| 390x844 | dataopen | 316×445 | 302×432 | 220×249 | sheet 390×340 | — | 91 | 1 | yes | `before/before-bfs-390x844-dataopen.png` |
| 390x844 | editopen | 316×138 | 302×125 | 83×99 | — | — | 91 | 1 | yes | `before/before-bfs-390x844-editopen.png` |
| 844x390 | preview | 770×152 | 756×139 | 91×109 | — | — | 56 | 0 | yes | `before/before-bfs-844x390-preview.png` |
| 844x390 | previewdata | 770×152 | 756×139 | 91×109 | sheet 844×195 | — | 56 | 2 | yes | `before/before-bfs-844x390-previewdata.png` |
| 844x390 | mid | 770×152 | 756×139 | 92×108 | — | — | 56 | 0 | yes | `before/before-bfs-844x390-mid.png` |
| 844x390 | dataopen | 770×152 | 756×139 | 92×108 | sheet 844×195 | — | 56 | 1 | yes | `before/before-bfs-844x390-dataopen.png` |
| 844x390 | editopen | 770×233 | 756×220 | 146×165 | — | — | 56 | 1 | yes | `before/before-bfs-844x390-editopen.png` |

## Six-node graph regression ("variables panel crossing the six-node graph")

The user's screenshot showed the variables panel crossing the six-node graph. In the real baseline:

- **390×844, data opened in preview** (`before/before-bfs-390x844-previewdata.png`): the data sheet (390×290, `position: fixed`, body portal) paints over the graph. There are 5 occluded graph parts, and the `ready / n / start / directed` config pills sit on the nodes. This is the reported symptom.
- **390×844 data open mid-run:** 1 occluder, with a measured overlap of **25 455 px²** between the sheet and the graph plot.
- **844×390 previewdata / dataopen:** 2 and 1 occluders respectively.
- **1366×768 / 1024×600 edit open:** the stage collapses to **0 px** (no stage rect). The graph is drawn **outside** its plot, into the siblings.

## Root causes (classified as the brief asks)

| # | Class | Where (baseline) | Effect |
|---|---|---|---|
| 1 | fixed/absolute panel overlay | `Visualizer.tsx` `createPortal(…, document.body)` for the inspector sheet (≈l.671) and transport (≈l.505). The sheet is `position: fixed; right: 0` and the parent compensates with `margin-right: min(360px, 38vw)` (styles.css ≈l.3199 and ≈l.3393). | Data overlays the scene on narrow widths (390×844) and steals 360px on desktop: stage 543→345, code 462→300 at 1366. |
| 2 | siblings fighting for space | `styles.css` lab-fill chain (`min-height:0 !important` vs later fixed minimums), 96px inline inspect band, `data-height-fallback`, a two-row transport of 113px, and a 260px nav | Stage is only 326px tall at 1366×768 and 138–158px at 1024×600 / 390×844, with a graph bbox of 82×100 at 390×844. At 1920×1080 the preview stage is only 216px tall (height fallback), then 422px mid-run. |
| 3 | child drawing outside its box | Edit open: the lab-fill column keeps a fixed height, the input form grows, and the stage flex item hits 0 while the SVG keeps its intrinsic size | The graph is painted outside the collapsed stage (1366 / 1024 editopen). |
| 4 | child scrollport taller than visible ancestor | Inspector sheet body and CodeMirror nested in `overflow: hidden` parents with fixed heights (V18/V19 patches) | Rows or lines are cut; the code scroller is 297px at 1366 with data open. |
| 5 | DOM present but glyphs/targets clipped | The 32px step bar and 2.4rem summary (V20 patches), and config pills rendered as equal-weight chips | Low-value config pills cover graph labels (item 1). Step text is clipped by fixed heights in short viewports. |
| 6 | layout by DOM scanning | `Layout.tsx` MutationObserver (≈l.104) plus visualViewport guessing; `WorkbenchLayout.tsx` MutationObserver (≈l.72) reading `data-open` from the portal | Several layout budgets were computed from the DOM instead of from one state source, which is why edit and data states disagreed about height. |

## Baseline responsibility list (who owned size / scroll / visibility)

| concern | baseline owner(s) |
|---|---|
| page height | `Layout.tsx` (visualViewport and a MutationObserver writing `data-height-fallback`) **and** lab-fill CSS **and** `WorkbenchLayout` fill mode |
| data visibility | `Visualizer` local state + body portal + `WorkbenchLayout` MutationObserver on `data-open` + CSS `margin-right` |
| transport | `Visualizer` (a portal into the workbench slot) **plus** a second mini transport inside the inspector sheet (`inspector-next-btn`, `inspector-step-counter`) driving the same cursor |
| scene height | CSS flex chain + fixed min-heights + `data-height-fallback` |
| code width | react-resizable-panels percentages |
| page scroll | window **and** `<main>` depending on route and fallback |

## Unverified at baseline

- Firefox / WebKit (not run on the baseline).
- Browser zoom 125% / 150% (≠ deviceScaleFactor; not run).
