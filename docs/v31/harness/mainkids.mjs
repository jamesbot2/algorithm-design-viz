import { launch, prep, settle } from './measure.mjs'
const [base, vw, vh, n] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
await prep(page, base, 'mergeSort', Array.from({ length: +n }, (_, i) => +n - i).join(','))
await settle(page)
console.log(await page.evaluate(() => {
  const main = document.querySelector('.arrays-panel[data-declared-primary] > .array-view')
  const cs = getComputedStyle(main)
  const out = [`main h=${main.getBoundingClientRect().height} pad=${cs.paddingBottom} disp=${cs.display} dir=${cs.flexDirection} minH=${cs.minHeight}`]
  for (const c of main.children) { const b = c.getBoundingClientRect(); const s = getComputedStyle(c); out.push(`${c.className} top=${b.top.toFixed(1)} h=${b.height.toFixed(1)} mb=${s.marginBottom} flex=${s.flex}`) }
  return out.join('\n')
}))
await browser.close()
