import { expect, type Locator, type Page } from '@playwright/test'

/**
 * V23: the capped phase chips live inline in the transport when the workbench is
 * roomy (data-transport="roomy"), and in the 「阶段 / 设置」 popover when compact
 * (1366x768-class heights give that row to the graph). Either way they are the
 * same capped list driving the ONE playback controller.
 * Returns the visible chip container (opening the popover if needed).
 */
export async function visiblePhaseJump(page: Page): Promise<Locator> {
  const inline = page.getByTestId('phase-jump')
  if ((await inline.count()) && (await inline.isVisible())) return inline
  const toggle = page.getByTestId('playback-settings-toggle')
  await expect(toggle).toBeVisible()
  if (!(await page.getByTestId('playback-settings-panel').count())) await toggle.click()
  const dock = page.getByTestId('phase-jump-dock')
  await expect(dock).toBeVisible()
  return dock
}

/** Click a phase chip by label via the real UI; closes the popover afterwards. */
export async function clickPhase(page: Page, label: string) {
  const box = await visiblePhaseJump(page)
  await box.getByRole('button', { name: label, exact: true }).first().click()
  if (await page.getByTestId('playback-settings-panel').count()) {
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('playback-settings-panel')).toHaveCount(0)
  }
}
