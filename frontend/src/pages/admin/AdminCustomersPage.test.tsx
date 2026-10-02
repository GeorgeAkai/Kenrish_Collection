import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import type { CustomerRow } from '@/lib/types'
import AdminCustomersPage from './AdminCustomersPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const row = (over: Partial<CustomerRow>): CustomerRow => ({
  ref: 'customer:1', kind: 'walkin', name: 'Mary', username: null, phone: '+254712111111', user_id: null,
  spend: '2500.00', purchases: 2, last_purchase: '2026-10-01', possible_user: null, ...over,
})

let rows: CustomerRow[]

beforeEach(() => {
  rows = [
    row({ ref: 'customer:2', kind: 'registered', name: 'Jane Wairimu', username: 'jane', phone: '+254733222222', user_id: 5, spend: '3000.00', purchases: 1 }),
    row({}),
    row({ ref: 'customer:3', name: 'Peter', phone: '+254744333333', spend: '1600.00', purchases: 2, possible_user: { id: 9, username: 'peterk' } }),
    row({ ref: 'user:7', kind: 'registered', name: 'bob', username: 'bob', phone: '', user_id: 7, spend: '0.00', purchases: 0, last_purchase: null }),
  ]
  vi.mocked(api.get).mockReset().mockImplementation(async () => ({ data: rows }))
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
})

const renderPage = () => render(<MemoryRouter><ToastProvider><AdminCustomersPage /></ToastProvider></MemoryRouter>)
// The page's frame is there at once; the people arrive a moment later.
const loaded = () => screen.findAllByText('Mary')
const listRows = () => within(screen.getByRole('list', { name: /customers/i })).getAllByRole('listitem')

describe('AdminCustomersPage', () => {
  it('ranks the top customers by total spend, leaving out people who have not bought anything', async () => {
    renderPage()
    await loaded()
    const top = screen.getByRole('region', { name: /top customers/i })
    const items = within(top).getAllByRole('listitem')
    expect(items.map(i => i.textContent)).toEqual([
      expect.stringContaining('Jane Wairimu'), expect.stringContaining('Mary'), expect.stringContaining('Peter'),
    ])
    expect(items[0]).toHaveTextContent('KES 3,000.00')
    expect(items[0]).toHaveTextContent('#1')
    expect(within(top).queryByText('bob')).not.toBeInTheDocument()
  })

  it('asks for all shops and all time by default and refetches when the filters change', async () => {
    renderPage()
    await loaded()
    expect(vi.mocked(api.get).mock.calls[0]).toEqual(['/admin/customers/', { params: { period: 'all' } }])

    await userEvent.selectOptions(screen.getByLabelText(/^shop/i), 'fashion')
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.at(-1)).toEqual(['/admin/customers/', { params: { period: 'all', shop: 'fashion' } }]))
    await userEvent.selectOptions(screen.getByLabelText(/period/i), '90d')
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.at(-1)).toEqual(['/admin/customers/', { params: { period: '90d', shop: 'fashion' } }]))
  })

  it('splits registered customers from walk-ins who are not in the app', async () => {
    renderPage()
    await loaded()
    expect(listRows()).toHaveLength(4)

    await userEvent.click(screen.getByRole('tab', { name: /registered/i }))
    expect(listRows().map(r => r.textContent)).toEqual([expect.stringContaining('Jane Wairimu'), expect.stringContaining('bob')])

    await userEvent.click(screen.getByRole('tab', { name: /not in app/i }))
    const walkins = listRows()
    expect(walkins).toHaveLength(2)
    expect(within(walkins[0]).getByText('Customer not in App')).toBeInTheDocument()
  })

  it('searches names and phone numbers without caring about case or spacing', async () => {
    renderPage()
    await loaded()
    await userEvent.type(screen.getByRole('searchbox', { name: /search customers/i }), 'jANe')
    expect(listRows()).toHaveLength(1)
    await userEvent.clear(screen.getByRole('searchbox', { name: /search customers/i }))
    await userEvent.type(screen.getByRole('searchbox', { name: /search customers/i }), '0744 333')
    expect(listRows()).toHaveLength(1)
    expect(listRows()[0]).toHaveTextContent('Peter')
  })

  it('shows spend, purchases, phone and last purchase, and links each customer to their profile', async () => {
    renderPage()
    await loaded()
    const list = screen.getByRole('list', { name: /customers/i })
    const mary = within(list).getByText('Mary').closest('li')!
    expect(mary).toHaveTextContent('KES 2,500.00')
    expect(mary).toHaveTextContent('2 purchases')
    expect(mary).toHaveTextContent('+254712111111')
    expect(within(mary).getByRole('link', { name: /mary/i })).toHaveAttribute('href', '/admin/customers/customer/1')
    const bob = within(list).getByText('bob').closest('li')!
    expect(bob).toHaveTextContent('No purchases yet')
    expect(within(bob).getByRole('link', { name: /bob/i })).toHaveAttribute('href', '/admin/customers/user/7')
  })

  it('offers to link a walk-in to the registered user their phone suggests, after confirmation', async () => {
    renderPage()
    await loaded()
    const list = screen.getByRole('list', { name: /customers/i })
    const peter = within(list).getByText('Peter').closest('li')!
    expect(peter).toHaveTextContent(/possible match: @peterk/i)

    await userEvent.click(within(peter).getByRole('button', { name: /link peter to @peterk/i }))
    expect(api.post).not.toHaveBeenCalled()
    await userEvent.click(within(peter).getByRole('button', { name: /^link$/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/customers/3/link/', { user_id: 9 }))
  })

  it('invites the admin to record a sale when there are no customers yet', async () => {
    rows = []
    renderPage()
    expect(await screen.findByText(/no customers yet/i)).toBeInTheDocument()
  })
})
