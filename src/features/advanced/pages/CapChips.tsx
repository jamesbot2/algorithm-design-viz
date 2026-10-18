import type { Capabilities } from '../catalog/types'

const LABEL: Record<string, string> = { done: '已提供', partial: '部分', none: '未提供', 'n/a': '不适用' }
const NAMES: [keyof Capabilities, string][] = [
  ['explanation', '讲解'],
  ['demo', '演示'],
  ['template', '模板'],
  ['anchors', '语义锚点'],
]
export function CapChips({ caps }: { caps: Capabilities }) {
  return (
    <ul className="adv-caps" aria-label="能力状态" data-testid="adv-caps">
      {NAMES.map(([k, n]) => (
        <li key={k} className="adv-cap" data-state={caps[k]} data-cap={k}>
          {n}：{LABEL[caps[k]]}
        </li>
      ))}
      <li className="adv-cap" data-state={caps.languages === 'none' ? 'none' : 'done'} data-cap="languages">
        语言：{caps.languages === 'six' ? '六语言' : caps.languages === 'cpp' ? '仅 C++' : '无'}
      </li>
    </ul>
  )
}
