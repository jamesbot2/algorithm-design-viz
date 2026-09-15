import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type LabThemeId = 'lab-dark' | 'lab-light' | 'legacy'

const STORAGE_KEY = 'adv-lab-theme'
const DEFAULT: LabThemeId = 'lab-dark'

function readStored(): LabThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'lab-dark' || v === 'lab-light' || v === 'legacy') return v
  } catch {
    /* ignore */
  }
  return DEFAULT
}

function applyTheme(id: LabThemeId) {
  document.documentElement.setAttribute('data-lab-theme', id)
}

/** Call before React render so first paint matches localStorage / default. */
export function bootstrapLabTheme(): LabThemeId {
  const id = readStored()
  applyTheme(id)
  return id
}

type Ctx = {
  theme: LabThemeId
  setTheme: (t: LabThemeId) => void
}

const LabThemeContext = createContext<Ctx>({
  theme: DEFAULT,
  setTheme: () => {},
})

export function LabThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<LabThemeId>(() => readStored())

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((t: LabThemeId) => {
    setThemeState(t)
    applyTheme(t)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <LabThemeContext.Provider value={value}>{children}</LabThemeContext.Provider>
}

export function useLabTheme() {
  return useContext(LabThemeContext)
}
