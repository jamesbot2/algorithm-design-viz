# V18 Coverage Matrix

| ID | Area | Unit/DOM | E2E Chromium | Evidence | Status |
|----|------|----------|--------------|----------|--------|
| V18-01 | Sheet body height not 96px | `tests/v18-01-sheet-body-height.test.ts` | @1366/@1920 bodyH + rows | traces/screenshots v18-01 | 已验证 |
| V18-02 | Primary scene LCS DP / merge | `tests/v18-02-primary-scene.test.ts` | LCS×2 + mergeSort | v18-02-primary-scene.json | 已验证 |
| V18-03 | Data open controls / compact clip | `tests/v18-03-data-open-controls.test.ts` | compact@1366 + edit click@1920 | v18-03-controls-data-open.json | 已验证 |
| V18-04 | Acceptance / mutation sanity | `tests/v18-04-acceptance-assertions.test.ts` | mutation faults; retries=0 | v18-04-mutation-sanity.json | 已验证 |
| Regress | V17 input/code/arrays/acceptance | prior | v17 e2e 10 | — | 已验证 |

**Counts:** vitest **384**; V18 e2e **4**; V17 regress **10**; fail **0**; flaky **0**; skip **0**.
