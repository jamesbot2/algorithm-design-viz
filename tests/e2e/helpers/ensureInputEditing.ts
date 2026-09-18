import { expect, type Page } from '@playwright/test'

/**
 * V16-05: demo defaults to collapsed input (summary +「编辑输入」) when viewport
 * height is short or for simple array algos. Expand before filling fields.
 * Product keeps collapse-by-default; tests must open via the stable toggle.
 */
export async function ensureInputEditing(page: Page) {
  const edit = page.getByTestId('input-edit-toggle')
  await expect(edit).toBeVisible({ timeout: 15_000 })
  const label = (await edit.textContent()) ?? ''
  if (label.includes('编辑输入')) {
    await edit.click()
  }
  await expect(page.getByTestId('input-panel')).toHaveAttribute('data-editing', '1')
  await expect(page.getByTestId('input-panel-body')).toBeVisible()
}
