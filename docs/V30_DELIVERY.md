# V30 交付（motion fixes）

证据目录（仓库外）：`/workspace/v30/`（REPORT.md、videos/、samples/、logs/）。下文路径除 src/ tests/ 外均相对该目录。

---

# V30 最终交付（分支已推送 origin/v30-motion-fixes；未合并 main / 未部署）

- 分支 `v30-motion-fixes`，基线 `fb5f44c`（V29）。代码最终提交 **d0db816**（M4 补丁：844x390 树打开主卡漂移，见下节；之前为 5233e5e）；其后仅追加本文档提交（docs/V30_DELIVERY.md，不改代码）。
- build-info 仍为 **V29**（未升版本）。仅经授权 `git push origin v30-motion-fixes`（非 force）；未推 main、未部署、未升版本；`git stash` 与约 302 个 docs/screenshots、docs/traces 未暂存改动均未触碰（全部只用显式路径 git add）。
- 所有 E2E 均在完整 HTTP 应用中用真实鼠标/键盘驱动；无 force click、evaluate(click)、预先 scrollIntoView、放大视口或自动恢复；本地 retries=0。

## V30-01 自动播放中手动 Next 接管时交换动画冻结
- 复现：bubble [2,1]（bars 与 cells），点击 Run 自动播放，在交换进行中点击 Next。V29：两个元素的 WAAPI 动画停在 `paused`、currentTime=0，视觉顺序停在 [2,1]，直到下一次操作（samples/before/v30-01-takeover.json：`settled:false, paused:2, frozen b0/b1`）。
- 根因：ArrayView 依据“自动播放标志”暂停动画；手动 Next 关闭自动播放 ⇒ 被误判为用户暂停，新交换的动画被冻结；旧定时器 tick 也可能在接管后再推进一次。
- 修复（0a92adc）：播放状态合并为单一 reducer（cursor + autoplay + intent）；只有显式 Pause 才设置 motionPaused；手动 Next/Prev 停止定时器但新过渡完整播放；接管后的过期 tick 被丢弃。
- 文件：src/components/workbench/playbackIntent.ts（新）、usePlaybackController.ts、src/components/ArrayView.tsx、Visualizer.tsx；测试 tests/v30-playback-intent.test.ts、tests/e2e/v30-motion-fixes.spec.ts、tests/e2e/helpers/v30Motion.mjs、tests/v17-03-array-stage-budget.test.ts（源码守卫更新）。
- 视频：before/after `/workspace/v30/videos/{before,after}-m0-repro-M0-repro-V30-01-a-9016d-t-takeover-bubble-2-1-bars-.webm`
- 数据：samples/before/v30-01-takeover.json → samples/after-videos/v30-01-takeover.json（`settled:true, paused:0, frozen:[]`，visOrder [1,2]）。

## V30-02 Prev 跨越交换时没有反向过渡（瞬移）
- 复现：bubble [2,1]，Next 到交换后，再按 Prev。V29：backActive=0、backMid=0（无中间帧，直接跳回）。
- 根因：动画以 prevStep→step 的数据差计算，Prev 方向没有 from→to 身份映射，操作取自错误一侧的步骤。
- 修复（0a92adc）：每帧携带 {runId, transitionId, from, to, intent}；ArrayView 从“实际显示的快照”（已提交元素 id + 布局中心）按元素身份动画到目标；操作取相邻步骤对中后一步，Prev 反向行进；中断从当前渲染偏移起步；过期 finish 回调按动画身份忽略；seek/reset/新运行为快照跳转。
- 视频：`/workspace/v30/videos/{before,after}-m0-repro-M0-repro-V30-02-P-804bd-transition-bubble-2-1-bars-.webm`、`…-4bc81-ransition-bubble-2-1-cells-.webm`
- 数据：samples/before/v30-02-reverse-{bars,cells}.json（backActive 0, backMid 0）→ samples/after-videos/…（backActive 18, backMid 13，b0/b1 起止 x 与前进方向镜像）；auto→Prev 压力 90/90（stress-prev.log 30 + stress-prev2.log 60）。

