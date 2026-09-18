import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

describe('V12-01 stage owns graph vs inspector', () => {
  it('fill mode: stage-viewport uses overflow auto', () => {
    expect(css).toMatch(/\.stage-viewport\s*\{[^}]*overflow:\s*auto/s)
  })

  it('fill mode constrains graph-svg to height 100% (not unconstrained auto)', () => {
    expect(css).toMatch(
      /\[data-lab-fill="1"\]:not\(\[data-height-fallback="scroll"\]\)[\s\S]*?\.graph-svg\s*\{[^}]*height:\s*100%/s,
    )
  })

  it('scroll fallback lets stage grow with content', () => {
    expect(css).toMatch(
      /\[data-height-fallback="scroll"\][\s\S]*?\.stage-viewport[\s\S]*?flex:\s*0\s+0\s+auto/s,
    )
  })
})
