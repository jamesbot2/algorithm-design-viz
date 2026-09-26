/**
 * V25-01: CodeBrowser only turns a numeric meta.code index into a document line when
 * the module's policy allows it. @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import CodeBrowser from '../../src/components/codeBrowser/CodeBrowser'
import { getCatalog } from '../../src/codeCatalog'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'

const cat = getCatalog('kadane')!
function mount(props: Partial<Parameters<typeof CodeBrowser>[0]>) {
  return render(
    <LabThemeProvider>
      <MotionProvider>
        <CodeBrowser documents={cat} {...props} />
      </MotionProvider>
    </LabThemeProvider>,
  )
}

describe('V25-01 CodeBrowser numeric fallback', () => {
  afterEach(() => cleanup())
  it('forbidden: legacy codeLine=1 (old 考察) never lands on line 2 (the declaration)', () => {
    mount({ activeLine: 1, numericFallback: 'forbidden', unmapped: true })
    expect(screen.getByTestId('code-mirror-wrap').getAttribute('data-exec-line')).toBe('')
    expect(screen.getByTestId('code-unmapped')).toBeTruthy()
  })
  it('legacy-unverified keeps the pre-V25 numeric behaviour (codeLine+1) for unverified modules', () => {
    mount({ activeLine: 1 })
    expect(screen.getByTestId('code-mirror-wrap').getAttribute('data-exec-line')).toBe('2')
  })
  it('an anchor always wins over a numeric line, whatever the policy', () => {
    mount({ activeLine: 1, execAnchorId: 'loopVisit', numericFallback: 'forbidden' })
    const line = Number(screen.getByTestId('code-mirror-wrap').getAttribute('data-exec-line'))
    expect(cat.typescript.source.split('\n')[line - 1]!.trim()).toBe('for (let i = 1; i < a.length; i++) {')
  })
})
