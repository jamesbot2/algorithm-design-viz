# V4 Stability — persistent workbench & layout polish

**HEAD at start:** `dcba310`  
**Scope:** Always-mounted workbench, pure `createPreview`, single-column viz + CodeMirror height chain, binary-search leftmost truth, real Chromium e2e.  
**No push** (local commits only).

## Root causes (pre-V4)

1. **Workbench gated on `hasRun`** — `AlgoPage` / `KnapsackUnit` rendered `viz-empty` until Run, so the shell remounted on first run (height/layout jump, no pre-run code panel).
2. **Nested dual column** — `.viz-body { grid-template-columns: 1fr 300px }` put a code column inside the viz panel while Workbench already had a right code panel (triple nesting, cramped editor).
3. **Height chain** — missing `min-height: 0` / flex shrink on workbench panels and CodeMirror wrappers → editor collapsed or relied on page overflow hacks.
4. **Banner remount** — `key={banner-${step.id}}` + `.viz-banner-enter` re-animated every step (jitter).
5. **CodeMirror** — hardcoded `theme="dark"`; `scrollIntoView` could scroll the **window**; highlight and scroll coupled; gutter width appeared on first arrow (code shift).
6. **Binary search catalog** — TS reference returned on first equal (`return mid`), conflicting with leftmost policy implemented in `generateSteps` / meta.
7. **Theme** — uncontrolled `<select defaultValue>` on Layout vs Workbench; not applied before first paint.

## Fixes (files)

| Area | Files |
|------|--------|
| Always mount + preview | `src/pages/AlgoPage.tsx`, `src/pages/teaching/KnapsackUnit.tsx`, `src/preview/createPreview.ts` |
| Layout / height | `src/components/workbench/WorkbenchLayout.tsx`, `src/components/Visualizer.tsx`, `src/styles.css`, `src/styles/animation.css` |
| Code browser | `src/components/codeBrowser/CodeBrowser.tsx` |
| Theme | `src/theme/LabThemeContext.tsx`, `src/main.tsx`, `src/App.tsx`, `src/components/Layout.tsx` |
| Binary leftmost | `src/algorithms/binarySearch.ts`, `src/codeCatalog/binarySearch/index.ts` |
| Tests | `tests/v4-binarySearch-leftmost.test.ts`, `tests/v4-preview.test.ts`, `tests/e2e/v4-stability.spec.ts` |
| Tooling | `playwright.config.ts`, `package.json` (`test:e2e`), `.github/workflows/e2e.yml` |

## Commands

```bash
npm run test:run          # vitest (excludes tests/e2e)
npm run build             # tsc -b && vite build
npm run test:e2e          # Playwright → /usr/bin/google-chrome
# Chrome path override:
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
```

## Measurements (real browser, 2026-09-15)

Thresholds: outer frame drift ≤1px; scrollY **drift** ≤1px during play; control-row edges ≤1px; no horizontal overflow.

### Run transition (binarySearch, 1357×743)

| Metric | Value |
|--------|-------|
| workbench height Δ | **0 px** |
| workbench y Δ | **0 px** |

Source: `docs/traces/v4/binarySearch-run-transition.json`

### Play sampling (rAF)

| Viewport | Samples | outerDrift | scrollYDrift | controlDrift | overflowX |
|----------|---------|------------|--------------|--------------|-----------|
| 1357×743 | 481 | 0 | 0 | 0 | 0 |
| 1280×800 | 481 | 0 | 0 | 0 | 0 |
| 1440×900 | 481 | 0 | 0 | 0 | 0 |
| 768×1024 | 481 | 0 | 0 | 0 | 0 |
| 390×844 | 241 | 0 | 0 | 0 | 0 |

Sources: `docs/traces/v4/binarySearch-play-*.json`

### Screenshots

- `docs/screenshots/v4/binarySearch-init.png`
- `docs/screenshots/v4/binarySearch-after-run.png`
- `docs/screenshots/v4/binarySearch-play-{viewport}.png`
- `docs/screenshots/v4/path__algo_{lcs,nQueens,dijkstra}.png`
- `docs/screenshots/v4/path__teach_knapsack.png`

## Binary search leftmost

- Algorithm + catalog + anchors aligned: on equal, record `candidate` and `hi = mid - 1`.
- Case `[1,1,1,2]` target `1` → **0**.
- Anchors: `init` / `mid` / `equal` / `less` / `greater` / `found` / `miss` (greater must not highlight less).
- DocumentIds: `binarySearch.ts` vs `binarySearch.pseudo`.

## CI policy

- **Pages gate** remains `.github/workflows/ci.yml` jobs: lint + `test:run` + build only.
- **E2E** runs in separate workflow `.github/workflows/e2e.yml` (Chromium via system/Playwright Chrome). It does **not** block Pages deploy. Rationale: e2e needs a browser binary (~minutes) and would flake Pages if coupled; local + dedicated e2e workflow is the honest gate.
- Prefer running `npm run test:e2e` locally before release; CI e2e is best-effort signal.

## Gaps / known limits

- Preview steps use `id: -1` / `phase: 'preview'`; not full semantic fidelity for every algo (size-capped).
- Transport bar remains inside Visualizer (left panel), not a separate workbench transport slot spanning both columns.
- Mobile 390×844 still vertically scrolls the **page** to reach the workbench; play sampling pins scroll once then asserts **drift** ≤1px (absolute scrollY may be >0).
- `playbackKey` removed; Visualizer remount keyed on `runId` / preview only.
- No new animation libraries; CodeMirror + react-resizable-panels reused.
