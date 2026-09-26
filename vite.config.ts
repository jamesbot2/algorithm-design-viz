/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

/** V23 build-info: short SHA + build time, baked in at build/dev start (no runtime fetch). */
function gitShortSha(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    const dirty = execSync('git status --porcelain --untracked-files=no', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return dirty ? `${sha}-dirty` : sha
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  plugins: [react()],
  base: '/algorithm-design-viz/',
  define: {
    __APP_VERSION__: JSON.stringify('V25'),
    __BUILD_SHA__: JSON.stringify(gitShortSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    globals: true,
    // Vitest 5: prefer projects over removed environmentMatchGlobs.
    // Algorithm/unit tests stay on node; only tests/dom/** use happy-dom (CI Node 22).
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['tests/dom/**', 'tests/e2e/**'],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: ['tests/dom/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
  },
})
