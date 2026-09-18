import { expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Mirror of tests/e2e/helpers/ensureInputEditing.ts for happy-dom.
 * V16/V17: input defaults to collapsed summary when viewport height is short
 * (or for simple array algos). Expand via the stable toggle before filling fields.
 * Product keeps collapse-by-default; tests must open the panel, not force-expand on load.
 */
export async function ensureInputEditing(user: UserEvent) {
  const edit = await screen.findByTestId('input-edit-toggle')
  const label = edit.textContent ?? ''
  if (label.includes('编辑输入')) {
    await user.click(edit)
  }
  await waitFor(() => {
    expect(screen.getByTestId('input-panel').getAttribute('data-editing')).toBe('1')
    const body = screen.getByTestId('input-panel-body')
    expect(body.hasAttribute('hidden')).toBe(false)
  })
}
