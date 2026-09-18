# 实施状态（algorithm-design-viz）

基准 HEAD：V4 基于 `dcba310`；本轮本地提交见 git log（**未 push**）  
更新约定：未开始 / 进行中 / 已实现待验证 / 已验证 / 受阻  
本轮默认：**不 push、不改远程设置**（需明确授权）。

## M0 基线与可信性
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| P0-01 | 复杂度对应实现 | 已验证 | AlgoMeta 扩展；Dijkstra→朴素 O(V²+E)；Prim/Kruskal/BFS/quickSort 标注对齐实现；chapters 最短路文案已改 |
| P0-02 | 二分禁止静默排序 | 已验证 | requireSorted 默认；sortThenSearch 可选；重复取最左；测试覆盖 [3,1,2] 等 |
| P0-03 | 图边 ID/方向 | 已验证 | edge.id + highlightEdgeIds/edgeRoles；双向曲线；useId 箭头；layoutGraph；各图算法累加边高亮 |
| P0-04 | 矩阵/数组高亮语义 | 已验证 | matrixTargets / arrayPointers；MatrixView 行列标签且不 truthy 判 0；knapsack/lcs/kmp 已发目标 |
| P0-05 | 输入编辑与执行分离 | 已验证 | draft + 运行/恢复默认/重置播放；`1,abc,3` 报错不静默丢弃；DEMO_LIMITS |
| P0-06 | 结果语义与边界 | 已验证 | Dijkstra 拒负权；BF/Floyd 负环；Prim/Kruskal 森林；Kadane 空/全负；KMP π/空模式 |
| T0 | Vitest 基础测试 | 已验证 | 见 VERIFICATION.md |

## M1 类型化模块与轨迹
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M1-01 | 剩余算法 typed 适配 | 已验证 | registry validate+solve：kadane/binarySearch/kmp/editDistance/kruskal/prim/bellmanFord/floyd/bfs/sorts/activitySelection + 原有 knapsack01/lcs/dijkstra；另含 nQueens/matrixChain/huffman/maxSubarrayDC / dijkstraHeap |
| M1-02 | Trace 演进 | 已验证 | Visualizer 接受 `steps?: Step[]` 或 `trace?: Trace`；AlgoPage 有 registry.solve 时写入 Trace |
| M1-03 | Runner | 已验证 | `src/core/runner/`：`runAlgo` + size budget + cancel flag + `RunOutcome` |
| M1-04 | Snapshot 不可变 | 已验证 | `freezeSteps` / `copyStepArrays` / `deepFreeze` |
| M1-05 | Infinity JSON | 已验证 | `{$inf:1\|-1}` 与 `'∞'/'-∞'`；`encodeInfInTree`/`decodeInfInTree` |
| M1-T | 测试 | 已验证 | registry + runner + immutability + infinity |

## M2 课程核心
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M2-nav | 双导航 | 已验证 | Layout/Home：「按设计思想」「按问题类型」← `src/data/curriculum.ts` / `src/content/nav.ts`；完成标记 theory/demo/practice 诚实；流章节 BFS 为最大流先修（planned） |
| M2-knapsack | 背包多策略样板 | 已验证 | `/teach/knapsack`：暴力/DP2D+回溯选中集/DP1D+正向反例/回溯树/B&B 分数上界/贪心密度反例 160vs220；O(nW) 文档；策略一致性测试 |
| M2-nqueens | N 皇后 | 已验证 | 棋盘+搜索树；one/all；1→1,2/3→0,4→2；n=8=92（高预算）；截断不宣称完整 |
| M2-matrix | 矩阵链乘 | 已验证 | [10,30,5,60]→4500；k 枚举 + 加括号恢复 |
| M2-huffman | Huffman | 已验证 | 正频率；并列字典序；WPL；空/单符号约定 |
| M2-maxsub | 分治最大子数组 | 已验证 | 与 kadane/O(n²) 对照；例→6 |
| M2-lcs-edit | LCS/编辑距离重建 | 已验证 | 一条 LCS 串 / 编辑 ops；matrixTargets path |
| M2-mergesort | 归并递归树 | 已验证 | searchTree + callStack 变量 |
| M2-teach | 教学页结构 | 已实现待验证 | 背包单元含 problem/state/idea/viz/correctness/complexity/edges/code/practice stub；新算法走 AlgoPage meta |
| M2-T | 测试 | 已验证 | knapsack 一致、nqueens、matrixChain、huffman、maxsub、LCS |

