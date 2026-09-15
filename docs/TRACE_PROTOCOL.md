# Trace 协议：如何新增算法

协议版本：`TRACE_PROTOCOL_VERSION = 1`（`src/core/trace/types.ts`）。

## 目标产物

一次成功运行应得到：

```ts
{
  protocolVersion: 1,
  algoId: string,
  implName?: string,
  implVersion?: string,
  status: 'ok' | 'validation_error' | 'algorithm_error' | ...,
  steps: Step[],          // 冻结后的可视化快照序列
  result?: AlgoResult,    // ok / code / message / data
  inputSnapshot?: unknown // 校验后的输入
}
```

`Step` 字段见 `src/types/step.ts`（arrays / matrices / graph / matrixTargets / arrayPointers / phase / searchTree / result …）。

## 推荐步骤

1. **实现** `src/algorithms/<id>.ts`  
   - 导出 `meta`（含 `id/title/complexity/implName/implVersion/timeComplexity/...`）  
   - 导出 `generateSteps(...)`：返回 `Step[]`；错误用终端 step 的 `result: { ok:false, error }`，**不要静默成功**  
   - 复杂度文案必须对齐真实实现（例：朴素 Dijkstra ≠ 堆）

2. **挂载旧表** `src/algorithms/index.ts`  
   - 加入 `algorithms` 记录，供 AlgoPage / 章节芯片使用

3. **typed 适配** `src/algorithms/registry.ts`  
   - `validate(raw) → { ok:true, value } | { ok:false, issues }`  
   - `solve(input) → { trace, result }`，内部用 `wrapLegacySteps` + `freezeSteps`  
   - 把条目放进 `registry`

4. **导航 / 课程**（可选但推荐）  
   - `src/data/curriculum.ts`、`src/content/nav.ts`、`src/data/chapters.ts`  
   - 完成标记只在确有 theory/demo/practice 时勾选

5. **图算法额外**  
   - 使用 `layoutGraph` + 稳定 `edge.id`（`utils/edgeId`）  
   - 接入 `GraphInput` / `validateGraphDraft`（`src/core/graph/`）  
   - AlgoPage 白名单加入该 id

6. **测试** `tests/*.test.ts`  
   - 边界：空输入、非法权、负环、截断等  
   - 若有对照实现（如 heap vs naive），断言 **结果语义** 一致，而非 step 数一致  
   - 跑 `npm run test:run`

7. **场景分享（可选）**  
   - Scene 含 `algoId` + `implVersion`；改语义时 bump `implVersion`

## Runner / Infinity

- 大批量或可取消运行：`src/core/runner/runAlgo`（size budget + cancel）  
- 需 JSON 序列化 ∞：`src/core/json/infinity.ts` 的 `{$inf:1|-1}`

## 不要做的事

- 不要在用户输入路径使用 `dangerouslySetInnerHTML` / 未消毒 HTML  
- 不要在 CI 中声称执行了参考 C++（参考代码仅展示）  
- 不要把「可视化 step 生成时间」写成纯算法性能证明
