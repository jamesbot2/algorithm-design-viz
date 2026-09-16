# V11 Delivery — Semantic / visual correctness

**Branch:** `v11-semantic-visual`  
**Baseline HEAD:** `e51c950` (V10 on main)  
**Tip:** _(see git log after commit)_  
**Not pushed. Not deployed.**

**User screenshot:** **待确认 / 附件缺失** — no new「严重 bug」original in attachments (only older V8/V9 layout PNGs). **Do not claim that screenshot bug is fixed.**

Chrome: `/usr/bin/google-chrome`.

---

## V11-01 — Signed bars / range highlight (P1)

| | |
|--|--|
| **Repro?** | Yes — zero used `minH`; neg only CSS class; ranges by index % |
| **Root cause** | Bar height = minH + scale(abs); no shared y(0); range bands not from slot rects |
| **Files** | `ArrayView.tsx`, `styles.css` |
| **Min input** | `[5,-5,0]`, `[-8,-2,-5]`, `[0,0,0]`, `[1,10,100]`, `[-3,0,4,-1]` |
| **Old → new** | Zero tall stub → data-height 0 + marker; equal \|v\| equal length; trajectory `scaleMax`; slot-measured range masks (segmented on wrap) |
| **Tests** | `tests/v11-01-signed-bars.test.ts`, `tests/dom/v11-signed-bars.test.tsx` |
| **Evidence** | `docs/traces/v11/`, screenshots under `docs/screenshots/v11/` |
| **Unverified** | Physical device zoom; extreme splitter drag mid-FLIP |

## V11-02 — Insert/merge copy identity (P1)

| | |
|--|--|
| **Repro?** | Yes — `[2,1]` right-shift aliased `elementIds` |
| **Root cause** | Copy assigned dest id = src id without vacating; React key = elementId |
| **Files** | `insertionSort.ts`, `mergeSort.ts`, `ArrayView.tsx` |
| **Min input** | `[2,1]`, `[3,2,1]`, `[4,1,3,2]` |
| **Old → new** | Vacate source on move; merge vacates range then write-back; temp/left/right buffers; React keys = `slot-i`; ops move/copy/write ≠ swap |
| **Tests** | `tests/v11-02-copy-identity.test.ts`, `tests/dom/v11-copy-keys.test.tsx` |
| **Unverified** | FLIP animation for move/copy (swap FLIP preserved) |

## V11-03 — N-Queens path/board/end/sampling (P1)

| | |
|--|--|
| **Repro?** | Yes — done lacked board; path guessed exploring child |
| **Root cause** | Terminal step omitted `matrices.board`; `collectPathIds` heuristic; stats mislabeled |
| **Files** | `nQueens.ts`, `SearchTreeView.tsx`, `Visualizer.tsx`, `types/step.ts` |
| **Min input** | n=1,2,3,4,5,8 |
| **Old → new** | `activePathIds` explicit; board on done; `computationComplete`/`traceComplete`/sampling label; row/col on events; Visualizer caches last board |
| **Tests** | `tests/v11-03-nqueens.test.ts`, e2e end board |
| **Unverified** | Very large n with heavy sampling UX polish |

## V11-04 — Knapsack input contract (P1)

| | |
|--|--|
| **Repro?** | Yes — `1.5` / `2.5` / Inf accepted into solver |
| **Root cause** | `parseNumberList`/`parseIntStrict` lacked discrete-int contract |
| **Files** | `parseInput.ts`, `AlgoPage.tsx`, `knapsack01.ts` |
| **Min input** | weights=1.5; W=2.5; Inf; mismatch; W=0 |
| **Old → new** | `parseNonNegInt` + `assertNonNegIntegers`; AlgoPage rejects before solve; generator guard |
| **Tests** | `tests/v11-04-knapsack-contract.test.ts`, e2e illegal |
| **Unverified** | Teach unit custom editor edge strings beyond validateKnapsackInstance |

## V11-05 — Code arrow = this step (P1)

| | |
|--|--|
| **Repro?** | Yes — Huffman all `init`; Floyd finish `codeLine=0`→kLoop; knapsack done bare; merge write on mergeCompare |
| **Root cause** | Default/stale refs |
| **Files** | `huffman.ts`, `floyd.ts`, `knapsack01.ts`, `mergeSort.ts` |
| **Tests** | `tests/v11-05-code-arrow.test.ts` |

## V11-06 — Huffman forest (P1/P2)

| | |
|--|--|
| **Repro?** | Partial — no forest viz; dup symbols undefined; heap claim |
| **Files** | `huffman.ts` (+ SearchTreeView reuse) |
| **Old → new** | Forest `searchTree`; aggregate/reject dups; honest sort+shift note; WPL/codes from tree |
| **Tests** | `tests/v11-06-huffman.test.ts` |

## V11-07 — KMP/DP/graph audit

| | |
|--|--|
| **Repro?** | Verified existing generators; no invented bugs fixed |
| **Tests** | `tests/v11-07-semantic-audit.test.ts` |
| **Unverified** | Deep per-edge graph geometry beyond V10 |

## V11-08 — Short-height docks (P1/P2)

| | |
|--|--|
| **Repro?** | Yes — descendant `.playback-transport .phase-jump` hid dock copies |
| **Files** | `styles.css`, `PlaybackTransport.tsx` |
| **Old → new** | Direct-child hide; panel copies forced visible; settings as overlay dialog; Escape/focus |
| **Tests** | `tests/v11-08-short-height-css.test.ts`, e2e @1024×520/500/844×390 |

## V11-09 — Mid-transition verification (P2)

| | |
|--|--|
| **Files** | generators + `tests/v11-09-mid-transition.test.ts` |
| **Note** | V10 cancel/create FLIP preserved; mid pairs for swap/move/copy sampled |

---

## CI / Pages same-SHA gate

Local edit to `.github/workflows/deploy-pages.yml`: require **CI + E2E** success on the **same SHA** before Pages build/deploy. **Not pushed.**

---

## Test counts (local)

| Suite | Result |
|-------|--------|
| Unit (`npm run test:run`) | **278 / 278** passed |
| Lint | warnings only (pre-existing + ArrayView export / Visualizer) |
| Build | pass |
| E2E V11 | **8 / 8** passed (`docs/traces/v11/e2e-v11.log`) |
| E2E full | **49 / 49** passed (`docs/traces/v11/e2e-full.log`) |

Full coverage: `docs/V11_COVERAGE_MATRIX.md` · M0: `docs/V11_M0_REPRO.md`
