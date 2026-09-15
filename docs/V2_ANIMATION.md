# V2 动画与动效说明（M2–M4）

本文件描述可视化「怎么动」——仅参考开源可视化思路，无专有代码拷贝。实现以 **CSS 变量 + keyframes** 为主，辅以轻量 React 状态；无 framer-motion。

## 统一动效系统（M2）

| 模块 | 路径 | 行为 |
|------|------|------|
| Duration / easing tokens | `src/theme/motion.ts` | fast/normal/slow/step/pulse/settle；`speedFeelMultiplier` 让播放速度不只改 interval |
| Semantic colors | `src/theme/semanticColors.ts` | compare/focus/update/accepted/rejected/pruned/optimal/done/error/frontier/settled + 中文图例标签 |
| Motion context | `src/theme/MotionContext.tsx` | `prefers-reduced-motion` + 顶栏用户切换（跟随系统/标准/减弱）；投影密度 |
| CSS | `src/styles/animation.css` | banner 交叉淡入、vars flash、数组/矩阵/图/搜索树关键动画；`.motion-reduced` 关闭动画 |

**Visualizer 步进层**

- Banner：`viz-banner-enter` + flash（交叉淡入感）
- 进度条：拖动时 `scrub-preview` 显示目标步消息；时间轴上 `phase-marker` 可点跳阶段
- 播放键：`tactile` / `is-playing` 反馈；有效 interval 经 speed-feel 调整
- 图例：只列出当前轨迹实际出现的 role（含边/树/窗口）

## 四视图（M3）

### ArrayView
- 比较：`arr-compare-pulse`
- 交换：CSS `--swap-dx` 轻 nudge（非瞬移；真正 FLIP 交换未做，避免依赖布局测量）
- 更新：`arr-update-settle` flash+settle
- 有符号基线（既有）+ 指针 tag 过渡
- `Step.ranges`：current / best 色带（Kadane / 分治最大子数组已接线）

### MatrixView
- 强写（`hl-write` flash）/ 弱读（glow）/ 路径（path flow）
- `labelHints`：行列/物品标签与当前 cell 同步高亮；`antiExample` 虚线框+横幅（背包正向更新反例）
- N 皇后 board 与搜索树联动提示

### GraphView
- 当前节点：scale + glow + pulse；frontier / settled 推断或 `nodeRoles`
- 边：checking/relaxing 虚线扫描；accepted/tree 发光；rejected 灰+shake
- 负环：`graph.warning` + `neg-cycle` 节点样式（BF 已接线），不暗示合法最短路
- 有向箭头独立 marker；双向边曲线保持

### SearchTreeView
- 进入动画；`on-path` 当前路径；pruned/rejected fade+shrink
- 中文状态徽章：探索中/剪枝/可行/最优/拒绝/根
- 与棋盘联动文案（board 矩阵存在时）

## 交互抛光（M4）

- 非法输入：`input-panel.has-errors` 红边 + `shake`；错误列表 fade-in（占位动画，避免硬跳）
- 图算法校验失败且仍保留旧轨迹：徽章「上一轮结果」（Visualizer + GraphResultPanel）
- VarsPanel：变更 chip flash（限时，避免 thrash）；结果快照轻过渡
- 视图 `memo`；动画不重新 solve；快照仍走既有 freeze
- 移动端：viz-body 单列；顶栏「投」切换投影密度

## 已知缺口
- 数组交换未做完整 FLIP 位移动画（仅 nudge）
- 图算法 `nodeRoles` 多为推断，仅 BF 负环显式写入
- Floyd 负环以矩阵对角强调为主，无独立 GraphView 警告（Floyd 无 graph 态）
