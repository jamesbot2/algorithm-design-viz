# V10 Delivery — Regression fixes & real workflow acceptance

Branch: `v10-regression`  
Baseline HEAD: `570d497` (V9 on main)  
**Not pushed. Not deployed.**

Chrome: `/usr/bin/google-chrome`. Soft keyboard / extreme zoom: **simulated via visualViewport/resize only** — not verified on a physical device.

---

## V10-01 — Full E2E baseline

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| binarySearch @768×1024 outer drift ~22.7px | Canvas **height** shrank when legend mounted mid-play (~1.5rem) and inspector/stats bands flexed | Always mount legend band; fixed heights for banner / stats / legend / inspector; skip 0×0 tab panels in drift | `Visualizer.tsx`, `styles.css`, `v4-stability.spec.ts` | **Fixed** — outer drift 0 @768 |
| Dijkstra `code-browser` hidden | Tabs vs crush confusion; after-run input collapse also broke graph edit path | Cross-algo test clicks「代码」in tabs; assert positive box; v6 graph test re-opens「编辑输入」 | `v4-stability.spec.ts`, `v6-uiux.spec.ts` | **Fixed** |
| quickSort play / swap settle timeouts | Input folded until「编辑输入」 | Tests click edit toggle before fill | `v5-m3-m4.spec.ts`, `v5-r1-r4.spec.ts` | **Fixed** |
| Pages vs E2E same-SHA | E2E not a hard Pages gate | Documented in `deploy-pages.yml` / `e2e.yml` (no deploy without auth) | workflows | **Documented** |

Traces: `docs/traces/v10/binarySearch-play-*.json`, screenshots under `docs/screenshots/v10/` and refreshed v4 shots.

---

## V10-02 — Low height must not delete features

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| `@media (max-height:520px)` hid inspector / speed / phase with no entry | Short-height “compact” deleted chrome | Dock toggles「变量/结果」sheet +「播放设置」panel; inline chrome hidden only when docks exist | `Visualizer.tsx`, `PlaybackTransport.tsx`, `styles.css` | **Fixed** — chain 1024×521→520→500→844×390 e2e |

---

## V10-03 — One height budget

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| Layout `data-height-fallback` vs Workbench `data-height-mode` diverged; clip ancestors stuck | Dual independent decisions | Layout owns budget (visualViewport + chrome + `data-input-editing`); Workbench follows parent; scroll releases related overflow ancestors; collapse input after successful run | `Layout.tsx`, `WorkbenchLayout.tsx`, `AlgoPage.tsx`, `styles.css` | **Fixed** |

---

## V10-04 — Manual next must not kill new FLIP

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| `goNext` bumped `transitionEpoch` + `setIdx`; post-layout `useEffect` cleared new FLIP | Cancel-old effect ran after create-new layout | Cancel-only vs create-new in one `useLayoutEffect` (geom sig); `goNext`/`goPrev` no longer bump epoch (pause/seek/runId still do) | `ArrayView.tsx`, `Visualizer.tsx`, `tests/dom/v10-flip-manual-next.test.tsx` | **Fixed** |

---

## V10-05 — Reverse edges canonical normal

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| A→B / B→A normals flipped with direction → same-side curves | `curveControl` used directed left-normal | `pairCanonicalNormal` (lex order); offsets along that normal; spacing 28; label bbox helpers | `graphEdgeGeometry.ts`, `GraphView.tsx`, unit tests | **Fixed** |

---

## V10-06 — DP row height stable

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| `td[data-prev]::after { display:block }` grew rows | Flow pseudo-element | Absolute in-cell overlay | `styles.css`, `tests/dom/v10-dp-row-height.test.tsx` | **Fixed** |

---

## V10-07 — Real workflow acceptance

| Problem | Root cause | Fix | Files | Status |
|---------|------------|-----|-------|--------|
| Preview-only matrix / tabs code h=0 | Active tab panel lacked stretch height in horizontal Group | Tabs active panel min-height + code/visualizer fill; workflow e2e edit→run→mid→docks; theory `role=dialog` + Escape | `styles.css`, `AlgoPage.tsx`, `Visualizer.tsx`, `v10-workflow.spec.ts` | **Fixed** |

---

## Test counts

| Suite | Result |
|-------|--------|
| Unit (`npm run test:run`) | **230 / 230** passed |
| Lint | warnings only (pre-existing style) |
| Build | pass |
| Full E2E | **41 / 41** passed (0 retry needed locally; log: `docs/traces/v10/e2e-full-final.log`) |

Known GH Actions baseline on `570d497`: 34 passed / 4 failed — all four addressed above.

---

## Residuals (honest)

- Soft keyboard / pinch-zoom: **not** verified on device (viewport simulation only).
- Pages still gates on `CI` workflow only; E2E success on the same SHA is a documented manual/release expectation until workflows are changed with push authority.
- Mid-flight FLIP pixel sampling in happy-dom remains soft; product cancel/create separation is covered by source + settle tests + e2e swap settle.
- `docs/traces/v4/playwright-report.json` left untouched if dirty (reporter may rewrite on local e2e — do not commit noise).

---

## Process

M0 baseline → M1 layout/reachability → M2 animation → M3 full suite → M4 docs (this file).
