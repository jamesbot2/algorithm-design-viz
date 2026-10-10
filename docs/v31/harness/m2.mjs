// M2 matrix: every frame of a run, real mouse Next clicks; key-frame screenshots; per-frame geometry + readability + same-step data checks.
import { launch, prep, realClick, settle } from './measure.mjs'
import fs from 'fs'
const [ver, base, out, filter] = process.argv.slice(2)
const VPS = [[375, 812], [390, 844], [844, 390], [1024, 600], [1366, 768], [1920, 1080]]
const NS = [7, 16, 24, 32]
const EXTRA = [ // tree open / cells variants
  { n: 16, vp: [375, 812], tree: true }, { n: 16, vp: [844, 390], tree: true }, { n: 16, vp: [1366, 768], tree: true },
  { n: 16, vp: [375, 812], cells: true },
]
const PAINTED = `(el) => { if (!el) return { frac: 0, hit: false }
  const b = el.getBoundingClientRect(); let L = Math.max(0, b.left), T = Math.max(0, b.top), R = Math.min(innerWidth, b.right), B = Math.min(innerHeight, b.bottom)
  for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ab = a.getBoundingClientRect(); const cl = ab.left + a.clientLeft, ct = ab.top + a.clientTop
      L = Math.max(L, cl); T = Math.max(T, ct); R = Math.min(R, cl + a.clientWidth); B = Math.min(B, ct + a.clientHeight) } }
  const area = Math.max(0, R - L) * Math.max(0, B - T); const frac = b.width * b.height > 0 ? area / (b.width * b.height) : 0
  let hit = false; if (area > 0) { const h = document.elementFromPoint((L + R) / 2, (T + B) / 2); hit = !!h && (h === el || el.contains(h) || h.contains(el)) }
  return { frac: +frac.toFixed(3), hit } }`
const FRAME = `(() => { const painted = ${PAINTED}
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)] }
  const viz = document.querySelector('[data-testid="visualizer"]'); const stage = document.querySelector('[data-testid="viz-canvas"]')
  const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')
  const comp = document.querySelector('[data-testid="scene-companions"]'); const live = comp && comp.querySelector(':scope > .scene-companions-row[data-live]')
  const bars = main ? [...main.querySelectorAll('.bar')].map((b) => b.getBoundingClientRect().height) : []
  const more = comp && comp.querySelector('[data-testid="scene-companions-more"]')
  const cards = live ? [...live.querySelectorAll('.array-view-compact')].map((c) => ({ name: (c.querySelector('.array-label')||{}).textContent, vals: [...c.querySelectorAll('.cell-val')].map((v) => v.textContent), ptr: Object.fromEntries([...c.querySelectorAll('.cell-slot')].flatMap((s, i) => [...s.querySelectorAll('.ptr-tag')].map((t) => [t.textContent, i]))) })) : []
  const tags = live ? [...live.querySelectorAll('.array-view-compact .ptr-tag, .array-view-compact .array-label')].map((e) => ({ t: e.textContent, ...painted(e) })) : []
  const mainVals = main ? [...main.querySelectorAll('[data-el-id]')].sort((a, b) => Number(a.dataset.slotIndex) - Number(b.dataset.slotIndex)).map((s) => (s.querySelector('.bar-val, .cell-val')||{}).textContent) : []
  const mainScroller = main ? [...main.querySelectorAll('*')].find((e) => { const cs = getComputedStyle(e); return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1 }) : null
  const mainPtrs = main ? [...main.querySelectorAll('.ptr-tag')].map((e) => painted(e)) : []
  const anyHidden = live ? [...live.querySelectorAll('.array-cells')].some((c) => c.scrollWidth > c.clientWidth + 1) : false
  return { idx: Number(viz.getAttribute('data-step-index')), runId: viz.getAttribute('data-run-id'), msg: ((document.querySelector('[data-testid="viz-banner-text"] .viz-banner-live') || document.querySelector('[data-testid="viz-banner-text"]') || {}).textContent || '').slice(0, 60),
    stage: r(stage), stageCH: stage.clientHeight, stageSH: stage.scrollHeight, comp: r(comp), budget: comp && comp.dataset.budget, reason: comp && comp.dataset.budgetReason,
    overflow: comp && comp.getAttribute('data-overflow'), more: more ? getComputedStyle(more).display !== 'none' : false,
    liveOver: live ? live.scrollHeight > live.clientHeight + 1 || anyHidden : false,
    main: r(main), mode: main ? (main.querySelector('.bars-wrap') ? 'bars' : 'cells') : null, maxBar: bars.length ? +Math.max(...bars).toFixed(1) : 0,
    mainPainted: painted(main), mainHScroll: !!mainScroller, mainPtrsPainted: mainPtrs.filter((p) => p.frac >= 0.99).length, mainPtrs: mainPtrs.length,
    cards, tags, mainVals, playing: viz.getAttribute('data-playing') } })()`