## M3 图编辑 / 练习 / 实验 / 分享
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M3-graph | 自定义图编辑器 | 已验证 | `GraphInput`：n/边表/有向/源点/预设；`validateGraphDraft` 校验端点、方向、权与算法约定；`layoutGraph`；AlgoPage 接入 bfs/dijkstra/dijkstraHeap/kruskal/prim/bellmanFord/floyd |
| M3-result | 结果 UX | 已验证 | 最短路：目标点 → 路径+代价（parent）；MST：选中边、总权、连通？；BF/BFS 补 parent/dist |
| M3-heap | 堆 Dijkstra | 已验证 | `dijkstraHeap` 懒删除二叉堆；过滤陈旧项；与朴素对照页+实验台；共享图 dist 一致测试 |
| M3-views | 视图抛光 | 已验证 | ArrayView 有符号柱+稳定 scale；非适合默认单元格；MatrixView 滚动+sticky 标签；图例仅当前轨迹用到的 role；`phase` 阶段跳转 |
| M3-practice | 练习三判定 | 已验证 | `/practice`：预测下一步 / 解释选择 / 构造反例；覆盖背包、LCS、Dijkstra、N皇后、贪心vsDP；多解裁判（LCS/等长最短路/交替MST/等值背包集）；seed 可复现；localStorage 进度+导出/确认清空 |
| M3-modes | 教学 vs 实验 | 已验证 | AlgoPage 模式切换；`/experiment`：最大子数组 / 背包策略 / 朴素vs堆 Dijkstra；计数器导出 CSV/JSON；指数规模封顶；声明非 DOM 计时证明 |
| M3-scene | 场景分享+本地学习 | 已验证 | Scene：algoId/version/input/params/seed/stepIndex；短 URL hash；JSON 导入导出；版本不符警告；localStorage 进度/错题/书签；标明非 LMS |
| M3-ref | 参考代码+讲义 | 已验证 | 伪代码+C++：背包 DP2D / 朴素 Dijkstra / N皇后；`/lab/core`；C++ 标注 CI 不执行 |
| M3-T | 测试 | 已验证 | graph validate、heap vs naive、practice judges、scene roundtrip、experiment export；既有测试保持绿 |

## M4 CI / 文档 / 验收
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M4-CI | GitHub Actions CI | 已验证（本地工作流文件） | `.github/workflows/ci.yml`：PR + push→main；`npm ci` / lint / `test:run` / build。未 push，远程尚未跑过 |
| M4-deploy | 与 Pages 关系 | 已实现待验证 | 见 V2：`deploy-pages.yml` 经 `workflow_run` 在 CI success 后部署（本地已改；远程待 push） |
| M4-docs | 文档集 | 已验证 | IMPLEMENTATION_STATUS / VERIFICATION / COURSE_MAP / TRACE_PROTOCOL / CONTRIBUTING / LICENSE_NOTES / FINAL_DELIVERY + README |
| M4-safety | 内容安全 | 已验证 | Chapter 讲义改为 React 节点渲染 `**`/`code`，**无** `dangerouslySetInnerHTML`；无用户 HTML/MD 直渲；无 markdown-it |
| M4-E2E | Playwright | 已验证（本地） | `npm run test:e2e` + `/usr/bin/google-chrome`；独立 `e2e.yml` 不挡 Pages |
| M4-T | 验收 | 已验证 | 本地 lint(exit 0)+84 tests+build 绿；见 V2 节 |


