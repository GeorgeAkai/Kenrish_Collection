import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export type Storefront = 'beauty' | 'fashion' | 'luxury' | null

export function storefrontForPath(pathname: string): Storefront {
  if (pathname.startsWith('/beauty')) return 'beauty'
  if (pathname.startsWith('/fashion')) return 'fashion'
  if (pathname.startsWith('/luxury')) return 'luxury'
  return null
}

/**
 * Sets [data-theme] on <html> from the route, independent of the light/dark
 * .dark class. Scoped to PublicLayout only — admin routes never set this, so
 * admin styling is unaffected.
 */
export function useStorefrontTheme(): Storefront {
  const location = useLocation()
  const storefront = storefrontForPath(location.pathname)

  useEffect(() => {
    if (storefront) {
      document.documentElement.dataset.theme = storefront
    } else {
      delete document.documentElement.dataset.theme
    }
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [storefront])

  return storefront
}
