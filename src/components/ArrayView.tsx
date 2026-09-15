import type { Step } from '../types/step'

interface Props {
  name: string
  values: (number | string)[]
  highlights?: number[]
}

const COLORS = ['hl-compare', 'hl-swap', 'hl-focus', 'hl-done']

export default function ArrayView({ name, values, highlights = [] }: Props) {
  return (
    <div className="array-view">
      <div className="array-label">{name}</div>
      <div className="array-cells">
        {values.map((v, i) => {
          const hi = highlights.indexOf(i)
          const cls = hi >= 0 ? COLORS[Math.min(hi, COLORS.length - 1)] : ''
          return (
            <div key={i} className={`cell ${cls}`}>
              <span className="cell-idx">{i}</span>
              <span className="cell-val">{String(v)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ArraysFromStep({ step }: { step: Step }) {
  if (!step.arrays) return null
  return (
    <div className="arrays-panel">
      {Object.entries(step.arrays).map(([name, values]) => (
        <ArrayView
          key={name}
          name={name}
          values={values}
          highlights={step.highlights?.[name] ?? []}
        />
      ))}
    </div>
  )
}
