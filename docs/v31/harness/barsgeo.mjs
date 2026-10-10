import { launch, prep, settle } from './measure.mjs'
const [base, vw, vh, n] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
await prep(page, base, 'mergeSort', Array.from({ length: +n }, (_, i) => +n - i).join(','))
await settle(page)
console.log(await page.evaluate(() => {
  const main = document.querySelector('.arrays-panel[data-declared-primary] > .array-view')
  const bw = main.querySelector('.bars-wrap')
  const st = document.querySelector('[data-testid="viz-canvas"]')
  if (!bw) return 'cells'
  const cols = [...bw.querySelectorAll('.bar-col')].map((c) => c.getBoundingClientRect())
  const r = (b) => [b.left, b.right, b.width].map((x) => x.toFixed(1)).join(',')
  return `main ${r(main.getBoundingClientRect())} bw ${r(bw.getBoundingClientRect())} scrollW=${bw.scrollWidth} clientW=${bw.clientWidth} ovx=${getComputedStyle(bw).overflowX} first ${r(cols[0])} last ${r(cols.at(-1))} stage ${r(st.getBoundingClientRect())} stScrollW=${st.scrollWidth}/${st.clientWidth} colW=${cols[0].width.toFixed(1)}`
}))
await browser.close()
