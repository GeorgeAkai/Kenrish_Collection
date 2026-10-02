import { describe, expect, it } from 'vitest'
import { ALL_EXPENSE_CATEGORIES, categoriesForShop } from './expenseCategories'

describe('categoriesForShop', () => {
  const shared = ['Rent', 'Electricity', 'Water', 'Equipment', 'Salaries', 'Other']

  it('offers beauty products and the shared categories for the Beauty shop', () => {
    expect(categoriesForShop('beauty')).toEqual(['Beauty Products', ...shared])
  })

  it('offers clothes, handbags and the shared categories for the Fashion shop', () => {
    expect(categoriesForShop('fashion')).toEqual(['Fashion (Clothes)', 'Fashion (Handbags)', ...shared])
  })

  it('offers every category when no shop is chosen (shared or all-shops view)', () => {
    expect(categoriesForShop(undefined)).toEqual(ALL_EXPENSE_CATEGORIES)
    expect(ALL_EXPENSE_CATEGORIES).toHaveLength(9)
  })

  it('keeps a legacy category selectable when editing an old expense', () => {
    expect(categoriesForShop('beauty', 'Stock Purchase')).toContain('Stock Purchase')
    expect(categoriesForShop('beauty', 'Rent').filter(c => c === 'Rent')).toHaveLength(1)
  })
})
