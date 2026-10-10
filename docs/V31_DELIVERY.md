# V31 交付（移动端主场景优先预算 + 部署门禁）——仅本地

- 分支 `v31-mobile-budget`，基线 `03898d8`（= origin/main = 线上 V30）。**未 push、未部署、未改远端配置、未升版本**（vite.config.ts `__APP_VERSION__` 仍为 `'V30'`，构建产物 build-info = `V30 · <sha>`）。
- `git stash@{0}` 与约 308 个 docs/screenshots、docs/traces 未暂存改动均未触碰；所有提交均用显式路径 `git add`。
- 过程记录：仓库外 `/workspace/v31/REPORT.md`（每个检查点一行），日志 `/workspace/v31/logs/`；入库副本 `docs/v31/`。
- 所有 E2E 为真实鼠标/键盘/滚轮交互；无 force、evaluate 点击、预滚动、放大视口、自动恢复、放宽阈值；`--retries=0`。未新增全局 `!important`，未缩小已有字号（新增的 `font-size` 仅用于新增的溢出提示胶囊/箭头）。

## 提交
| SHA | 内容 |
|---|---|
| 301e44c | M0：V29 fb5f44c / V30 03898d8 真实包复现（测量、截图、harness） |
| 35435fc | M1 先写失败测试：tests/e2e/v31-mobile-budget.spec.ts（V30 代码 3/3 失败） |
| 9728602 | 主场景优先伴随区预算（share/typical/main-need），单行横向滚动卡片 + 指针跟随 + 溢出提示；aux 按钮不逐字换行；sizer 自然高度 |
| 0a70996 | V31-02 部署门禁（CI/E2E 任意顺序完成触发）+ mock REST 测试 |
| fa4761a | compact 带 = 本次运行最高的 compact 帧；主区 need 作为下限；bars 放不下时自动转 cells；safe center + 最小 1px 间距 |
| 1e1173c | 预算单元测试（compact / compact-tight / natural run-max） |
| 6d71daa | 宽屏时 aux 条与两张卡同行（1024/1366：117→87px） |
| b857c9d | M2 矩阵 spec（n=7/16 整轮 ×6 视口 + n=24/32 可达性 ×6）；无符号 bars 发布下限（chrome+32px）为主区 need |
| 07233c2 | harness：清理 oxlint 未使用绑定；新增 motion.mjs、table.py |
| a868060 | docs/v31/final 截图 + docs/v31/m4 日志 |
| （本文档） | docs/V31_DELIVERY.md |

## 改动文件（03898d8..HEAD，不含 docs）
- `src/components/companionBudget.ts`（新，71 行）：伴随区预算模型。
- `src/components/ArrayView.tsx`：发布主区 need / bars 下限、compact sizer、横向滚动卡片指针跟随、bars→cells 自动切换。
- `src/styles/scene.css`、`src/styles.css`：capped 带单行滚动 + 溢出提示；aux nowrap；`.bars-wrap` `justify-content: safe center` + `--bars-gap: clamp(1px, …, 6px)`。
- `.github/workflows/deploy-pages.yml`、`scripts/deploy-gate.cjs`（新）：部署门禁。
- 测试：`tests/e2e/v31-mobile-budget.spec.ts`、`tests/e2e/helpers/v31Budget.mjs`、`tests/v31-companion-budget.test.ts`、`tests/v31-deploy-gate.test.ts`。
- harness：`docs/v31/harness/*.mjs`、`table.py`。

## 根因（M0，375×812，mergeSort 降序输入）
1. **n=7：退化的 aux 条最小内容撑高 run-max**。最高 sizer 是空缓冲 ghost 帧：`.scene-aux-bar`（flex 1 1 0）被 295px 的 ghost 挤到 43px，按钮「展开递归树」逐字换行 → 按钮 89px → 行高 203px。V29 117 → V30 203。
2. **n=16：V30 的 guard 让伴随区优先，主区只剩下限**。sizerMax 352（left 8 + right 8 两张 153px 卡片堆叠 + aux 行）> avail(≈440) − floor(160) → capped，cap = clamp(avail−floor, sizerMin, sizerMax) = 286.4 → 主区只得 160px 下限 → 最高柱 32px，`k` 指针压在卡片边框上。没有份额上限，任何最高帧放得下的运行都会全拿走。
3. **n=32 非单调**：主区 cells 按内容 need（359）分配，bars 只按下限分配，所以 n=32 主区 359 > n=16 主区 160。
4. 附带发现（V29/V30 同样存在）：n=16 @375 第 0 列 x=−1.5，n=24 第 0 列 x=−97，不可达；844×390 无符号 bars 在 32px 下限时溢出卡片 9.5px。

