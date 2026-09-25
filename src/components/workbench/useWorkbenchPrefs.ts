import { useCallback, useState } from 'react'
import { DEFAULT_LAYOUT_PREFS, type WorkbenchLayoutPrefs } from './layoutModel'

/** Page/session-owned layout intent. One instance per learning page. */
export function useWorkbenchPrefs(initial?: Partial<WorkbenchLayoutPrefs>) {
  const [prefs, setPrefs] = useState<WorkbenchLayoutPrefs>({ ...DEFAULT_LAYOUT_PREFS, ...initial })
  const patchPrefs = useCallback((patch: Partial<WorkbenchLayoutPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      return (Object.keys(patch) as (keyof WorkbenchLayoutPrefs)[]).every((k) => p[k] === next[k]) ? p : next
    })
  }, [])
  return [prefs, patchPrefs] as const
}
