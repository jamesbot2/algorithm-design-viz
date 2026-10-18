# docs/advanced — evidence index

All files were produced by `scripts/advanced-record.mjs` (Playwright + system Chrome, 1366x768 video, real mouse clicks, the product's own
player at default speed, no slowMo, no time-lapse) against `vite preview` of the production build. Nothing here is a generated image.

## Recordings (normal speed, WebM)
| file | what | duration |
|---|---|---|
| `stl-vector-demo.webm` | STL lab: vector/iterator invalidation (the default draft ends in an honest stop before UB) | ~6 s |
| `dsu-demo.webm` | DSU full run (union/find, path compression) | ~59 s |
| `fenwick-demo.webm` | Fenwick tree full run | ~36 s |
| `segtree-demo.webm` | Segment tree full run | ~39 s |

## Screenshots
- Desktop 1366x768: `<demo>-1366x768-preview.png` (before run), `<demo>-1366x768-final.png` (after run), for stl-vector, dsu, fenwick, segtree.
- 1920x1080 / 1024x600 / 390x844 / 844x390 (mid-run, a few steps in): `<demo>-<W>x<H>.png`.
- Pages: `home-*`, `explain-fenwick-*`, `template-dsu-*`, `template-stl-bounds-*` at 1366x768 and 390x844.

## Measurements / validation data
- `v31-style-measure-375x812.jsonl` — ADV-27 scene measurements on 5 advanced demos at 375x812.
- `validation-run.json` — raw real-toolchain validation run output (see docs/ADVANCED_TEMPLATE_VALIDATION.md).

Observation (not a defect claim): in the segment-tree frames the tree nodes are drawn as dark boxes on the dark theme; values are readable.
