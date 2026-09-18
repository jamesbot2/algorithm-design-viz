import { describe, expect, it, afterEach } from 'vitest'
import {
  shouldIgnoreKeyboard,
  isEditingControl,
  eventTargetsEditingControl,
} from '../../src/utils/keyboardGuard'

afterEach(() => {
  document.body.innerHTML = ''
})

function fireKey(el: Element, key: string, init: KeyboardEventInit = {}) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(e)
  // Re-target: KeyboardEvent from dispatch has correct target; build one for helper with composedPath
  const wrapped = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  Object.defineProperty(wrapped, 'target', { configurable: true, value: el })
  const path = typeof wrapped.composedPath === 'function' ? wrapped.composedPath() : [el]
  // Ensure composedPath includes el
  Object.defineProperty(wrapped, 'composedPath', {
    configurable: true,
    value: () => (path.length ? path : [el, document.body, document]),
  })
  return wrapped
}

describe('V15-01 keyboardGuard DOM', () => {
  it('number INPUT owns ArrowLeft/Right', () => {
    const input = document.createElement('input')
    input.type = 'number'
    document.body.appendChild(input)
    expect(isEditingControl(input)).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(input, 'ArrowRight'))).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(input, 'ArrowLeft'))).toBe(true)
  })

  it('drawer sheet + number input: editing wins (no playback steal)', () => {
    const sheet = document.createElement('div')
    sheet.className = 'inspector-sheet'
    sheet.setAttribute('data-testid', 'inspector-sheet')
    const input = document.createElement('input')
    input.type = 'number'
    input.setAttribute('data-testid', 'graph-result-target')
    sheet.appendChild(input)
    document.body.appendChild(sheet)
    const e = fireKey(input, 'ArrowRight')
    expect(eventTargetsEditingControl(e)).toBe(true)
    expect(shouldIgnoreKeyboard(e)).toBe(true)
  })

  it('textarea / select / contenteditable / range fixtures', () => {
    const ta = document.createElement('textarea')
    const sel = document.createElement('select')
    const ce = document.createElement('div')
    ce.contentEditable = 'true'
    const range = document.createElement('input')
    range.type = 'range'
    document.body.append(ta, sel, ce, range)
    for (const el of [ta, sel, ce, range]) {
      expect(shouldIgnoreKeyboard(fireKey(el, 'ArrowLeft'))).toBe(true)
    }
  })

  it('non-editing reading area inside sheet allows arrows', () => {
    const sheet = document.createElement('div')
    sheet.className = 'inspector-sheet'
    sheet.setAttribute('data-testid', 'inspector-sheet')
    const p = document.createElement('p')
    p.textContent = 'vars'
    sheet.appendChild(p)
    document.body.appendChild(sheet)
    expect(shouldIgnoreKeyboard(fireKey(p, 'ArrowRight'))).toBe(false)
  })

  it('defaultPrevented / isComposing / ctrlKey → ignore', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const base = fireKey(div, 'ArrowRight')
    Object.defineProperty(base, 'defaultPrevented', { value: true })
    expect(shouldIgnoreKeyboard(base)).toBe(true)
    expect(shouldIgnoreKeyboard(fireKey(div, 'ArrowRight', { ctrlKey: true }))).toBe(true)
  })
})
