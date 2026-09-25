import { defineConfig } from '/workspace/algorithm-design-viz/node_modules/@playwright/test/index.mjs'
export default defineConfig({
  testDir: '/workspace/probe/v24',
  testMatch: /.*\.probe\.ts/,
  workers: 1, retries: 0, timeout: 300_000,
  outputDir: '/tmp/pwout-v24probe',
  use: { baseURL: process.env.BASE || 'http://127.0.0.1:5173/algorithm-design-viz/', launchOptions: { executablePath: '/usr/bin/google-chrome' } },
})
