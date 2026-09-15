/** Motion design tokens — durations in ms, easings as CSS timing functions. */
export const motion = {
  duration: {
    instant: 0,
    fast: 120,
    normal: 220,
    slow: 360,
    step: 180,
    pulse: 600,
    settle: 420,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    exit: 'cubic-bezier(0.3, 0, 1, 1)',
    enter: 'cubic-bezier(0, 0, 0, 1)',
    springy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

export type MotionDuration = keyof typeof motion.duration
export type MotionEasing = keyof typeof motion.easing
export type AnimationMode = 'standard' | 'reduced'

/** Map UI speed slider (interval ms) to perceived pacing multiplier. */
export function speedFeelMultiplier(intervalMs: number): number {
  // Faster playback (lower interval) slightly shortens CSS motion; slow playback lets settle breathe.
  if (intervalMs <= 200) return 0.55
  if (intervalMs <= 400) return 0.75
  if (intervalMs <= 800) return 1
  if (intervalMs <= 1200) return 1.15
  return 1.3
}

export function resolveDuration(
  baseMs: number,
  mode: AnimationMode,
  speedIntervalMs = 600,
): number {
  if (mode === 'reduced') return 0
  return Math.round(baseMs * speedFeelMultiplier(speedIntervalMs))
}

/** CSS custom-property map for injecting into :root / inline styles. */
export function motionCssVars(
  mode: AnimationMode = 'standard',
  speedIntervalMs = 600,
): Record<string, string> {
  const mul = mode === 'reduced' ? 0 : speedFeelMultiplier(speedIntervalMs)
  const d = (ms: number) => `${Math.round(ms * mul)}ms`
  return {
    '--motion-fast': d(motion.duration.fast),
    '--motion-normal': d(motion.duration.normal),
    '--motion-slow': d(motion.duration.slow),
    '--motion-step': d(motion.duration.step),
    '--motion-pulse': d(motion.duration.pulse),
    '--motion-settle': d(motion.duration.settle),
    '--ease-standard': motion.easing.standard,
    '--ease-emphasized': motion.easing.emphasized,
    '--ease-exit': motion.easing.exit,
    '--ease-enter': motion.easing.enter,
    '--ease-springy': motion.easing.springy,
    '--motion-mode': mode,
  }
}
