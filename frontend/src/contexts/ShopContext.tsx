import { createContext, useContext, useState, ReactNode } from 'react'

export type ShopSlug = 'beauty' | 'clothes' | 'luxury' | 'enterprise'

export interface ShopOption {
  slug: ShopSlug
  name: string
  emoji: string
}

export const SHOPS: ShopOption[] = [
  { slug: 'beauty',     name: 'Beauty Shop',   emoji: '💄' },
  { slug: 'clothes',    name: 'Clothes Shop',  emoji: '👗' },
  { slug: 'luxury',     name: 'Luxury Attire', emoji: '✨' },
  { slug: 'enterprise', name: 'Enterprise',    emoji: '🌐' },
]

interface ShopContextValue {
  shop: ShopSlug
  shopName: string
  setShop: (s: ShopSlug) => void
  shopParam: string   // '?shop=beauty' — append to any admin API call
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopSlug>('beauty')

  const shopName = SHOPS.find(s => s.slug === shop)?.name ?? ''
  const shopParam = `shop=${shop}`

  return (
    <ShopContext.Provider value={{ shop, shopName, setShop, shopParam }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}
