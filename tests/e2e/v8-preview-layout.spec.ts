import { test, expect } from '@playwright/test'

test.describe('V8 preview layout', () => {
  test('mobile tabs is single-pane with usable preview height', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('#/algo/kadane')
    const wb = page.getByTestId('workbench-layout')
    await expect(wb).toBeVisible({ timeout: 20_000 })
    await expect(wb).toHaveAttribute('data-layout', 'tabs')

    const metrics = await page.evaluate(() => {
      const panels = [...document.querySelectorAll('[data-panel]')] as HTMLElement[]
      const active = panels.find((p) => p.getAttribute('data-tab-active') === '1')
      const inactive = panels.find((p) => p.getAttribute('data-tab-active') === '0')
      const viz = document.querySelector('[data-testid="workbench-viz-slot"]') as HTMLElement | null
      const transport = document.querySelector('[data-testid="playback-transport"]') as HTMLElement | null
      const layout = document.querySelector('[data-testid="workbench-layout"]') as HTMLElement | null
      const ar = active?.getBoundingClientRect()
      const ir = inactive?.getBoundingClientRect()
      const vr = viz?.getBoundingClientRect()
      const tr = transport?.getBoundingClientRect()
      const lr = layout?.getBoundingClientRect()
      return {
        activeW: ar?.width ?? 0,
        inactiveW: ir?.width ?? 0,
        vizH: vr?.height ?? 0,
        transportH: tr?.height ?? 0,
        wbH: lr?.height ?? 0,
        wbTop: lr?.top ?? 0,
        vh: window.innerHeight,
        layout: layout?.getAttribute('data-layout'),
        // legacy broken selector must not match
        legacyHits: document.querySelectorAll(
          '.workbench-viz-panel[data-tab-active], .workbench-code-panel[data-tab-active]',
        ).length,
      }
    })

    expect(metrics.layout).toBe('tabs')
    expect(metrics.legacyHits).toBe(0)
    expect(metrics.inactiveW).toBeLessThan(12)
    expect(metrics.activeW).toBeGreaterThan(280)
    expect(metrics.vizH).toBeGreaterThan(240)
    expect(metrics.transportH).toBeLessThan(metrics.vizH)
    expect(metrics.wbH).toBeGreaterThan(metrics.vh * 0.45)
    expect(metrics.wbTop).toBeLessThan(metrics.vh * 0.5)

    // Code tab gets the full pane
    await page.getByRole('tab', { name: '代码' }).click()
    const codeMetrics = await page.evaluate(() => {
      const code = document.querySelector('[data-testid="workbench-code-slot"]') as HTMLElement | null
      const active = document.querySelector('[data-panel][data-tab-active="1"]') as HTMLElement | null
      return {
        codeHidden: code?.hasAttribute('hidden') ?? true,
        codeW: code?.getBoundingClientRect().width ?? 0,
        activeW: active?.getBoundingClientRect().width ?? 0,
      }
    })
    expect(codeMetrics.codeHidden).toBe(false)
    expect(codeMetrics.codeW).toBeGreaterThan(280)
    expect(codeMetrics.activeW).toBeGreaterThan(280)
  })

  test('desktop split panes have usable min height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/kadane')
    const wb = page.getByTestId('workbench-layout')
    await expect(wb).toBeVisible({ timeout: 20_000 })
    await expect(wb).toHaveAttribute('data-layout', 'split')

    const metrics = await page.evaluate(() => {
      const viz = document.querySelector('[data-testid="workbench-viz-slot"]') as HTMLElement | null
      const code = document.querySelector('[data-testid="workbench-code-slot"]') as HTMLElement | null
      const layout = document.querySelector('[data-testid="workbench-layout"]') as HTMLElement | null
      const vr = viz?.getBoundingClientRect()
      const cr = code?.getBoundingClientRect()
      const lr = layout?.getBoundingClientRect()
      return {
        vizH: vr?.height ?? 0,
        vizW: vr?.width ?? 0,
        codeH: cr?.height ?? 0,
        codeW: cr?.width ?? 0,
        wbH: lr?.height ?? 0,
        wbTop: lr?.top ?? 0,
        vh: window.innerHeight,
      }
    })

    expect(metrics.vizW).toBeGreaterThan(280)
    expect(metrics.codeW).toBeGreaterThan(220)
    expect(metrics.vizH).toBeGreaterThan(240)
    expect(metrics.codeH).toBeGreaterThan(240)
    expect(metrics.wbH).toBeGreaterThan(metrics.vh * 0.4)
    expect(metrics.wbTop).toBeLessThan(metrics.vh * 0.5)
  })
})
