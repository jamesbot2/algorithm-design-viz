// Measures REAL JS bytes fetched (raw, uncompressed preview server) on a cold load, using Playwright chromium against `vite preview`.
import { chromium } from '@playwright/test'
const base = process.argv[2] ?? 'http://localhost:4173'
const run = async (label, hash, after) => {
  const b = await chromium.launch()
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } })
  const seen = new Map()
  page.on('response', async (r) => {
    if (/\.js(\?|$)/.test(r.url())) seen.set(r.url(), (await r.body().catch(() => Buffer.alloc(0))).length)
  })
  await page.goto(`${base}/#${hash}`)
  await page.waitForLoadState('networkidle')
  if (after) await after(page)
  await page.waitForLoadState('networkidle')
  const total = [...seen.values()].reduce((a, c) => a + c, 0)
  await b.close()
  return { label, files: seen.size, jsBytes: total }
}
const out = []
out.push(await run('home /', '/'))
out.push(await run('advanced fenwick demo (cold)', '/advanced/algorithms/fenwick?view=demo'))
const m = await run('fenwick demo + switch to Python', '/advanced/algorithms/fenwick?view=demo', async (p) => {
  await p.getByTestId('tab-lang-python').click()
  await p.getByTestId('tab-lang-python').waitFor()
})
out.push(m)
console.log(JSON.stringify(out, null, 1))
