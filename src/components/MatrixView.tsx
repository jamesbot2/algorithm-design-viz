import type { Step } from '../types/step'

export default function MatrixView({ step }: { step: Step }) {
  if (!step.matrices) return null
  const focusI = typeof step.vars?.i === 'number' ? step.vars.i : -1
  const focusJ = typeof step.vars?.j === 'number' ? step.vars.j : -1
  const focusK = typeof step.vars?.k === 'number' ? step.vars.k : -1

  return (
    <div className="matrices-panel">
      {Object.entries(step.matrices).map(([name, mat]) => (
        <div key={name} className="matrix-view">
          <div className="array-label">{name}</div>
          <div className="matrix-scroll">
            <table className="matrix-table">
              <tbody>
                {mat.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => {
                      let cls = ''
                      if (i === focusI && j === focusJ) cls = 'hl-focus'
                      else if (focusK >= 0 && (i === focusK || j === focusK) && focusI < 0) cls = 'hl-read'
                      else if (i === focusI && focusJ < 0) cls = 'hl-compare'
                      return (
                        <td key={j} className={cls}>
                          {cell === null || cell === undefined ? '·' : String(cell)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