## V30-03 缓冲区出现/消失时主数组卡片漂移（含 03b）
- 复现：merge [4,1,3,2] 1366x768 逐步 Next；ghost 占位 ↔ 真实缓冲区切换时主卡片 y 跳动 4.328px；递归树打开时 34.5px；390x844 多位数 90.8px。03b：cells@390 指针出现时换行行下移约 21px；bars 最高元素停入缓冲区时基线上移 27px。
- 根因：ghost 与真实缓冲卡片模板不同（字号/行高/粗细不同，samples/before/v30-03-ghost-real.json：ghost 19.44px vs real 23.77px）；伴随条按“当前帧”内容定高；指针轨道仅在有指针时渲染；bars 区高度跟随当前可见最大值。
- 修复：b573fb1 统一缓冲模板 + 伴随条按整次运行最大内容预留（隐藏惰性 sizer 行）；1202170 指针轨道按运行预算 + 无符号 plot strut；8b76ba8 / 9888172 strut 与有符号 plot 几何禁止 transition（减弱动效下首帧陈旧 75px，后者为 V29 既有问题）；5233e5e 适配保护：run-max 预算放不进舞台时回退到逐帧高度（data-budget=frame），保证主数组不被挤出舞台。
- 文件：src/components/ArrayView.tsx、src/components/Visualizer.tsx、src/styles/scene.css、src/styles.css；测试 tests/dom/v30-companion-template.test.tsx、tests/dom/v30-pointer-track-budget.test.tsx、tests/e2e/v30-motion-fixes.spec.ts。
- 视频：`/workspace/v30/videos/{before,after}-m0-repro-M0-repro-V30-03-m-228ff-ar-main-card-drift-1366x768.webm`、`…-V30-03-g-273a2-ompanion-geometry-computed-.webm`
- 数据：samples/before/v30-03-merge-1366.json（pp y 4.328，4 次跳变）→ samples/after-videos/v30-03-merge-1366.json（pp 0，无跳变）；矩阵 samples/before/buffer/*.json（before 0/24 通过，m2-buffer-before.log）→ samples/final2-buffer/buffer/*.json；运动矩阵 samples/final2-motion/motion/。

## V30-03c（M4/M5）844x390 递归树打开时主卡漂移
- 复现：merge [4,1,3,2]，844x390，打开递归树后逐步 Next（两种动效偏好）。5233e5e：主数组 y p-p **30.19px**（V29 34.52px）。
- 根因：伴随条（缓冲区）按整次运行最大内容预留的 run-max 预算在树打开时放不进舞台 ⇒ 5233e5e 的适配保护回退到逐帧高度（data-budget=frame），伴随条每帧变高变矮，主卡随之移动 30.19px。
- 修复：
  - 03be108 先提交失败回归（回退带必须稳定：844x390 树打开、merge 7 树打开 @1366）。
  - bd38852 run-max 放不进时改为“封顶的稳定伴随带”（整次运行固定高度，内容在带内裁切/滚动），不再逐帧变高。
  - d0db816 封顶带的预算预留主卡的真实内容需求（按非弹性内容测量主卡 need、隐藏 tab 跳过测量、观察主卡子元素尺寸变化），修复 bd38852 下主卡被压缩导致的 v24 回归。
- 结果（@d0db816，零重试）：缓冲矩阵 **48/48**（全部 main x/y/w/h p-p 0px，含 844x390 树打开两种动效）；v24 17/17；V30 spec ×3 87/87（含 03be108 两条回归 ×3）；运动矩阵 83/83；tsc 0；lint 0 错误；单元 672/672；完整 E2E **347/347 passed，0 failed，0 flaky**（29.2 min，logs/full-e2e-m5.log）；干净 clone 生产构建 exit 0：`index-DfMqJ_yq.js`、`index-Ban0OfYW.css`，build-info `V29 · d0db816`（logs/build-d0db816.log）。
- 首次失败（如实记录）：bd38852 的 m4 链 v24 2 失败（“recursion tree open/close … a stays readable”、“merge 390x844 tabs round trip … keeps a readable”）——真实回归，由 d0db816 修复，m5 v24 17/17；m4 运动矩阵 82/83（crossrow-390-cells rep2 “not settled”），m5 83/83 及完整 E2E 未复现，原因未解释。

## 测试结果（@5233e5e，均为零重试；@d0db816 结果见上节）
| 项目 | 结果 | 日志 |
|---|---|---|
| tsc -b | exit 0 | logs/tsc-5233e5e.log |
| lint (oxlint) | exit 0（仅既有 CodeBrowser.tsx warnings，无 error） | logs/lint-5233e5e.log |
| 单元/DOM (vitest) | 117 文件 / 672 通过 | logs/unit-5233e5e.log |
| after-videos | 5/5 | logs/after-videos.log |
| 缓冲矩阵（4 视口 × 2 动效偏好 × 6 用例） | **46/48**（2 失败 = 844x390 merge-tree-open 两种动效，见遗留） | logs/buffer2.log |
| 运动矩阵 ×3 | 83/83 | logs/motion2.log |
| repo V30 spec ×3 | 84/84 | logs/repo-x3-2.log |
| **完整 E2E（本地 clone，含 .git）** | **346/346 passed，0 failed，0 flaky**（27.4 min） | logs/full-e2e2.log |
| 生产构建（干净 clone @5233e5e） | exit 0：`index-0DaeIWVY.js`、`index-0dzbhKPe.css`，build-info V29 / sha 5233e5e | logs/build-clean.log |

注：链中 logs/build.log 在跑完 E2E 的同一 clone 中构建（E2E 会重写 docs/screenshots ⇒ sha `5233e5e-dirty`，资源名 index-D593FtxO.js）；以干净 clone 的构建为准。日志中出现的 “02 flaky” 是用例名 “V16-02 flaky historical …”，不是 flaky 结果。

## 灵敏度对照（注入 → 失败；恢复 → 通过）
- a（撤销 V30-01 修复）：sens-a.log 4/4 失败（V30-01 bars×3 + cells）。
- b（撤销 V30-02 修复）：sens-b.log 9/9 失败（V30-02 bars/cells ×3 + auto→Prev ×3）。
- c（撤销 V30-03 修复）：sens-c.log 4/4 失败；sens-c-harness.log 缓冲矩阵同样失败。
- 恢复（HEAD 5233e5e）：同一 spec ×3 84/84（logs/repo-x3-2.log），缓冲矩阵 46/48（遗留项除外）。
- 注入副本：/workspace/v30/sens-{a,b,c}/（与 HEAD 的 diff 仅在 ArrayView.tsx / scene.css / usePlaybackController.ts）。

## 首次失败与 flaky（如实记录）
- 1202170 repo ×3：74/75，`auto→Prev mid-swap rep 3` 首次失败一次；后续 stress-prev 90/90 未复现。
- 9888172 链：motion 81/83（crossrow-390-bars rep1 “back→16 not settled in 2000ms” 但落点正确；reduce bubble-21-bars rep3 落点偏 56.25px）；repo ×3 80/81（:323 signed first frame）。根因：检测器在 Run 后舞台自身收缩期间（viz-canvas 406→331px，V29 既有）采样 ⇒ 14f4a0b 让 waitSettled 同时要求几何静止 3 帧；rep323 40/40、stress-f0 2/40→0/40、bubble-21 reduce 10/10。crossrow 的 “not settled” **原因未解释**，隔离复跑 6/6 + 后续 83/83 未复现。
- 完整 E2E #1（@9888172 树拷贝）：341/4 失败——v23 build-info `V29 · unknown`（拷贝无 .git，环境问题）；v24 tree-open ×2（真实问题 → 5233e5e 修复）；v30:323（检测器 → 14f4a0b）。#2 @5233e5e：346/346。

## 遗留 / 未验证
1. ~~844x390 merge 树打开主数组 y p-p 30.19px~~ → 已由 bd38852 / d0db816 修复（p-p 0px，见 V30-03c）。
2. 产品侧瞬态：Run 后舞台高度约 40ms 内 406→331px 收缩（V29 既有，未在 V30 修改）。
3. crossrow-390-bars（9888172 链）与 crossrow-390-cells（m4 链）各偶发 “not settled” 一次，未解释，均未复现。
4. 未验证：六种语言 CDN 实际加载、Worker 路径、Firefox / WebKit、真实设备、真实浏览器缩放。

## 授权说明
代码 HEAD d0db816（+ 文档提交）已按授权推送到 `origin/v30-motion-fixes`（非 force）。**未**合并/推送 main、**未**部署、**未**升版本号（build-info 保持 V29）；这些仍需用户另行授权。
