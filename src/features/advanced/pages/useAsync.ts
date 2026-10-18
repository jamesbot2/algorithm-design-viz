import { useEffect, useState } from 'react'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { value: T | null; error: string | null } {
  const [state, setState] = useState<{ value: T | null; error: string | null; key: string }>({ value: null, error: null, key: '' })
  const key = JSON.stringify(deps)
  useEffect(() => {
    let live = true
    fn().then(
      (v) => live && setState({ value: v, error: null, key }),
      (e: unknown) => live && setState({ value: null, error: e instanceof Error ? e.message : String(e), key }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? { value: state.value, error: state.error } : { value: null, error: null }
}
