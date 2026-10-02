import { describe, expect, it } from 'vitest'
import { formatPriceRange } from './utils'

describe('formatPriceRange', () => {
  it('shows a single price when there is no range', () => {
    expect(formatPriceRange('800.00', null)).toBe('KES 800.00')
    expect(formatPriceRange('800.00', undefined)).toBe('KES 800.00')
  })

  it('treats a max equal to or below the price as a single price', () => {
    expect(formatPriceRange('800.00', '800.00')).toBe('KES 800.00')
    expect(formatPriceRange('800.00', '500.00')).toBe('KES 800.00')
  })

  it('shows the full range on detail views', () => {
    expect(formatPriceRange('800.00', '1500.00')).toBe('KES 800.00 – 1,500.00')
  })

  it('shows a "from" price on list views', () => {
    expect(formatPriceRange('800.00', '1500.00', 'from')).toBe('From KES 800.00')
    expect(formatPriceRange('800.00', null, 'from')).toBe('KES 800.00')
  })
})
