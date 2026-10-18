# 高阶算法：参考来源与许可

**重要的诚实声明**：本次实现是离线撰写的。任务简报指定的来源（OI Wiki、AtCoder Library、KACTL、cp-algorithms、Library Checker、C++ 草案）**没有被逐页抓取或复制**；讲解文字与全部代码由本项目原创撰写，来源只用于下列"概念/接口约定"层面的对照。`SOURCES.md` 与 `ACCEPTANCE-CASES.json` 当时没有随任务提供，因此没有按它们逐条验收。

| 来源 | 用途（仅限） | 是否复制文字/代码 | 许可（据所知，未在本次运行中重新核对原站） |
|---|---|---|---|
| AtCoder Library (ACL) `dsu` / `fenwick_tree` | 接口命名与"半开区间 [l,r)、0-based"约定的参考 | 否 | CC0（ACL 仓库声明）；本项目未使用其源码 |
| Library Checker "Union Find" / "Point Add Range Sum" | 竞赛版示例 main 的 stdin/stdout 格式 | 否（只用输入输出格式，不含题面） | 题面不复制；格式本身是协议约定 |
| cp-algorithms | 并查集/树状数组复杂度表述（α(n)、O(log n)）的核对 | 否 | CC BY-SA 4.0（站点声明）；未复制其文字，故不触发署名/相同方式共享要求 |
| OI Wiki | 中文术语（lowbit、路径压缩、按大小合并）的对照 | 否 | CC BY-SA 4.0 / 部分 GPL 代码（站点声明）；未复制 |
| KACTL | 竞赛版 DSU 用 `p[x]<0` 编码根与大小的惯用法 | 惯用法思想；代码为独立重写 | MIT（KACTL 声明）；本项目代码为独立写作，不是其副本 |
| C++ 标准草案 | `lower_bound`/`upper_bound`/`priority_queue` 的契约（闭开区间、复杂度、`top()` 空容器为未定义行为） | 否（页面中的"标准保证 vs 本页模型"为本项目概述） | 标准文本不复制 |

## 本项目代码的许可状态

仓库没有顶层 LICENSE（见 `docs/LICENSE_NOTES.md`）。本模块的代码与文字是原创，**许可证待项目所有者确定**；页面模板区如实显示此状态，不声称任何开源许可。

## 每个模板页显示的来源/许可

来自 `src/features/advanced/templates/meta.ts` 的 `source` / `license` 字段，模板页的"来源与许可"一节渲染它们（E2E 与 vitest 检查该节存在）。

## 未做

- 没有对上述来源做逐条条款核验；如需合规发布，应由项目所有者复核本表并补充 `SOURCES.md` 中指定的条目。
