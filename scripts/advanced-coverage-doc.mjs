#!/usr/bin/env node
// Renders docs/ADVANCED_COVERAGE.md from the live catalog metadata + validation.json (so it cannot drift from the code).
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const ROOT = resolve(new URL('..', import.meta.url).pathname)
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href)
const { TOPICS } = await imp('src/features/advanced/catalog/topics.ts')
const { ROADMAP } = await imp('src/features/advanced/catalog/roadmap.ts')
const db = JSON.parse(readFileSync(join(ROOT, 'src/features/advanced/templates/validation.json'), 'utf8'))
const st = (id, variant) => {
  const keys = Object.keys(db.entries).filter((k) => k.startsWith(`${id}|${variant}`))
  if (!keys.length) return '未验证'
  const pass = keys.filter((k) => db.entries[k].status === 'pass').length
  return `${pass}/${keys.length} 通过`
}
const L = ['# 高阶算法覆盖表', '', '每行一个主题/变体。"已交付"以代码为准（本表由 `scripts/advanced-coverage-doc.mjs` 从目录元数据与验证记录生成）。', '']
L.push('## 已交付', '', '| 主题 | 讲解 | 演示 | 模板（教学/竞赛） | 语言 | 语义锚点 | 编译/运行（教学版） | 编译/运行（竞赛核心） | 编译/运行（竞赛完整版） | 复用旧算法 |', '|---|---|---|---|---|---|---|---|---|---|')
for (const t of TOPICS) {
  const langs = t.caps.languages === 'six' ? '六语言' : '仅 C++'
  L.push(`| ${t.titleZh} (\`${t.id}\`) | ${t.caps.explanation} | ${t.caps.demo} | ${t.caps.template} | ${langs} | ${t.caps.anchors} | ${st(t.id, 'teach')} | ${st(t.id, 'contest-core')} | ${st(t.id, 'contest-full')} | ${t.relatedAlgos.map((a) => `\`${a}\``).join(', ') || '—'}（链接，非复制） |`)
}
L.push('', '测试：`tests/advanced/advanced.test.ts`（vitest）、`tests/e2e/adv-p1.spec.ts`（Playwright，真实鼠标键盘、0 次重试）、`scripts/advanced-validate.mjs`（真实工具链）。', '')
L.push('## 未完成（路线图中，页面上不是可学习卡片）', '', '| 主题 | 分组 | 状态 |', '|---|---|---|')
for (const r of ROADMAP) L.push(`| ${r.titleZh} / ${r.titleEn} | ${r.section === 'stl' ? 'STL' : '算法'} | **未做**：无讲解、无演示、无模板、无六语言、无锚点、未编译、未测试 |`)
L.push('', '旧课程中可复用的算法（未被改写）：`binarySearch`、`kruskal`、`dijkstraHeap` 等；其中 Kruskal 的并查集内核已抽到 `src/algorithms/advanced/dsuCore.ts`（见 ADVANCED_DELIVERY.md 的 Kruskal 一节）。', '')
writeFileSync(join(ROOT, 'docs/ADVANCED_COVERAGE.md'), L.join('\n') + '\n')
console.log('wrote docs/ADVANCED_COVERAGE.md')
