/**
 * V23 test harness: WorkbenchLayout with page-owned prefs (the single layout-state
 * source), exactly as AlgoPage / KnapsackUnit wire it.
 */
import type { ReactNode } from 'react'
import WorkbenchLayout from '../../../src/components/workbench/WorkbenchLayout'
import { useWorkbenchPrefs } from '../../../src/components/workbench/useWorkbenchPrefs'

export default function LayoutHarness(props: {
  scene: ReactNode
  data?: ReactNode
  code?: ReactNode
  transport?: ReactNode
  runKey?: string | number
}) {
  const [prefs, patch] = useWorkbenchPrefs()
  return (
    <>
      <output data-testid="prefs-probe">{JSON.stringify(prefs)}</output>
      <WorkbenchLayout {...props} prefs={prefs} onPrefsChange={patch} />
    </>
  )
}
