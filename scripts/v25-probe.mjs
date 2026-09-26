// V25 probe: real running app (dev/preview URL), normal clicks only.
// usage: node scripts/v25-probe.mjs <baseUrl> <outShotsDir> <outJson> [viewports...] [--reduced]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const reduced = args.includes('--reduced')
const [base, outDir, outJson, ...vpsRaw] = args.filter((a) => a !== '--reduced')
const vps = (vpsRaw.length ? vpsRaw : ['1366x768', '1920x1080', '390x844', '844x390']).map((s) => s.split('x').map(Number))
fs.mkdirSync(outDir, { recursive: true })

const CASES = [
  { key: 'kadane-default-7of22', algo: 'kadane', input: null, nexts: 6 },
  { key: 'insertion-1_-1-3of6', algo: 'insertionSort', input: '1,-1', nexts: 2 },
  { key: 'quick-5_-5_0-3of10', algo: 'quickSort', input: '5,-5,0', nexts: 2 },
]

async function stepIdx(p) {
  return Number(await p.getByTestId('visualizer').getAttribute('data-step-index'))
}
async function run(p) {
  const before = await p.getByTestId('visualizer').getAttribute('data-run-id')
  await p.getByTestId('run-btn').click()
  await p.waitForFunction((prev) => {
    const el = document.querySelector('[data-testid="visualizer"]')
    const rid = el?.getAttribute('data-run-id')
    return el?.getAttribute('data-preview') === '0' && !!rid && rid !== 'preview' && rid !== prev
  }, before, { timeout: 30000 })
  const panel = p.getByTestId('input-panel')
  if ((await panel.getAttribute('data-editing')) === '1') {
    const t = p.getByTestId('input-edit-toggle')
    if (await t.isVisible()) await t.click()
  }
}
async function next(p) {
  const b = await stepIdx(p)
  await p.getByTestId('next-step-btn').click()
  await p.waitForFunction((b) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === b + 1, b)
  await p.waitForFunction(() => document.querySelectorAll('[data-testid="viz-canvas"] [data-run-flip="1"]').length === 0)
}

