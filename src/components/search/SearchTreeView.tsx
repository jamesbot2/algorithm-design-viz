import type { SearchTreeNode } from '../../types/step'

interface Props {
  tree: SearchTreeNode
  title?: string
}

function NodeView({ node, depth }: { node: SearchTreeNode; depth: number }) {
  const status = node.status ?? 'exploring'
  return (
    <li className={`st-node st-${status}`} style={{ marginLeft: depth === 0 ? 0 : 12 }}>
      <div className="st-label">
        <span className={`st-badge st-badge-${status}`}>{status}</span>
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
            <NodeView key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function SearchTreeView({ tree, title = '搜索树' }: Props) {
  return (
    <div className="search-tree-view panel">
      <h4>{title}</h4>
      <ul className="st-root">
        <NodeView node={tree} depth={0} />
      </ul>
    </div>
  )
}
