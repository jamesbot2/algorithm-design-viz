import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KnapsackUnit from '../../src/pages/teaching/KnapsackUnit'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'

function wrap(ui: ReactElement) {
  return (
    <MemoryRouter>
      <LabThemeProvider>
        <MotionProvider>{ui}</MotionProvider>
      </LabThemeProvider>
    </MemoryRouter>
  )
}

describe('UI-05 knapsack draft vs run snapshot', () => {
  it('W=8 run then switch W=50 without run keeps old snapshot and dirty banner', async () => {
    const user = userEvent.setup()
    render(wrap(<KnapsackUnit />))

    await user.click(screen.getByTestId('run-btn'))
    expect(screen.getByTestId('knapsack-run-summary').textContent).toMatch(/DP2D|max=/)
    // Default preset W=8
    expect(screen.getByTestId('workbench-layout').textContent).toMatch(/W=8/)

    await user.selectOptions(screen.getByTestId('knapsack-preset'), 'greedy')
    // Draft shows W=50
    expect(screen.getByTestId('knapsack-draft-summary').textContent).toMatch(/W=\s*50/)
    // Dirty banner present — must not silently replace run summary with new params only
    expect(screen.getByTestId('knapsack-dirty-banner')).toBeTruthy()
    expect(screen.getByTestId('knapsack-run-summary').textContent).toMatch(/上一轮/)
    // Workbench summary still references previous run
    expect(screen.getByTestId('workbench-layout').textContent).toMatch(/上一轮|W=8/)
  })
})
