import { resolveDuration, speedFeelMultiplier } from '../theme/motion'
import type { AnimationMode } from '../theme/motion'

/** Decorative swap/settle budget at current playback speed (0 if reduced). */
export function decorativeMotionMs(
  mode: AnimationMode,
  speedIntervalMs: number,
  baseSwapMs = 280,
): number {
  return resolveDuration(baseSwapMs, mode, speedIntervalMs)
}

/**
 * Unify step clock with animation clock:
 * - base interval from slider + feel
 * - never advance faster than active decorative motion unless reduced
 * Fast play compresses both via speedFeelMultiplier — does not skip algo state.
 */
export function coordinatedStepIntervalMs(
  speedIntervalMs: number,
  mode: AnimationMode,
  opts?: { hasSwapMotion?: boolean; hasMoveMotion?: boolean; baseSwapMs?: number },
): number {
  const feel = speedFeelMultiplier(speedIntervalMs)
  const base = Math.max(80, Math.round(speedIntervalMs / Math.max(0.5, 2 - feel)))
  const needsMotion = Boolean(opts?.hasSwapMotion || opts?.hasMoveMotion)
  if (mode === 'reduced' || !needsMotion) return base
  const motion = decorativeMotionMs(mode, speedIntervalMs, opts?.baseSwapMs ?? 280)
  return Math.max(base, motion)
}
