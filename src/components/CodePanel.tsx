interface Props {
  code: string
  activeLine?: number
}

export default function CodePanel({ code, activeLine }: Props) {
  const lines = code.trim().split('\n')
  return (
    <div className="code-panel">
      <div className="panel-title">伪代码</div>
      <pre className="code-pre">
        {lines.map((line, i) => (
          <div key={i} className={`code-line${activeLine === i ? ' active' : ''}`}>
            <span className="ln">{i + 1}</span>
            <span className="lt">{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}
