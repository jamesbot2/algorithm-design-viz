/**
 * V17-01 → V23 input edit body budget.
 * V23 replacement note: V17-01 checked a max-height:900px media ladder that clamped
 * the idle panel to 2.8rem and gave the editing body a 4.5rem floor. V23 removes the
 * clamp ladder: the input body is in normal flow under the toolbar, and when it
 * does not fit the page scroll viewport (.main) scrolls while the workbench keeps
 * its min height — so nothing is clipped and nothing is crushed.
 */
import { describe, expect, it } from 'vitest'
import { readAllCss } from './helpers/readCss'

describe('V17-01 / V23 input edit body budget CSS', () => {
  const css = readAllCss()

  it('no max-height/overflow clamp on the input panel or its body', () => {
    expect(css).not.toMatch(/input-panel-v9/)
    expect(css).not.toMatch(/\.input-panel-body[^{]*\{[^}]*max-height/s)
    expect(css).not.toMatch(/\.algo-toolbar[^{]*\{[^}]*overflow:\s*hidden/s)
    expect(css).not.toMatch(/data-input-editing/)
  })

  it('page viewport scrolls and the workbench keeps a min height (no crush)', () => {
    expect(css).toMatch(/\.main-wrap\[data-lab-fill="1"\] > \.main\s*\{[^}]*overflow-y:\s*auto/s)
    expect(css).toMatch(/\.workbench-layout\s*\{[^}]*min-height:\s*var\(--wb-min-h/s)
    expect(css).toMatch(/\.algo-toolbar \.input-panel-body\s*\{/)
  })
})