## 预算模型（V31）
- 主区份额下限 share = 2/3 场景（伴随区 ≤ 1/3），下限为 typical（中位）形状，主区 need 由主视图发布（cells 内容 need；bars 下限 = chrome + 32px plot）。
- capped 时伴随区 = 本轮最高 **compact** 帧（单行卡片，横向滚动 + 指针跟随 + 「更多」提示），整轮固定，不随帧跳动。
- bars 在 `n·18 + (n−1)·1 > 宽度` 时自动转 cells（375 下 n≥17），用户仍可手动选 bars（此时 safe center，溢出只向可达的末端）。

## 375×812 n=16 第 31 帧（idx30，「比较 left[0]=12 与 right[0]=11」）
来源：docs/v31/m4/m4-frame31.json（本次 M4 重测，与 M0 完全一致）。
| 版本 | 伴随区高 | 主区高 | 最高柱 | budget | stage clientH |
|---|---|---|---|---|---|
| V29 fb5f44c | 117.02 | 344.38 | 197 | 无（逐帧） | 467 |
| V30 03898d8 | 286.39 | 160（=下限） | 32 | capped | 452 |
| **V31 b857c9d** | **117.02** | **329.14** | **181** | capped/compact | 452 |

n=7（idx5）：V29 112.69 / 348.70 / 217；V30 203.47 / 242.69 / 94（run-max）；V31 117.02 / 329.14 / 180（capped/compact）。

## V29 / V30 / V31 尺寸矩阵（M2，docs/v31/m4/m2-tables.md）
单元格 = 默认帧伴随区高 / 默认帧主区高 / midCompare 帧最高柱（cells 表示主区为单元格）/ 全轮最小主区份额 / 全轮主卡 x,y,w,h 最大峰峰值（px）；⇕ = stage 需滚动。V29 仅测了 n=16。

| case | V29 | V30 | V31 |
|---|---|---|---|
| n7-375x812 | — | 203 / 243 / 94 / 54% / 0 | 117 / 329 / 180 / 74% / 0 |
| n7-390x844 | — | 203 / 290 / 141 / 59% / 0 | 117 / 376 / 228 / 76% / 0 |
| n7-844x390 | — | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 164 / 32 / 65% / 0 ⇕ |
| n7-1024x600 | — | 117 / 169 / 37 / 59% / 0 | 87 / 199 / 67 / 70% / 0 |
| n7-1366x768 | — | 87 / 238 / 106 / 73% / 0 | 87 / 238 / 106 / 73% / 0 |
| n7-1920x1080 | — | 87 / 697 / 565 / 89% / 0 | 87 / 697 / 565 / 89% / 0 |
| n16-375x812 | 113 / 349 / 197 / 31% / 254 ⇕ | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 329 / 181 / 74% / 0 |
| n16-390x844 | 113 / 381 / 229 / 31% / 239 ⇕ | 318 / 160 / 32 / 33% / 0 ⇕ | 117 / 361 / 213 / 76% / 0 |
| n16-844x390 | 82 / 160 / 32 / 44% / 121 ⇕ | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n16-1024x600 | 82 / 203 / 51 / 44% / 121 ⇕ | 125 / 160 / 32 / 56% / 0 ⇕ | 87 / 199 / 51 / 70% / 0 |
| n16-1366x768 | 82 / 242 / 90 / 44% / 121 ⇕ | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n16-1920x1080 | 82 / 701 / 549 / 74% / 121 | 203 / 580 / 433 / 74% / 0 | 203 / 580 / 433 / 74% / 0 |
| n24-375x812 | — | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 528 / cells / 82% / 0 ⇕ |
| n24-390x844 | — | 318 / 160 / 32 / 33% / 0 ⇕ | 117 / 528 / cells / 82% / 0 ⇕ |
| n24-844x390 | — | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n24-1024x600 | — | 125 / 160 / 32 / 56% / 0 ⇕ | 87 / 199 / 51 / 70% / 0 |
| n24-1366x768 | — | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n24-1920x1080 | — | 203 / 580 / 433 / 74% / 0 | 203 / 580 / 433 / 74% / 0 |
| n32-375x812 | — | 87 / 359 / cells / 81% / 0 ⇕ | 117 / 691 / cells / 86% / 0 ⇕ |
| n32-390x844 | — | 87 / 391 / cells / 82% / 0 ⇕ | 117 / 691 / cells / 86% / 0 ⇕ |
| n32-844x390 | — | 87 / 160 / cells / 65% / 0 ⇕ | 87 / 285 / cells / 77% / 0 ⇕ |
| n32-1024x600 | — | 87 / 199 / cells / 70% / 0 ⇕ | 87 / 447 / cells / 84% / 0 ⇕ |
| n32-1366x768 | — | 87 / 238 / cells / 73% / 0 ⇕ | 87 / 366 / cells / 81% / 0 ⇕ |
| n32-1920x1080 | — | 352 / 432 / cells / 55% / 0 | 87 / 697 / cells / 89% / 0 |
| n16-375x812-tree | 113 / 165 / 33 / 31% / 254 ⇕ | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 182 / 33 / 61% / 0 |
| n16-844x390-tree | 82 / 160 / 32 / 44% / 121 ⇕ | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n16-1366x768-tree | 82 / 242 / 60 / 31% / 269 ⇕ | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n16-375x812-cells | 113 / 349 / cells / 31% / 254 ⇕ | 87 / 359 / cells / 81% / 0 | 117 / 366 / cells / 76% / 0 ⇕ |

