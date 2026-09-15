# V3 最终交付（本地，未 push）

基线 HEAD（开工）：`a3f6dd34734b37b05dce8c9a7c917b5c0949f066`  
当前本地 tip：`b31e477`（含 `3f063e8` A–C + `b31e477` D/E）

## 1. 修复与关键文件

| 问题 | 修复 |
|------|------|
| 播放回传暂停 | Visualizer 自持 idx/playing；父层仅 `seekCommand`；`onStepIndexChange` 只通知 |
| VarsPanel remount | 去掉 `vars-${flashKey}`；按相邻步 diff 闪烁 |
| 伪交换 | `arrayOps` 显式 compare/swap；不再用 highlights≥2 推断 |
| scene 草稿污染 | RunSnapshot 不可变；分享用快照+cursor |
| 完整代码缺失 | `src/codeCatalog` + CodeMirror CodeBrowser + 工作台双栏 |

关键路径：`src/components/Visualizer.tsx`、`AlgoPage.tsx`、`ArrayView.tsx`、`codeBrowser/`、`workbench/`、`codeCatalog/**`、`core/runSnapshot.ts`、`tests/dom/*`

## 2. 完整代码支持矩阵

见 `docs/CODE_COVERAGE_MATRIX.md`：所列可运行算法/背包策略均有完整 TS 文档、锚点、`sourceHash`、步骤 `codeRefs`，AlgoPage/`KnapsackUnit` 经 `getCatalog` 接入。

## 3. 工作台 / 主题 / 动画

- `react-resizable-panels`：约 55% 可视化 / 45% 代码
- Lab 深浅主题 token；桌面动效/主题/专注入口
- V2 动效保留；不回退可信性修复

## 4. 命令结果（本机）

| 命令 | 结果 |
|------|------|
| `npm run test:run` | **107 passed** / 14 files |
| `npm run build` | **OK**（主包 ~1MB，有 chunk 体积警告） |
| `npm run lint` | exit 0（hooks warning） |
| Playwright E2E | **未安装、未运行** |
| 多尺寸真实截图/录屏 | **未做** |
| `git push` | **未执行**（需授权） |

## 5. 未完成 / 未验证

- Playwright 与真实多分辨率截图/录屏
- 部分图/DP 步仍用粗粒度默认锚点（合法 id，非 message 猜行）
- 活动选择无自定义表编辑器
- 主 JS chunk 较大，可后续 code-split
- 远程 CI/Pages 需授权 push 后验证（Pages 仍经 CI workflow_run 门禁）

## 6. 本地启动与验收路径

```bash
cd /workspace/algorithm-design-viz
npm ci && npm run dev
```

重点：`/#/algo/dijkstra`（连续播放≥5步+代码箭头）、`/#/algo/lcs`（填表+恢复）、`/#/algo/nQueens`（递归帧+树）、`/#/teach/knapsack`（策略切换代码与轨迹）、练习/实验/scene 恢复回归。
