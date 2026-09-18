/**
 * V15-01 / V16-01: Decide whether Visualizer global keydown should ignore a key
 * (leave it to the focused control) vs handle transport shortcuts.
 *
 * Editing controls always own the keyboard first — including when they live
 * inside `.inspector-sheet`. Being inside the drawer is NOT a reason to steal
 * ArrowLeft/Right from INPUT/TEXTAREA/SELECT/contenteditable/range.
 *
 * V16-01: BUTTON / checkbox / radio / role equivalents own Space / Enter / arrows
 * before global play — one native action per key (no double-toggle).
 */

function isElement(n: EventTarget | null | undefined): n is Element {
  return !!n && typeof (n as Element).nodeType === 'number' && (n as Element).nodeType === 1
}

function tagOf(el: Element): string {
  return el.tagName
}

function roleOf(el: Element): string {
  return ((el.getAttribute?.('role') || '') as string).toLowerCase()
}

/** True if this element itself is an editing control. */
export function isEditingControl(el: Element | null | undefined): boolean {
  if (!el || !isElement(el)) return false
  const html = el as HTMLElement
  if (html.isContentEditable) return true
  const tag = tagOf(el)
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
    // Buttons / submit / checkbox / radio are NOT text-editing for arrow ownership
    // (checkbox/radio are handled separately as activation controls).
    if (
      type === 'button' ||
      type === 'submit' ||
      type === 'reset' ||
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'file' ||
      type === 'image'
    ) {
      return false
    }
    return true // text, number, range, search, etc.
  }
  return false
}

/** Native activation controls: button / checkbox / radio (and ARIA roles). */
export function isActivationControl(el: Element | null | undefined): boolean {
  if (!el || !isElement(el)) return false
  const tag = tagOf(el)
  const role = roleOf(el)
  if (tag === 'BUTTON') return true
  if (tag === 'SUMMARY') return true
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase()
    if (type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit' || type === 'reset') {
      return true
    }
  }
  if (
    role === 'button' ||
    role === 'checkbox' ||
    role === 'radio' ||
    role === 'switch' ||
    role === 'tab' ||
    role === 'menuitem' ||
    role === 'menuitemcheckbox' ||
    role === 'menuitemradio' ||
    role === 'option'
  ) {
    return true
  }
  return false
}

/** True if event target / composed path hits an editing control. */
export function eventTargetsEditingControl(e: KeyboardEvent): boolean {
  if (typeof e.composedPath === 'function') {
    for (const n of e.composedPath()) {
      if (!isElement(n)) continue
      if (isEditingControl(n)) return true
      if ((n as HTMLElement).isContentEditable) return true
    }
  }
  const t = e.target as HTMLElement | null
  if (!t) return false
  if (isEditingControl(t)) return true
  if (t.closest?.('[contenteditable="true"], [contenteditable=""], [contenteditable]')) {
    const ce = t.closest('[contenteditable="true"], [contenteditable=""], [contenteditable]') as HTMLElement | null
    if (ce?.isContentEditable) return true
  }
  if (t.closest?.('input, textarea, select')) {
    const host = t.closest('input, textarea, select')
    if (host && isEditingControl(host)) return true
  }
  if (t.closest?.('[role="slider"], input[type="range"]')) return true
  return false
}

/** True if event targets a native activation control (button/checkbox/radio/…). */
export function eventTargetsActivationControl(e: KeyboardEvent): boolean {
  if (typeof e.composedPath === 'function') {
    for (const n of e.composedPath()) {
      if (!isElement(n)) continue
      if (isActivationControl(n)) return true
      // Closest button host (e.g. icon inside <button>)
      if (tagOf(n) !== 'BUTTON' && (n as HTMLElement).closest?.('button')) {
        return true
      }
    }
  }
  const t = e.target as HTMLElement | null
  if (!t) return false
  if (isActivationControl(t)) return true
  if (t.closest?.('button, summary, input[type="checkbox"], input[type="radio"], [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"]')) {
    return true
  }
  return false
}

function isSpaceOrEnter(e: KeyboardEvent): boolean {
  return e.key === ' ' || e.code === 'Space' || e.key === 'Enter'
}

function isArrowKey(e: KeyboardEvent): boolean {
  return (
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.code === 'ArrowLeft' ||
    e.code === 'ArrowRight' ||
    e.code === 'ArrowUp' ||
    e.code === 'ArrowDown'
  )
}

/**
 * @returns true → Visualizer must NOT handle this key (ignore).
 */
export function shouldIgnoreKeyboard(e: KeyboardEvent): boolean {
  if (e.defaultPrevented) return true
  if (e.isComposing) return true
  // Modifier chords belong to the browser / other shortcuts
  if (e.altKey || e.ctrlKey || e.metaKey) return true

  // V15-01: editing controls ALWAYS own first (drawer included)
  if (eventTargetsEditingControl(e)) return true

  // V16-01: BUTTON / checkbox / radio own Space / Enter / arrows before global play
  if (eventTargetsActivationControl(e)) {
    if (isSpaceOrEnter(e) || isArrowKey(e)) return true
    // Other keys on buttons: also leave alone (no accidental scrub)
    return true
  }

  const t = e.target as HTMLElement | null
  if (!t) return false

  if (
    t.closest(
      '[role="slider"], [role="separator"], [data-panel-resize-handle], .cm-editor, .cm-content, .code-browser, .WorkbenchLayout',
    )
  ) {
    if (t.closest('.viz-toolbar, .scrub-row, .phase-jump, .phase-track, .playback-transport')) return false
    if (t.closest('.cm-editor, .cm-content, .code-browser')) return true
    if (t.closest('[role="slider"], input[type="range"]')) return true
    if (t.closest('[role="separator"], [data-panel-resize-handle]')) return true
  }

  return false
}