## V2 可信性+动画
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| M1-greedy | 贪心反例结构化判定 | 已验证 | `judgeGreedyCounterexample`：解析 weights/values/capacity；校验；密度贪心 vs DP/暴力；仅 greedy<opt 通过；反馈含实例/贪心/最优/gap；随机数字失败；经典 160vs220 通过；PracticePage 结构化输入 |
| M1-nqueens-bank | N皇后题库+多选精确命中 | 已验证 | `nqueens-predict-1` 仅接受完整答案 b；judgeMode: single / multiExact / construct / path / setOptimal；multiExact 不完整子集失败 |
| M1-tree-immut | searchTree 逐步快照 | 已验证 | nQueens / knapsack BT / B&B 使用 `snapshotTree`；逐步异引用快照；变异后续步不影响先前 |
| M1-exp-metrics | 实验台真实计数 | 已验证 | 停用 generateSteps().length 充当工作量；comparisons/scans/relaxations/heapPops/staleSkips/dpStates/btNodes/prunedNodes；vizSteps=可视化步骤量 |
| M1-single-run | 单次执行路径 | 已验证 | AlgoPage：校验 → runAlgo/solve 一次 → {result,steps/trace}；有 registry 时不预生成 fallback；预算+取消 |
| M1-scene-seek | 场景 stepIndex 恢复 | 已验证 | 持久化 stepIndex；加载后重跑并 seek；版本不匹配/结构非法/过大 → 明确报错、无静默回退 |
| M1-deploy-gate | Pages 依赖 CI | 已实现待验证 | deploy-pages.yml 用 workflow_run（CI success on main）；workflow_dispatch 可手动；未 push |
| M2-motion | 统一动效系统 | 已验证 | motion/semantic tokens；MotionContext（系统+用户减弱）；banner 交叉淡入；scrub 预览；阶段轴标记；speed-feel；图例按实际 role |
| M3-array | ArrayView 动效 | 已验证 | compare pulse；swap nudge；update settle；ranges 色带；Kadane/maxSub DC 接线 |
| M3-matrix | MatrixView 动效 | 已验证 | 强写/弱读/路径；labelHints 同步；antiExample 横幅（背包正向反例） |
| M3-graph | GraphView 动效 | 已验证 | 节点 pulse/frontier/settled；边 scan/accept/reject；BF 负环 warning |
| M3-tree | SearchTreeView 动效 | 已验证 | enter/path/prune；可行 vs 最优；棋盘联动提示 |
| M4-ux | 交互抛光 | 已验证 | 非法输入 shake+红边；上一轮结果徽章；Vars 强调；memo 视图；投影密度 |
| M5-docs | 动画文档 | 已验证 | docs/V2_ANIMATION.md；本表与 VERIFICATION 已更新 |



## V3 Workbench / Credible playback
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| A1 | 光标反馈暂停修复 | 已验证 | Visualizer 拥有 idx/playing；`seekCommand` 仅外部 seek；`onStepIndexChange` 只通知；`tests/dom/playback-no-autopause` happy-dom |
| A2 | VarsPanel 不 remount | 已验证 | 去掉 vars-flashKey；与相邻步 diff，仅变更 chip 闪烁 |
| A3 | 显式 arrayOps | 已验证 | Step.arrayOps；bubble/insertion/quick/merge 发真实 ops；禁止 highlights≥2 推断 swap；稳定 elementIds |
| A4 | RunSnapshot 场景 | 已验证 | 不可变 RunSnapshot；分享=快照+cursor；脏横幅；cursor 不写 draft.graph |
| A5 | 阶段轴+键盘 | 已验证 | phase 段而非每 compare；快捷键不抢输入/按钮/滑块/CM/分隔条；最终结果折叠面板 |
| B1 | Dijkstra 代码目录 | 已验证 | `src/codeCatalog/dijkstra`：完整 TS、伪代码、anchors、SourceRange(1-based)、sourceHash；steps 发 codeRefs |
| B2 | CodeBrowser | 已验证 | @uiw/react-codemirror；只读、gutter 执行箭头、高亮、搜索、复制、字号、跟随执行 |
| B3 | Dijkstra AlgoPage 接线 | 已验证 | 运行后 viz∥code；cursor 同步图/变量/代码箭头 |
| C1 | WorkbenchLayout | 已验证 | react-resizable-panels；~55/45；桌面主题/动效/焦点控件；AlgoPage+KnapsackUnit |
| C2 | Lab theme tokens | 进行中 | data-lab-theme 渐进迁移；语义色保留 |
| D | 更多目录/抛光 | 未开始 | 见 V3_WORKBENCH.md |
| E | E2E / 远程 CI | 未开始 | **未 push** |

