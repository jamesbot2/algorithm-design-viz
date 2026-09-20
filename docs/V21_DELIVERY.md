# V21 Delivery — pseudo scroll / reading pin / matrix effective viewport

**Branch:** `v21-pseudo-pin-matrix`  
**Baseline HEAD:** `46a8aaa2f014c4968b7a77a4cff9201841b459ca` (V20 live tip)  
**Tip (fix):** `92b65b888c98d831d54f805c0b97baed359b0e29`  
**Tip (docs):** `5be940d67d7831591357bd9bd2013ba31770c813`
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V20

Unassisted LCS 95 follow; Dijkstra data-open TS follow; soft-wrap real; banner readable; user wheel pauses + goto; sheet body; run identity; Dijkstra preds; same-SHA gate. No theme redesign, no new algorithms, no second editor/player, no CM remount to “fix”.

Evidence baseline (reviewer): live `index-DC8fsX3i.js` / `index-DU3S7xIF.css`; Pages ZIP SHA-256 `7f9bae32…`; E2E 35482772067 → 147 expected (**those did not cover V21 scenarios**).

---

## Before → after

| Metric | Before (V20 @46a8aaa) | After (V21) |
|--------|----------------------|-------------|
| Pseudo line 2 visH @1366×600 | **0** (scrolled away; offsetParent=`.page.algo-page`) | **23** (=elH; offsetParent=`code-pre`) |
| Pseudo line 2 visH @844×390 | **3** | **23** |
| Pseudo line 2 @390×844 | 23 (OK) | 23 (kept) |
| pinTop after data open (user browsed ~140) | stale restore toward first pause / 0 (hypothesis) | **~186** kept near latest browse (paused=true) |
| LCS frame 14 cell ∩ clip-chain | cellH≈35, overhang scroll below view (~+14), minH=`120px` | cellH=35, **intersect=35**, overhang **−13**, minH=`min(48px, 100%)`, clientH=133 |

Evidence: `docs/traces/v21/v21-m0-baseline.json`, `v21-after-metrics.json`, `docs/screenshots/v21/{before,after}/`.

---

## V21-01 — Pseudo `scrollPseudoToLine` uses offsetTop vs wrong parent (P1)

| | |
|--|--|
| **Root cause** | `el.offsetTop` used as `pre.scrollTop` target, but `offsetParent` was `.page.algo-page` (`position: relative`) — not the `<pre>` scrollport. Wrong content Y scrolled init line 2 away @1366×600 / left ~3px @844×390. |
| **Fix** | Content coords via `pre.scrollTop + (elRect.top − preRect.top)` (same pattern as matrix `cellContentBox`); clamp to scroll range; no-op if already fully visible; remasure on tab restore; CSS makes `.code-pre` a real flex scrollport with `position: relative`. |
| **Files** | `src/components/codeBrowser/CodeBrowser.tsx`, `src/styles.css` |
| **Min repro** | Dijkstra → 伪代码 @1366×600 frame 1 — meta says line 2; measure `[data-line="2"]` ∩ `pseudo-pre` visH. |
| **Verify** | e2e V21-01a..c; static + dom unit |
| **Limits** | Very long soft-wrapped lines still depend on flex panel height; FF/WK unverified. |

## V21-02 — Reading pin frozen after first pause; ResizeObserver restores stale (P2)

| | |
|--|--|
| **Root cause** | `onScrollPin` updated `pinTop` only when `!userScrolledAwayRef` — after pause, further user browse ignored; RO restored the first-pause pin (often ~0) on data open / height-only resize. |
| **Fix** | Always update `pinTop` on non-absorbing scrolls (real user browse while paused); layout/follow txn still absorbed so restore does not overwrite; clear pin on cleanup. |
| **Files** | `src/components/codeBrowser/CodeBrowser.tsx` |
| **Min repro** | Dijkstra @1366 step 16 → wheel to ~0 → wheel to ~140 → open 变量/结果 — scrollTop must stay ~140, not jump to 0; 768→780 keeps ~140. |
| **Verify** | e2e V21-02; keypath B ×10 |
| **Limits** | Data-open height shrink can nudge pin by tens of px (reflow); still far from stale-0. |

## V21-03 — `.matrix-scroll` min-height 120 > ancestor → cell bottom clipped (P2)

| | |
|--|--|
| **Root cause** | Lab-fill `.matrix-scroll { min-height: 120px }` made scrollport taller than `.matrix-view` / stage; follow used `clientHeight` only → cell bottom clipped (≈35 vs ≈29). At 1024×600, inline inspector + labels starved stage (~54px) so a pure `min-height:0` also collapsed scrollport to 0. |
| **Fix** | Soft floor `min-height: min(48px, 100%)` + `max-height: 100%` (never taller than parent); labels strip yields (`flex-shrink`); compact follow-bar; ≤640px hide inline inspector (sheet toggle remains); `effectiveScrollport()` uses clip-chain intersect for follow. Glow/outline not treated as content clip. |
| **Files** | `src/styles.css`, `src/components/MatrixView.tsx` |
| **Min repro** | LCS @1366 frame 14 — cell ∩ full clip chain; scrollport bottom ≤ matrix-view bottom. |
| **Verify** | e2e V21-03 / 03b; static guards |
| **Limits** | Ultra-short landscape still prioritizes matrix over inline inspector text (use sheet). |

## V21-04 — Acceptance

Keep V20 unassisted (no resume/locate rescue). Cases A/B/C/D + mutation + ×10 retries=0. No force/viewport swap/threshold gaming.

---

## Test counts (honest)

| Suite | Pass | Fail | Flaky | Skipped | Notes |
|-------|------|------|-------|---------|-------|
| Vitest V21 unit/dom/static | **7** | 0 | — | 0 | |
| V21 e2e (incl. ×10 keypaths) | **9** | 0 | 0 | 0 | retries=0 |
| Full Vitest / full Playwright | **not run** this pass | | | | Prefer focused V21 + product fixes |
| Prod build | not required for local V21 tip | | | | |

Commands:

```bash
npx tsc -b
npx vitest run tests/v21-static-guards.test.ts tests/dom/v21-01-pseudo-scrollport.test.ts
npx playwright test tests/e2e/v21-pseudo-pin-matrix-acceptance.spec.ts --retries=0
```

---

## Doc / screenshot / trace paths

- `docs/V21_DELIVERY.md` (this file)
- `docs/V21_COVERAGE_MATRIX.md`
- `docs/screenshots/v21/before/`, `docs/screenshots/v21/after/`
- `docs/traces/v21/` (`v21-m0-baseline.json`, `v21-after-metrics.json`, e2e JSON/logs)

## Confirm

**No push. No deploy. No force-push. No remote modification.**
