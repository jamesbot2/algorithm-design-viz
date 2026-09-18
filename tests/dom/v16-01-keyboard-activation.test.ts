import { describe, expect, it, afterEach } from 'vitest'
import {
  shouldIgnoreKeyboard,
  isActivationControl,
  eventTargetsActivationControl,
} from '../../src/utils/keyboardGuard'

afterEach(() => {
  document.body.innerHTML = ''
})

function fireKey(el: Element, key: string, init: KeyboardEventInit = {}) {
  const wrapped = new KeyboardEvent('keydown', { key, code: key === ' ' ? 'Space' : key, bubbles: true, cancelable: true, ...init })
  Object.defineProperty(wrapped, 'target', { configurable: true, value: el })
  Object.defineProperty(wrapped, 'composedPath', {
    configurable: true,
    value: () => [el, document.body, document],
  })
  return wrapped
}

describe('V16-01 activation controls own Space/Enter/arrows', () => {
  it('BUTTON owns Space and Enter (no global play steal)', () => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = '播放'
    btn.setAttribute('data-testid', 'play-btn')
    document.body.appendChild(btn)
    expect(isActivationControl(btn)).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(btn, ' '))).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(btn, 'Enter'))).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(btn, 'ArrowRight'))).toBe(true)
  })

  it('checkbox / radio own Space', () => {
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    const radio = document.createElement('input')
    radio.type = 'radio'
    document.body.append(cb, radio)
    expect(shouldIgnoreKeyboard(fireKey(cb, ' '))).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(radio, ' '))).toBe(true)
  })

  it('SELECT still owns arrows (editing)', () => {
    const sel = document.createElement('select')
    document.body.appendChild(sel)
    expect(shouldIgnoreKeyboard(fireKey(sel, 'ArrowDown'))).toBe(true)
  })

  it('non-control reading area still allows Space play', () => {
    const div = document.createElement('div')
    div.className = 'stage-viewport'
    document.body.appendChild(div)
    expect(eventTargetsActivationControl(fireKey(div, ' '))).toBe(false)
    expect(shouldIgnoreKeyboard(fireKey(div, ' '))).toBe(false)
  })

  it('transport button owns Space (one action — native click only)', () => {
    const bar = document.createElement('div')
    bar.className = 'playback-transport'
    const btn = document.createElement('button')
    btn.className = 'play-btn'
    bar.appendChild(btn)
    document.body.appendChild(bar)
    expect(shouldIgnoreKeyboard(fireKey(btn, ' '))).toBe(true)
  })
})
