import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V17-02 workbench owns data-open layout', () => {
  const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
  const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')

  it('removes body:has fixed gutter that forced <720 → tabs', () => {
    expect(css).not.toMatch(
      /body:has\(\.inspector-sheet\[data-inspect-mode="side"\]:not\(\[hidden\]\)\)[^{]*padding-right:\s*calc\(min\(360px/s,
    )
  })

  it('workbench tracks data-data-open and layout profile', () => {
    expect(wb).toMatch(/data-data-open=\{dataOpen/)
    expect(wb).toMatch(/data-layout-profile=\{layoutProfile\}/)
    expect(wb).toMatch(/DATA_OPEN_SPLIT_MIN_VW/)
    expect(wb).toMatch(/forceSplitForData/)
  })

  it('keeps code slot min-width when data open in split', () => {
    expect(css).toMatch(
      /workbench-layout\[data-layout="split"\]\[data-data-open="1"\][^{]*workbench-code-slot[\s\S]*?min-width:\s*160px/s,
    )
  })
})
