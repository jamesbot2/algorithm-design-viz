import { createContext, useContext } from 'react'

/**
 * V23: Layout (the shell) measures its real scroll viewport with ResizeObserver
 * and publishes the height here. Pages read it; nobody scans the DOM or watches
 * document.body with MutationObserver to guess layout state.
 */
export interface WorkspaceBudget {
  /** Visible height of the page scroll viewport (px); 0 = not measured yet. */
  viewportHeight: number
  /** Width of the page content column (px). */
  viewportWidth: number
}

export const WorkspaceBudgetContext = createContext<WorkspaceBudget>({ viewportHeight: 0, viewportWidth: 0 })

export function useWorkspaceBudget(): WorkspaceBudget {
  return useContext(WorkspaceBudgetContext)
}
