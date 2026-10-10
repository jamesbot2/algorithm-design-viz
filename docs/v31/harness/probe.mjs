import { launch, prep, settle } from './measure.mjs'
const [base, vw, vh, ns] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5] || '7,16,32']
const browser = await launch()
for (const n of ns.split(',').map(Number)) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } })
  await prep(page, base, 'mergeSort', Array.from({ length: n }, (_, i) => n - i).join(','))
  await settle(page)
  const d = await page.evaluate(() => {
    const comp = document.querySelector('[data-testid="scene-companions"]')
    const sz = [...comp.querySelectorAll('.scene-companions-sizer')].map((s) => ({ h: Math.round(s.getBoundingClientRect().height), rows: new Set([...s.children].flatMap((c) => [...c.children]).map((c) => Math.round(c.getBoundingClientRect().top))).size, kids: [...s.querySelectorAll('.array-view-compact')].map((c) => Math.round(c.getBoundingClientRect().height) + ':' + Math.round(c.getBoundingClientRect().width)).join(' '), aux: Math.round(s.querySelector('.scene-aux-bar')?.getBoundingClientRect().height ?? 0) }))
    const hs = sz.map((s) => s.h).sort((a, b) => a - b)
    const stage = document.querySelector('[data-testid="viz-canvas"]')
    const main = document.querySelector('.arrays-panel[data-declared-primary] > .array-view')
    const mcs = getComputedStyle(main)
    const top = sz.slice().sort((a, b) => b.h - a.h)[0]
    return { n: sz.length, min: hs[0], med: hs[hs.length >> 1], max: hs.at(-1), stage: stage.clientHeight, stageW: stage.clientWidth, mainMin: mcs.minHeight, mainMode: main.querySelector('.bars-wrap') ? 'bars' : 'cells', mainH: main.getBoundingClientRect().height, budget: comp.dataset.budget, cap: comp.style.getPropertyValue('--companion-cap'), tallest: top, banner: document.querySelector('[data-testid="viz-banner"]')?.getBoundingClientRect().height }
  })
  console.log(n, JSON.stringify(d))
  await page.close()
}
await browser.close()
