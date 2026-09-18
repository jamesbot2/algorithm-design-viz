import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V17-04 acceptance quality static checks', () => {
  const ready = readFileSync(resolve(__dirname, '../tests/e2e/helpers/runReadiness.ts'), 'utf8')
  const e2eYml = readFileSync(resolve(__dirname, '../.github/workflows/e2e.yml'), 'utf8')
  const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')

  it('waitForRunReady binds to expectRunId / data-run-id', () => {
    expect(ready).toMatch(/expectRunId/)
    expect(ready).toMatch(/data-run-id/)
    expect(viz).toMatch(/data-run-id=\{/)
  })

  it('openDataSheet does not use force:true or viewport 390 swap', () => {
    expect(ready).toMatch(/export async function openDataSheet/)
    const fn = ready.slice(ready.indexOf('export async function openDataSheet'))
    const end = fn.indexOf('export async function prepare')
    const body = end > 0 ? fn.slice(0, end) : fn
    expect(body).not.toMatch(/force:\s*true/)
    expect(body).not.toMatch(/390/)
  })

  it('e2e.yml uploads current test-results (not only v4)', () => {
    expect(e2eYml).toMatch(/test-results\//)
    expect(e2eYml).not.toMatch(/path:\s*\|\s*\n\s*docs\/screenshots\/v4\/\s*\n\s*docs\/traces\/v4\//)
  })
})