验证：本地 `npm run test:run`（99）+ `npm run build` 绿。详见 `docs/V3_WORKBENCH.md`、`docs/CODE_COVERAGE_MATRIX.md`。



## V4 Persistent workbench / stability
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| V4-A | Fail-first：Workbench 不再门禁 hasRun | 已验证 | AlgoPage + KnapsackUnit 始终挂载；e2e 覆盖 init 预览+代码面板 |
| V4-B1 | createPreview 纯预览 | 已验证 | `src/preview/createPreview.ts`；非 generateSteps[0]；二分仅 lo/hi；DP null≠0 |
| V4-B2 | 单列 viz + 高度链 | 已验证 | 去掉 1fr/300px 双列；code 仅 Workbench 右栏；min-height:0 / CM ~300px+ |
| V4-C | 无抖动 + 代码滚动 | 已验证 | 固定 banner/stats 槽；nearest 跟随；仅「回到执行行」居中；不滚 window |
| V4-D1 | 表单对齐 + 主题 | 已验证 | input-grid；取消 idle 禁用；LabTheme 首屏 localStorage；切换不 remount |
| V4-D2 | 二分 leftmost 一致 | 已验证 | 算法+目录+anchors；[1,1,1,2]→0；TS/pseudo 分 documentId |
| V4-E | 真浏览器测量 | 已验证 | 5 视口 rAF 采样 outer/scroll/control drift=0；见 docs/V4_STABILITY.md |
| V4-CI | E2E 与 Pages | 已实现待验证 | `e2e.yml` 独立；ci.yml 仍为 Pages 门禁；**未 push** |

验证：`npm run test:run`（116）+ `npm run build` + `npm run test:e2e`（10）绿。截图 `docs/screenshots/v4/`，轨迹 `docs/traces/v4/`。

## 拓展（规划，非本轮）
| 项 | 状态 | 备注 |
|----|------|------|
| Edmonds-Karp / Strassen / 最近点对 | 拓展规划 | `EXTENDED_PLANNED` in curriculum |

## 缺口 / 已知限制
- 数组交换仅为 CSS nudge，未做完整 FLIP 位移动画
- deploy-pages 的 workflow_run 门禁需 push 后在 GitHub Actions 实跑确认
- 教学页（非 AlgoPage）部分算法仍用内置示例参数编辑器较简（nQueens/matrixChain/huffman/背包 AlgoPage）
- Floyd 结果面板未做 i→j 点选路径重建（矩阵视图为主）
- 练习题库为静态+种子抽样，题量有限；可继续扩充
- markdown-it 讲义渲染未引入（讲义仍为 chapters.ts / lab TSX；Chapter 仅支持粗体与行内代码）
- ChatGPT UI / HashRouter / vite `base: '/algorithm-design-viz/'` 保持不变
- oxlint 有若干 React hooks **warning**（非 error）；CI lint 以 exit 0 为准
- 可视化 step 快照开销占墙钟时间主导；实验台/本机 microbench **不是** DOM 渲染证明，亦非算法渐近优越性证明
- V4：移动端仍可能需页面滚动才能看到完整 workbench；play 采样断言的是 scrollY **漂移**
- Transport 仍在 Visualizer 内而非跨双栏底槽
- **未执行 `git push`**

## 验证记录
- `npm run lint` → exit 0（warnings only）
- `npm run test:run` → 16 files / 116 tests passed
- `npm run build` → tsc + vite build OK
- `npm run test:e2e` → 10 passed（Playwright + /usr/bin/google-chrome）
- 本轮 **未 push**


