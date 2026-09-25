/** V23: build identity baked in by vite.config.ts `define` (see docs/V23_DELIVERY.md). */
declare const __APP_VERSION__: string
declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string

export const BUILD_INFO = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  sha: typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'unknown',
  time: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '',
} as const

export function buildInfoLabel(): string {
  return `${BUILD_INFO.version} · ${BUILD_INFO.sha}`
}
