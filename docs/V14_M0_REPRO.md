# V14 M0 Repro (failing before fix)

Baseline: `dc40e1679e6fad3f37236146a72d6d6f8a28f771` (V13 main).
Branch target: `v14-inspector-arrays-pan-visibility`.
Time zone: Asia/Shanghai (UTC+8).

## V14-01 — Desktop lab-fill hides inspector with no entry

**Repro:** BFS/Dijkstra @ 1280×800 or 1366×768 with `data-lab-fill=1`.
- CSS `.viz-body-single:has(.graph-view) > .viz-inspector:not(.inspector-sheet-body) { display:none }`
- `.inspector-sheet-toggle` only `display:inline-flex` under `@media (max-height:520px),(max-width:400px)`
- Result: inline hidden AND alternate entry hidden → no 变量/结果 path.

**Accept after fix:** `inlineVisible || alternateEntryReachable` with real vars/result data; no canvas crush; one logical inspector; toggle/resize does not change runId/cursor/speed/code.

## V14-02 — tabs hide arrays; VarsPanel ignores step.arrays

**Repro:** Dijkstra under tabs layout; stage `.arrays-panel { display:none }`; VarsPanel only `step.vars`.
Case: n=3 start=0 edges `0 1 10` / `0 2 1` / `2 1 1` → dist[1] ∞→10→2, parent[1]=2.

**Accept:** cursor-synced compact array tables in same inspector (dist/parent/done); seek/back/forward restore frame.

## V14-03 — Pan sx/sy ≠ meet

**Repro:** GraphView pan uses `camera.w/plot.w` and `camera.h/plot.h` separately while SVG uses `xMidYMid meet`.
@ 600×200 or 200×500 plot, 100px screen drag ≠ 100px node screen move.

**Accept:** CTM inverse or uniform meet scale; reset-view; pointer capture; mobile pan policy; runId/cursor unchanged.

## V14-04 — Visibility helper accepts opaque overlay

**Repro:** `stack.some(el => closest('.graph-svg'))` ⇒ inGraph even when topmost is opaque overlay.

**Accept:** shared strict helper — topmost effective hit must be target node/label/allowed plot object; fault inject (opaque overlay any class, clip, off-viewport, unreadable weights, hidden canvas, transport/inspector cover) MUST fail; positive control still passes.

## Commands (M0 expect red on new asserts)

```bash
npx vitest run tests/v14-01-inspector-layout.test.ts tests/v14-02-arrays-inspector.test.ts tests/v14-03-pan-meet.test.ts tests/v14-04-visibility-helper.test.ts
npx playwright test tests/e2e/v14-inspector-arrays-pan-visibility.spec.ts
```
