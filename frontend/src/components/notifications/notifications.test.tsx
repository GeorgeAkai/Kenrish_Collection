import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider, useToast } from '@/contexts/ToastContext'
import { timeAgo, type AppNotification } from '@/lib/notifications'
import NotificationBell from './NotificationBell'
import AnnouncementBar from './AnnouncementBar'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const now = new Date()
const item = (over: Partial<AppNotification>): AppNotification => ({
  id: 1, kind: 'booking', title: 'Booking confirmed', body: 'Barber on Fri', link: '/beauty/reservations',
  action_label: 'View booking', priority: false, ref_type: 'reservation', ref_id: 7, thumb: '',
  unread: true, created_at: now.toISOString(), ...over,
})

function mockInbox(results: AppNotification[]) {
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url === '/notifications/') return { data: { unread_count: results.filter(n => n.unread).length, results } }
    if (url === '/announcements/current/') return { data: { announcement: null } }
    return { data: [] }
  })
}

const renderBell = (audience: 'customer' | 'admin' = 'customer') =>
  render(<MemoryRouter><ToastProvider><NotificationBell audience={audience} /></ToastProvider></MemoryRouter>)

beforeEach(() => {
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  localStorage.clear()
})

describe('NotificationBell', () => {
  it('badges unread items only and caps the count at 9+', async () => {
    mockInbox([...Array.from({ length: 12 }, (_, i) => item({ id: i + 1 })), item({ id: 99, unread: false })])
    renderBell()
    expect(await screen.findByRole('button', { name: 'Notifications, 12 unread' })).toHaveTextContent('9+')
  })

  it('groups Today and Earlier, filters to Unread, and marks everything read', async () => {
    const lastWeek = new Date(now.getTime() - 6 * 86_400_000).toISOString()
    mockInbox([item({ id: 1, title: 'New today' }), item({ id: 2, title: 'From last week', created_at: lastWeek, unread: false })])
    renderBell()
    await userEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }))
    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('Today')).toBeInTheDocument()
    expect(within(panel).getByText('Earlier')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('tab', { name: /unread/i }))
    expect(within(panel).queryByText('From last week')).not.toBeInTheDocument()
    expect(within(panel).getByText('New today')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: /mark all read/i }))
    expect(api.post).toHaveBeenCalledWith('/notifications/read/', { all: true })
  })

  it('opening an item marks it read', async () => {
    mockInbox([item({ id: 5 })])
    renderBell()
    await userEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }))
    await userEvent.click(screen.getByRole('button', { name: /view booking/i }))
    expect(api.post).toHaveBeenCalledWith('/notifications/read/', { ids: [5] })
  })

  it('lets an admin approve a booking from the notification', async () => {
    mockInbox([item({ id: 3, kind: 'approval', title: 'New booking needs approval', priority: true, ref_id: 42 })])
    renderBell('admin')
    await userEvent.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }))
    expect(screen.getByText('Priority')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/reservations/42/', { status: 'APPROVED' }))
    expect(await screen.findByText('Booking approved')).toBeInTheDocument()
  })

  it('declining waits so it can be undone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      mockInbox([item({ id: 3, kind: 'approval', title: 'New booking needs approval', ref_id: 42 })])
      renderBell('admin')
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await user.click(await screen.findByRole('button', { name: /notifications, 1 unread/i }))
      await user.click(screen.getByRole('button', { name: 'Decline' }))
      await user.click(await screen.findByRole('button', { name: /undo/i }))
      await act(async () => { vi.advanceTimersByTime(7000) })
      expect(api.patch).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows a friendly empty state', async () => {
    mockInbox([])
    renderBell()
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
  })
})

function ToastButtons() {
  const toast = useToast()
  return (
    <>
      {[1, 2, 3, 4].map(i => <button key={i} onClick={() => toast.show({ title: `Toast ${i}` })}>Show {i}</button>)}
      <button onClick={() => toast.error('Could not save')}>Fail</button>
    </>
  )
}

describe('Toasts', () => {
  it('never shows more than three at once', async () => {
    render(<ToastProvider><ToastButtons /></ToastProvider>)
    for (const i of [1, 2, 3, 4]) await userEvent.click(screen.getByRole('button', { name: `Show ${i}` }))
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
    expect(screen.getByText('Toast 4')).toBeInTheDocument()
  })

  it('announces errors immediately', async () => {
    render(<ToastProvider><ToastButtons /></ToastProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
  })
})

describe('AnnouncementBar', () => {
  const announcement = {
    id: 4, message: '25% off all braiding until 31 Oct', tone: 'gold', link_label: 'Book now', link_url: '/beauty/services',
    dismissible: true, is_active: true, starts_at: null, ends_at: null, updated_at: '2026-10-15T05:00:00Z',
  }

  it('shows the live announcement and remembers when it is dismissed', async () => {
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: { announcement } })
    const { unmount } = render(<MemoryRouter><AnnouncementBar /></MemoryRouter>)
    expect(await screen.findByText('25% off all braiding until 31 Oct')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /book now/i })).toHaveAttribute('href', '/beauty/services')
    await userEvent.click(screen.getByRole('button', { name: /dismiss announcement/i }))
    expect(screen.queryByText('25% off all braiding until 31 Oct')).not.toBeInTheDocument()
    unmount()
    render(<MemoryRouter><AnnouncementBar /></MemoryRouter>)
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(screen.queryByText('25% off all braiding until 31 Oct')).not.toBeInTheDocument()
  })
})

describe('timeAgo', () => {
  it('reads naturally', () => {
    const base = new Date('2026-10-15T12:00:00')
    expect(timeAgo('2026-10-15T11:59:40', base)).toBe('Just now')
    expect(timeAgo('2026-10-15T11:48:00', base)).toBe('12 min ago')
    expect(timeAgo('2026-10-15T09:00:00', base)).toBe('3 h ago')
    expect(timeAgo('2026-10-14T09:00:00', base)).toBe('Yesterday')
  })
})
