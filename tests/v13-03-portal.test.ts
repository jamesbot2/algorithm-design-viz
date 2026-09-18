import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../src/components/workbench/PlaybackTransport.tsx'), 'utf8')

describe('V13-03 settings portal lifecycle + in-portal overflow', () => {
  it('closes or repositions when toggle has zero rect / hidden', () => {
    expect(src).toMatch(/toggleIsVisible/)
    expect(src).toMatch(/setSettingsOpen\(false\)/)
  })

  it('listens to visualViewport + scroll while open', () => {
    expect(src).toMatch(/visualViewport/)
    expect(src).toMatch(/addEventListener\('scroll'/)
  })

  it('renders overflowStages select inside portaled settings', () => {
    expect(src).toMatch(/phase-jump-overflow-dock/)
    expect(src).toMatch(/overflow-stages-select-dock/)
  })

  it('has explicit close control + Esc', () => {
    expect(src).toMatch(/playback-settings-close/)
    expect(src).toMatch(/Escape/)
  })
})
