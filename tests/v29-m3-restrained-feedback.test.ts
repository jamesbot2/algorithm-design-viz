import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V29 M3 restrained feedback (source)', () => {
  const anim = readFileSync(resolve(__dirname, '../src/styles/animation.css'), 'utf8')
  const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
  const gv = readFileSync(resolve(__dirname, '../src/components/GraphView.tsx'), 'utf8')
  const motion = readFileSync(resolve(__dirname, '../src/theme/motion.ts'), 'utf8')

  it('rejects edge shake / node transform thrash / subtree scale prune', () => {
    expect(anim).not.toMatch(/edge-reject-shake/)
    expect(anim).toMatch(/edge-reject-mark/)
    expect(anim).toMatch(/edge-scan var\(--motion-slow\) linear 1/)
    expect(anim).toMatch(/st-prune[\s\S]*opacity: 0\.35/)
    expect(anim).not.toMatch(/st-prune[\s\S]*scale\(0\.92\)/)
    const nodeBlock = anim.match(/\.graph-svg \.node \{[^}]+\}/)?.[0] ?? ''
    expect(nodeBlock).toMatch(/transition: fill/)
    expect(nodeBlock).not.toMatch(/transform var\(--motion/)
  })

  it('input shake is local 1–2px; springy token has no overshoot', () => {
    expect(anim).toMatch(/translateX\(-2px\)/)
    expect(anim).not.toMatch(/translateX\(-6px\)/)
    expect(motion).toMatch(/springy: 'cubic-bezier\(0\.2, 0, 0, 1\)'/)
  })

  it('update role is not swap colour class; graph camera not rebound on neg warn', () => {
    expect(av).toMatch(/update: 'hl-update'/)
    expect(av).not.toMatch(/update: 'hl-swap'/)
    expect(gv).toMatch(/do not rebind on showNegWarn/)
    expect(gv).toMatch(/graph-neg-warning/)
  })

  it('matrix write stays paint-only (no scale keyframes)', () => {
    expect(anim).toMatch(/mat-write-flash/)
    expect(anim).not.toMatch(/mat-write-flash[\s\S]{0,120}scale\(/)
  })
})
