export interface ExperimentRow {
  experiment: string
  method: string
  n: number
  metric: string
  value: number
  extra?: Record<string, string | number | boolean | null>
}

export interface ExperimentResult {
  rows: ExperimentRow[]
  notes: string[]
}
