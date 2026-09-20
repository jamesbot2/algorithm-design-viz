# V22 Delivery — joint readable matrix + input + controls

**Branch:** `v22-joint-matrix-input-controls`  
**Baseline HEAD:** `efa23a512281cf0c5f86bd33ccff77d5626fbb77` (V21)  
**Tip (fix+test):** `e2a958d1e14b104e2b0337b9e731d7800df13d05`  
**Tip (docs):** `2c65e9bc3293d84429570f187dbefffc6f4d513a`  
**Tip (branch HEAD):** `4c1aefd8e94c8f6fe8b84ca7e6626552923a8a4c`  
**Not pushed. Not deployed. No force-push.** Local branch commits only.

Chrome: `/usr/bin/google-chrome`. Asia/Shanghai (UTC+8).

## Preserve V21

Pseudo line2 @ short heights; reading pin after data/height; unassisted LCS 95 cell integrity; content-coord matrix; CM scrollport; scroll intent; soft-wrap; compact semantics (not giant cards); keyboard; sheet body; single player; same-SHA gate; soft matrix floor `min(48px,100%)` + `max-height:100%` (**no hard 120px restore**).

Evidence baseline (reviewer): live `index-gmbuTtuH.js` / `index-B5gmd-0x.css`; Pages 35495869252; ZIP `ca9bcbdc…`; E2E 35495446699 → 156 expected (**those did not cover V22 joint readability**).

---

## Before → after (same LCS frame 14, unassisted)

| Metric | Before (V21 @efa23a5) | After (V22) |
|--------|----------------------|-------------|
| Strip glyph visH @1366×768 | **~10.5** of ~20.4 (stripH≈12.8; ≥8 false-positive would pass) | **20.4** (=elH); stripH≈25.2 |
| Strip glyph visH @1024×600 | **~14** of 20.4 | **20.4** |
| Strip glyph visH @844×390 | **~6.6** of 20.4 | **20.4** |
| Locate btn visH @1366 | **~10** of ~21 (mid-slice) | **~19** (=elH) |
| Locate btn visH @1024 | **~6.3** of ~21 | **~19** (=elH) |
| Cell ∩ clip-chain @1366 | 35 / 35 (kept) | **35 / 35** (kept) |
| Cell ∩ @1024×600 | 35 / 35 | **35 / 35** (scrollH≈51, soft floor) |

Evidence: `docs/traces/v22/v22-m0-baseline.json`, `v22-after-metrics.json`, `docs/screenshots/v22/{before,after}/`.

---

## V22-01 — Compact input strip vertically crushed (P1)

| | |
|--|--|
| **Root cause** | Lab-fill `.array-labels-strip { flex: 0 1 auto; min-height: 0; max-height: min(4.5rem,35%); overflow: auto }` allowed flex-shrink below one glyph line. ≤640px further capped `max-height: 1.6rem`. |
| **Fix** | Intrinsic strip: `flex: 0 0 auto` + `min-height` ≥ one `.compact-ch` line; long inputs still scroll inside strip (`max-height: min(4.5rem,40%)`). Short-height media raises strip cap (no 1.6rem crush). Matrix sibling still owns remainder. |
| **Files** | `src/styles.css` |
| **Min repro** | Default LCS → frame 14 settle, no pre-scroll strip @1366 — measure `.compact-ch` ∩ clip ancestors vs glyph height. |
| **Verify** | e2e V22-01; static V22-01; M0/after JSON |
| **Limits** | Very long wrapped companion labels scroll inside strip (aux), not expanded into giant ArrayView cards. Ultra-short landscape prioritizes joint floor over multi-line context. |

## V22-02 — Locate/resume mid-slice (P2)

