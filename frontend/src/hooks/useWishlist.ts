import { useState, useEffect, useCallback } from 'react'
import { Heart, HeartOff } from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { Wishlist } from '@/lib/types'

export function useWishlist() {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [wishlist, setWishlist] = useState<Wishlist>({ products: [], handbags: [], clothes: [] })

  const fetch = useCallback(() => {
    if (!isAuthenticated) return
    api.get('/wishlist/').then(r => setWishlist(r.data)).catch(() => {
      toast.error("Couldn't load your wishlist. Please refresh and try again.")
    })
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  const isInWishlist = (type: 'products' | 'handbags' | 'clothes', id: number) =>
    wishlist[type].some(i => i.id === id)

  const toggle = async (type: 'products' | 'handbags' | 'clothes', id: number) => {
    if (!isAuthenticated) { window.location.href = '/login'; return }
    const inWishlist = isInWishlist(type, id)
    const name = wishlist[type].find(i => i.id === id)?.name
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/${type}/${id}/`)
      } else {
        await api.post(`/wishlist/${type}/${id}/`)
      }
      await fetch()
      // Undo instead of "Are you sure?": put it back (or take it out) with one tap.
      toast.show({
        title: inWishlist ? 'Removed from wishlist' : 'Added to wishlist',
        description: inWishlist ? name : 'We\u2019ll tell you if it\u2019s running out or comes back in stock.',
        icon: inWishlist ? HeartOff : Heart,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              if (inWishlist) await api.post(`/wishlist/${type}/${id}/`)
              else await api.delete(`/wishlist/${type}/${id}/`)
              fetch()
            } catch { toast.error("Couldn't undo. Please try again.") }
          },
        },
      })
    } catch {
      toast.error(inWishlist ? "Couldn't remove item from wishlist." : "Couldn't add item to wishlist.")
    }
  }

  return { wishlist, isInWishlist, toggle }
}
