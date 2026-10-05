# V29 Motion References (M0)

Date: 2026-10-05 (UTC+8). Baseline SHA: `c90c31b`. Branch: `v29-motion`.

Research is bounded: ≥2 algorithm-viz projects + 1 animation-engineering ref from the brief list. Prefer running demos; mark read-only when a live demo could not be driven.

## 1. Algorithm Visualizer / tracers.js — **read-only**

- Paths / URLs:
  - https://github.com/algorithm-visualizer/tracers.js (`src/Array2DTracer.ts`, README)
  - https://algorithm-visualizer.github.io/tracers.js/
  - Issue discussion of swap API: https://github.com/algorithm-visualizer/algorithm-visualizer/issues/228
- What they do: step delays + select/patch highlights. **No FLIP / element-identity swap motion** — swaps are color marks on cells, not translated bars.
- Adopted ideas:
  - Keep semantic highlight (compare/swap/write) separate from geometry motion.
  - Step clock owns pacing; visuals react, they do not drive the clock.
- Rejected:
  - Highlight-only swaps (we already have identity FLIP for teaching swaps; keep it).
  - Adding a new `.swap()` tracer API surface — out of scope; we already emit swap pairs.

## 2. Algorithms in Action (AIA) — **read-only** (repo README + tree; live demo not driven)

- Paths / URLs:
  - https://github.com/algorithms-in-action/algorithms-in-action.github.io
  - README notes coordinated animation + pseudocode + explanation; stepwise refinement of detail.
- Adopted ideas:
  - **Interruptible coordinated step**: play/pause/step share one cursor; visuals must cancel cleanly on seek.
  - Prefer clarity of identity over decorative bounce when teaching swap/partition.
- Rejected:
  - Multi-level pseudocode expansion coupling (product already has code sync; not a motion fix).
  - Pulling their React/animation stack — too heavy vs local FLIP+CSS.

## 3. Motion for React (layout / FLIP engineering) — **read-only docs**

- Paths / URLs:
  - https://motion.dev/docs/react-layout-animations
  - https://motion.dev/docs/layout-animations
- Adopted ideas:
  - Layout motion via **transforms**, interruptible mid-flight (vs View Transitions snapshots).
  - Scale-on-layout is dangerous without correction — **do not put settle `scale()` on the same node that carries FLIP `translate`**, and avoid default springs/overshoot for educational swaps.
  - Change layout through style/class; let one owner animate position.
- Rejected for V29 M1/M2:
  - Adding the `motion` package as a dependency now — size + lifecycle cost without proven need; local 2D FLIP already exists. Revisit only if FLIP+WAAPI cannot meet interrupt contract.
  - Default spring / bounce curves (`bounce: 0.2`, overshoot easings) — conflicts with user preference (no whole-UI shake, no default repeated bounce).

## 4. Anime.js timeline — **read-only** (optional brief list)

- URL: https://animejs.com/documentation/timeline
- Adopted idea: single timeline with cancel/seek for swap phases (lift → exchange → settle).
- Rejected for now: introducing Anime.js alongside existing CSS/WAAPI/FLIP — prefer one stack. Local `swapMs` + epoch token already approximate a cancelable timeline.

## Adopted local landing points (code)

| Idea | Landing |
|------|---------|
| Separate highlight vs geometry | `.hl-*` on `.bar/.cell`; FLIP on `.bar-flip-layer` only (`ArrayView.tsx`) |
| No scale-on-FLIP-node | Keep settle animation off the flip layer; audit `arr-update-settle` fighting `transform` transitions on `.bar` |
| Interrupt / epoch cancel | `transitionEpoch`, `animToken`, `clearTransforms`, `geometryGen` in `ArrayView.tsx`; playback seek in `usePlaybackController.ts` |
| Outer frame stability | `WorkbenchLayout` monotonic `dataContentH`; ArrayView `maxH` ResizeObserver re-fit — measure whether these still move workbench/scene rects during play/step |
| No default springy overshoot | `--ease-springy` / `arr-swap-nudge` / settle scale — candidates to tone down in M2 swap template |

## Not adopted this phase

- Motion Canvas, D3 join/transition (not opened; enough signal from Motion docs + tracers/AIA).
- Adding Motion+Anime+GSAP+D3 together.
- Retheme / rebuild / new algorithms.

