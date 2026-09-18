/**
 * V16-04: Unified 1-based step counter display for main transport and inspector drawer.
 * Internal cursor `idx` stays 0-based; only the visible label is unified.
 */

export type StepDisplayModel = {
  /** 0-based internal index */
  idx: number
  /** Total step count (length of steps array) */
  stepsLen: number
  phase?: string | null
}

/** Human-facing 1-based current step (0 when empty). */
export function displayStepNumber(idx: number, stepsLen: number): number {
  if (stepsLen <= 0) return 0
  return Math.min(stepsLen, Math.max(1, idx + 1))
}

/** Shared label: "i / n" or "— / —"; optional phase suffix. */
export function formatStepCounter({ idx, stepsLen, phase }: StepDisplayModel): string {
  if (!stepsLen) return phase ? `— / — · ${phase}` : '— / —'
  const cur = displayStepNumber(idx, stepsLen)
  const base = `${cur} / ${stepsLen}`
  return phase ? `${base} · ${phase}` : base
}
