import { launch, prep, stepTo, measure, settle } from './measure.mjs'
import fs from 'fs'
const targets = JSON.parse(process.argv[2]) // [{name, base}]
const out = []
const browser = await launch()
for (const t of targets) for (const n of [7, 16, 32]) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const arr = Array.from({ length: n }, (_, i) => n - i).join(',')
  await prep(page, t.base, 'mergeSort', arr)
  await settle(page)
  const f0 = await measure(page)
  // find the frame whose banner is the first compare of left[0]/right[0] at merge depth top for 16: frame 31 ('31 / 144')
  const target = n === 16 ? 30 : null
  let m
  if (target !== null) { await stepTo(page, target); m = await measure(page) }
  // also step to the first frame where counter starts with '31' to align numbering
  out.push({ ver: t.name, n, f0, f31: m })
  if (n === 16) await page.screenshot({ path: `/workspace/v31/shots/m0-${t.name}-n16-idx${m.idx}.png` })
  await page.close()
}
await browser.close()
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1))
console.log(JSON.stringify(out.map((o) => ({ ver: o.ver, n: o.n, counter: o.f31?.counter, banner: o.f31?.banner, comp: o.f31?.comp?.h ?? o.f0.comp?.h, main: o.f31?.main?.h ?? o.f0.main?.h, maxBar: o.f31?.maxBar ?? o.f0.maxBar, budget: o.f0.compBudget, stage: o.f0.stageClientH })), null, 0))