补充（同表第二部分）：V31 所有 case 单一 runId；带内溢出帧 0 帧缺少提示；伴随区标签不可读帧 V30→V31 全部降为 0（如 n16-1024x600 51→0、n32-375x812 207→0）；同步比较/写回帧全部一致（如 n16 32/32 · 32/32）。
动画中段采样（docs/v31/m4/m2-motion.log，rAF + 真实 Next 点击）：V30 与 V31 在 375×812 n16、844×390 n16、375×812 n7、1366×768 n24 上主卡与带高峰峰值均为 0。
如实说明：844×390 下 n=16/24 bars 最高柱仍为 32px 下限（V30 相同），主区从 160 增到 180、份额 65→67%，stage 仍需滚动；1920×1080 n16/n24 V31 与 V30 相同。

## 截图（真实渲染，375×812，默认字号，递归树关闭）
渲染自本地静态服务的真实包：V29 index-C9evicHH.js（fb5f44c 重建）、V30 index-C1nS38sl.js（= Pages 部署产物）、V31 index-Cgi6vOke.js（干净 clone @b857c9d 构建），2026-10-10 12:14–12:15 CST。
- n=16 第 31 帧：`docs/v31/final/final-v29-375x812-n16-idx30.png`、`final-v30-375x812-n16-idx30.png`、`final-v31-375x812-n16-idx30.png`
- n=7 idx5：`docs/v31/final/final-v29-375x812-n7-idx5.png`、`final-v30-375x812-n7-idx5.png`、`final-v31-375x812-n7-idx5.png`
- M0 原始复现：`docs/v31/m0/`；M2 关键帧（仓库外）：`/workspace/v31/shots/m2/{v29,v30,v31}/`

## 命令与结果（Chromium /usr/bin/google-chrome，@playwright/test 1.63，DPR 1，零重试）
| 项 | 命令 / 位置 | 结果 |
|---|---|---|
| 全量 E2E | `/workspace/v31/clone`（本地 clone，含 .git，@b857c9d，node_modules 软链）`npx playwright test --retries=0`，1 worker | **375 passed / 0 failed / 0 flaky**，31.5 min（12:09:26→12:54:49 CST）；其中 V31 spec 27、V30 spec 30。docs/v31/m4/m4-e2e-full.log |
| tsc | `npx tsc -b`（同 clone） | EXIT 0 |
| lint | `npm run lint`（oxlint） | 0 error，53 warning（4 条为 harness，已在 07233c2 清除；其余均为既有代码，非 V31 新增） |
| 单元/DOM | `npx vitest run` | 119 files / 700 tests passed |
| 生产构建 | `npm run build`（干净 clone，工作区无未提交改动） | index-Cgi6vOke.js（1,159.07 kB）、index-DMdn59YQ.css（96.60 kB）、heavySolve.worker-yu8hA-m_.js；内置 `V30 · b857c9d`（build-info 未升） |
| 门禁单测 | `npx vitest run tests/v31-deploy-gate.test.ts` | 16/16 |
| 预算单测 | tests/v31-companion-budget.test.ts | 12/12 |
| V31+V30 回归 | reg5 | 57/57（V31 27 + V30 30） |

