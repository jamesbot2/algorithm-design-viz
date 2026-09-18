# V15 M0 Repro (failing-then-passing)

## V15-01
Visualizer `shouldIgnoreKeyboard`: ArrowLeft/Right inside `.inspector-sheet` returned `false` before INPUT checks → focused `graph-result-target` still stepped playback.

## V15-02
Case edges `0 1 10` / `0 2 1` / `2 1 1`: final `edgeRoles['0->1']` stayed `accepted` alongside current preds; update snaps set `checking` over `accepted`; extract `nodeRoles[u]=settled` with `??` blocked current/focus.

## V15-03
Modal drawer covered transport; continuous scrub with data open required closing sheet (or hardware arrows).

## V15-04
`evaluateTargetVisibility`: pe:none opaque not paint-checked; label unreadability required both width∧height &lt; min; clip used center-in only (35% overlap still passed).
