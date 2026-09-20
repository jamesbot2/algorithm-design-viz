# V22 Coverage Matrix

| ID | Risk | Viewport / content | Assert | Mutation / negative | Status |
|----|------|-------------------|--------|---------------------|--------|
| V22-01 | P1 strip crush | 1366/1024/1920/390/844 LCS f14 | glyph visH ≥ 90% elH; falsePos8=0; cell kept | — | PASS |
| V22-02 | P2 follow mid-slice | 1366 + 1024 LCS f14 | locate/resume visH ≥ 90% elH + hit | click locate no force | PASS |
| V22-03a | Joint same-frame | LCS 1/14/31/74/75/94/95; editDist; knapsack01 @1366 | strip+cell+controls+codeW; same runId; no pause | — | PASS |
| V22-03b | Unassisted + V21 smoke | LCS walk samples; Dijkstra pseudo L2 | no resume/locate rescue; pseudo vis | — | PASS |
| V22-03c | Detector teeth | 1366 LCS f14 | restore joint pass | strip 10px; bar 6px; matrix taller than stage; code w=0 | PASS |
| V22-03d | Buffer + short | merge/insert smoke; 1024×600; 390×844 | joint / glyph+locate+cell | — | PASS |
| V19 measureCompact | False ≥8px | shared helper | ≥90% glyph + ancestor clip | 40px fault still fails | PASS |
| V21 regression | Preserve | full V21 e2e (9) | pseudo/pin/matrix/unassisted/×10 | V21 mutations | PASS |
| Static | CSS contract | — | no flex-shrink strip; no bar maxH clip; no 120px | — | PASS |

Viewports covered in V22-01: **1366×768, 1920×1080, 1024×600, 390×844, 844×390**.
