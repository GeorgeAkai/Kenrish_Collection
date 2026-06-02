import { useState } from 'react'
import { Star } from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  type: 'products' | 'handbags' | 'clothes'
  itemId: number
  currentRating: number
  onRated: (newAvg: number) => void
}

export default function RatingWidget({ type, itemId, currentRating, onRated }: Props) {
  const { isAuthenticated } = useAuth()
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function rate(value: number) {
    if (!isAuthenticated) { window.location.href = '/login'; return }
    setSubmitting(true)
    try {
      const { data } = await api.post(`/${type}/${itemId}/rate/`, { value })
      onRated(data.average_rating)
      setMessage('Rating saved!')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Could not save rating.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={submitting}
            className="p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => rate(star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={22}
              className={`transition-colors ${star <= (hover || currentRating) ? 'text-gold' : 'text-muted-foreground'}`}
              fill={star <= (hover || currentRating) ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {currentRating > 0 ? currentRating.toFixed(1) : 'Not yet rated'}
      </span>
      {message && (
        <span className={`text-xs font-medium ${message.includes('saved') ? 'text-green-600' : 'text-destructive'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
