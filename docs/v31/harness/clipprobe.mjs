import { launch, prep, settle, realClick } from './measure.mjs'
const [base, vw, vh, n, steps] = process.argv.slice(2)
const browser = await launch()
const page = await browser.newPage({ viewport: { width: +vw, height: +vh } })
await prep(page, base, 'mergeSort', Array.from({ length: +n }, (_, i) => +n - i).join(','))
await settle(page)
for (let i = 0; i < +steps; i++) { await realClick(page, page.getByTestId('next-step-btn')); await settle(page) }
const st = await page.getByTestId('viz-canvas').boundingBox()
for (let i = 0; i < 12; i++) { await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2); await page.mouse.wheel(0, 200); await page.waitForTimeout(50) }
console.log(JSON.stringify(await page.evaluate(() => {
  const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')
  const slots = [...main.querySelectorAll('[data-el-id]')].sort((a, b) => Number(a.dataset.slotIndex) - Number(b.dataset.slotIndex))
  const el = slots.at(-1); const b = el.getBoundingClientRect()
  const out = [{ el: el.className, r: [b.left, b.top, b.right, b.bottom] }]
  for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ab = a.getBoundingClientRect(); out.push({ a: a.className || a.tagName, testid: a.dataset.testid, ov: cs.overflowX + '/' + cs.overflowY, clip: [ab.left + a.clientLeft, ab.top + a.clientTop, ab.left + a.clientLeft + a.clientWidth, ab.top + a.clientTop + a.clientHeight], sh: a.scrollHeight, ch: a.clientHeight, st: a.scrollTop, sw: a.scrollWidth, cw: a.clientWidth }) } }
  const st = document.querySelector("[data-testid=viz-canvas]"); const mb = main.getBoundingClientRect(); const pan = main.closest(".arrays-panel").getBoundingClientRect(); const bw = main.querySelector(".bars-wrap"); const bwr = bw && bw.getBoundingClientRect(); const lastChild = [...st.querySelectorAll("*")].reduce((m, e) => Math.max(m, e.getBoundingClientRect().bottom), 0)
  out.push({ vp: [innerWidth, innerHeight], stScrollTopExact: st.scrollTop, mainBottom: mb.bottom, panelBottom: pan.bottom, bwBottom: bwr && bwr.bottom, maxDescBottom: lastChild, stPadB: getComputedStyle(st).paddingBottom, mainCS: getComputedStyle(main).overflow, bwCS: bw && getComputedStyle(bw).overflow })
  return out })), null, 1)
await browser.close()
