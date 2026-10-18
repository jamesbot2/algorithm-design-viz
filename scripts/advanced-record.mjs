#!/usr/bin/env node
/**
 * Real recordings + screenshots of the 高阶算法 demos: Playwright (Chrome) video at NORMAL speed (no slowMo, no
 * time-lapse), real mouse clicks, the product's own player at its default speed.
 *   node scripts/advanced-record.mjs <baseUrl e.g. http://127.0.0.1:5173/algorithm-design-viz/> <outDir>
 */
import { chromium } from '@playwright/test'
import { mkdirSync, renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const base = process.argv[2]
const out = process.argv[3]
mkdirSync(out, { recursive: true })
const exe = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(existsSync)
const browser = await chromium.launch({ executablePath: exe })

async function playToEnd(page, maxMs = 150_000) {
  await page.getByTestId('run-btn').click()
  await page.getByTestId('visualizer').and(page.locator('[data-preview="0"]')).waitFor({ timeout: 20_000 })
  await page.getByTestId('play-btn').click()
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-playing') === '1', null, { timeout: 10_000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-playing') === '0', null, { timeout: maxMs })
}

const demos = [
  ['stl-bounds', 'stl', 'stl-bounds'],
  ['stl-priority-queue', 'stl', 'stl-priority-queue'],
  ['dsu', 'algorithms', 'dsu'],
  ['fenwick', 'algorithms', 'fenwick'],
]
const log = []
for (const [name, section, id] of demos) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: join(out, '_vid'), size: { width: 1366, height: 768 } } })
  await ctx.addInitScript(() => localStorage.setItem('adv-lab-theme', 'lab-dark'))
  const page = await ctx.newPage()
  const t0 = Date.now()
  await page.goto(`${base}#/advanced/${section}/${id}?view=demo`)
  await page.getByTestId('adv-demo').waitFor()
  await page.waitForTimeout(800) // let the viewer see the preview frame
  await page.screenshot({ path: join(out, `${name}-1366x768-preview.png`) })
  await playToEnd(page)
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, `${name}-1366x768-final.png`) })
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  const video = page.video()
  await ctx.close()
  const p = await video.path()
  renameSync(p, join(out, `${name}-demo.webm`))
  log.push({ name, seconds: Number(secs), file: `${name}-demo.webm` })
  console.log('recorded', name, secs, 's')
}

// screenshots: 1920x1080 and mobile 390x844 / landscape 844x390, mid-run
for (const [vw, vh] of [[1920, 1080], [390, 844], [844, 390], [1024, 600]]) {
  for (const [name, section, id] of demos) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh } })
    await ctx.addInitScript(() => localStorage.setItem('adv-lab-theme', 'lab-dark'))
    const page = await ctx.newPage()
    await page.goto(`${base}#/advanced/${section}/${id}?view=demo`)
    await page.getByTestId('run-btn').click()
    await page.getByTestId('visualizer').and(page.locator('[data-preview="0"]')).waitFor({ timeout: 20_000 })
    for (let i = 0; i < 6; i++) await page.getByTestId('next-step-btn').click()
    await page.screenshot({ path: join(out, `${name}-${vw}x${vh}.png`) })
    await ctx.close()
  }
}
for (const [vw, vh] of [[1366, 768], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } })
  await ctx.addInitScript(() => localStorage.setItem('adv-lab-theme', 'lab-dark'))
  const page = await ctx.newPage()
  for (const [file, hash] of [['home', '#/advanced'], ['explain-fenwick', '#/advanced/algorithms/fenwick'], ['template-dsu', '#/advanced/templates/dsu'], ['template-stl-bounds', '#/advanced/templates/stl-bounds']]) {
    await page.goto(base + hash)
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `${file}-${vw}x${vh}.png`), fullPage: false })
  }
  await ctx.close()
}
await browser.close()
import('node:fs').then((fs) => fs.writeFileSync(join(out, 'recordings.json'), JSON.stringify({ at: new Date().toISOString(), note: 'Playwright recordVideo, default player speed, real clicks, no slowMo/time-lapse', log }, null, 2)))
