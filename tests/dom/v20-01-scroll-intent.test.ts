import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createScrollFollowIntent } from '../../src/utils/scrollFollowIntent'

describe('V20-01 scrollFollowIntent', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not fire onUserBrowse for scroll without user gesture (layout/clamp)', () => {
    const intent = createScrollFollowIntent()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const spy = vi.fn()
    intent.bind(el, spy)
    el.dispatchEvent(new Event('scroll'))
    expect(spy).not.toHaveBeenCalled()
    el.remove()
  })

  it('fires onUserBrowse when wheel preceded scroll', () => {
    const intent = createScrollFollowIntent()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const spy = vi.fn()
    intent.bind(el, spy)
    el.dispatchEvent(new Event('wheel', { bubbles: true }))
    el.dispatchEvent(new Event('scroll'))
    expect(spy).toHaveBeenCalledTimes(1)
    el.remove()
  })

  it('absorbs scroll during transaction even after wheel', () => {
    const intent = createScrollFollowIntent()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const spy = vi.fn()
    intent.bind(el, spy)
    el.dispatchEvent(new Event('wheel'))
    const txn = intent.beginTransaction('follow')
    el.dispatchEvent(new Event('scroll'))
    expect(spy).not.toHaveBeenCalled()
    txn.end()
    el.remove()
  })
})

