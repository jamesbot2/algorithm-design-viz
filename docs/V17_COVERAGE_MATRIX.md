# V17 Coverage Matrix

| ID | Area | Unit/DOM | E2E Chromium | Evidence | Status |
|----|------|----------|--------------|----------|--------|
| V17-01 | Input edit body budget | `tests/v17-01-input-edit-css.test.ts` | 6 viewports + resize | traces/screenshots v17-01 | 已验证 |
| V17-02 | Data open + readable code | `tests/v17-02-workbench-data-open.test.ts` | v17-02 @1366 + fault + ≥10 steps | v17-02-1366-data-open.json | 已验证 |
| V17-03 | Array/DP stage budget | `tests/v17-03-array-stage-budget.test.ts` | kadane×3 vp + mergeSort + LCS | v17-03-array-stage.json | 已验证 |
| V17-04 | Acceptance quality | `tests/v17-04-acceptance-quality.test.ts` | Dijkstra×10 roles+dist; visibility | v17-04-*.json | 已验证 |
| Regress | V16 workbench/keyboard/vis | prior | v16 e2e 10 | — | 已验证 |

**Counts:** vitest **371**; V17 e2e **10**; V16 regress **10**; fail **0**; flaky **0**; skip **0**.
