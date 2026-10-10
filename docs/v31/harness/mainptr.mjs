import { launch, prep, stepTo, settle } from './measure.mjs'
const [base, vw, vh, n, idx] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
await prep(page, base, 'mergeSort', Array.from({ length: +n }, (_, i) => +n - i).join(','))
await stepTo(page, +idx)
console.log(await page.evaluate(() => {
  const main = document.querySelector('.arrays-panel[data-declared-primary] > .array-view')
  const out = []
  for (const t of main.querySelectorAll('.ptr-tag')) {
    const b = t.getBoundingClientRect()
    const clips = []
    for (let a = t.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ab = a.getBoundingClientRect(); clips.push(`${a.className.slice(0,30)}[${cs.overflowX}/${cs.overflowY}] ${ab.left.toFixed(0)},${ab.top.toFixed(0)},${ab.right.toFixed(0)},${ab.bottom.toFixed(0)} sl=${a.scrollLeft}`) } }
    const h = document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2); out.push(`hit=${h===t||t.contains(h)?"self":(h?h.className:"none")} pe=${getComputedStyle(t).pointerEvents} vis=${getComputedStyle(t).visibility} ` + `${t.textContent} ${b.left.toFixed(0)},${b.top.toFixed(0)},${b.right.toFixed(0)},${b.bottom.toFixed(0)} | ${clips.slice(0,3).join(' | ')}`)
  }
  return out.join('\n')
}))
await browser.close()
