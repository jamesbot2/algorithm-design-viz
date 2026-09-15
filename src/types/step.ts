export interface GraphState {
  nodes: { id: string | number; label?: string; x?: number; y?: number }[]
  edges: {
    from: string | number
    to: string | number
    weight?: number
    directed?: boolean
  }[]
  highlightNodes?: (string | number)[]
  highlightEdges?: [string | number, string | number][]
}

export interface Step {
  id: number
  message: string
  highlights?: Record<string, number[]>
  arrays?: Record<string, number[] | string[]>
  matrices?: Record<string, (number | string | null)[][]>
  vars?: Record<string, string | number | boolean | null>
  codeLine?: number
  graph?: GraphState
}
