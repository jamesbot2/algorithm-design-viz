import { describe, expect, it } from 'vitest'
import { parseNumberList } from '../src/utils/parseInput'

describe('P0-05 parseNumberList', () => {
  it('errors on invalid tokens instead of dropping', () => {
    const { values, errors } = parseNumberList('1,abc,3')
    expect(errors.length).toBe(1)
    expect(errors[0]?.token).toBe('abc')
    expect(values).toEqual([1, 3])
  })

  it('allows empty and zero', () => {
    expect(parseNumberList('').values).toEqual([])
    expect(parseNumberList('0,0,1').values).toEqual([0, 0, 1])
  })
})
