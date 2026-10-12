# V32 Delivery — Sidebar navigation (rail + popover catalog)

Branch `v32-sidebar-nav`, based on `a89d9e4` (V31, = origin/main). Local only: nothing pushed, deployed or version-bumped. Evidence logs live in `/workspace/v32/logs` (outside the repo).

## Root cause (M0, Chromium, V31 @a89d9e4, `tools/probe.mjs`)
- The "dark box" look was **not** about colour contrast: the rail-vs-workbench pixel contrast was 1.045 dark (ΔRGB 10.5) and 1.027 light (ΔRGB 5.1). It came from a full-height bordered column with its own gradient tint, 20 visible identical `.nav-dot` bullets (8 `.nav-mod-label` + 8 chapter + 4 nav) and a stacked pill toggle with an accent glow. The selected item was not the cause.
- When collapsed (961–1439 px), all 50 `.nav-algo` links were hidden and none could be reached with the keyboard. The Tab order leaked the mobile "关闭菜单" × button onto desktop, because `button.icon-btn{display}` overrode `.mobile-drawer-close{display:none}`.
- The 8 module labels were `pointer-events:none` dots that looked like links but did nothing.
- Mobile drawer: scroll lock and focus return worked. At 844×390 the list was very long (2877/214 nav-scroll, 100 links, with by-idea and chapter duplicates).

## Design choice
A slim **icon rail** (首页 / 目录 / 练习 / 实验 / 讲义) plus a **popover catalog** with tabs 设计思想 / 问题类型 / 章节.
Why: all 50 algorithms are reachable at every width, including the collapsed one, through a single keyboard-reachable entry. The rail takes up no extra width and has no tinted full-height column, the decorative dots are gone, there are no non-interactive leaves, and duplicate lists are grouped under tabs instead of stacked. On mobile the drawer stays, with a backdrop tap that closes it and releases the scroll lock.

## Changed files (a89d9e4..HEAD)
- `src/components/Layout.tsx` (rewritten nav), `src/components/nav/NavCatalog.tsx` (new), `src/components/nav/NavIcons.tsx` (new), `src/main.tsx` (imports nav.css)
- `src/styles/nav.css` (new, 243 lines), `src/styles.css` (−178), `src/styles/promax.css`, `src/styles/tokens.css`
- Tests: `tests/e2e/v32-sidebar-nav.spec.ts` (11 tests), `tests/e2e/helpers/v32Nav.ts`, `tests/dom/v32-nav-rail.test.tsx`, `tests/dom/v7-r1-async-run-identity.test.tsx` (now opens the catalog from the rail)
- `docs/screenshots/v32/*` (14 PNGs)

## Removed CSS
`--sidebar` token; `.sidebar` (+ `.collapsed`, `.open`, `.sidebar-top`, `.sidebar-toggle`, `.sidebar-backdrop.visible`), `.brand*`, `.nav-dot`, `.nav-mod-label`, `.nav-group`, `.nav-item*`, `.nav-algo*`, `.nav-algos*`, `.nav-search*`, `.nav-scroll`, `.nav-completion`, `.nav-mode-toggle.compact`, `.side-foot`, `.desktop-collapse-btn`, `.mobile-drawer-close`, and the old 960/961 px sidebar media blocks. These are replaced by `src/styles/nav.css`.

## Screenshots — `docs/screenshots/v32/`
`before-*` = V31 on :5180, `after-*` = V32 dev on :5181, both taken with probe.mjs under the same conditions: `algo-1366x768-lab-{dark,light}` (collapsed), `algo-1920x1080-lab-{dark,light}` (expanded), `algo-390x844-lab-{dark,light}`, `drawer-390x844-open`. Rail ΔRGB: dark 10.5 → 1.7, light 5.1 → 0.

## Interaction results
`v32-sidebar-nav.spec.ts` 11/11 pass on dev (logs/v32spec-r6.log). It covers the catalog opening from the rail and keyboard reachability with no hidden focusable elements. It also checks that switching algorithms preserves workbench state (variables in viz-inspector, `.cm-exec-line`, animation state; the reading position may differ by ±1 source line because of re-wrap, which is documented), and that a mobile drawer backdrop tap closes the drawer and releases the lock. Failing-first: the same spec on V31 gave 11 failed (logs/v32spec-on-v31.log). One r5 failure (anims 2→0) came from sampling during the finite 800 ms step transition, not from the product. The spec now waits for the transitions to settle.

## Negative controls (`V32_FAULT`)
- `dots`: test 1 ×2 FAIL (non-interactive leaves).
- `hide-entry`: test 1 ×2 FAIL (entry not visible) and test 3 FAIL (hidden focusable).
- `dark-rail`: tests 1, 2, 3 FAIL (ΔRGB 25.1 dark / 427.8 light > 6).
- Unmodified product: 11/11 pass.

## V31 budget re-measure
375×812, merge n=16, idx30: band 117.0, main 329.1, maxBar 181, stage 452. Identical to V31 (logs/budget.log).

## V30 regressions
V30 motion + V31 budget specs: 57/57 pass (logs/motion.log).

## Test counts
- tsc: 0 errors.
- oxlint: 0 errors, 49 warnings (= V31 baseline).
- vitest: 120 files / 703 tests pass.
- Full Playwright E2E (Chromium, retries=0):
  - @90ee579: 386/386 pass (28.7 min).
  - @7608e6a: 386/386 pass, 0 failed, 0 flaky (30.6 min; local clone with .git, logs/e2e-full2.log)
- Production build @7608e6a: `index-BBMuBz_m.js` 1,162.07 kB (gzip 380.81) and `index-BaPSwhoO.css` 97.80 kB (gzip 19.99). V31 was 1,159.07 kB JS and 96.60 kB CSS. The >500 kB chunk warning is the same as before.

## Dependency cost
None: no changes to `package.json` or the lockfile. The icons are inline SVG (`NavIcons.tsx`). The size cost is +3.0 kB JS and +1.2 kB CSS (minified).

## Accessibility
- Every algorithm can be reached by keyboard from the rail's 目录 entry, including in the collapsed layout.
- The desktop Tab order no longer includes the mobile close button.
- Non-interactive dots and labels are removed.
- The mobile drawer keeps its scroll lock and returns focus to the menu button. A backdrop tap closes it and releases the lock.
- No screen-reader (NVDA/VoiceOver) pass was done.

## Known gaps
- Only Chromium was run. WebKit, Firefox and real devices (iOS/Android) were **not** run.
- No manual screen-reader audit.
- The main JS chunk is still over 500 kB (pre-existing).
