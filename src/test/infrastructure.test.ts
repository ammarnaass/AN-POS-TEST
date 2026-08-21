import { describe, expect, it } from 'vitest'

describe('infrastructure', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('has crypto.randomUUID', () => {
    expect(crypto.randomUUID()).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('has matchMedia polyfill', () => {
    expect(window.matchMedia('(min-width: 768px)')).toBeDefined()
  })
})
