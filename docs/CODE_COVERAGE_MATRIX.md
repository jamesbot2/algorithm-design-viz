# Code coverage matrix (catalog ↔ viz)

| Algorithm | Catalog doc | Anchors | `codeRefs` on steps | CodeBrowser wired | Notes |
|-----------|-------------|---------|---------------------|-------------------|-------|
| Dijkstra (naive) | `dijkstra.naive.ts` + pseudo | init, selectMin, relax.condition, relax.update | yes | AlgoPage workbench | Vertical sample for V3 B |
| Dijkstra heap | — | — | — | — | Planned |
| Bubble / Insertion / Quick / Merge | meta.code pseudo only | — | arrayOps yes; codeRefs no | stub / meta.code | A3 ops done |
| Knapsack strategies | stub in KnapsackUnit | — | — | workbench stub | Minimum stub |
| Others | meta.code | — | — | CodePanel / stub | Gradual |

## Anchor convention

- `CodeDocument.anchors[].range` uses **1-based** inclusive line numbers.
- Generators attach `codeRefs: [{ documentId, anchorId }]` at the op that corresponds to that anchor — never by parsing `message` text.
