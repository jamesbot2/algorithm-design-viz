/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/algorithm-design-viz/',
  test: {
    // Unit/algorithm tests need no DOM; jsdom+undici breaks on Node 20 in CI.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
})
