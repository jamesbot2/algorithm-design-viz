# V16 Coverage Matrix

| ID | Area | Unit/DOM | E2E Chromium | Evidence | Status |
|----|------|----------|--------------|----------|--------|
| V16-01 | Button/checkbox own Space | `tests/dom/v16-01-keyboard-activation.test.ts` | v16-01 | traces/screenshots v16-01 | 已验证 |
| V16-02 | Run readiness + Dijkstra×10 | runReadiness helper | v16-02 ×3 scenarios ×10 | v16-02-*.json | 已验证 |
| V16-03 | Single visibility detector | `tests/dom/v16-03-*.test.ts` | v16-03 pe:none + recover | v16-03-*.json | 已验证 |
| V16-04 | 1-based counters | `tests/v16-04-step-display.test.ts` | v16-04 | v16-04-*.json | 已验证 |
| V16-05 | Workbench width + data gutter | — | v16-05 @1366/1920/2560 | after-layout-metrics + shots | 已验证 |
| V16-06 | Enlarge plot/code/labels | v13 label band update | v16-05/06 plot mins | after-layout-metrics | 已验证 |
| V16-07 | Session across resize/toggle | WorkbenchLayout stable tree | v16-07 | v16-07-*.json | 已验证 |
| Regress | V15 keyboard/Dijkstra/inspect/vis | prior | v15 e2e 5 | — | 已验证 |
| Regress | V13 graph portal visibility | prior | v13 e2e 12 | — | 已验证 |
| Regress | mergeSort | v13-02 6 | — | — | 已验证 |

**Counts (this delivery):** pass **359** vitest + **10** v16 e2e + **17** regress e2e; fail **0**; flaky **0**; skip **0**; unverified: FF/WK.
