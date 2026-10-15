import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import Alert from './Alert'

/** Shown while the browser reports no connection. */
export default function OfflineAlert({ className = '' }: { className?: string }) {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <Alert tone="info" icon={WifiOff} title="You’re offline" className={className}>
      You can keep browsing what’s already loaded. Bookings and orders will work again once you’re back online.
    </Alert>
  )
}