| | |
|--|--|
| **Root cause** | `.matrix-follow-bar { flex: 0 1 auto; min-height: 0 }` + lab-fill `max-height: 1.7rem; overflow: hidden` (≤640px: 1.35rem) centered ~21px buttons → top+bottom clipped (~10px@1366, ~6px@1024). Click often still worked (hit-face ≠ full geometry). |
| **Fix** | Toolbar `flex: 0 0 auto` with intrinsic `min-height`; remove max-height/overflow clip; compact button padding retained; hint still hides on short height. |
| **Files** | `src/styles.css` |
| **Min repro** | Same LCS frame 14 — locate/resume visH vs elH + `elementFromPoint` hit. |
| **Verify** | e2e V22-02; static V22-02 |
| **Limits** | On very narrow widths buttons wrap (overflow visible); no second player/toolbar. |

## V22-03 — Joint three-region acceptance

| | |
|--|--|
| **Root cause** | V19 `measureCompact` treated `vis≥8px` as readable → 15–20px glyphs with ~9–10px visible passed. No same-frame joint contract for strip + cell + follow controls + code. |
| **Fix** | Tighten `measureCompact` to ~90% glyph height + ancestor clip walk; new `measureJoint` / `assertJointReadable` same `runId`/cursor; mutations strip 10px / bar 6px / matrix taller than stage / code w=0 → fail; restore → pass; keep V21 unassisted (no resume/locate rescue). |
| **Files** | `tests/e2e/v19-matrix-cm-compact-acceptance.spec.ts`, `tests/e2e/v22-joint-matrix-input-controls.spec.ts`, `tests/v22-static-guards.test.ts` |
| **Min repro** | LCS frames 1/14/31/74/75/94/95 + editDist + knapsack01 @ listed viewports; measure before focus/scrollIntoView. |
| **Verify** | e2e V22-03a..d; V21 full e2e regression; V19-03 |
| **Limits** | Tabs layout may hide code column on phone — desktop joint asserts code width ≥1024 only. |

---

## Layout principle applied

One compact-but-readable input strip (intrinsic); one non-clipped follow action row; matrix gets remaining flex space with V21 soft floor (no hard 120px). Prefer content-sized chrome over shrink-to-zero.

---

## Test counts (honest)

| Suite | Pass | Fail | Flaky | Skipped | Notes |
|-------|------|------|-------|---------|-------|
| Vitest V22+V21+V19 static | **18** | 0 | — | 0 | |
| V22 e2e | **6** | 0 | 0 | 0 | retries=0 |
| V21 e2e regression | **9** | 0 | 0 | 0 | incl. ×10 keypaths |
| V19-03 compact e2e | **1** | 0 | 0 | 0 | tightened measureCompact |
| `tsc -b` | clean | | | | |
| oxlint (touched) | 0 errors | | | | 1 pre-existing unused-var warn in V19 |
| `npm run build` | ok | | | | assets `index-BbKAPFM_.js` / `index-D3kLtX_2.css` (local only) |
| Full Playwright 156 | **not run** this pass | | | | Prefer focused V22 + V21 product fixes |

Commands:

```bash
npx vitest run tests/v22-static-guards.test.ts tests/v21-static-guards.test.ts tests/v19-03-compact-labels.test.ts tests/v19-01-matrix-follow.test.ts
npx playwright test tests/e2e/v22-joint-matrix-input-controls.spec.ts
npx playwright test tests/e2e/v21-pseudo-pin-matrix-acceptance.spec.ts
npx playwright test tests/e2e/v19-matrix-cm-compact-acceptance.spec.ts -g 'V19-03'
npx tsc -b && npm run build
```

---

## Doc / screenshot paths

- `docs/V22_DELIVERY.md`, `docs/V22_COVERAGE_MATRIX.md`
- `docs/screenshots/v22/before/v22-m0-lcs14-*.png`
- `docs/screenshots/v22/after/v22-01-*.png`, `v22-after-lcs14-*.png`, `v22-02-*`, `v22-03-*`
- `docs/traces/v22/v22-m0-baseline.json`, `v22-after-metrics.json`, `v22-01-strip.json`, `v22-02-follow-bar.json`, `v22-03-*.json`, `v22-e2e.log`, `v22-unit.log`, `v22-v21-regression-e2e.log`, `v22-build.log`

**Confirm: no push, no deploy, no force-push, remotes untouched.**
