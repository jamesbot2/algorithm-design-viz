# V33 delivery — nav keyboard ownership, modal mobile drawer, live responsive collapse, build label

Baseline: V32 `0b92bc4` (origin/main, live: index-YEY1WRFO.js / index-BaPSwhoO.css; CI, E2E, Pages green @0b92bc4).
Branch `v33-nav-keyboard`. Local only — not pushed, not deployed.

## Root causes (confirmed on V32, Chromium)
| Item | Cause | Evidence |
|---|---|---|
| V33-01 (P1) | `shouldIgnoreKeyboard()` only knew editing/activation controls; `<a href>` and the nav/catalog scope were not owners, so `usePlaybackController`'s window keydown handled ArrowRight/Space on a focused catalog link | first-fail: `after ArrowRight on link` — idx 1→2 (1366 popover and 1920 expanded sidebar) |
| V33-02 (P1) | drawer `<aside>` had no `role=dialog`/`aria-modal`, `.main-wrap` not inert, no Tab containment | first-fail: role ''; probe: Tab press #43 reaches outside (BODY / main) with drawer open, both 390×844 and 844×390 |
| V33-03 (P2) | collapse decided once in the `useState` initializer | first-fail: 1366→1920 stays 60px, 1920→1366 stays 260px |
| V33-04 (P3) | `vite.config.ts` `__APP_VERSION__ = 'V31'` | first-fail: build-info `V31 · d9bf19b` |

## Changed files
- `src/utils/keyboardGuard.ts` — central ownership order: (0) defaultPrevented / IME `isComposing` (+keyCode 229) / Alt-Ctrl-Meta chords → (1) any open `aria-modal` → (2) `data-kbd-scope` / `a[href]` / role dialog|menu|listbox|tablist|… found on `composedPath()` (child nodes of links included) → (3) native editing then activation controls → (4) editor/separators/sliders → (5) stage shortcuts. Nothing is disabled globally; links keep native Enter navigation.
- `src/components/Layout.tsx`
  - `data-kbd-scope="nav"` on the sidebar root (covers rail, expanded catalog, mobile drawer) and `data-kbd-scope="catalog"` on the popover.
  - Mobile drawer, only when `isMobile && open`: `role="dialog"`, `aria-modal="true"`, `aria-label="导航菜单"`, `.main-wrap` `inert`; focus goes to the × button on open; document keydown cycles Tab/Shift+Tab over the drawer's visible focusables (recomputed per key press, so search filtering is handled); `focusout` recovery puts focus on the search box if the focused item disappears. Esc, ×, backdrop, link and resize >960 all just set `open=false`; one effect restores focus to the ☰ trigger (fallback `<main>`) when focus was inside the drawer or lost. Body scroll lock unchanged (save/restore). Desktop popover is still non-modal (no inert, no trap). No `tabindex=-1` on links.
  - Collapse: `autoCollapsed` follows `(min-width:961px) and (max-width:1439px)` via a matchMedia listener; `userCollapsed` (null until the user toggles with the rail button or ☰ on desktop) wins afterwards. **Not persisted** — no localStorage key; a reload returns to the responsive default. Mobile drawer state is separate.
- `vite.config.ts` — `__APP_VERSION__` `'V33'` (single source; SHA logic unchanged).
- Tests: `tests/e2e/v33-nav-keyboard.spec.ts` (10 tests), `tests/dom/v33-keyboard-guard.test.ts` (4 unit tests), `tests/e2e/v23-workbench-layout.spec.ts` build-info expects V33.
- No CSS changes (nav.css untouched); V32 rail / popover / 1920 catalog / mobile drawer visuals unchanged.

## Tests
- First-fail on V32 product (retries 0): 9 failed / 2 passed (the 2 are precondition controls: desktop popover not a trap, manual choice). Traces + PNGs kept in `/workspace/v33/first-fail`.
- After fix: V33 10/10, build-info, V32 11/11 → 22/22.
- Negative controls (revert one fix → its test fails; restore → pass): guard scope lines → V33-01 2 FAIL; Tab trap → V33-02 cycle 2 FAIL (focus reached BODY at Tab #43/49); dialog/aria-modal/inert → 4 FAIL; breakpoint listener → V33-03 auto 2 FAIL; version → build-info FAIL; restored → 11/11.
- Inputs: real `page.keyboard` / `page.mouse` / locator clicks, viewports 1366×768, 1920×1080, 390×844, 844×390, 1366↔1920 and 960/961 resizes (the resize itself is under test). Read-only `evaluate` probes only.
- V31 budget (375×812 merge n=16 idx30): band 117.0, main 329.1, tallest bar 181, stage 452 — unchanged.
- Full suite: see "Results" below.

## Results (local, Chromium, 1 worker, retries 0)
- Full E2E (`playwright test --retries=0`, started 12:55 CST on the 52ef946 tree; HEAD d991bfb only adds docs/screenshots/v33 + tools/shots.mjs, no product/test change): **396 passed / 0 failed / 0 flaky / 0 skipped** (29.8 min). Log: `/workspace/v33/logs/e2e-full.log`. Dev-server console shows non-fatal `ResizeObserver loop completed with undelivered notifications` (73 lines); no test asserts on it.
- Within it: V30 motion 30/30, V31 mobile budget 27/27, V32 sidebar nav 11/11, V33 10/10.
- `tsc -b`: 0 errors. `oxlint`: 0 errors, 49 warnings (= 49 baseline, no new). `vitest run`: 121 files / 707 tests passed. `vite build`: OK — CSS `index-BaPSwhoO.css` (unchanged from live V32), main JS `index-*.js` (hash changes with the embedded build SHA; see final report), `heavySolve.worker-yu8hA-m_.js`.

## Screenshots
`docs/screenshots/v33/{before,after}-*`: 1366 dark/light catalog link focus ring (+ after keys), 1920 load and 1920→1366 resize, 390×844 and 844×390 drawer after 60 Tabs, plus `*-probe.json` (runId/idx/solveCount, mid-run LCS/merge sort/Dijkstra across catalog open/close, language switch, sidebar toggle, resize — identical before and after).

## Remaining risks
- Any `aria-modal="true"` in the document now suspends stage shortcuts (theory drawer, playback settings panel). This matches "modal first" but is a behaviour change for those panels.
- Space on a focused catalog link keeps its native action (scrolls the catalog scroller); only player state is protected.
- Chromium (Playwright, headless) only. **Not tested:** WebKit/Safari, Firefox, real iOS/Android devices, and any screen reader (VoiceOver/NVDA/TalkBack) — dialog announcement and inert behaviour are verified only via DOM attributes and focus.
- Not pushed, not deployed; CI/Pages have not run on this branch. Manual collapse choice is session-only by design.
