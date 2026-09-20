# V21 Coverage Matrix

| ID | Severity | Scenario | Product assert | Test | Evidence |
|----|----------|----------|----------------|------|----------|
| V21-01a | P1 | Dijkstra pseudo init line 2 @1366×600 | visH ≥ elH (full line); text+geometry | e2e V21-01a | `v21-01-pseudo-1366x600.json`, `after/v21-01-pseudo-line2-1366x600.png` |
| V21-01b | P1 | Dijkstra pseudo line 2 @844×390 + 390×844 | full readable; tall OK | e2e V21-01b | `v21-01-pseudo-short-tall.json` |
| V21-01c | P1 | mid/end + TS↔pseudo remasure + goto | geometry not only data-exec-line | e2e V21-01c | `v21-01-pseudo-top-mid-end.json` |
| V21-02 | P2 | two user scrolls → data open; 768→780 | pin keeps latest (~140), not stale 0 | e2e V21-02 | `v21-02-pin.json`, `after/v21-02-pin-after-data.png` |
| V21-03 | P2 | LCS frames 14/31/74/75/94/95 unassisted | cell ∩ all clip ancestors ≥ 85% cellH; no scrollport overhang | e2e V21-03 | `v21-03-matrix-clip.json` |
| V21-03b | P2 | matrix smoke 1024×600 / 1920 / 844×390 | intersect ≥ 10; sheet toggle available | e2e V21-03b | `v21-03-matrix-viewports.json` |
| V21-04a | P1 | V20 positives: LCS unassisted 95; Dijkstra data-open follow | no false pause; line visible after data | e2e V21-04a | (inline) |
| V21-04b | P1 | mutation: wrong coords / first-pin-only / oversized scroll | mutations fail contract | e2e V21-04b | `v21-04-mutation.json` |
| V21-04c | P1 | key paths ×10 retries=0 | A/B/C all pass | e2e V21-04c | `v21-04-keypaths-x10.json` |
| static | — | offsetTop / first-pin / 120px / effectiveScrollport | source contracts | vitest `v21-static-guards` | — |
| dom | — | contentTop ≠ offsetTop vs page | unit geometry | vitest `v21-01-pseudo-scrollport` | — |

## Unverified
- Firefox / WebKit
- Device / zoom / high-DPI
- Full Vitest / full Playwright suites beyond V21 focused set
