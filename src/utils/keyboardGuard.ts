/**
 * V15-01: Decide whether Visualizer global keydown should ignore a key
 * (leave it to the focused control) vs handle transport shortcuts.
 *
 * Editing controls always own the keyboard first — including when they live
 * inside `.inspector-sheet`. Being inside the drawer is NOT a reason to steal
 * ArrowLeft/Right from INPUT/TEXTAREA/SELECT/contenteditable/range.
 */

function isElement(n: EventTarget | null | undefined): n is Element {
  return !!n && typeof (n as Element).nodeType === 'number' && (n as Element).nodeType === 1
}

function tagOf(el: Element): string {
  return el.tagName
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
    // Buttons / submit are not "editing" for arrow ownership
    if (type === 'button' || type === 'submit' || type === 'reset' || type === 'checkbox' || type === 'radio' || type === 'file' || type === 'image') {
      return false
    }
    return true // text, number, range, search, etc.
  }
  return false
}

/** True if event target / composed path hits an editing control. */
export function eventTargetsEditingControl(e: KeyboardEvent): boolean {
  if (typeof e.composedPath === 'function') {
    for (const n of e.composedPath()) {
      if (!isElement(n)) continue
      if (isEditingControl(n)) return true
      // contenteditable ancestor
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

  const t = e.target as HTMLElement | null
  if (!t) return false

  // Transport / sheet chrome buttons: allow ArrowLeft/Right to reach window handler
  // (sheet reading area still scrubs when focus is NOT in an input).
  if (tagOf(t) === 'BUTTON' || t.closest?.('button')) {
    if (
      t.closest(
        '.viz-toolbar, .scrub-row, .phase-jump, .phase-track, .playback-transport, .inspector-sheet, [data-testid="inspector-sheet"], .inspector-sheet-transport',
      )
    ) {
      return e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== ' ' && e.code !== 'Space'
    }
    return true
  }

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
