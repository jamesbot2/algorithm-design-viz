import { describe, expect, it, afterEach } from 'vitest'
import { shouldIgnoreKeyboard } from '../../src/utils/keyboardGuard'

function fire(target: Element, init: KeyboardEventInit = { key: 'ArrowRight' }) {
  let ignored: boolean | null = null
  const h = (e: Event) => { ignored = shouldIgnoreKeyboard(e as KeyboardEvent) }
  window.addEventListener('keydown', h)
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init }))
  window.removeEventListener('keydown', h)
  return ignored
}

afterEach(() => { document.body.innerHTML = '' })

describe('V33-01 keyboard ownership guard', () => {
  it('links and children of links own arrows / Space', () => {
    document.body.innerHTML = '<a href="#/x" id="a"><span id="s">冒泡</span></a>'
    expect(fire(document.getElementById('a')!)).toBe(true)
    expect(fire(document.getElementById('s')!, { key: ' ', code: 'Space' })).toBe(true)
  })
  it('nav scope owns keys even on non-interactive children', () => {
    document.body.innerHTML = '<aside data-kbd-scope="nav"><h2 id="h">目录</h2></aside><div id="stage"></div>'
    expect(fire(document.getElementById('h')!)).toBe(true)
    expect(fire(document.getElementById('stage')!)).toBe(false)
  })
  it('open aria-modal owns keys even when focus fell to body', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true"></div><div id="stage"></div>'
    expect(fire(document.getElementById('stage')!)).toBe(true)
  })
  it('modifiers / isComposing / defaultPrevented are ignored; plain stage key handled', () => {
    document.body.innerHTML = '<div id="stage"></div>'
    const st = document.getElementById('stage')!
    expect(fire(st, { key: 'ArrowRight', ctrlKey: true })).toBe(true)
    expect(fire(st, { key: 'ArrowRight', isComposing: true })).toBe(true)
    expect(fire(st, { key: 'ArrowRight' })).toBe(false)
  })
})
