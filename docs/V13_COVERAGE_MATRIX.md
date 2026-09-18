# V13 Coverage Matrix

| ID | Area | Automated | Manual / notes |
|----|------|-----------|----------------|
| V13-01 | Graph warn/plot + label ~12–14px + camera | unit CSS/TS + e2e BFS multi-viewport, Dijkstra/Prim, BF neg-warn, resize | Screenshots under `docs/screenshots/v13/` |
| V13-02 | mergeSort return/divide, arrayPointers, pre-inc snap | `tests/v13-02-mergesort.test.ts` + catalog consistency | Assert source text |
| V13-03 | Portal 0-rect close, vv/scroll, More overflow | unit source + e2e 844→1280 + More seek | Esc/close button |
| V13-04 | Real visibility / fault inject must fail | e2e helper + FAULT-INJECTION test + v12 overlap tighten | No force:true / opacity0 mocks |

## Viewports exercised (e2e)

1366×768, 1024×500, 844×390, 390×844, 320×568, 1280×800 (resize + Dijkstra/Prim).

## Browser

Chromium only (`/usr/bin/google-chrome`) via Playwright project config.
