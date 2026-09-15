/** Motion design tokens — durations in ms, easings as CSS timing functions. */
export const motion = {
  duration: {
    instant: 0,
    fast: 120,
    normal: 220,
    slow: 360,
    step: 180,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    exit: 'cubic-bezier(0.3, 0, 1, 1)',
    enter: 'cubic-bezier(0, 0, 0, 1)',
  },
} as const

export type MotionDuration = keyof typeof motion.duration
export type MotionEasing = keyof typeof motion.easing

/** CSS custom-property map for injecting into :root / inline styles. */
export function motionCssVars(): Record<string, string> {
  return {
    '--motion-fast': `${motion.duration.fast}ms`,
    '--motion-normal': `${motion.duration.normal}ms`,
    '--motion-slow': `${motion.duration.slow}ms`,
    '--motion-step': `${motion.duration.step}ms`,
    '--ease-standard': motion.easing.standard,
    '--ease-emphasized': motion.easing.emphasized,
    '--ease-exit': motion.easing.exit,
    '--ease-enter': motion.easing.enter,
  }
}
