import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Clock, TriangleAlert, X, ArrowRight } from 'lucide-react'
import { useCurrentAnnouncement, type Announcement } from '@/lib/notifications'

const TONE = {
  gold: { bar: 'bg-primary text-primary-foreground', icon: Megaphone },
  dark: { bar: 'bg-inverse text-inverse-foreground', icon: Clock },
  warning: { bar: 'bg-warning-tint text-warning', icon: TriangleAlert },
} as const

const keyFor = (a: Announcement) => `kenrish-announcement-dismissed:${a.id}:${a.updated_at}`

function wasDismissed(a: Announcement) {
  try { return localStorage.getItem(keyFor(a)) === '1' } catch { return false }
}

/** One site-wide line above the header (an offer, a closure, holiday hours). Dismissal is remembered per visitor. */
export default function AnnouncementBar() {
  const { data: announcement } = useCurrentAnnouncement()
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  if (!announcement || dismissedKey === keyFor(announcement) || (announcement.dismissible && wasDismissed(announcement))) return null

  const tone = TONE[announcement.tone] ?? TONE.gold
  const Icon = tone.icon
  const href = announcement.link_url
  const internal = href.startsWith('/')

  function dismiss() {
    try { localStorage.setItem(keyFor(announcement!), '1') } catch { /* private mode: hide for this visit only */ }
    setDismissedKey(keyFor(announcement!))
  }

  return (
    <div role="region" aria-label="Announcement" className={tone.bar}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 min-h-11 py-2 flex items-center gap-3 text-[13px] sm:text-sm">
        <Icon size={16} strokeWidth={1.9} className="shrink-0" />
        <p className="flex-1 font-medium leading-snug">
          {announcement.message}
          {href && announcement.link_label && (
            internal ? (
              <Link to={href} className="ml-2 inline-flex items-center gap-1 font-bold underline underline-offset-2 whitespace-nowrap">
                {announcement.link_label} <ArrowRight size={13} />
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 font-bold underline underline-offset-2 whitespace-nowrap">
                {announcement.link_label} <ArrowRight size={13} />
              </a>
            )
          )}
        </p>
        {announcement.dismissible && (
          <button onClick={dismiss} aria-label="Dismiss announcement"
            className="shrink-0 w-8 h-8 -mr-1 rounded-full flex items-center justify-center hover:bg-black/10">
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
