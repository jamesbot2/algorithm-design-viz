# V3 Workbench

## Goals

Credible playback, explicit array ops, immutable run snapshots, code catalog sync (Dijkstra first), and a shared workbench shell (viz | code).

## Phase A — Credible playback

### A1 Cursor / seek ownership

- **Visualizer owns** `idx` and `playing`.
- Parent sends **`seekCommand: { requestId, target }`** only on scene load, new run, or explicit external seek.
- **`onStepIndexChange` is notify-only** — must never write back into `seekCommand` / init (that caused auto-pause).
- New **`runId`** resets the player once (idx=0, playing=false).
- Regression: `tests/dom/playback-no-autopause.test.tsx` (happy-dom project).

### A2 VarsPanel

- Removed ancestor `key={vars-flashKey}` remount.
- Diff vars against **adjacent** step; flash only changed chips.
- Arbitrary scrub/seek shows correct per-step diffs.

### A3 Explicit `arrayOps`

- `Step.arrayOps?: Record<string, ArrayOp[]>` with `compare | swap | move | copy | write`.
- Do **not** infer swap from `highlights.length >= 2`.
- bubble / insertion / quick / merge emit real ops + stable `elementIds`.
- ArrayView: geometry swap only when swap op present; compare only highlights.

### A4 RunSnapshot

- Immutable `RunSnapshot`: `algoId, version, input, params, seed, sourceHash?, runId`.
- Scene share = snapshot + cursor. Draft share labeled non-run (`draftOnly`).
- Dirty banner when input edited while showing previous run.
- Cursor changes must **not** write live draft.graph into scene.

### A5 Phase axis + keyboard

- Phase markers collapsed to **segments** (consecutive identical `phase`).
- Space / arrows ignored inside inputs, buttons, sliders, CodeMirror, resize separators.
- Final-answer panel separate and collapsed by default.

## Phase B — Dijkstra vertical sample

- Catalog: `src/codeCatalog/dijkstra/` — full TS, pseudocode, anchors (`init`, `selectMin`, `relax.condition`, `relax.update`), `CodeDocument` + 1-based `SourceRange` + `sourceHash`.
- Generator emits `codeRefs` on real ops (no message→line guessing).
- `CodeBrowser` (@uiw/react-codemirror): readonly, gutters, exec arrow, line highlight, search, copy, font size, follow-exec + return button. Selection does not move algo cursor.
- AlgoPage Dijkstra: viz + code side-by-side; cursor syncs graph/vars/code arrow.

## Phase C — Workbench shell

- `react-resizable-panels` v4: `Group` / `Panel` / `Separator`.
- `WorkbenchLayout`: title | input summary | viz ~55% + code ~45% | desktop theme/motion/focus controls.
- Algo pages + KnapsackUnit use workbench; knapsack shows strategy code stub when no catalog.
- Lab theme tokens (dark `#0F1117` / light `#F6F8FC`, accent `#5B8DEF`) via `data-lab-theme`; semantic algo colors kept.

## Test environments (Vitest 5)

`environmentMatchGlobs` was removed in Vitest 5. Equivalent:

```ts
projects: [
  { test: { name: 'unit', environment: 'node', exclude: ['tests/dom/**'] } },
  { test: { name: 'dom', environment: 'happy-dom', include: ['tests/dom/**'] } },
]
```

## Phase D — Catalog coverage (done locally)

- `getCatalog(algoId)` generalized; AlgoPage + KnapsackUnit look up by id/strategy.
- Full TS CodeDocuments + anchors + `sourceHash` for runnable algos listed in `docs/CODE_COVERAGE_MATRIX.md`.
- LCS reconstruct playable phase; N-Queens `frameId` + tree immutability kept; knapsack per-strategy catalogs.

## Phase E — start

- Vitest DOM smoke for Dijkstra + CodeBrowser (`tests/dom/v3-phase-e-codebrowser.test.tsx`).
- Playwright **not** added (install reliability); do not claim E2E passed.
- Screenshots skipped.

## Still open

- Richer CodeBrowser follow / FLIP polish
- Deploy verification after push
- Optional Playwright when environment supports reliable install
