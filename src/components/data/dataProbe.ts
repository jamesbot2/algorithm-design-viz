import { createContext, useContext } from 'react'

/**
 * V23: an invisible, inert measuring copy of the current-data presentation (for the
 * run's largest frames) lets the workbench calibrate the data region ONCE per run,
 * so playback never resizes the scene. Inside a probe, components omit test ids so
 * the copy is never mistaken for the real region.
 */
export const DataProbeContext = createContext(false)

export function useTestId() {
  const probe = useContext(DataProbeContext)
  return (id: string) => (probe ? {} : { 'data-testid': id })
}
