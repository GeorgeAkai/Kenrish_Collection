import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import type { Wishlist } from '@/lib/types'

export function useWishlist() {
  const { isAuthenticated } = useAuth()
  const [wishlist, setWishlist] = useState<Wishlist>({ products: [], handbags: [], clothes: [] })

  const fetch = useCallback(() => {
    if (!isAuthenticated) return
    api.get('/wishlist/').then(r => setWishlist(r.data)).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => { fetch() }, [fetch])

  const isInWishlist = (type: 'products' | 'handbags' | 'clothes', id: number) =>
    wishlist[type].some(i => i.id === id)

  const toggle = async (type: 'products' | 'handbags' | 'clothes', id: number) => {
    if (!isAuthenticated) { window.location.href = '/login'; return }
    const inWishlist = isInWishlist(type, id)
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/${type}/${id}/`)
      } else {
        await api.post(`/wishlist/${type}/${id}/`)
      }
      await fetch()
    } catch {
      // ignore
    }
  }

  return { wishlist, isInWishlist, toggle }
}
