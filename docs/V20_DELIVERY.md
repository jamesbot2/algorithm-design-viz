# V20 Delivery — follow intent / banner readability / soft-wrap / unassisted acceptance

**Branch:** `v20-follow-banner-wrap`  
**Baseline HEAD:** `7925a2bfc16003c168334d0d6576a0e8c13c5419` (V19)  
**Tip (docs):** `47d399483d5405623d41dbe4c886af35ab2950b8`  
**Tip (fix):** `b5c2994fe67440007a31683613f1e36d99031b38`  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V19

Matrix content-coord follow (not offsetParent); CM real scrollport; CompactSequenceStrip (not 40px clip); vars/run button geometry; full sheet body; run identity/snapshots/solver/Dijkstra preds/Worker/same-SHA gate. Auto-follow remains on by default; locate/resume remain explicit ops. No theme redesign, no new algorithms, no CM remount to “fix” wrap/follow, no second editor/player.

Evidence baseline (reviewer): live `index-D0HTcY20.js` / `index-CxO52rU7.css`; Pages ZIP SHA-256 `8804bdfc…`; E2E 35413728316 → 130 passed (**those did not cover V20 scenarios**).

---

## Before → after

| Metric | Before (V19 @7925a2b) | After (V20) |
|--------|----------------------|-------------|
| Banner contentH @1366×768 LCS | **6px** (slotH=32, padY=24) | **16.4px** (≥1 glyph line; padY=8) |
| Soft wrap uncheck → `.cm-lineWrapping` | **still present** (cosmetic) | **removed** (Compartment reconfigure) |
| Dijkstra @16 open data → follow paused | **true** (layout scroll) | **false** |
| Dijkstra @22 after data, line 27 vis | n/a (paused) | **~36px**, paused=false |
| evaluate `scrollTop` pauses matrix follow | **true** | **false** (user-gesture only) |
| Real wheel pauses matrix follow | true | true (kept) |
| LCS unassisted 73–95 false pause | racey / rescued by V19 e2e | **0** in ×10 keypaths |

Evidence: `docs/traces/v20/v20-m0-baseline.json`, `v20-after-metrics.json`, `v20-01-follow-paused-timeline.json`, `docs/screenshots/v20/{before,after}/`.

---

## V20-01 — False follow pause from layout/animation scroll (P1)

| | |
|--|--|
| **Root cause** | `MatrixView` / `CodeBrowser` paused whenever `programmaticScrollDepth===0` / `!programmaticScroll` on any `scroll` event. Layout reflow, write-anim `scrollHeight` ±1 clamp, and data-panel resize fire trusted scrolls without a user browse gesture → false `followPaused` / `userScrolledAway`. Path-restore cells then stay off-viewport; Dijkstra line follow drops after opening vars. |
| **Fix** | Shared `createScrollFollowIntent`: pause only on wheel / touch / scrollbar pointer / scroll-key browse; absorb app `follow` / `layout` / `locate` transactions (gen/depth correct across cancel); clear stale gesture on txn begin; clamp scroll targets to real range; CM pin `scrollTop` while paused across ResizeObserver (data toggle). Locate/resume remain explicit. |
| **Files** | `src/utils/scrollFollowIntent.ts`, `src/components/MatrixView.tsx`, `src/components/codeBrowser/CodeBrowser.tsx` |
| **Min repro** | (1) LCS @1920 Run+Next through 73–95 — must not show「已暂停矩阵跟随」. (2) Dijkstra @1366 step 16 → open 变量/结果 (no wheel) → advance to 22 — line 27 still in `.cm-scroller`. (3) Real wheel → pause; evaluate `scrollTop` → must not pause. |
| **Verify** | e2e V20-01a..d; keypath ×10 retries=0; dom unit `tests/dom/v20-01-scroll-intent.test.ts` |
| **Limits** | Browser clamp when paused may still nudge `scrollTop` before pin restore (one frame); scrollbar detection uses scroller-target / gutter hit tests (custom overlay scrollbars may need extra binding). |

## V20-02 — Banner text clipped to ~6px (P1)