### 首次失败（如实记录）
- M1：新 spec 在 V30 代码上 3/3 失败（预期，测试先行）：share 0.358 < 0.55；n=7 带 203 > 162.7；frame 118 溢出无提示。docs/v31/m1-first-fail.log
- 门禁单测首跑 15/16：dispatch 触发的 E2E 重跑被判 'ignored' → 改为与 push 同等接受。
- 预算单测首跑 11/12：测试自身算术错误（scene 900 时 352 > share 300），改为 1100；非产品问题。
- M2 spec 首跑 9/10（docs/v31/m2/m2-e2e-1.log）：n=24 844×390 末槽绘制比例 0.9889（无符号 bars 在 32px 下限溢出卡片 9.5px，V30 同样）。修复尝试 1（把溢出的 .bars-wrap 计入 need）导致 V30-03 fit-guard 回归（RO 延迟棘轮，主卡底 572 > stage 503；reg4 29/30，docs/v31/m2/reg4-v30.log）→ 撤回；修复 2（bars 发布 data-bars-floor = chrome + 32）→ V31 27/27 + V30 30/30 零重试。
- M4 全量 E2E：无失败，无需 flaky 复跑。

## 部署门禁变更（0a70996，仅本地，未推送）
- `deploy-pages.yml`：`workflow_run` 监听 `[CI, E2E]` 的 completed（branches: main）+ `workflow_dispatch`；gate job 调用 `scripts/deploy-gate.cjs`。
- 判定：同一 SHA 的 CI 与 E2E 均成功才部署，**任意完成顺序**均可——先完成的事件发现另一个仍在运行 → `waiting`（干净退出，有限宽限期内重查）；后完成的事件 → `deploy`。任一失败/取消 → `blocked`（红色，与 waiting 区分）。SHA 不再是 main 最新 → `stale`（gate 和部署前各检查一次 tip-of-main）。部署 job 串行（concurrency `pages`，不取消）并做同 SHA 重复检查 → `duplicate` 空操作。pull_request 触发的运行一律忽略；手动 dispatch 也要求同 SHA 双绿。
- mock REST 单测 16/16：四种完成顺序、近同时完成仅一次部署、两个 gate 都通过时第二次部署前检查跳过、跨 SHA（迟到的旧 SHA 绿事件不覆盖新 main；gate 与部署之间 main 前进则跳过）、PR 运行忽略、运行列表滞后、宽限重查、红后绿重跑算通过。
- 时序证据（V30 03898d8 实际发生）：CI 完成 15:23:14Z（23:23:14 CST），旧部署 workflow_run 15:23:17Z 触发并因 E2E 未完成而失败；E2E 37951233200 于 16:22:24Z（00:22:24 CST 10-10）完成（约 60 分钟）；只能靠 16:23:17Z 手动 dispatch 部署。新门禁下 E2E 完成事件本身就会触发部署。

## 保留的 V30 修复
V30-01（自动播放中手动接管不冻结）、V30-02（Prev 反向过渡）、V30-03/03b/03c（缓冲出现/消失、树打开、指针行时主卡不漂移）—— tests/e2e/v30-motion-fixes.spec.ts 30/30 在全量运行中通过；M2 矩阵中 V31 全部 case 主卡峰峰值 0，动画中段采样峰峰值 0。

## 未验证
- 真实手机（iOS Safari / Android Chrome）与真实触控滚动；只在桌面 Chromium headless 模拟视口。
- Firefox / WebKit 未跑。
- 真实浏览器缩放 / 系统字号放大未测（只测默认字号）。
- 新部署门禁尚未在 GitHub Actions 上真实运行（仅 mock REST 单测）；需推送到 main 后观察首轮 CI/E2E 事件的 waiting → deploy。
- V29 包为 fb5f44c 重建（原 Pages 产物已过期），CSS 哈希一致，JS 仅内置 define 不同。

## 授权说明
推送分支、合并 main、部署、升 build-info 版本均需另行授权；本地状态已就绪。
