import { expect, type Locator, type Page } from '@playwright/test'

/**
 * V23: current-step data is a permanent workbench region, not a body-portal sheet.
 * - docked / wide: the region sits under (or beside) the scene; `data-toggle`
 *   (aria-expanded) collapses it to its header.
 * - tabbed: the region is the 「数据」 tab; the transport stays outside the tabs.
 *
 * Old specs that opened `inspector-sheet` via `inspector-sheet-toggle` now use this
 * helper: the contract they checked ("vars / arrays / result reachable without
 * leaving the current cursor") is preserved; the entry point changed.
 */
export async function openCurrentData(page: Page): Promise<Locator> {
  const layout = page.getByTestId('workbench-layout')
  await expect(layout).toBeVisible()
  const mode = await layout.getAttribute('data-layout-mode')
  if (mode === 'tabbed') {
    await page.getByTestId('workbench-tab-data').click()
    await expect(page.getByTestId('workbench-tab-data')).toHaveAttribute('aria-selected', 'true')
  } else {
    const toggle = page.getByTestId('data-toggle')
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  }
  const body = page.getByTestId('workbench-data-body')
  await expect(body).toBeVisible()
  return body
}

/** Return to the scene (tabbed) — docked/wide keep data visible next to the scene. */
export async function backToScene(page: Page) {
  const mode = await page.getByTestId('workbench-layout').getAttribute('data-layout-mode')
  if (mode === 'tabbed') {
    await page.getByTestId('workbench-tab-demo').click()
    await expect(page.getByTestId('workbench-viz-slot')).toBeVisible()
  }
}

/** Open the separately-labelled final-result details (whole-run result, not the current step). */
export async function openFinalResult(page: Page) {
  const body = await openCurrentData(page)
  const panel = body.getByTestId('final-answer-panel')
  await expect(panel).toBeVisible()
  if ((await panel.getAttribute('open')) === null) await panel.locator('summary').click()
  await expect(panel).toHaveAttribute('open', '')
  return panel
}
