# V14 Coverage Matrix

| ID | Area | Automated | Manual / notes |
|----|------|-----------|----------------|
| V14-01 | Inspector layout unify; alternate entry when inline hidden | unit CSS/TS + e2e BFS/Dijkstra/Prim/Kruskal/BF @1366×768,1280×800,768×1024,390×844,844×390 | Screenshots `docs/screenshots/v14/inspector-*` |
| V14-02 | step.arrays in inspector; Dijkstra ∞→10→2 / parent[1]=2; close drawer between steps | unit + e2e @1280/768/390 | Traces `docs/traces/v14/dijkstra-arrays-*.json` |
| V14-03 | Pan CTM/meet; reset-view; pointer capture | unit source/math + e2e 100px drag | `pan-100px.json` |
| V14-04 | Strict topmost visibility; opaque overlay fault must fail | unit helper + e2e positive/fault | `visibility-*.json` |
| V13 reg | Graph readable 320×568; BF neg-warn nodes in plot; portal | e2e v13 full (12) | Short-viewport min-heights + warn layout |
| V12 reg | Stage overlap + settings | e2e v12 (5) | Retained |
| MergeSort | V13 return/pointers/pre-inc | `tests/v13-02-mergesort.test.ts` | Preserved |

## Viewports (e2e)

1366×768, 1280×800, 768×1024, 390×844, 844×390 (+ V13 320×568 / 1024×500 / 844×390).

## Browser

Chromium only (`/usr/bin/google-chrome`) via Playwright project config.
