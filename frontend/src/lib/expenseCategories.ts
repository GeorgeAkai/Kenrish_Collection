export type ExpenseShop = 'beauty' | 'fashion'

const BEAUTY_ONLY = ['Beauty Products']
const FASHION_ONLY = ['Fashion (Clothes)', 'Fashion (Handbags)']
const SHARED = ['Rent', 'Electricity', 'Water', 'Equipment', 'Salaries', 'Other']

/** Mirrors EXPENSE_CATEGORIES on the server. */
export const ALL_EXPENSE_CATEGORIES = [...BEAUTY_ONLY, ...FASHION_ONLY, ...SHARED]

/** Categories offered for a shop; `current` (e.g. a legacy "Stock Purchase") stays selectable while editing. */
export function categoriesForShop(shop: ExpenseShop | undefined, current?: string): string[] {
  const list = shop === 'beauty' ? [...BEAUTY_ONLY, ...SHARED]
    : shop === 'fashion' ? [...FASHION_ONLY, ...SHARED]
    : ALL_EXPENSE_CATEGORIES
  return current && !list.includes(current) ? [...list, current] : list
}
