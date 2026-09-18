import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const v17 = readFileSync(
  resolve(__dirname, '../tests/e2e/v17-input-edit-code-arrays-acceptance.spec.ts'),
  'utf8',
)
const v18 = readFileSync(
  resolve(__dirname, '../tests/e2e/v18-data-body-primary-scene-controls.spec.ts'),
  'utf8',
)

describe('V18-04 content assertions not shell OR', () => {
  it('V18 e2e removes hit||isVisible OR and asserts real content', () => {
    expect(v18).toMatch(/retries:\s*0/)
    expect(v18).not.toMatch(/runHit\s*\|\|\s*\(/)
    expect(v18).not.toMatch(/editHit\s*\|\|\s*\(/)
    expect(v18).toMatch(/sheetBodyH/)
    expect(v18).toMatch(/currentCellVisibleH/)
    expect(v18).toMatch(/mutationSanity/)
    expect(v18).toMatch(/force 96px|height = '96px'|height:\s*['\"]96px['\"]/)
  })

  it('V17 e2e no longer uses hit||isVisible cheat', () => {
    expect(v17).not.toMatch(/runHit\s*\|\|\s*\(await/)
    expect(v17).not.toMatch(/editHit\s*\|\|\s*\(await/)
  })

  it('openDataSheet still forbids force/viewport swap', () => {
    const rr = readFileSync(resolve(__dirname, '../tests/e2e/helpers/runReadiness.ts'), 'utf8')
    expect(rr).toMatch(/without force:true or secret viewport swap/)
    expect(rr).not.toMatch(/setViewportSize\(\s*\{\s*width:\s*390/)
  })
})