const browser = await launch()
const cases = []
for (const n of NS) for (const vp of VPS) cases.push({ n, vp })
for (const e of EXTRA) cases.push(e)
const results = []
for (const c of cases) {
  const tag = `${ver}-n${c.n}-${c.vp[0]}x${c.vp[1]}${c.tree ? '-tree' : ''}${c.cells ? '-cells' : ''}`
  if (filter && !tag.includes(filter)) continue
  const page = await browser.newPage({ viewport: { width: c.vp[0], height: c.vp[1] } })
  const arr = Array.from({ length: c.n }, (_, i) => c.n - i).join(',')
  await prep(page, base, 'mergeSort', arr)
  if (c.cells) { await realClick(page, page.locator('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view .view-toggle button', { hasText: '单元格' })) }
  if (c.tree) { await realClick(page, page.getByTestId('aux-toggle-recursion-tree')); await page.getByTestId('scene-aux-pane').waitFor() }
  await settle(page)
  const frames = [await page.evaluate(FRAME)]
  const next = page.getByTestId('next-step-btn')
  for (let i = 1; i < 1000; i++) {
    if (await next.isDisabled()) break
    await realClick(page, next)
    await page.waitForFunction((k) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === k, i, { polling: 'raf', timeout: 10000 })
    await settle(page)
    frames.push(await page.evaluate(FRAME))
  }
  // key frames
  const cmpIdx = frames.filter((f) => f.msg.startsWith('比较')).map((f) => f.idx)
  const mid = cmpIdx[Math.floor(cmpIdx.length / 2)]
  const bufLen = (f) => f.cards.reduce((s, k) => s + (k.vals[0] === '—' ? 0 : k.vals.length), 0)
  const maxBuf = frames.reduce((a, f) => (bufLen(f) > bufLen(a) ? f : a), frames[0]).idx
  const wb = frames.find((f) => f.idx > maxBuf && f.msg.startsWith('写入'))?.idx
  const key = { default: 0, midCompare: mid, maxBuffer: maxBuf, writeBack: wb, done: frames.length - 1 }
  // same-step data checks: compare 'left[i]=v 与 right[j]=w' matches live cards + pointer slots; '写入 a[k] = v' matches main slot k
  const sync = { cmp: 0, cmpBad: [], wb: 0, wbBad: [] }
  for (const f of frames) {
    const m = f.msg.match(/^比较 left\[(\d+)\]=(-?\d+) 与 right\[(\d+)\]=(-?\d+)/)
    if (m) { sync.cmp++
      const L = f.cards.find((k) => k.name === 'left'), R = f.cards.find((k) => k.name === 'right')
      const ok = L && R && L.vals[+m[1]] === m[2] && R.vals[+m[3]] === m[4] && Object.values(L.ptr).includes(+m[1]) && Object.values(R.ptr).includes(+m[3])
      if (!ok) sync.cmpBad.push(f.idx) }
    const w = f.msg.match(/^写入 a\[(\d+)\] = (-?\d+)/)
    if (w) { sync.wb++; if (f.mainVals[+w[1]] !== w[2]) sync.wbBad.push(f.idx) }
  }
  // screenshots of key frames: replay with Prev/Next? re-run is cheap: new page, step to each key frame
  const page2 = await browser.newPage({ viewport: { width: c.vp[0], height: c.vp[1] } })
  await prep(page2, base, 'mergeSort', arr)
  if (c.cells) { await realClick(page2, page2.locator('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view .view-toggle button', { hasText: '单元格' })) }
  if (c.tree) { await realClick(page2, page2.getByTestId('aux-toggle-recursion-tree')); await page2.getByTestId('scene-aux-pane').waitFor() }
  await settle(page2)
  const next2 = page2.getByTestId('next-step-btn')
  const order = Object.entries(key).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])
  let cur = 0
  for (const [name, k] of order) {
    while (cur < k) { await realClick(page2, next2); cur++; await page2.waitForFunction((q) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === q, cur, { polling: 'raf', timeout: 10000 }) }
    await settle(page2)
    fs.mkdirSync(`/workspace/v31/shots/m2/${ver}`, { recursive: true })
    await page2.screenshot({ path: `/workspace/v31/shots/m2/${ver}/${tag}-${name}-idx${k}.png` })
  }
  await page2.close()
  const pp = (key2) => { const o = {}; ['x', 'y', 'w', 'h'].forEach((k, i) => { const v = frames.map((f) => f[key2]?.[i]).filter((x) => typeof x === 'number'); o[k] = v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(2) : null }); return o }
  const res = { tag, ver, n: c.n, vp: c.vp, tree: !!c.tree, cells: !!c.cells, frames: frames.length, runIds: [...new Set(frames.map((f) => f.runId))], key,
    keyFrames: Object.fromEntries(Object.entries(key).map(([k, v]) => [k, v == null ? null : (({ cards, tags, mainVals, ...rest }) => rest)(frames[v])])),
    mainPP: pp('main'), compPP: pp('comp'), budgets: [...new Set(frames.map((f) => `${f.budget}/${f.reason}`))],
    minShare: Math.min(...frames.map((f) => f.main[3] / (f.main[3] + f.comp[3]))),
    overflowFrames: frames.filter((f) => f.liveOver).length, overflowNoAffordance: frames.filter((f) => f.liveOver && !(f.overflow && f.more)).map((f) => f.idx),
    unreadableTags: frames.flatMap((f) => f.tags.filter((t) => t.frac < 0.99 || !t.hit).map((t) => `${f.idx}:${t.t}:${t.frac}`)).slice(0, 20),
    unreadableTagFrames: new Set(frames.flatMap((f) => f.tags.filter((t) => t.frac < 0.99 || !t.hit).map(() => f.idx))).size,
    mainPtrUnpaintedFrames: frames.filter((f) => f.mainPtrsPainted < f.mainPtrs).length,
    stageScrolls: frames.some((f) => f.stageSH > f.stageCH + 1), mainHScroll: frames.some((f) => f.mainHScroll), mainMinPainted: Math.min(...frames.map((f) => f.mainPainted.frac)),
    sync }
  results.push(res)
  console.log(JSON.stringify({ tag, frames: res.frames, runIds: res.runIds.length, mainPP: res.mainPP, compH: res.keyFrames.default.comp[3], mainH: res.keyFrames.default.main[3], maxBarMid: res.keyFrames.midCompare?.maxBar, mode: res.keyFrames.default.mode, budgets: res.budgets, minShare: +res.minShare.toFixed(3), ovf: res.overflowFrames, noAff: res.overflowNoAffordance.length, unreadTagFrames: res.unreadableTagFrames, mainPtrUnpainted: res.mainPtrUnpaintedFrames, stageScrolls: res.stageScrolls, sync: `${res.sync.cmp - res.sync.cmpBad.length}/${res.sync.cmp} ${res.sync.wb - res.sync.wbBad.length}/${res.sync.wb}` }))
  await page.close()
}
await browser.close()
fs.writeFileSync(out, JSON.stringify(results, null, 1))
