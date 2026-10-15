import { useContext } from 'react'
import { QueryClientContext, useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { fallbackQueryClient } from '@/lib/queryClient'

// Same fallback as adminQuery: components still render in unit tests with no provider above them.
const useClient = () => useContext(QueryClientContext) ?? fallbackQueryClient

export type NotificationKind =
  | 'booking' | 'reminder' | 'stock' | 'order' | 'approval'
  | 'cancel' | 'inventory' | 'data' | 'security'

export interface AppNotification {
  id: number
  kind: NotificationKind
  title: string
  body: string
  link: string
  action_label: string
  priority: boolean
  ref_type: string
  ref_id: number | null
  thumb: string
  unread: boolean
  created_at: string
}

interface Inbox { unread_count: number; results: AppNotification[] }

export interface Announcement {
  id: number
  message: string
  tone: 'gold' | 'dark' | 'warning'
  link_label: string
  link_url: string
  dismissible: boolean
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  updated_at: string
}

export const NOTIFICATIONS_KEY = ['notifications'] as const
const POLL_MS = 60_000

/**
 * The signed-in person's inbox. Checks on load and every 60 seconds while the tab is visible
 * (polling pauses in background tabs); no WebSockets needed.
 */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => (await api.get<Inbox>('/notifications/')).data,
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: false,
  }, useClient())
}

/** Mark some notifications (ids) or all of them read, updating the badge immediately. */
export function useMarkRead() {
  const client = useClient()
  return useMutation({
    mutationFn: async (target: number[] | 'all') => {
      await api.post('/notifications/read/', target === 'all' ? { all: true } : { ids: target })
    },
    onMutate: async target => {
      await client.cancelQueries({ queryKey: NOTIFICATIONS_KEY })
      const previous = client.getQueryData<Inbox>(NOTIFICATIONS_KEY)
      if (previous) {
        const hit = (n: AppNotification) => target === 'all' || target.includes(n.id)
        const results = previous.results.map(n => (hit(n) ? { ...n, unread: false } : n))
        client.setQueryData<Inbox>(NOTIFICATIONS_KEY, { results, unread_count: results.filter(n => n.unread).length })
      }
      return { previous }
    },
    onError: (_e, _t, ctx) => { if (ctx?.previous) client.setQueryData(NOTIFICATIONS_KEY, ctx.previous) },
    onSettled: () => client.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  }, client)
}

/** The one site-wide announcement to show right now, if any. */
export function useCurrentAnnouncement() {
  return useQuery({
    queryKey: ['announcement', 'current'],
    queryFn: async () => (await api.get<{ announcement: Announcement | null }>('/announcements/current/')).data.announcement,
    staleTime: 5 * 60_000,
    retry: false,
  }, useClient())
}

/** "Just now", "12 min ago", "3 h ago", "Yesterday", "Mon 12 Oct". */
export function timeAgo(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const mins = Math.round((now.getTime() - then.getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24 && then.toDateString() === now.toDateString()) return `${hours} h ago`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return then.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function isToday(iso: string, now = new Date()) {
  return new Date(iso).toDateString() === now.toDateString()
}
