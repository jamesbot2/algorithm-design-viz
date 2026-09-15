# V6 UI/UX Delivery

Branch: `v6-ui-ux`  
Baseline: `e2961e92513b044f9e8f4a8aeb8ed239ff9a1e27`  
M0 notes: `docs/V6_M0_REPRO.md`

## Per-issue status

| ID | Status | Phenomenon | Root cause | Files | Verification |
|----|--------|------------|------------|-------|--------------|
| UI-01 | **fixed** | Phase jump exploded with compare/swap; timeline last segment overflowed via N-1 math | Event segments used as jump buttons; `left/width` divided by `max=N-1` | `src/utils/teachableStages.ts`, `PlaybackTransport.tsx`, `Visualizer.tsx` | **unit** geometry + teachable bound; **DOM** phase-jump ≤8; **e2e** bubble transport |
| UI-02 | **fixed** | Height chain fought (`min(72vh,820px)` + nested 100% + min-height 280) | Stacked V3/V4 patches | `styles.css` workbench height clamp + flex panels | **source** + **e2e** height drift ≤2px |
| UI-03 | **fixed** | Narrow crushed two columns | Always horizontal Group; window-only breakpoints | `WorkbenchLayout.tsx` ResizeObserver → tabs; panels stay mounted | **source** + **e2e** phone sample |
| UI-04 | **fixed** | Illegal edges still ran previous graph; `n` snapped via `\|\|1` | Local edgeText + early return kept parent edges | `GraphInput.tsx`, `AlgoPage.tsx` validity gate | **DOM** clear edges + empty n; **e2e** dijkstra illegal |
| UI-05 | **fixed** | Knapsack preset mixed new W with old steps; experiment export used live `which` | No run snapshot; `experiment-${which}` | `KnapsackUnit.tsx`, `ExperimentPage.tsx`, `exportIdentity.ts` | **DOM** dirty banner; **unit** basename; **e2e** export name |
| UI-06 | **fixed** | Pseudo「回到执行行」only drove CM `viewRef` | No pseudo scroll API; silent copy catch | `CodeBrowser.tsx` | **source**; goto disabled when unmapped |
| UI-07 | **fixed** | Desktop collapse hid catalog (`!collapsed`); menu only set mobileOpen | Single collapsed flag + conditional render | `Layout.tsx`, CSS | **source**; inert on closed mobile drawer |
| UI-08 | **fixed** | `animation.css` overrode phase-track; `transform:none!important` killed shake; light contrast weak | Animation redefined layout/theme; hard-coded light colors | `animation.css`, `styles.css` light tokens | **source** |
| UI-09 | **fixed** | Same step message thrice; frameId labeled 调用栈 | Duplicate banner/inspector; mislabel | `Visualizer.tsx`, `GraphResultPanel.tsx` | **source** |
| UI-10 | **fixed** | Flat 播放/重置 labels | No play-state vocabulary | `PlaybackTransport.tsx` | **DOM**/e2e labels; V5 playback test updated |
| UI-11 | **partial** | Practice JSON-first; verdict always green-ish; seed confusion | Product leftovers | `PracticePage.tsx` | **source**; progress summary + stale verdict |

## CSS cleanup

- Removed `animation.css` `.phase-track` 6px/#2a2a2a override (layout/theme owned by `styles.css`).
- Split shell `transform:none` vs `.input-panel-shake-inner` shake.
- Light theme semantic tokens for `.lt`, `.var-val`, button hover, errors (not a giant end-of-file `!important` dump).
- Checkbox field escapes `input { height:40px }`.

## Shared workbench

- `/teach/knapsack` uses `WorkbenchLayout` + `chromePlacement="workbench"` + primary/context `codeRefs` (no `codeRefs[0]`-only / embedded-only player).
- AlgoPage already shared host; teach page aligned.

## Commands run

| Command | Result |
|---------|--------|
| `npm run lint` | pass (warnings only, pre-existing + minor) |
| `npx tsc -b` | **pass** |
| `npm run test:run` | **pass** 165/165 |
| `npm run build` | **pass** |
| `npm run test:e2e` (v4+v5+v6) | **pass** after V4 expectation updates for V6 layout (phone scroll/tabs) |

## Remaining gaps / unverified

- Full WCAG contrast **computed** in browser for every component state (tokens set; not instrumented with axe).
- UI-11 practice localStorage subscription edge cases beyond stale-verdict — light coverage.
- Graph path highlight overlay still text-only (unused `onHighlightPath` **removed**, not rewired to canvas).
- Screenshots under `docs/screenshots/v6/` from e2e (bubble-default-transport, knapsack-dirty).
- No `git push` / Pages deploy (forbidden this round).

## Human smoke paths (5–8)

1. `#/algo/bubbleSort` → 运行 → confirm ≤8 阶段跳转 → scrub to end → 重新播放 (no re-solve).
2. Bubble array `32,31,…,1` → 运行 → transport height stays usable; jump via「更多」.
3. `#/algo/dijkstra` → 运行 → corrupt 边列表 → 运行 fails; no old graph; 恢复默认 syncs text.
4. `#/teach/knapsack` → 运行 W=8 → switch greedy W=50 → dirty banner + old summary; 运行 refreshes.
5. `#/experiment` → run Dijkstra → switch knapsack → export CSV named `experiment-dijkstra.csv`.
6. Desktop collapse « → shrink to phone → ☰ opens drawer with full catalog; Esc closes; Tab skips closed drawer.
7. Narrow workbench → 演示/代码 tabs share playback; switch tabs without losing step.
8. Lab 浅色 theme → buttons/pseudocode/vars readable; 练习台 submit → edit answer → stale verdict banner.
