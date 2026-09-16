import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motionCssVars, type AnimationMode } from './motion'
import { semanticCssVars } from './semanticColors'

const STORAGE_KEY = 'adv-motion-mode'

type MotionCtx = {
  mode: AnimationMode
  /** User override: null = follow system prefers-reduced-motion */
  userPref: AnimationMode | null
  setUserPref: (pref: AnimationMode | null) => void
  cyclePref: () => void
  cssVars: Record<string, string>
  density: 'normal' | 'projection'
  setDensity: (d: 'normal' | 'projection') => void
  /** Live playback interval from Visualizer (ms between steps). */
  speedIntervalMs: number
  setSpeedIntervalMs: (ms: number) => void
  /** Bumped on pause / seek / resize / replace-run — stale FLIP callbacks must ignore. */
  transitionEpoch: number
  bumpTransitionEpoch: () => void
}

const Ctx = createContext<MotionCtx | null>(null)

function readStoredPref(): AnimationMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'standard' || v === 'reduced') return v
  } catch {
    /* ignore */
  }
  return null
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [userPref, setUserPrefState] = useState<AnimationMode | null>(() => readStoredPref())
  const [systemReduced, setSystemReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  const [density, setDensity] = useState<'normal' | 'projection'>('normal')
  const [speedIntervalMs, setSpeedIntervalMs] = useState(600)
  const [transitionEpoch, setTransitionEpoch] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setSystemReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setUserPref = useCallback((pref: AnimationMode | null) => {
    setUserPrefState(pref)
    try {
      if (pref === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      /* ignore */
    }
  }, [])

  const cyclePref = useCallback(() => {
    setUserPref(userPref === null ? 'reduced' : userPref === 'reduced' ? 'standard' : null)
  }, [userPref, setUserPref])

  const bumpTransitionEpoch = useCallback(() => {
    setTransitionEpoch((n) => n + 1)
  }, [])

  const mode: AnimationMode =
    userPref !== null ? userPref : systemReduced ? 'reduced' : 'standard'

  const cssVars = useMemo(
    () => ({ ...semanticCssVars(), ...motionCssVars(mode, speedIntervalMs) }),
    [mode, speedIntervalMs],
  )

  const value = useMemo(
    () => ({
      mode,
      userPref,
      setUserPref,
      cyclePref,
      cssVars,
      density,
      setDensity,
      speedIntervalMs,
      setSpeedIntervalMs,
      transitionEpoch,
      bumpTransitionEpoch,
    }),
    [
      mode,
      userPref,
      setUserPref,
      cyclePref,
      cssVars,
      density,
      speedIntervalMs,
      transitionEpoch,
      bumpTransitionEpoch,
    ],
  )

  return (
    <Ctx.Provider value={value}>
      <div
        className={`motion-root density-${density}${mode === 'reduced' ? ' motion-reduced' : ''}`}
        style={cssVars as CSSProperties}
        data-motion={mode}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}

export function useMotion(): MotionCtx {
  const ctx = useContext(Ctx)
  if (!ctx) {
    return {
      mode: 'standard',
      userPref: null,
      setUserPref: () => {},
      cyclePref: () => {},
      cssVars: { ...semanticCssVars(), ...motionCssVars('standard') },
      density: 'normal',
      setDensity: () => {},
      speedIntervalMs: 600,
      setSpeedIntervalMs: () => {},
      transitionEpoch: 0,
      bumpTransitionEpoch: () => {},
    }
  }
  return ctx
}