function measure() {
  const textRect = (el) => {
    if (!el) return null
    const r = document.createRange()
    r.selectNodeContents(el)
    const rs = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0)
    if (!rs.length) return null
    return { l: Math.min(...rs.map((x) => x.left)), r: Math.max(...rs.map((x) => x.right)), t: Math.min(...rs.map((x) => x.top)), b: Math.max(...rs.map((x) => x.bottom)) }
  }
  const boxRect = (el) => {
    if (!el) return null
    const x = el.getBoundingClientRect()
    return { l: x.left, r: x.right, t: x.top, b: x.bottom }
  }
  const ov = (A, B) => {
    if (!A || !B) return null
    const dx = Math.min(A.r, B.r) - Math.max(A.l, B.l)
    const dy = Math.min(A.b, B.b) - Math.max(A.t, B.t)
    return dx > 0.5 && dy > 0.5 ? { dx: +dx.toFixed(2), dy: +dy.toFixed(2) } : null
  }
  const stage = document.querySelector('[data-testid="viz-canvas"]')
  const view = stage ? [...stage.querySelectorAll('.array-view[data-array="a"]')].find((v) => !v.closest('.array-buffers')) : null
  const slots = view ? [...view.querySelectorAll('[data-slot-index]')] : []
  const S = slots.map((s) => {
    const val = s.querySelector('.bar-val, .cell-val')
    return {
      i: Number(s.getAttribute('data-slot-index')),
      v: val?.textContent?.trim(),
      valBox: boxRect(val),
      valText: textRect(val),
      bar: boxRect(s.querySelector('.bar, .bar-zero-marker')),
      idxText: textRect(s.querySelector('.bar-idx, .cell-idx')),
      ptrs: [...s.querySelectorAll('.ptr-tag')].map((t) => ({ label: t.textContent.trim(), box: boxRect(t), text: textRect(t) })),
    }
  })
  const conflicts = []
  for (const A of S) {
    for (const B of S) {
      for (const pt of A.ptrs) {
        for (const [kind, rect] of [['valueText', B.valText], ['valueBox', B.valBox], ['bar', B.bar], ['indexText', B.idxText]]) {
          const o = ov(pt.box, rect)
          if (o) conflicts.push({ ptr: `${pt.label}@${A.i}`, with: `${kind}(${B.v})@${B.i}`, ...o })
        }
      }
      if (A.i === B.i) {
        const o1 = ov(A.idxText, B.valText); if (o1) conflicts.push({ ptr: `idx@${A.i}`, with: `valueText@${B.i}`, ...o1 })
        const o2 = ov(A.idxText, B.bar); if (o2) conflicts.push({ ptr: `idx@${A.i}`, with: `bar@${B.i}`, ...o2 })
      }
    }
    for (let x = 0; x < A.ptrs.length; x++) for (let y = x + 1; y < A.ptrs.length; y++) {
      const o = ov(A.ptrs[x].box, A.ptrs[y].box); if (o) conflicts.push({ ptr: `${A.ptrs[x].label}@${A.i}`, with: `${A.ptrs[y].label}@${A.i}`, ...o })
    }
  }
  const wrap = document.querySelector('[data-testid="code-mirror-wrap"]')
  const execEl = document.querySelector('.cm-exec-line')
  const viz = document.querySelector('[data-testid="visualizer"]')
  const bars = view?.querySelector('.bars-wrap')
  return {
    counter: document.querySelector('[data-testid="step-counter"]')?.textContent?.trim(),
    banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim(),
    runId: viz?.getAttribute('data-run-id'),
    execLine: wrap?.getAttribute('data-exec-line') ?? null,
    execLineText: execEl?.textContent ?? null,
    codeMeta: document.querySelector('.code-browser-meta')?.textContent?.trim() ?? null,
    signed: bars?.getAttribute('data-signed') ?? null,
    slots: S.map((s) => ({ i: s.i, v: s.v, ptrs: s.ptrs.map((p) => p.label) })),
    conflicts,
  }
}

const out = { base, reduced, at: new Date().toISOString(), results: {} }
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
for (const [w, h] of vps) {
  const vp = `${w}x${h}`
  for (const c of CASES) {
    const p = await b.newPage({ viewport: { width: w, height: h } })
    const errs = []
    p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto(base + '#/')
    await p.goto(base + `#/algo/${c.algo}`)
    await p.getByTestId('workbench-layout').waitFor()
    if (reduced) await p.getByLabel('动画模式').selectOption('reduced')
    if (c.input) {
      const edit = p.getByTestId('input-edit-toggle')
      if (((await edit.textContent()) ?? '').includes('编辑输入')) await edit.click()
      await p.getByTestId('array-input').fill(c.input)
    }
    await run(p)
    for (let k = 0; k < c.nexts; k++) await next(p)
    await p.waitForTimeout(400)
    const demoTab = p.getByTestId('workbench-tab-demo')
    const m = await p.evaluate(measure)
    m.errors = errs
    out.results[`${c.key}-${vp}${reduced ? '-reduced' : ''}`] = m
    await p.screenshot({ path: path.join(outDir, `${c.key}-${vp}${reduced ? '-reduced' : ''}.png`) })
    console.log(c.key, vp, m.counter, '|', m.banner, '| exec', m.execLine, JSON.stringify(m.execLineText), '| conflicts', m.conflicts.length, JSON.stringify(m.conflicts.slice(0, 4)))
    void demoTab
    await p.close()
  }
}
await b.close()
fs.mkdirSync(path.dirname(outJson), { recursive: true })
const prev = fs.existsSync(outJson) ? JSON.parse(fs.readFileSync(outJson, 'utf8')) : {}
fs.writeFileSync(outJson, JSON.stringify({ ...prev, ...out, results: { ...(prev.results ?? {}), ...out.results } }, null, 2))
