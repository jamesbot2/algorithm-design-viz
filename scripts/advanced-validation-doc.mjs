#!/usr/bin/env node
// Renders docs/ADVANCED_TEMPLATE_VALIDATION.md from docs/advanced/validation-run.json (+ validation.json).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
const ROOT = resolve(new URL('..', import.meta.url).pathname)
const run = JSON.parse(readFileSync(join(ROOT, 'docs/advanced/validation-run.json'), 'utf8'))
const db = JSON.parse(readFileSync(join(ROOT, 'src/features/advanced/templates/validation.json'), 'utf8'))
const L = []
L.push('# 高阶算法模板验证记录', '')
L.push(`运行时间（UTC）：${run.ranAt}。生成命令：\`node scripts/advanced-validate.mjs && node scripts/advanced-validation-doc.mjs\`。`, '')
L.push('验证状态 **绑定** 到：展示源码的 SHA-256 + 测试集版本（`' + db.testsetVersion + '`）。源码或测试集任一改变，页面显示"验证过期"，而不是沿用旧结果。', '')
L.push('## 工具链', '', '| 工具 | 版本 |', '|---|---|')
for (const [k, v] of Object.entries(run.toolchain)) L.push(`| ${k} | ${v} |`)
L.push('', run.missing.length ? `**缺失工具：${run.missing.join(', ')}**（对应语言的行会显示失败/未验证）。` : '本次运行没有缺失的工具链。', '')
L.push('> 说明：g++ 来自 Debian 的 gcc-14 软件包解压到 /workspace/adv/tools（本机无 sudo，通过 `apt-get download` + `dpkg -x` 安装，包装脚本补全 -B/-isystem 路径）；JDK 同样；这些不是系统默认安装，复现需要同样的包版本。', '')
L.push('## 方法', '', '- 被测对象就是页面展示（复制/导出）的源码：从生成的目录读取，重新计算 SHA-256 并与界面绑定的哈希比较。', '- 向量：固定种子 PRNG（mulberry32）生成；独立朴素基线写在脚本里（标签数组并查集、O(n) 前缀和、线性扫描、无序列表取最大值），不调用被测代码。', '- 每种语言的驱动导入/调用展示的函数，同一进程内跑全部用例。', '- C++：`g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-sanitize-recover=undefined -Wall -Wextra`；任何警告都算失败。', '- 竞赛版：核心代码按展示原样 `#include` 进驱动；含 main 的完整版按展示原样编译，先对样例输出做精确比较，再跑随机 stdin 与基线比较。', '- 数值：Fenwick 含超 32 位的和（3e9×1000、±1e12 随机）。', '')
L.push('## 结果', '', '| 键（模板\\|版本\\|语言\\|类型） | 结果 | 用例数 | 检查 | 源码 SHA-256 前 12 位 |', '|---|---|---|---|---|')
for (const [k, v] of Object.entries(db.entries)) L.push(`| \`${k}\` | ${v.status === 'pass' ? '通过' : '**失败**'} | ${v.tests} | ${v.checks} | ${v.hash.slice(0, 12)} |`)
L.push('', '## 命令与退出码', '')
for (const e of run.logs) {
  L.push(`### ${e.key}`, '')
  for (const c of e.commands ?? []) L.push(`- \`${c.cmd.slice(0, 220)}\` → exit ${c.code} (${c.ms} ms)`)
  L.push('')
}
L.push('## 负控制（让验证器真的失败一次）', '', '把 `fenwick.go` 的 `p -= p & -p` 改成 `p -= 1`，重新生成目录与哈希后运行 `--only=fenwick`：Go 条目失败（`fenwick case 1: got [...-1392...] want [...-791...]`），其余语言通过；恢复后 22 项全部通过。日志：`/workspace/adv/logs/negctl-validator-fenwick-go.log`。', '')
L.push('## 未验证 / 不适用', '', '- 本验证不覆盖 Safari / WebKit / Firefox / 真机 / 读屏器。', '- STL 实验的"操作模型"不是 C++ 编译器，也不执行用户编辑的源码；教学版 C++ 的执行映射由 vitest 对照 trace 验证，不由这里验证。', '- 竞赛版与教学版控制流不同构，竞赛版没有"正在执行"箭头（仅参考）。')
writeFileSync(join(ROOT, 'docs/ADVANCED_TEMPLATE_VALIDATION.md'), L.join('\n') + '\n')
console.log('wrote docs/ADVANCED_TEMPLATE_VALIDATION.md')
