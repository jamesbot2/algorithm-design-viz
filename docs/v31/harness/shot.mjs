import { launch, prep, stepTo, measure, settle } from './measure.mjs'
// usage: shot.mjs base tag vw vh n idx[,idx...] [algo] [input]
const [base, tag, vw, vh, n, idxs, algo = 'mergeSort', input] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
const arr = input || Array.from({ length: +n }, (_, i) => +n - i).join(',')
await prep(page, base, algo, arr)
await settle(page)
for (const i of idxs.split(',').map(Number)) {
  await stepTo(page, i)
  const m = await measure(page)
  console.log(JSON.stringify({ tag, vw, vh, n, ...m }))
  await page.screenshot({ path: `/workspace/v31/shots/${tag}-${vw}x${vh}-n${n}-idx${i}.png` })
}
await browser.close()
