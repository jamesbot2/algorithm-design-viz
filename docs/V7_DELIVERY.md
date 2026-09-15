# V7 Continuous-operation & State Regression Delivery

Branch: `v7-state-regressions`  
Baseline HEAD: `c14761f253cd5c791f507702d459c1b4395733d3` (main, V6)  
Not pushed. Not merged. Pages not deployed.

## Per-issue status

| ID | Status | Repro (baseline) | Root cause | Files | Test evidence |
|----|--------|------------------|------------|-------|---------------|
| R1 | **fixed** | Start nQueens, navigate to Dijkstra, old result lands on new page; edit n while waiting clears dirty | `activeRunToken` only gated success; id effect cleared UI but did not cancel/invalidate; `setDraftDirty(false)` unconditional | `src/core/runner/runIdentity.ts`, `solveBarrier.ts`, `src/pages/AlgoPage.tsx` | **unit** identity helpers; **DOM** controllable barrier (nav / A-then-B / dirty n=9 / unmount) |
| R2 | **fixed** | Type `abc`/`Infinity`/`NaN`/`1e309` in n/start → still ran with old 3/0 | `Number.isFinite ? parsed : value.n` fallback + `Math.trunc` | `src/core/graph/validate.ts` (`parseGraphIntField`), `GraphInput.tsx`, AlgoPage runnable gate | **unit** parse matrix; **DOM** field errors + **solver spy** not called; **e2e** illegal n |
| R3 | **fixed** | At end「重新播放」only toggled playing; timer saw idx≥max and stopped | No seek-0 on completed→play; preview labeled「生成并演示」while disabled | `Visualizer.tsx`, `PlaybackTransport.tsx` | **DOM** replay/pause/1-frame/preview label; **e2e** bubble replay |
| R4 | **fixed** | Cross 720px remounted Visualizer/CodeBrowser (split Group tree vs tabs div tree) | Dual React trees | `WorkbenchLayout.tsx`, `styles.css` | **DOM** mount-id + state across RO width flips + tab switch; **e2e** viewport resize |
| R5 | **fixed** | Pseudo `scrollIntoView` moved window/outer; fixed 120ms flag | Unconstrained scrollIntoView + timer guess | `CodeBrowser.tsx` | **DOM** window.scrollY + outer.scrollTop unchanged on goto-exec |
| R6 | **fixed** | Leave mobile with drawer flag true → body `overflow:hidden` stuck; brand/close still tabbable | Lock keyed only on `mobileDrawerOpen`; `inert` only on nav | `Layout.tsx` | **DOM** matchMedia flip / inert / ESC focus / route; **e2e** phone→desktop |

## Commands run

| Command | Result |
|---------|--------|
| `npm run lint` | pass (warnings only; pre-existing + minor) |
| `npx tsc -b` | **pass** |
| `npm run test:run` | **pass** **204**/204 (V6 baseline was 165 unit/DOM; this round added V7 suites — not a CI target count) |
| `npm run build` | **pass** |
| `npm run test:e2e -- tests/e2e/v7-state.spec.ts tests/e2e/v6-uiux.spec.ts` | **pass** 8/8 |
| `npm run test:e2e -- tests/e2e/v5-m3-m4.spec.ts tests/e2e/v5-r1-r4.spec.ts` | **pass** 7/7 |

Playwright Chrome: `/usr/bin/google-chrome`.

Left untouched (not reverted/committed): `docs/traces/v4/playwright-report.json`, `docs/traces/v5/r4-swap-settle.json`.

## Local commits

| SHA | Subject |
|-----|---------|
| `9cb8fd2` | fix(V7-R1): AlgoPage async run identity + cancel on navigate |
| `5622895` | fix(V7-R2): graph n/start illegal text no longer falls back |
| `320de55` | fix(V7-R3): replay seeks to 0 and plays existing trace |
| `cc3962c` | fix(V7-R4): stable workbench tree across split/tabs breakpoint |
| `a945549` | fix(V7-R5): code follow scrolls only the local code scroller |
| `21084d3` | fix(V7-R6): mobile drawer scroll-lock and focus lifecycle |
| _(follow-up)_ | test(V7): e2e + lint cleanups + delivery |

## Remaining limits / unverified

- R1: full Worker termination under real Chrome for every heavy algo combo (tests use `solveBarrier` + cancel flag; worker path still terminates on cancel via existing `runHeavyPreferWorker`).
- R3: explicit solver-call counter in full-app e2e (DOM proves seek-0 play; solve-once remains parent-owned — no re-click of 运行).
- R4: browser-zoom + orientation as separate e2e matrix (covered via viewport + sidebar collapse + container RO in DOM).
- R5: rapid step/doc/zoom race under real CM layout heights in e2e (DOM asserts outer/window freeze).
- R6: full focus-trap cycle through every control (ESC + inert + lock release covered).
- Isolation probes ≠ whole-app e2e for every R item; V7 e2e covers R2/R3/R4/R6 smokes.

## Human smoke paths (5–8)

1. `#/algo/nQueens` → 运行 → quickly click Dijkstra in sidebar → Dijkstra must not show queens board/vars.
2. `#/algo/nQueens` n=8 → 运行 → change n to 9 while running → after finish: input still 9, dirty banner, snapshot from 8.
3. `#/algo/dijkstra` → set n=`abc` / `Infinity` → 运行 blocked; no「图校验通过」; restore default → runnable again.
4. `#/algo/bubbleSort` → 运行 → scrub to end →「重新播放」→ step 1 then advances; pause mid-way →「继续」keeps index.
5. Wide workbench → pause mid-run, change code font/speed → shrink &lt;720 → tabs → expand again: cursor/play/font persist; demo↔代码 tabs keep state.
6. Long pseudo + code panel partially off-screen →「回到执行行」: page/outer scroll unchanged; only code scroller moves.
7. Phone width → ☰ open menu → rotate/widen to desktop: page scrolls; Tab does not hit offscreen brand/close when closed.
8. ESC with open mobile drawer returns focus to ☰; route change closes drawer without leftover body lock.
