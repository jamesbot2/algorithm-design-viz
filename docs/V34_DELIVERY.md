# V34 delivery — merge init layout flash (branch v34-merge-init-layout)

Labels: [REAL] real run · [FI] fault injection · [UNVERIFIED]. Source: /workspace/v34/REPORT.md (S0–S16). Local only; not pushed or deployed.

## Classification
- [REAL] **Actually painted**, not a detector artifact: CDP screencast frames 010 (stage taller, data region pushed down) and 011–012 (tall bars, index row clipped) are composited frames (`logs/cast-flash-triptych.png`). Font-independent (CI fonts 10/10, local Noto 5/5, warm cache, second Run, bars→cells→bars all reproduce on V33).
- [REAL] **S2 causal chain**: Run commit → passive `useEffect(setDataContentH(0), [runKey])` in WorkbenchLayout collapses docked data height → stage 330.55→405.55 for one commit (main card 313) → WorkbenchLayout RO re-measures data (169) while ArrayView bar-fit RO reads the transient 296.75 box → both commit together: stage back to 330 but plot 182 (was 107) → slots 166 clipped by viz-canvas → next RO refit → 107.

## Product fixes
1. WorkbenchLayout: reset of `dataContentH` moved into the layout effect, batched with the first measure (one main allocation 238.13, plot 107; RO callbacks 30→19, bar style writes 19→6; screencast 0 diff frames).
2. Bar floors computed from measured chrome only (removes 181↔182 `data-bars-floor` / `--primary-need` flip at 375x812).
3. Version bump to V34 in vite.config.ts (+ build-info test).

## Test changes
- New spec `v34-run-start-paint`: fails on V33 [REAL], passes on V34 [REAL]; revert fix 1 → fails, restore → passes [FI].
- merge7 `:170` test: 40/60 ms sleeps replaced by `waitForStageLayoutStable` (bounded 5 s, loud failure).

## Evidence
- [REAL] 10 cold `:170` runs, `--retries=0`: **V33 base 8/10** (runs 2, 9 fail: "slots clipped 7/7", the CI signature) vs **V34 10/10**.
- [REAL] S9 control: V34 product + original V33 spec (40 ms sleep) 10/10 → the product fix alone removes the flake.
- [REAL] CI evidence: remote run **38371349842** (on V33) — expected 395 / flaky 1; artifact holds first-attempt failure + retry trace.
- [REAL] tsc 0 errors; oxlint 48 warnings (baseline 49); vitest 121 files / 707 tests.
- [REAL] S12 regressions (`--retries=0`): nav-keyboard + sidebar-nav 21/21; V30 motion 41/41; V31 mobile-budget 27/27; LCS follow + multilang 71/71.
- [REAL] S13 V31 re-measure 375x812 (merge desc n=16): band 117.02, main 329.14, maxBar 181, floor 181 (single value), stage 452 no scroll — matches V31 (~117/~329/~181).
- ResizeObserver warnings: fix 2 leaves one one-shot loop notice at run start (initial refit, not an oscillation). Full-suite [REAL] count in `logs/e2e-full2.log`: **64** lines matching `ResizeObserver loop` (vs V33's local **73**; −9). No separate Vite log for this run's `:5173` webServer — Playwright interleaved `[WebServer]` client errors into the same log.

## Full E2E
- [REAL] Detached full suite `playwright test --retries=0` (pid ~1038988), log `logs/e2e-full2.log`, webServer `:5173`.
- Summary: **397 passed / 0 failed / 0 flaky / 0 skipped** (34.5m). No failing test names.
- ResizeObserver loop lines: **64** in `e2e-full2.log` (includes `[WebServer]` vite client errors). Vs V33 local **73** (−9). No other dedicated dev-server log for this run was written under `logs/` (mtime-overlapping `vite-5292-base.log` belongs to the separate V33-base suite, not this process).

## Unverified
- [UNVERIFIED] Safari/WebKit, Firefox, real mobile devices, real HTTP cache behaviour, remote CI run on V34.
