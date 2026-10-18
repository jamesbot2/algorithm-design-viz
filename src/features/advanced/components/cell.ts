export const cell = (w: number, count: number, max: number, pad = 8) => Math.max(14, Math.min(max, Math.floor((w - 2 * pad) / Math.max(1, count))))
