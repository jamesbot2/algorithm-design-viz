# 高阶算法 · 交付说明（ADVANCED_DELIVERY）

分支 `feature/advanced-algorithms`（本地，**未 push、未部署**）。基线 `34ad7d1`（V34 checkpoint S16）。时间均为 Asia/Shanghai。

## 1. 基线（实测，见 ADVANCED_BASELINE.md）
Vite + React 19 + TS、HashRouter、`base: '/algorithm-design-viz/'`；基线 tsc 0 错、oxlint 48 warnings、vitest 121 文件 / 707 测试。用户仓库 `/workspace/algorithm-design-viz` 的 main 是陈旧的，本工作在独立克隆 `/workspace/adv/clone` 完成。

## 2. 交付范围
- 一级模块「高阶算法」：首页 + 搜索、STL 专题、算法、模板库，每个主题有 讲解 / 演示 / 模板 三个视图（复用旧 workbench、单一 playback controller、六语言目录、语义锚点）。
- 23 个主题（全部在 ADVANCED_COVERAGE.md，由代码元数据生成）：
  - 算法 13：并查集、树状数组、线段树、懒标记线段树、前缀和与差分、离散化、二分答案、单调栈、单调队列、拓扑排序、LCA、LIS、数论（六语言，教学版）。
  - STL 10：lower/upper_bound、priority_queue，以及 vector/迭代器失效、queue/deque、unique+erase、set/multiset/map、string/pair/tuple、标准算法、numeric/bitset、迭代器与比较器（仅 C++）。
- 每个主题：用途、头文件与最低标准、核心 API、复杂度条件、示例、常见错误、相关竞赛算法、可复制模板、反例、竞赛版（core / 含 stdin/stdout 示例）。
- P3：模板库本地收藏 / 最近查看（localStorage，不上传）+ 分类 / 语言 / 验证状态筛选。
- STL 实验是**内置操作模型**（页面固定提示：“演示运行本站内置的操作模型；右侧为参考代码。本页不会执行用户任意编辑的 C++ 源码。”）。类型化操作，不使用 eval；未定义行为（空容器 pop、失效迭代器、越界）在调用**之前**停止，不编造值。
- 竞赛版是参考代码，**不显示“正在执行”箭头**；展示的源码 = 被编译并测试的源码（SHA-256 绑定；改源码 → “验证过期”）。
- 未做：强连通分量（仅出现在路线图列表里，不是可学习卡片）。

## 3. 命令
```
npm ci
npx tsc -b && npx oxlint && npx vitest run
node scripts/gen-advanced.mjs && node scripts/gen-code-langs.mjs        # 从真实源码生成目录/模板/哈希
PATH=/workspace/adv/tools/bin:/workspace/adv/tools/jdk/usr/lib/jvm/java-1.21.0-openjdk-amd64/bin:$PATH \
  node scripts/advanced-validate.mjs                                    # 真实工具链验证
node scripts/advanced-validation-doc.mjs && node scripts/advanced-coverage-doc.mjs
npx playwright test --retries=0 --workers=1                              # 全量 E2E（端口 5173）
node scripts/advanced-record.mjs http://localhost:4173/ docs/advanced    # 录屏/截图（对 vite preview）
node scripts/advanced-firstload.mjs http://localhost:4173                # 首屏 JS 字节
```

## 4. 测试结果（真实）
| 项 | 结果 |
|---|---|
| tsc -b | 0 错误 |
| oxlint | 48 warnings（= 基线 48） |
| vitest | 125 文件 / 804 测试全过（基线 707；新增 97 含 STL golden、Kruskal golden、规则测试） |
| 真实工具链验证（g++ 14.2 ASan+UBSan -Wall -Wextra、Java 21、Python 3.13、Rust 1.85.1、Go 1.27.2、Node 24.20.0） | 每个主题的教学版 / 竞赛核心 / 竞赛完整版全部通过；STL 实验的 TS 模拟器逐步等于真实 g++ golden（每实验 120–250 组随机操作序列） |
| E2E-1（旧 spec，commit 18ad988） | 433/433 |
| **E2E-2**（80712f5，全量 497） | 495 通过 / **2 失败** / 0 flaky / 0 skipped，31.7 min。首批失败 = adv-p1 里两条**过期的断言**（ADV-01 仍把已交付的 segtree 当“未找到”；ADV-02 仍期望 2 张算法卡片，现为 13）。不是产品缺陷，已修测试 |
| E2E-2 之后的产品改动 | Kruskal 共用 `findCompress`（c7304ef），定向复跑 adv-p1 + v14 + v28-p3 = 95/95 |
| **E2E-3**（HEAD 627e9f7；src 与测试与 c7304ef 相同，之后只有文档/脚本提交），全量 497，`--retries=0`，1 worker | **497 通过 / 0 失败 / 0 flaky / 0 skipped，31.0 min** |

