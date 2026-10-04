import type { Page } from '@playwright/test'

/**
 * V27: object-level probe of the code browser's execution location, for whichever document
 * (TypeScript / pseudocode) is shown. Same visibility rule as the V24 stage detector
 * (primaryObjects.ts): element box ∩ every clipping ancestor (overflow ≠ visible) ∩ viewport,
 * sub-pixel tolerance, plus a topmost hit-test at the centre. Also records the document's own
 * scroll container so callers can prove locating happened there (not via page scrolling).
 */
export interface CodeExecState {
  frame: { runId: string | null; stepIndex: number; counter: string; banner: string; preview: boolean; playing: boolean; solveCount: string | null }
  vp: { w: number; h: number }
  layout: string | null
  tab: string | null
  docId: string | null
  execState: string | null
  header: string
  headerAnchor: string | null
  headerDocId: string | null
  headerLine: string | null
  execAttr: string | null
  activeCount: number
  domText: string | null
  weakLines: number[]
  weakTexts: string[]
  full: boolean
  hit: boolean
  inOwnScroller: boolean
  scroller: { top: number; height: number; scrollHeight: number; clientHeight: number } | null
  pageScroll: number
  gotoDisabled: boolean | null
  noLocation: { text: string; full: boolean } | null
  unmappedBanner: boolean
  followPaused: boolean
}

export async function measureCodeExec(page: Page, tol = 0.75): Promise<CodeExecState> {
  return page.evaluate((tol) => {
    const clip = (el: Element) => {
      const a = el.getBoundingClientRect()
      let t = a.top, b = a.bottom, l = a.left, r = a.right
      let invisible = false
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || cs.display === 'none') invisible = true
        if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
          const nr = n.getBoundingClientRect()
          t = Math.max(t, nr.top); b = Math.min(b, nr.bottom); l = Math.max(l, nr.left); r = Math.min(r, nr.right)
        }
      }
      if (el.closest('[hidden],[inert],[aria-hidden="true"]')) invisible = true
      t = Math.max(t, 0); l = Math.max(l, 0); b = Math.min(b, window.innerHeight); r = Math.min(r, window.innerWidth)
      const visW = invisible ? 0 : Math.max(0, r - l)
      const visH = invisible ? 0 : Math.max(0, b - t)
      const full = a.width > 0 && a.height > 0 && visW >= a.width - tol && visH >= a.height - tol
      let hit = false
      if (full) {
        const top = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)
        hit = !!top && (el === top || el.contains(top))
      }
      return { full, hit }
    }
    const viz = document.querySelector('[data-testid="visualizer"]')
    const cb = document.querySelector('[data-testid="code-browser"]')
    const tab = cb?.getAttribute('data-tab') ?? null
    const header = (cb?.querySelector('.code-browser-meta')?.textContent ?? '').trim()
    const hm = header.match(/▶ (\S+) @(\S+):(\S+)/)
    const pre = cb?.querySelector('[data-testid="pseudo-pre"]') as HTMLElement | null
    const cmWrap = cb?.querySelector('[data-testid="code-mirror-wrap"]') as HTMLElement | null
    const host = tab === 'pseudo' ? pre : cmWrap
    const scroller = (tab === 'pseudo' ? pre : (cmWrap?.querySelector('.cm-scroller') as HTMLElement | null)) ?? null
    const actives = tab === 'pseudo'
      ? [...(pre?.querySelectorAll('.code-line.active') ?? [])]
      : [...(cmWrap?.querySelectorAll('.cm-exec-line') ?? [])]
    const active = actives[0] as HTMLElement | undefined
    const domText = active
      ? ((tab === 'pseudo' ? active.querySelector('.lt')?.textContent : active.textContent) ?? '')
      : null
    const vis = active ? clip(active) : { full: false, hit: false }
    let inOwnScroller = false
    if (active && scroller) {
      const a = active.getBoundingClientRect(), s = scroller.getBoundingClientRect()
      inOwnScroller = scroller.contains(active) && a.top >= s.top - tol && a.bottom <= s.bottom + tol
    }
    const nl = cb?.querySelector('[data-testid="code-doc-no-location"]') as HTMLElement | null
    const goto = cb?.querySelector('[data-testid="goto-exec-btn"]') as HTMLButtonElement | null
    return {
      frame: {
        runId: viz?.getAttribute('data-run-id') ?? null,
        stepIndex: Number(viz?.getAttribute('data-step-index') ?? -1),
        counter: document.querySelector('[data-testid="step-counter"]')?.textContent?.trim() ?? '',
        banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim() ?? '',
        preview: viz?.getAttribute('data-preview') === '1',
        playing: viz?.getAttribute('data-playing') === '1',
        solveCount: document.querySelector('.algo-page')?.getAttribute('data-solve-count') ?? null,
      },
      vp: { w: window.innerWidth, h: window.innerHeight },
      layout: document.querySelector('[data-testid="workbench-layout"]')?.getAttribute('data-layout') ?? null,
      tab,
      docId: cb?.getAttribute('data-active-doc') ?? null,
      execState: cb?.getAttribute('data-exec-state') ?? null,
      header,
      headerAnchor: hm?.[1] ?? null,
      headerDocId: hm?.[2] ?? null,
      headerLine: hm?.[3] ?? null,
      execAttr: host?.getAttribute('data-exec-line') ?? null,
      activeCount: actives.length,
      domText,
      weakLines: tab === 'pseudo' ? [...(pre?.querySelectorAll('.code-line.context') ?? [])].map((e) => Number(e.getAttribute('data-line'))) : [],
      weakTexts: tab === 'pseudo' ? [] : [...(cmWrap?.querySelectorAll('.cm-context-line') ?? [])].map((e) => e.textContent ?? ''),
      full: vis.full,
      hit: vis.hit,
      inOwnScroller,
      scroller: scroller
        ? { top: scroller.scrollTop, height: scroller.getBoundingClientRect().height, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight }
        : null,
      pageScroll: document.scrollingElement?.scrollTop ?? 0,
      gotoDisabled: goto ? goto.disabled : null,
      noLocation: nl ? { text: (nl.textContent ?? '').trim(), full: clip(nl).full } : null,
      unmappedBanner: !!cb?.querySelector('[data-testid="code-unmapped"]'),
      followPaused: !!cb?.querySelector('[data-testid="follow-paused"]'),
    }
  }, tol)
}

export function tagOf(s: CodeExecState, input: string) {
  return `input=${input}, viewport=${s.vp.w}x${s.vp.h} (${s.layout}), runId=${s.frame.runId}, cursor=${s.frame.stepIndex} (${s.frame.counter}), solveCount=${s.frame.solveCount}, doc=${s.docId}, header="${s.header.replace(/^.*?·\s*/, '')}", data-exec-line="${s.execAttr}", banner="${s.frame.banner}"`
}
