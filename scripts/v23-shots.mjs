import { chromium } from 'playwright'
const [,, base, out, vp='1366x768', ...routes] = process.argv
const [w,h] = vp.split('x').map(Number)
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const p = await b.newPage({ viewport: { width: w, height: h } })
const errs=[]; p.on('pageerror', e=>errs.push(String(e)))
for (const r of routes) {
  await p.goto(base + '#/' + r); await p.waitForTimeout(800)
  const run = p.getByTestId('run-btn').first()
  if (await run.count()) { await run.click(); await p.waitForTimeout(900); for (let i=0;i<6;i++){ const n=p.getByTestId('next-step-btn').first(); if (await n.isEnabled()) await n.click(); await p.waitForTimeout(60)} }
  await p.waitForTimeout(400)
  const m = await p.evaluate(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};return {stage:q('[data-testid=viz-canvas]'),data:q('[data-testid=workbench-data-slot]'),code:q('[data-testid=workbench-code-slot]'),tr:q('[data-testid=workbench-transport-slot]'),doc:document.querySelector('.main')?.scrollHeight, mode:document.querySelector('[data-testid=workbench-layout]')?.dataset.layoutMode}})
  console.log(r, JSON.stringify(m))
  await p.screenshot({ path: `${out}/${r.replace(/\W+/g,'_')}-${vp}.png` })
}
console.log('errors', errs)
await b.close()
