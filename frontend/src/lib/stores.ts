import { Scissors, Shirt, type LucideIcon } from 'lucide-react'

export type StoreId = 'beauty' | 'fashion'

export interface StoreDef {
  id: StoreId
  labelKey: string
  shortKey: string
  href: string
  icon: LucideIcon
}

export const STORES: StoreDef[] = [
  { id: 'beauty', labelKey: 'store.beauty', shortKey: 'store.beautyShort', href: '/beauty', icon: Scissors },
  { id: 'fashion', labelKey: 'store.fashion', shortKey: 'store.fashion', href: '/fashion', icon: Shirt },
]

/** Which storefront a public route belongs to; null on the shared home page and account pages. */
export function storeForPath(pathname: string): StoreId | null {
  if (/^\/(fashion|clothes|handbags)/.test(pathname)) return 'fashion'
  if (/^\/(beauty|products|services|reservation|gallery)/.test(pathname)) return 'beauty'
  return null
}

/** Search categories: each maps to a listing page that reads `?search=`. */
export const SEARCH_CATEGORIES = [
  { value: '/products', labelKey: 'search.beautyProducts' },
  { value: '/handbags', labelKey: 'nav.handbags' },
  { value: '/clothes', labelKey: 'nav.clothes' },
] as const

export const SHOP_PHONE = '0708 440390'
export const SHOP_PHONE_TEL = 'tel:+254708440390'
