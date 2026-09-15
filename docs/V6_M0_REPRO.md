# V6 M0 — UI-01..UI-11 reproduction notes

Baseline HEAD: `e2961e92513b044f9e8f4a8aeb8ed239ff9a1e27`

| ID | Path | Trigger | Observed | Expected | Cause (hypothesis) | Proposed test |
|----|------|---------|----------|----------|--------------------|---------------|
| UI-01 | `Visualizer.phaseSegments` + `PlaybackTransport` | Run bubble 7 / 32-rev | Phase jump buttons = event segments (~30 / ~1025); timeline last seg uses `/max` (N-1) → overflow | ≤8 teachable stages; geometry `/N`; bar height bounded | Merging identical phase still leaves compare/swap alternation; width=`(end-start+1)/max` | unit geometry + DOM phase-jump count |
| UI-02 | `styles.css` `.workbench-layout` | Open any algo workbench | `height:min(72vh,820px)` fights nested `100%` / `min-height:280px` | One scroll owner; canvas+code readable | Stacked V3/V4 height patches | layout CSS review + smoke |
| UI-03 | `WorkbenchLayout` always horizontal Group | Narrow container / sidebar open | Two crushed columns | Container-width tabs | No ResizeObserver layout mode | DOM/e2e layout attr |
| UI-04 | `GraphInput` local `edgeText` | Legal→illegal edges→Run | Parent keeps old edges; may show pass + run old | Single draft; illegal cannot run | Parse fail returns early without clearing edges | DOM GraphInput + validate gate |
| UI-05 | `KnapsackUnit` preset; `ExperimentPage` export | Run then switch without run | New W in summary + old steps; export `experiment-${which}` | Snapshot isolation | No run snapshot; export uses live `which` | knapsack dirty + exportBasename |
| UI-06 | `CodeBrowser` | Pseudo tab + 回到执行行 | Only `viewRef` (CM) scrolls | Active doc scroll API | Pseudo is `<pre>` | DOM goto on pseudo |
| UI-07 | `Layout` `collapsed`/`mobileOpen` | Desktop collapse → phone → open | Catalog missing (`!collapsed`); menu sets mobileOpen only | Split desktopCollapsed / mobileDrawerOpen | Shared flag + conditional render | unit/DOM inert |
| UI-08 | `animation.css` after `styles.css` | Load app | `.phase-track` 6px/#2a2a2a overrides; shake killed by `transform:none!important` | Shell vs shake inner; theme tokens | Animation file redefines layout | CSS source check |
| UI-09 | Visualizer banner + inspector | Play step | Same message thrice; frameId as “调用栈” | One primary message; frame label honest | Duplicate nodes | DOM single banner |
| UI-10 | PlaybackTransport labels | Preview/play/end | Always 播放/重置 | preview/generate/continue/replay semantics | Flat labels | label props |
| UI-11 | Practice/Experiment | Submit then edit; export | Green for all; JSON as main UI; export wrong name | Verdict + summary + snapshot export | Product leftovers | practice feedback + export |

Evidence grades used later in `docs/V6_DELIVERY.md`: source / unit / full-app browser.