## V14 Inspector / arrays / pan / visibility
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| V14-01 | 桌面 lab-fill 图算法检查器入口 | 已验证 | inspectorLayout inline/drawer；隐藏 inline 时 变量/结果 toggle；不 remount 双检查器；不压垮画布 |
| V14-02 | 检查器展示 step.arrays（Dijkstra dist/parent/done） | 已验证 | 与光标同步；抽屉关闭后再点下一步；∞→10→2 / parent[1]=2 @1280/768/390 |
| V14-03 | GraphView pan 使用 meet/CTM | 已验证 | getScreenCTM 逆变换；重置视图仅相机；pointer capture |
| V14-04 | 严格可见性（topmost hit） | 已验证 | 共享 helper；任意 class 不透明遮罩 fault 必失败；正对照仍过 |
| V14-T | 回归 | 已验证 | vitest 324；pw v14=30；v12+v13=17；mergeSort 6；**未 push** |


## V15 Keyboard / Dijkstra roles / continuous inspect / visibility
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| V15-01 | 抽屉内编辑控件拥有方向键 | 已验证 | keyboardGuard；GraphResultPanel target 不步进；Esc 恢复焦点不改 cursor |
| V15-02 | Dijkstra 当前前驱 / 历史松弛 / focus 叠 settled | 已验证 | parent 派生 tree；success≠checking；数值求解不变；堆/BFS/Prim 回归 |
| V15-03 | 数据面板打开连续 ≥10 步 | 已验证 | drawer-internal transport 同源 goPrev/goNext；aria-modal=false；侧栏 inspect |
| V15-04 | strictGraphVisibility 字段分离 | 已验证 | geometry/hit/text/paint；pe:none / 细字 / 部分裁剪必败 |
| V15-T | 回归 | 已验证 | vitest 350；pw v15=5；v13+v14=42；mergeSort 6；**未 push** |


## V16 Workbench space / keyboard / visibility
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| V16-01 | 原生键盘：按钮/勾选框拥有 Space | 已验证 | keyboardGuard activation controls；一键一次 |
| V16-02 | 运行就绪 + Dijkstra×10 零重试 | 已验证 | waitForRunReady；三历史 flaky 场景各×10 |
| V16-03 | 单一可见性检测器 | 已验证 | measurePageGraphVisibility + window bridge；pe:none |
| V16-04 | 统一 1-based 步数显示 | 已验证 | formatStepCounter；内部 idx 不变 |
| V16-05 | 桌面工作台吃满可用宽度 | 已验证 | lab-fill 去 1180 卡片；数据抽屉占位不盖代码 |
| V16-06 | 放大真实图/数据/代码 | 已验证 | flex 0-basis；标签 ~13px；1366 plot≈322 |
| V16-07 | 布局不打断会话/动画 | 已验证 | resize+数据开关保持 cursor；单播放器 |
| V16-T | 回归 | 已验证 | vitest 359；pw v16=10；v13+v15=17；mergeSort 6；**未 push** |


## V17 输入编辑 / 数据+代码 / 数组预算 / 验收质量
| ID | 项 | 状态 | 备注 |
|----|----|------|------|
| V17-01 | 编辑输入真实 body 高度 | 已验证 | max-height:900px 不再对 editing 套 4.5rem overflow:hidden；e2e 六分辨率 |
| V17-02 | 数据打开保持代码可读 | 已验证 | 去掉 body gutter；Workbench data-data-open；1366 code.w 0→300 |
| V17-03 | 数组/DP 用 stage 预算 | 已验证 | ArrayView 取消硬 160；matrix-scroll lab-fill 超 420；aux compact |
| V17-04 | 验收质量 | 已验证 | runId 绑定；无 force/390 cheat；Dijkstra×10 roles+dist；e2e.yml 上传 test-results |
| V17-docs | 交付文档 | 已验证 | V17_DELIVERY / COVERAGE_MATRIX / screenshots+traces under docs/*/v17/ |
