# V29 M4 acceptance (local harness)

Build-info remains **V28** until the user authorizes a version bump.

## Shared detectors
`tests/e2e/helpers/v29MotionDetectors.mjs` — same check functions for positive and negative controls (no name-based fail).

Out-of-repo runner (evidence + videos): `/workspace/v29/`
- `m4-posneg.spec.mjs` — frame / bounce / mid-motion / stale / primary-vis pos→neg→recover
- `m4-coverage.spec.mjs` — bubble/quick/insert/merge bars+cells, shared algos, viewports, reduced-motion, multilang
- `m4-perf.spec.mjs` — honest rAF interval distribution
- Config: `/workspace/v29/pw-m4.config.mjs` against vite `:5220`

## Commands
```bash
cd /workspace && npx --prefix /workspace/algorithm-design-viz playwright test -c /workspace/v29/pw-m4.config.mjs
```

See `/workspace/v29/REPORT.md` delivery section for matrix counts and first-fail notes.
