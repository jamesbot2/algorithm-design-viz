/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/algorithm-design-viz/',
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
