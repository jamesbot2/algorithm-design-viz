# FINAL_DELIVERY — algorithm-design-viz（M0–M4）

Date: 2026-09-15  
Baseline: `35709de7559ef9678bbb66ca59ffc33bf0780516`  
**No git push**（本地 commits 仅）。

---

## 1. Stages / features done

| Stage | Status | Highlights |
|-------|--------|------------|
| **M0** | 已验证 | 复杂度对齐、二分禁静默排序、图边 id/方向、矩阵/数组高亮、输入/执行分离、边界语义、Vitest |
| **M1** | 已验证 | Trace 协议、typed registry、runner、freeze、∞ JSON |
| **M2** | 已验证 | 双导航、背包多策略教学单元、N皇后/矩阵链/Huffman/最大子数组、LCS/编辑重建、归并树 |
| **M3** | 已验证 | 图编辑器、堆 Dijkstra、练习三判定、实验台导出、场景 hash、本地进度、参考讲义 |
| **M4** | 已验证（本地） | CI workflow、文档集、内容安全（无用户 HTML）、验收绿、Playwright **推迟** |

**Real features（产品面）：** 中文理论章节、逐步可视化（数组/矩阵/图/搜索树）、草稿→运行流、教学单元 `/teach/knapsack`、练习 `/practice`、实验 `/experiment`、场景分享、lab 参考代码、HashRouter + GitHub Pages 配置。

**非功能 / 未宣称：** 非 LMS；C++ 不在 CI 执行；实验计时非 DOM 证明；Pages 可能落后直至授权 push。

---

## 2. Key files / architecture

```
src/algorithms/          # 各算法 generateSteps + meta；index 旧表；registry typed
src/core/trace/          # Trace / Validate 类型与协议版本
src/core/runner/         # runAlgo budget/cancel
src/core/snapshot/       # freezeSteps
src/core/json/           # infinity encode/decode
src/core/graph/          # validate + presets
src/components/          # Visualizer, Array/Matrix/Graph views, GraphInput
src/pages/               # Home, Chapter, AlgoPage, teach/practice/experiment
src/practice|scene|experiment/
src/data/curriculum.ts   # 双导航与完成标记
.github/workflows/ci.yml           # M4 CI
.github/workflows/deploy-pages.yml # 未改；push→Pages
docs/*                   # 状态 / 验证 / 课程地图 / Trace / 贡献 / 许可说明 / 本文
```

数据流：用户草稿 → validate → `solve`/`generateSteps` → `Trace`/`Step[]`（冻结）→ Visualizer。

---

## 3. Fixes + evidence

| Fix | Evidence |
|-----|----------|
| Chapter 去掉 `dangerouslySetInnerHTML`，仅 React 解析 `**` / `` ` `` | `src/pages/Chapter.tsx`；`rg dangerouslySetInnerHTML` 无命中 |
| 新增 CI：lint + test + build | `.github/workflows/ci.yml` |
| 文档诚实更新 M0–M4 | `docs/IMPLEMENTATION_STATUS.md` 等 |
| 保留 deploy-pages 独立 | 文件未改；关系写在 VERIFICATION / README |
| 验收命令绿 | 见 §4 |

性能随记（含可视化快照，见 VERIFICATION）：小图堆 Dijkstra 未必更快；mergeSort n=200 ~100ms 量级墙钟——**不作速度宣传**。

---

## 4. Commands + pass/fail

| Command | Result |
|---------|--------|
| `npm run lint` | **PASS** exit 0（warnings only） |
| `npm run test:run` | **PASS** 8 files / **64** tests |
| `npm run build` | **PASS** tsc + vite；JS ~419 kB |
| `git push` | **NOT RUN**（按要求） |
| Playwright / 远程 CI / 线上 Pages | **未验证** |

---

## 5. Incomplete / unverified / need-auth

- **Need auth:** `git push` 到 `origin`（`https://github.com/jamesbot2/algorithm-design-viz.git`）；此后远程 CI 与 Pages 才会跑/更新  
- Playwright E2E：推迟；手工清单见 `docs/VERIFICATION.md`  
- 部署闸门：Pages **不**等待 CI（有意未改远程设置）  
- 拓展算法：Edmonds-Karp / Strassen / 最近点对未做  
- 许可：无根 `LICENSE`；见 `docs/LICENSE_NOTES.md`（未发明 MIT）  
- M2-teach「教学页结构」标为已实现待验证（背包完整；其它算法主要靠 AlgoPage meta）  
- oxlint hooks warnings 未清零  

---

## 6. Local start + best acceptance paths

```bash
cd /workspace/algorithm-design-viz
npm ci          # 或已有 node_modules 时直接
npm run dev     # 开发
# 验收：
npm run lint && npm run test:run && npm run build
npm run preview # 可选静态预览
```

**Best acceptance paths（浏览器）：**

1. `/#/algo/binarySearch` — 未排序拒绝；先排序再查  
2. `/#/algo/dijkstra` + 图编辑 — 运行与路径面板；可对照 `/#/algo/dijkstraHeap`  
3. `/#/teach/knapsack` — 多策略与反例  
4. `/#/practice` — 三判定与多解裁判  
5. `/#/experiment` — 导出 CSV/JSON  
6. `/#/chapter/graph` — 理论章节排版（粗体/代码）无 HTML 注入  

线上 https://jamesbot2.github.io/algorithm-design-viz/ 在未 push 前可能仍是旧构建。
