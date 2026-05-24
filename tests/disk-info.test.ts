// tests/disk-info.test.ts
import { describe, it, expect } from 'vitest'
import { getDiskInfo } from '../src/main/services/disk-info'

describe('getDiskInfo', () => {
  it('returns total, used, free > 0', async () => {
    const info = await getDiskInfo()
    expect(info.total).toBeGreaterThan(0)
    expect(info.used).toBeGreaterThan(0)
    expect(info.free).toBeGreaterThan(0)
    expect(info.total).toBe(info.used + info.free)
  })

  it('byCategory sums up to less than or equal to used', async () => {
    const info = await getDiskInfo()
    const sum = Object.values(info.byCategory).reduce((a, b) => a + b, 0)
    expect(sum).toBeLessThanOrEqual(info.used)
  })
})
