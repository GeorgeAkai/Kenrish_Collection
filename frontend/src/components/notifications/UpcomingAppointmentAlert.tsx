import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { QueryClientContext, useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { fallbackQueryClient } from '@/lib/queryClient'
import { formatSlotTime } from '@/lib/slots'
import type { Reservation } from '@/lib/types'
import Alert from './Alert'

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "Your appointment is tomorrow at 10:00 AM" for a confirmed booking today (still ahead) or tomorrow. */
export default function UpcomingAppointmentAlert({ className = '' }: { className?: string }) {
  const { isAuthenticated } = useAuth()
  const { data } = useQuery({
    queryKey: ['reservations', 'my'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations/my/')).data,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  }, useContext(QueryClientContext) ?? fallbackQueryClient)

  if (!isAuthenticated || !data) return null
  const now = new Date()
  const today = localKey(now)
  const tomorrow = localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const next = data
    .filter(r => r.status === 'APPROVED')
    .filter(r => r.reservation_date === tomorrow || (r.reservation_date === today && r.reservation_time.slice(0, 5) > nowHM))
    .sort((a, b) => `${a.reservation_date}${a.reservation_time}`.localeCompare(`${b.reservation_date}${b.reservation_time}`))[0]
  if (!next) return null

  const when = next.reservation_date === today ? 'today' : 'tomorrow'
  return (
    <Alert tone="gold" className={className}
      title={`Your appointment is ${when} at ${formatSlotTime(next.reservation_time.slice(0, 5))}`}
      actions={<>
        <Link to="/beauty/reservations" className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center hover:bg-gold-deep">View booking</Link>
        <Link to="/beauty/reservations" className="h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center text-gold-ink hover:bg-card/60">Reschedule</Link>
      </>}>
      {next.service_name ?? 'Salon appointment'} at Shabaab, Nakuru.
    </Alert>
  )
}