开发过程中的首批失败（均已记录在 /workspace/adv/REPORT.md）：adv-p3 首跑 15/18（3 个测试用了不存在的 testid）；adv-labs 首跑 8 个测试缺陷 + **1 个产品缺陷**（comparator 默认草稿在 lbf 处停止）；ADV-24 首跑发现**产品缺陷**：实验脚本重复运行导致 4 个 STL 主题/模板条目重复（React 重复 key），已去重并修了生成脚本的幂等判断；ADV-25 首跑 2 个视口失败（移动端语言标签在“代码”面板里，测试修正）。

E2E 约束：真实鼠标键盘；不用 `force:true` / `evaluate(click)` / 预先 scrollIntoView / 放大视口 / 重试 / 长 sleep。期望值由测试内独立参考实现算出，与主场景实际绘制的 `data-*` 值比较；每次运行都做场景可见性审计。覆盖：五个视口（1366x768、1920x1080、1024x600、390x844、844x390）的代表性流程（进入模块、搜索、讲解、演示、运行、步进、切换语言、暂停、缩小视口再还原、模板、竞赛版/复制/导出、返回演示）= ADV-25；所有 23 个模板页头部完整 = ADV-26。

## 5. 反向对照（故意弄坏，必须失败）
| 对照 | 结果 | 日志（docs/advanced/evidence/） |
|---|---|---|
| 隐藏主场景（`ADV_FAULT=hide-tree`）on p2/p3 | 12 失败 | negctl-hide-tree-p2p3.log |
| 同上，STL 实验 | 首版只失败 1（只读 DOM 属性，对可见性不敏感）→ 加每次运行的场景审计 → 9/9 失败 | negctl-hide-tree-labs.log |
| 导航键泄漏给播放器（去掉 `shouldIgnoreKeyboard`） | ADV-09 失败 2 | negctl-nav-leak.log |
| 模板缺头部字段 | ADV-26 失败 | negctl-header.log |
| 删除某语言（Java）锚点 | vitest families 失败：`lis/java lacks anchor lisSearch`（需重新 `gen-code-langs`） | negctl-anchor.log |
| Kruskal 共用核心取消路径压缩 | Kruskal golden 失败 | negctl-kruskal-core.log |
| STL 模拟器变异（set-map erase、deque 槽位、unique 保留规则、string npos、algo lower_bound、numeric 前缀和、comparator 稳定性、vector 增长） | 各自 golden/规则测试失败 | negctl-stl-sims*.log、negctl-stl-vector-sim.log |
| Java/Go 验证变异（topo、lca、lis、number-theory、lazy 顺序、fenwick-go、segtree-java） | 真实工具链验证失败 | negctl-*-java.log、negctl-validator-*.log |

其中发现过一个**等价变异**（unique 的 `cur[w-1]` → `cur[r-1]` 行为相同），已换成真正改变行为的变异；这类“没失败”的对照不算数。

## 6. Kruskal 共用 DSU 核心
`src/algorithms/kruskal.ts` 的 `find` 现在调用 `src/algorithms/advanced/dsuCore.ts` 的 `findCompress`（一行改动）。验证：`tests/advanced/kruskal.golden.json` 是**重构前**实现在默认图 + 12 个固定种子随机图上的逐步 trace 哈希，重构后字节相同（kruskal-regression 通过）；把核心的路径压缩去掉则该测试失败；E2E-3 含 Kruskal 相关 spec 全过。注：REPORT 中曾有一行“Kruskal 重构跳过”，已被此条取代。

