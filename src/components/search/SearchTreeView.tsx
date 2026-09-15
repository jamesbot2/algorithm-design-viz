import { memo, useMemo } from 'react'
import type { SearchTreeNode } from '../../types/step'

interface Props {
  tree: SearchTreeNode
  title?: string
  /** When board matrix is also present in the step */
  linkedBoard?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  exploring: '探索中',
  pruned: '剪枝',
  feasible: '可行',
  optimal: '最优',
  rejected: '拒绝',
  root: '根',
}

function collectPathIds(node: SearchTreeNode, acc: string[] = []): string[] {
  acc.push(node.id)
  const exploring = node.children?.find((c) => c.status === 'exploring')
  if (exploring) return collectPathIds(exploring, acc)
  // Prefer deepest non-pruned leaf on first branch if no exploring
  const live = node.children?.find((c) => c.status !== 'pruned' && c.status !== 'rejected')
  if (live && (live.status === 'feasible' || live.status === 'optimal')) {
    return collectPathIds(live, acc)
  }
  return acc
}

function NodeView({
  node,
  depth,
  pathSet,
}: {
  node: SearchTreeNode
  depth: number
  pathSet: Set<string>
}) {
  const status = node.status ?? 'exploring'
  const onPath = pathSet.has(node.id)
  return (
    <li
      className={`st-node st-${status}${onPath ? ' on-path' : ''}`}
      style={{ marginLeft: depth === 0 ? 0 : 12 }}
    >
      <div className="st-label">
        <span className={`st-badge st-badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>
        <span>{node.label}</span>
        {node.meta && (
          <span className="st-meta muted">
            {Object.entries(node.meta)
              .map(([k, v]) => `${k}=${v}`)
              .join(' · ')}
          </span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <ul className="st-children">
          {node.children.map((c) => (
            <NodeView key={c.id} node={c} depth={depth + 1} pathSet={pathSet} />
          ))}
        </ul>
      )}
    </li>
  )
}

function SearchTreeView({ tree, title = '搜索树', linkedBoard }: Props) {
  const pathSet = useMemo(() => new Set(collectPathIds(tree)), [tree])

  return (
    <div className="search-tree-view panel">
      <h4>{title}</h4>
      {linkedBoard && (
        <p className="board-tree-link">与棋盘矩阵联动：路径高亮对应当前回溯深度。</p>
      )}
      <ul className="st-root">
        <NodeView node={tree} depth={0} pathSet={pathSet} />
      </ul>
    </div>
  )
}

export default memo(SearchTreeView)
