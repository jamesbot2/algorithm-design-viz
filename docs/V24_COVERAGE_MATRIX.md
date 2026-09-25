# V24 coverage matrix

Detector: `tests/e2e/helpers/primaryObjects.ts` (box ∩ all clip ancestors ∩ viewport, 0.75px
tolerance, topmost hit-test at rest; scoped to the one visible stage; probes excluded).
Spec: `tests/e2e/v24-primary-objects.spec.ts` (retries 0). Chrome = `/usr/bin/google-chrome`.

| # | Requirement (brief) | Test | Viewports | What is asserted |
|---|---|---|---|---|
| 1 | Merge default 7 items, fully stepped, bars | `merge default 7 items … all 55 frames stepped (bars), key frames in cells` | 1366x768 | every one of 55 frames via real 下一步 clicks: all 7 slots / bars / values / indices / pointers of stage `a` fully visible + hit; stage `a` == current-data `a`; exec line > 0; buffers (when present) fully visible separately; phases init / buffers / compare / write-back / remaining copy / done seen; end = [1,2,3,5,7,8,9] |
| 2 | Merge cells mode, key frames | same test (walk back with 上一步) | 1366x768 | first frame of every phase + 21/55 in cells mode, same assertions |
| 3 | Merge 4,1,3,2 both modes fully stepped | `merge 4,1,3,2 … every frame in bars AND cells` | 1366x768 | 25 frames forward in bars, 25 back in cells; transient duplicate kept; end [1,2,3,4] |
| 4 | Tree open/close keeps state; a accessible before/after; tree growth | `recursion tree open/close keeps runId/cursor/code/mode …` | 1366x768, 1200x740 | aux closed by default; open → pane visible, runId/cursor/exec/solve-count identical, `a` passes; tree node count grows while stepping; bars↔cells with tree open; close; resize with tree open |
| 5 | Animation start / mid / landing in the accessible area | `animation start / mid-transition / landing …` | 1366x768 | rAF sampler from click to landing: worst visible ratio of `a`'s flip layers + values ≥ 0.98 (merge write-back, insertion move), landing passes detector |
| 6 | Huffman default: each select, merge, final tree, code table; input ↔ leaves | `default 5 symbols … every frame` | 1366x768 | primary = forest on all 10 frames; all forest nodes / labels / input chips fully visible; leaves == {a:5,b:9,c:12,d:13,e:16} every frame; select frames: exactly 2 selected roots, both ≤ every other root weight; merge frames: new parent label = ⊕(sum of the 2 merged); final: 1 tree, leaf codes == table codes == result message, codes fully visible |
| 7 | Activity start / mid / end; light theme; larger font | `default 6 items start / 4/14 / end …` | 1366x768 | Range text rects: 6 labels, 0 neighbour overlaps, 0 clipped, `A<id>[s,f)` text; light theme; `html{font-size:20px}` + max code font |
| 8 | Viewports 1920x1080 / 390x844 | `key primaries @…` | 1920x1080, 390x844 | merge 21/55 bars + cells, 4,1,3,2 13/25, Huffman 4/10, activity 4/14 through the same detector (390: demo tab) |
| 9 | 1024x600 / 844x390 explicit fallback + action entries | `low-height fallback @…` | 1024x600, 844x390 | if `a` does not fit, the stage offers scroll and a normal wheel reveals it (then detector passes); companions reached by wheeling back; tree toggle + mode toggle clickable, state unchanged; Huffman `定位当前` shows the selected pair |
| 10 | Large data: navigation, locate, view restore | `Huffman 14 symbols … 定位当前 …` | 1366x768 | forest pans; selected pair auto-located on step change; after manual wheel away, 定位当前 restores it |
| 11 | 390 data/code/demo round trip | `merge 390x844 tabs round trip` | 390x844 | `a` passes before/after; runId/cursor/exec/solve unchanged |
| 12 | Positive: insertion temp, quicksort main array | `insertion sort temp companion + quicksort main array` | 1366x768 | insertion [2,1] every frame + temp companion seen; quicksort 4 frames |
| 13 | Positive: Dijkstra default desktop + 390 round trip; LCS 95 frames unassisted follow | V23 spec A / C / ×3 block (unchanged) | 1366x768 … 390x844 | V23 graph + joint detectors (run in the full suite) |
| N1 | a squeezed to 56px, data table correct → FAIL | negative control 1 | 1366x768 | data table unchanged; `mainArrayFailures` non-empty; restore → empty |
| N2 | buffers + tree kept, a hidden → FAIL | negative control 2 | 1366x768 | buffers fully visible, slot count still 7, detector fails; restore → passes |
| N3 | symbol/freq cards squeezed to tops → FAIL | negative control 3 | 1366x768 | forest labels / input glyphs clipped → fail; restore → pass |
| N4 | activity 52px single-line → label check FAIL | negative control 4 | 1366x768 | ≥1 neighbour overlap (measured 5 pairs, dx 2.08px); restore → 0 |

Unit / DOM: `tests/v24-presentation-contract.test.ts` (descriptors, legacy fallback, Huffman
forest stable on every frame, merge array on every frame despite searchTree, no solve during
resolve, interval split, results unchanged) and `tests/dom/v24-forest-and-companions.test.tsx`
(forest roles select / merge, 5 leaves each frame, placeholder vs real companions, tree not
inline, interval cards).

Not run: WebKit, real devices, OS zoom. Firefox: V24 spec only.
