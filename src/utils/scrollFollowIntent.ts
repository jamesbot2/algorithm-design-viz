/**
 * V20-01: Classify scroll intent so layout/animation/browser-clamp scrolls
 * do not falsely pause auto-follow. Only real user browse (wheel / touch /
 * scrollbar / keyboard) pauses. App locate/follow/layout use transactions.
 */

export type ScrollTxnKind = 'follow' | 'layout' | 'locate'

const USER_GESTURE_MS = 450
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
  'Spacebar',
])

export type ScrollFollowIntent = {
  /** Begin a cancellable absorb window for app-driven scroll. */
  beginTransaction: (kind: ScrollTxnKind) => { end: () => void; gen: number; kind: ScrollTxnKind }
  /** True while a follow/layout/locate transaction is open. */
  isAbsorbing: () => boolean
  /** Mark that the user is browsing (wheel/touch/scrollbar/keys). */
  noteUserGesture: () => void
  /** True if a user browse gesture was noted recently. */
  hasRecentUserGesture: () => boolean
  /**
   * Bind listeners on a scroller. onUserBrowse fires only when a scroll event
   * is attributable to user browse (not transaction / layout clamp).
   */
  bind: (el: HTMLElement, onUserBrowse: () => void) => () => void
  /** Bump generation to cancel pending transaction clear callbacks. */
  cancelAll: () => void
}

export function createScrollFollowIntent(): ScrollFollowIntent {
  let txnDepth = 0
  let txnGen = 0
  let userGestureUntil = 0
  const cleanups: Array<() => void> = []

  const noteUserGesture = () => {
    userGestureUntil = performance.now() + USER_GESTURE_MS
  }

  const hasRecentUserGesture = () => performance.now() < userGestureUntil

  const beginTransaction = (kind: ScrollTxnKind) => {
    const gen = ++txnGen
    txnDepth += 1
    // App-driven scroll: drop stale browse gesture so a later clamp/evaluate
    // inside the settle window cannot false-pause after resume/locate.
    if (kind === 'follow' || kind === 'locate' || kind === 'layout') {
      userGestureUntil = 0
    }
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      // Clear after two frames so the scroll event from scrollTo lands inside absorb.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (txnGen !== gen && txnGen > gen) {
            // A newer cancelAll/begin replaced us — still decrement if we counted.
          }
          txnDepth = Math.max(0, txnDepth - 1)
        })
      })
    }
    return { end, gen, kind }
  }

  const isAbsorbing = () => txnDepth > 0

  const cancelAll = () => {
    txnGen += 1
    txnDepth = 0
  }

  const bind = (el: HTMLElement, onUserBrowse: () => void) => {
    const onWheel = () => noteUserGesture()
    const onTouchStart = () => noteUserGesture()
    const onTouchMove = () => noteUserGesture()
    const onKeyDown = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) noteUserGesture()
    }
    // Scrollbar / empty-track clicks typically target the scrollport itself.
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === el) noteUserGesture()
      // Also: pointer in classic scrollbar gutter (outside client box of content).
      const sbW = el.offsetWidth - el.clientWidth
      const sbH = el.offsetHeight - el.clientHeight
      if (sbW > 0 && e.offsetX >= el.clientWidth) noteUserGesture()
      if (sbH > 0 && e.offsetY >= el.clientHeight) noteUserGesture()
    }
    const onScroll = () => {
      if (txnDepth > 0) return
      if (!hasRecentUserGesture()) {
        // Layout / animation / browser clamp — do not pause follow.
        return
      }
      onUserBrowse()
    }

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })

    // If focus is inside scroller, key scrolls count.
    const onDocKey = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(e.key)) return
      if (el === document.activeElement || el.contains(document.activeElement)) {
        noteUserGesture()
      }
    }
    document.addEventListener('keydown', onDocKey)

    const cleanup = () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', onDocKey)
    }
    cleanups.push(cleanup)
    return cleanup
  }

  return {
    beginTransaction,
    isAbsorbing,
    noteUserGesture,
    hasRecentUserGesture,
    bind,
    cancelAll,
  }
}
