# V12 M0 — Reproduce + failing tests

**Branch:** `v12-stage-overlap`  
**Baseline HEAD:** `0d5b12f` (V11 on main — **already deployed / live**)  
**Env (box):** Node + npm · Chrome `/usr/bin/google-chrome` · Asia/Shanghai (UTC+8)  
**Constraints:** no push, no deploy; leave unrelated dirty files alone.

## User screenshot

用户原图线索已按提示词采纳（n=6/start=0/undirected）；命名文件 USER_REPORTED_GRAPH_OVERLAP.png 本会话未落盘；按同类机制在完整应用复现，不声称“用户没提供截图”。

Searched once:
- `/home/box/agent-data/agents/ac8fe0b3-ebab-4703-a69b-f9302d8ef657/attachments/`
- `/workspace` (no `USER_REPORTED_GRAPH_OVERLAP.png`, no 564×393 crop)

Reproduction: BFS / Prim / Dijkstra GraphView preview with **n=6, start=0, undirected**; capture before/after rectangles proving SVG vs `.viz-inspector` overlap, then fix.

## Confirmed failing scenarios (pre-fix)

### V12-01 Graph paints into inspector (P1)
- `.stage-viewport` flex-shrinks; `.graph-svg { height: auto }` overflows into sibling `.viz-inspector` while ancestors use `overflow: visible` in scroll-fallback — hybrid.
- Default 6-node undirected graph: node/weight hit-testing lands on inspector.

### V12-02 Code anchors ≠ ops (P1)
- insertionSort: take-key phase `insert` → PHASE_ANCHOR `insert` → write-back line (`arr[j+1]=key`), not `const key = …`.
- mergeSort: left-take / copy-left-remain use `mergePush` whose catalog range is the **else** (right) branch only.

### V12-03 Move clock (P1)
- `coordinatedStepIntervalMs` budgets swap FLIP only (`hasSwapMotion`); insertion move steps advance before FLIP settles.

### V12-04 Settings clipped (P1)
- `.playback-settings-panel` is in-flow / absolute under transport; short landscape (844×390 / 900×390) clips speed+phase; dock「更多」must expose real overflow stages.

### V12-05 Range mask + scale (P2)
- Masks measured vs array-view wrap, not overlay host; no resize remeasure; cells lack top/height segments; bar half/full span flips mid-run so value `1` doubles after `[1,-1]` → `[1,1]`.

### V12-06 False-green bars (P2)
- `assertBarsPainted` uses full bar `h` for `maxVisibleH`, ignoring clip ancestors + inspector occlusion.

## Tests planned
- `tests/v12-01-stage-overlap.test.ts` (layout contract)
- `tests/v12-02-code-anchors.test.ts`
- `tests/v12-03-move-clock.test.ts`
- `tests/v12-05-range-scale.test.ts`
- `tests/e2e/v12-stage-overlap.spec.ts` (clip + elementFromPoint; settings @844×390)

---

## Post-fix evidence (local)

- Before (injected hybrid): `docs/screenshots/v12/bfs-overlap-before.png` + `docs/traces/v12/bfs-overlap-before.json`
- After: `docs/screenshots/v12/bfs-overlap-after.png` + after JSON; Prim/Dijkstra after shots
- Settings: `settings-844x390.png`, `settings-900x390.png`
- E2E log: `docs/traces/v12/e2e-v12.log` — 5/5 passed
