import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import type { CustomerProfile } from '@/lib/types'
import AdminCustomerProfilePage from './AdminCustomerProfilePage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

const months = Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(11 + i > 12 ? 11 + i - 12 : 11 + i).padStart(2, '0')}`, spend: '0.00' }))
months[11] = { month: '2026-10', spend: '1500.00' }
months[10] = { month: '2026-09', spend: '1000.00' }

const walkin: CustomerProfile = {
  ref: 'customer:1', kind: 'walkin', name: 'Mary', username: null, email: '', joined: null, phone: '+254712111111',
  user_id: null, customer_id: 1, possible_user: null,
  metrics: { total_spend: '2500.00', purchases: 2, average_purchase: '1250.00', last_purchase: '2026-10-01', logins: null, last_seen: null },
  login_stats: null,
  spend_by_month: months,
  timeline: [
    { type: 'service', date: '2026-10-01T09:00:00+03:00', title: 'Braids', detail: 'Cash', amount: '1500.00' },
    { type: 'sale', date: '2026-09-10T12:00:00+03:00', title: 'Serum × 2', detail: '', amount: '1000.00' },
  ],
  wishlist: null,
}
const registered: CustomerProfile = {
  ...walkin, ref: 'customer:2', kind: 'registered', name: 'Jane Wairimu', username: 'jane', email: 'jane@example.com',
  joined: '2026-02-03', user_id: 5, customer_id: 2,
  metrics: { ...walkin.metrics, logins: 7, last_seen: '2026-09-30T10:00:00+03:00' },
  login_stats: { last_30_days: 3, web: 4, app: 2, tracked_since: '2026-10-01' },
  timeline: [
    { type: 'order', date: '2026-10-02T08:00:00+03:00', title: 'Online order #4', detail: 'Pending', amount: '800.00' },
    { type: 'reservation', date: '2026-10-01T10:00:00+03:00', title: 'Appointment: Braids', detail: 'Approved', amount: null },
  ],
  wishlist: [{ type: 'clothes', id: 3, name: 'Denim Jacket', price: '1200.00' }, { type: 'product', id: 1, name: 'Serum', price: '500.00' }],
}

let profile: CustomerProfile

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/customers" element={<p>Customers list</p>} />
          <Route path="/admin/customers/:kind/:id" element={<AdminCustomerProfilePage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  profile = walkin
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url.startsWith('/admin/customers/')) return { data: profile }
    return { data: [] }
  })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
})

describe('AdminCustomerProfilePage', () => {
  it('opens the profile named in the address and shows who they are', async () => {
    renderAt('/admin/customers/customer/1')
    expect(await screen.findByRole('heading', { name: 'Mary' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/admin/customers/customer/1/')
    expect(screen.getByText('Customer not in App')).toBeInTheDocument()
    expect(screen.getByText('+254712111111')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all customers/i })).toHaveAttribute('href', '/admin/customers')
  })

  it('shows the metric tiles', async () => {
    renderAt('/admin/customers/customer/1')
    const tiles = await screen.findByRole('region', { name: /customer metrics/i })
    expect(within(tiles).getByLabelText('Total spend')).toHaveTextContent('KES 2,500.00')
    expect(within(tiles).getByLabelText('Purchases')).toHaveTextContent('2')
    expect(within(tiles).getByLabelText('Average purchase')).toHaveTextContent('KES 1,250.00')
    expect(within(tiles).getByLabelText('Last purchase')).toHaveTextContent('01/10/2026')
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('Not an app user')
  })

  it('shows logins and last seen for a registered customer', async () => {
    profile = registered
    renderAt('/admin/customers/customer/2')
    const tiles = await screen.findByRole('region', { name: /customer metrics/i })
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('7')
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('3 in the last 30 days')
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('4 website · 2 app')
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('Detailed history since 01/10/2026')
    expect(within(tiles).getByLabelText('Last seen')).not.toHaveTextContent('Never')
    expect(screen.getByText('@jane')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('says detailed login history has not started when no login has been recorded yet', async () => {
    profile = { ...registered, login_stats: { last_30_days: 0, web: 0, app: 0, tracked_since: null } }
    renderAt('/admin/customers/customer/2')
    const tiles = await screen.findByRole('region', { name: /customer metrics/i })
    expect(within(tiles).getByLabelText('Logins')).toHaveTextContent('Detailed history starts with the next login')
  })

  it('draws spend for each of the last twelve months', async () => {
    renderAt('/admin/customers/customer/1')
    const chart = await screen.findByRole('img', { name: /spend over the last 12 months/i })
    expect(within(chart).getAllByRole('listitem')).toHaveLength(12)
    expect(within(chart).getByText('Oct 2026')).toBeInTheDocument()
    expect(chart).toHaveTextContent('KES 1,500')
  })

  it('lists activity newest first with amounts', async () => {
    renderAt('/admin/customers/customer/1')
    const list = await screen.findByRole('list', { name: /activity/i })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Braids')
    expect(items[0]).toHaveTextContent('KES 1,500.00')
    expect(items[1]).toHaveTextContent('Serum × 2')
  })

  it('shows orders and appointments in a registered customers activity', async () => {
    profile = registered
    renderAt('/admin/customers/customer/2')
    const list = await screen.findByRole('list', { name: /activity/i })
    expect(within(list).getByText('Online order #4')).toBeInTheDocument()
    expect(within(list).getByText('Appointment: Braids')).toBeInTheDocument()
    expect(within(list).getByText('Approved')).toBeInTheDocument()
  })

  it('says so when there is no activity yet', async () => {
    profile = { ...walkin, timeline: [] }
    renderAt('/admin/customers/customer/1')
    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument()
  })

  it('shows the wishlist for registered customers and explains its absence for walk-ins', async () => {
    profile = registered
    const { unmount } = renderAt('/admin/customers/customer/2')
    await userEvent.click(await screen.findByRole('tab', { name: /wishlist/i }))
    const list = screen.getByRole('list', { name: /wishlist/i })
    expect(within(list).getByText('Denim Jacket')).toBeInTheDocument()
    expect(within(list).getByText('KES 1,200.00')).toBeInTheDocument()
    unmount()

    profile = walkin
    renderAt('/admin/customers/customer/1')
    await userEvent.click(await screen.findByRole('tab', { name: /wishlist/i }))
    expect(screen.getByText(/no account, so no wishlist/i)).toBeInTheDocument()
  })

  it('lets the admin correct the name and phone, then refreshes', async () => {
    renderAt('/admin/customers/customer/1')
    await userEvent.click(await screen.findByRole('button', { name: /edit contact/i }))
    const name = await screen.findByLabelText(/^name/i)
    expect(name).toHaveValue('Mary')
    await userEvent.clear(name)
    await userEvent.type(name, 'Mary Wanjiku')
    await userEvent.click(screen.getByRole('button', { name: /save contact/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/customers/customer/1/', { name: 'Mary Wanjiku' }))
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(c => c[0] === '/admin/customers/customer/1/').length).toBeGreaterThan(1))
  })

  it('shows the server message when a correction is refused', async () => {
    vi.mocked(api.patch).mockRejectedValue({ response: { data: { phone: ['A customer with this number already exists.'] } } })
    renderAt('/admin/customers/customer/1')
    await userEvent.click(await screen.findByRole('button', { name: /edit contact/i }))
    const phone = await screen.findByLabelText(/phone/i)
    await userEvent.clear(phone)
    await userEvent.type(phone, '0722333444')
    await userEvent.click(screen.getByRole('button', { name: /save contact/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })

  it('does not offer to edit someone who has never bought (no record to edit)', async () => {
    profile = { ...registered, ref: 'user:5', customer_id: null, timeline: [] }
    renderAt('/admin/customers/user/5')
    await screen.findByRole('heading', { name: 'Jane Wairimu' })
    expect(screen.queryByRole('button', { name: /edit contact/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change history/i })).not.toBeInTheDocument()
  })

  it('opens the change history of the customer record', async () => {
    renderAt('/admin/customers/customer/1')
    await userEvent.click(await screen.findByRole('button', { name: /change history/i }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/audit/', { params: { kind: 'customer', ref: 1 } }))
  })

  it('confirms a suggested link between a walk-in and a registered user', async () => {
    profile = { ...walkin, possible_user: { id: 9, username: 'peterk' } }
    renderAt('/admin/customers/customer/1')
    expect(await screen.findByText(/possible match: @peterk/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /link to @peterk/i }))
    await userEvent.click(screen.getByRole('button', { name: /^link$/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/customers/1/link/', { user_id: 9 }))
  })

  it('says so when the customer does not exist', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } })
    renderAt('/admin/customers/customer/99')
    expect(await screen.findByText(/customer not found/i)).toBeInTheDocument()
  })
})
