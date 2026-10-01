import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import api from '@/lib/axios'

/** Random per-browser id so anonymous visitors can be counted (no personal data). */
function clientId(): string {
  try {
    let id = localStorage.getItem('kc_client_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('kc_client_id', id)
    }
    return id
  } catch {
    return ''
  }
}

/** Reports each public route change to the activity log. Silent: never blocks or errors the UI. */
export default function PageTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    api.post('/activity/track/', { path: pathname + search, client_id: clientId() }).catch(() => {})
  }, [pathname, search])
  return null
}