## 7. 体积（`vite build`，在 34ad7d1 与 c7304ef 各构建一次；src 与 HEAD 相同）
| | V34 (34ad7d1) | 本分支 | 差 |
|---|---|---|---|
| 主 bundle | `index-3lOJc5cE.js` 1,164,188 B（gzip 376,091） | `index-BjZLVSBI.js` 1,174,526 B（gzip 378,794） | +10,338 B（+0.9%）；gzip +2,703 B |
| 全部 JS | 35 个文件 1,656,405 B | 106 个文件 2,317,593 B | +661,188 B，几乎全是懒加载块 |
| CSS | 97,805 B | 104,995 B | +7,190 B |
| heavySolve worker | 4,899 B | 103,056 B | +98,157 B（懒加载，含高阶求解器） |
注：任务给出的 V34 主 bundle 名是 `index-CPdCz7C4.js`；本机重建 34ad7d1 得到的是 `index-3lOJc5cE.js`（内容哈希随构建环境不同），**此处的“前”数字来自本机重建，不是你那次构建的文件**。

高阶懒加载块（本分支）：`AdvancedDemo` 124,353 B、`sources.generated`（竞赛版源码）72,769 B、`meta`（模板元数据）41,421 B、`prefs` 44,024 B（含验证库）、`TemplatePage` 8,609 B、`TopicPage` 6,767 B、`IndexPage` 4,337 B、`AdvancedHome` 2,962 B，另有每个主题的 `langs.generated-*.js`（4–18 KB 不等）。

首屏实测（`scripts/advanced-firstload.mjs`，Playwright Chromium 对 `vite preview`，**未压缩**的 JS 响应字节，已真实运行，docs/advanced/evidence/firstload-*）：
- V34 首页：1 个 JS，1,164,188 B。
- 本分支首页：2 个 JS，1,184,658 B（+20,470 B）。
- 本分支冷启动打开 Fenwick 演示：9 个 JS，1,361,843 B。
- 再切换到 Python：11 个 JS，1,413,958 B（切换增量 +52,115 B）。
只测了字节数，没有测时间、没有测 gzip 传输、没有在 V34 上测高阶页（V34 没有）。

## 8. 证据路径
- 日志：`/workspace/adv/logs/`（原件）与 `docs/advanced/evidence/`（副本，E2E 日志已去 ANSI）。
- 过程记录：`/workspace/adv/REPORT.md`。
- 录屏/截图索引：`docs/advanced/INDEX.md`（STL vector、DSU、Fenwick、线段树的真实正常速度 WebM；1366x768、1920x1080、1024x600、390x844、844x390 的真实截图）。
- 375x812 测量：`docs/advanced/v31-style-measure-375x812.jsonl`（ADV-27）。V31 “主数组 / 伴随带”预算只适用于数组场景算法，已由旧的 v31 spec 在 E2E-3 中继续覆盖；高阶页面用的是自己的 `adv-scene`，所以测的是类比量（场景高度 0.31–0.47 个视口、单元最小宽 31 px、无页面横向溢出），不是 V31 原数值。
- 工具链版本与每个展示源码的 SHA-256：`docs/ADVANCED_TEMPLATE_VALIDATION.md`。

## 9. 未验证 / 未做 / 已知限制
- **没有**在 Safari / WebKit / Firefox、真实手机/平板、屏幕阅读器上测试（只用了系统 Chrome / Chromium，含 390x844 等“视口”模拟）。
- **没有**把任何模板提交到真实在线评测（OJ）。
- 许可证：仓库无顶层 LICENSE，页面如实显示“许可证待项目所有者确定”；来源表见 ADVANCED_SOURCES.md，**未逐条核对外部条款**。
- 简报提到的 `SOURCES.md` 与 `ACCEPTANCE-CASES.json` **从未收到**，因此没有按其逐条验收。
- 强连通分量未做。
- STL 实验是内置模型：不执行用户编辑的 C++；`sort` 的内部比较顺序和 `nth_element` 的其余元素顺序标准未规定，页面不画；libstdc++ 的容量增长（翻倍等）是实现行为而非标准保证。
- unique 的读/写指针动画是“示意”（标准只规定结果前缀）。
- 线段树演示中树节点在深色主题下是深色方块（数值可读）——外观观察，非缺陷判定。
- 尚未合并进用户仓库的任何现有分支；仅把分支 fetch 到用户仓库（不检出）。
