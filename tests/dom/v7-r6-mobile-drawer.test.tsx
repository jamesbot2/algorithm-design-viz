/**
 * V7 R6 — mobile drawer scroll-lock and focus lifecycle.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'

function mockMatchMedia(mobile: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches: mobile,
    media: '(max-width: 960px)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatch: (next: boolean) => {
      ;(mql as { matches: boolean }).matches = next
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent)
    },
  }
  vi.stubGlobal('matchMedia', () => mql)
  return mql
}

describe('V7 R6 mobile drawer', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/algorithm-design-viz/')
    window.location.hash = '#/'
    document.body.style.overflow = ''
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    document.body.style.overflow = ''
  })

  it('phone open → desktop width releases body lock so page can scroll', async () => {
    const user = userEvent.setup()
    const mql = mockMatchMedia(true)
    render(<App />)
    await screen.findByTestId('menu-btn')
    await user.click(screen.getByTestId('menu-btn'))
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.querySelector('[data-mobile-modal="1"]')).toBeTruthy()

    act(() => {
      mql.dispatch(false)
    })
    expect(document.querySelector('[data-mobile-modal="1"]')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('closed drawer: brand/close are not tabbable (inert on aside)', async () => {
    mockMatchMedia(true)
    render(<App />)
    await screen.findByTestId('app-sidebar')
    const aside = screen.getByTestId('app-sidebar')
    expect(aside.hasAttribute('inert') || aside.getAttribute('aria-hidden') === 'true').toBe(true)
    const close = screen.getByTestId('mobile-drawer-close')
    expect(close.tabIndex).toBe(-1)
  })

  it('ESC returns focus to menu trigger', async () => {
    const user = userEvent.setup()
    mockMatchMedia(true)
    render(<App />)
    const menu = await screen.findByTestId('menu-btn')
    await user.click(menu)
    expect(document.body.style.overflow).toBe('hidden')
    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(menu)
  })

  it('route change closes drawer and releases lock', async () => {
    const user = userEvent.setup()
    mockMatchMedia(true)
    render(<App />)
    await user.click(await screen.findByTestId('menu-btn'))
    expect(document.body.style.overflow).toBe('hidden')
    // Click a nav link inside open drawer
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.includes('bubbleSort'))
    expect(link).toBeTruthy()
    // aside not inert when open
    await user.click(link!)
    await act(async () => {
      await Promise.resolve()
    })
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