| | |
|--|--|
| **Root cause** | Laptop `@media (max-height:800px)` set `.viz-banner-slot` to **2rem (32px)** while `.viz-banner` padding was **12+12** → text contentH≈6. V19 `:has(toggle)` only raised budget when vars button present. |
| **Fix** | Unified `--banner-line-h` / `--banner-pad-y` content budget ≥1 full glyph line always; vertical pad owned by slot (base `.viz-banner` pad=0); line-clamp ellipsis of whole lines; `title={displayMessage}` for accessible full text. Does not raise matrix min-height via vars. |
| **Files** | `src/styles.css`, `src/components/Visualizer.tsx` |
| **Min repro** | LCS @1366×768; measure `.viz-banner-text` ∩ slot contentH (sticky+ancestors). |
| **Verify** | e2e V20-02; static CSS unit; screenshots `docs/screenshots/v20/after/v20-02-banner-*.png` |
| **Limits** | Ultra-short landscape still clamps to 1 line by design; long messages rely on `title` + line-clamp. |

## V20-03 — Soft wrap checkbox cosmetic only (P2)

| | |
|--|--|
| **Root cause** | `extensions` `useMemo([],)` always included `EditorView.lineWrapping`; `lineWrap` state only drove pseudocode `whiteSpace`. |
| **Fix** | `Compartment` + `reconfigure` on checkbox; no CM remount; layout txn so wrap reflow obeys V20-01 follow intent; TS + pseudo independently. |
| **Files** | `src/components/codeBrowser/CodeBrowser.tsx` |
| **Min repro** | Dijkstra → uncheck「软换行」→ `.cm-lineWrapping` gone; probe attr on `.cm-editor` unchanged. |
| **Verify** | e2e V20-03; static source unit |

## V20-04 — Acceptance must not rescue product (P1)

| | |
|--|--|
| **Root cause** | `v19-matrix-cm-compact-acceptance.spec.ts` full95 clicked `matrix-resume-follow-btn` / `matrix-locate-btn` when paused / low visibleH — proved rescue, not unassisted follow. |
| **Fix** | New `tests/e2e/v20-follow-banner-wrap-acceptance.spec.ts`: pure auto (no resume/locate/set scrollTop/pre-scroll/reload), manual leave+restore (real wheel), layout-without-leave (data open), fail-fast on unexpected pause/invisible, mutation sanity, key unassisted ×10 retries=0. |
| **Files** | `tests/e2e/v20-follow-banner-wrap-acceptance.spec.ts`, `tests/dom/v20-01-scroll-intent.test.ts`, `tests/v20-02-03-static.test.ts`, `tests/v20-04-acceptance-quality.test.ts` |
| **Verify** | 17 e2e passed retries=0; 7 unit/dom/static passed |

---

## Test counts (honest)

| Suite | Pass | Fail | Flaky | Skipped | Notes |
|-------|------|------|-------|---------|-------|
| Vitest V20 unit/dom/static | **7** | 0 | — | 0 | |
| V20 e2e (incl. ×10 keypaths) | **17** | 0 | 0 | 0 | retries=0 |
| Full Vitest / full Playwright | **not run** this pass | | | | Prefer focused V20 + product fixes |
| Lint (touched) | — | | | | |
| Prod build | not required for local V20 tip | | | | |

Commands:

```bash
npx tsc -b
npx vitest run tests/dom/v20-01-scroll-intent.test.ts tests/v20-02-03-static.test.ts tests/v20-04-acceptance-quality.test.ts
npx playwright test tests/e2e/v20-follow-banner-wrap-acceptance.spec.ts --retries=0
```

---

## Doc / screenshot / trace paths

- `docs/V20_DELIVERY.md` (this file)
- `docs/V20_COVERAGE_MATRIX.md`
- `docs/screenshots/v20/before/`, `docs/screenshots/v20/after/`
- `docs/traces/v20/` (`v20-m0-baseline.json`, `v20-after-metrics.json`, e2e JSON logs)

## Confirm

**No push. No deploy. No force-push. No remote modification.**
