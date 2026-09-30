import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gem, CalendarDays } from 'lucide-react'
import api from '@/lib/axios'

interface LuxuryInquiry {
  id: number
  item: number
  item_name: string
  status: 'PENDING' | 'CONTACTED' | 'CLOSED'
  status_display: string
  preferred_viewing_date: string | null
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONTACTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function MyLuxuryInquiriesPage() {
  const [inquiries, setInquiries] = useState<LuxuryInquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<LuxuryInquiry[]>('/luxury/inquiries/my/').then(r => setInquiries(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>My Luxury Inquiries</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16">
          <Gem size={28} className="mx-auto mb-3 text-primary/30" />
          <p className="text-muted-foreground mb-4">No inquiries yet.</p>
          <Link to="/luxury" className="btn-primary inline-block">Browse the Atelier</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inq => (
            <div key={inq.id} className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{inq.item_name}</p>
                {inq.preferred_viewing_date && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <CalendarDays size={11} /> Preferred: {new Date(inq.preferred_viewing_date + 'T00:00:00').toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_BADGE[inq.status]}`}>{inq.status_display}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
