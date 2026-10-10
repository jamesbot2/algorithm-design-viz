import { launch, prep, settle } from './measure.mjs'
const [base, vw, vh, n] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
await prep(page, base, 'mergeSort', Array.from({ length: +n }, (_, i) => +n - i).join(','))
await settle(page)
console.log(await page.evaluate(() => {
  const sz = [...document.querySelectorAll('.scene-companions-sizer')]
  const t = sz.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]
  const out = []
  const walk = (el, d) => { if (d > 5) return; const b = el.getBoundingClientRect(); out.push(' '.repeat(d) + el.className + ' ' + [b.x, b.y, b.width, b.height].map(Math.round).join(',') + (el.children.length ? '' : ' "' + el.textContent + '"')); for (const c of el.children) walk(c, d + 1) }
  walk(t, 0)
  return out.slice(0, 60).join('\n')
}))
await browser.close()
