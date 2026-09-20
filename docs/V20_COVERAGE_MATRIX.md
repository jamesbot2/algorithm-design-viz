# V20 Coverage Matrix

| ID | Severity | Scenario | Product assert | Test | Evidence |
|----|----------|----------|----------------|------|----------|
| V20-01a | P1 | LCS @1920 unassisted full 95 (esp 73–95) | no `matrix-follow-paused`; current cell visibleH>10 | e2e V20-01a | `v20-01-lcs-unassisted-timeline.json`, `after/v20-01-lcs-end-1920.png` |
| V20-01b | P1 | LCS @1366 frame 14 + samples 30/60/75/92/94 + 2nd run | unassisted follow; no rescue clicks | e2e V20-01b | `v20-01-lcs-samples-1366.json` |
| V20-01c | P1 | Real wheel leave + locate/resume; evaluate scrollTop labeled | wheel pauses; evaluate does not; locate/resume restore | e2e V20-01c | `v20-01-manual-restore.json` |
| V20-01d | P1 | Dijkstra 16→open data→22; paused data toggle | layout does not pause; line 27 visible; paused stays paused (no auto re-follow) | e2e V20-01d | `v20-01-dijkstra-data-layout.json`, `after/v20-01-dijkstra-22-data-1366.png` |
| V20-01-unit | P1 | Intent classification | no-gesture scroll ignored; wheel pauses; txn absorbs | dom unit | `tests/dom/v20-01-scroll-intent.test.ts` |
| V20-02 | P1 | Banner ≥1 glyph line w/wo vars; LCS/Kadane/Dijkstra/knapsack | contentH ≥ ~fontSize; title present | e2e V20-02 | `v20-02-banner.json`, `after/v20-02-banner-*.png` |
| V20-02-css | P1 | No bare 32px+pad crush | CSS budget vars; no `height:2rem` trio | static unit | `tests/v20-02-03-static.test.ts` |
| V20-03 | P2 | Soft wrap on/off | `.cm-lineWrapping` tracks checkbox; no remount; no pause | e2e V20-03 | `v20-03-wrap.json` |
| V20-03-src | P2 | Compartment wired | `reconfigure` + testid | static unit | `tests/v20-02-03-static.test.ts` |
| V20-04-mut | P1 | Mutation sanity | 6px banner / wrap removed detectable | e2e V20-04 | `v20-04-mutation.json` |
| V20-04-key | P1 | Key unassisted ×10 retries=0 | LCS 73–95 samples never pause/invisible | e2e keypath #1–10 | `v20-e2e-full.log` |
| V20-04-quality | P1 | Spec does not rescue | unassisted text; V19 rescue acknowledged | static unit | `tests/v20-04-acceptance-quality.test.ts` |

## Explicitly not claimed

- Prior CI E2E 35413728316 (130 passed) did **not** cover V20 unassisted / banner / wrap scenarios.
- V19 e2e still contains resume/locate rescue on full95 samples — superseded by V20 for follow acceptance.
- Full repo Playwright / full Vitest not re-run in this local pass.
- Firefox / WebKit / device farms not run (Chromium + `/usr/bin/google-chrome` only).
