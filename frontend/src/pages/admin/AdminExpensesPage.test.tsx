import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import type { Expense, ExpenseList, RecurringExpense } from '@/lib/types'
import AdminExpensesPage from './AdminExpensesPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const exp = (over: Partial<Expense>): Expense => ({
  id: 1, description: 'Jacket bale', amount: '45000.00', category: 'Fashion (Clothes)', shop: 'fashion',
  date_purchased: '2026-09-28', note: '', is_pending: false, recurring: null, created_at: '2026-09-29T08:00:00Z', ...over,
})
const rent: RecurringExpense = {
  id: 4, name: 'Monthly rent', category: 'Rent', shop: null, kind: 'fixed', amount: '30000.00', start_date: '2026-10-01', active: true,
}
const electricity: RecurringExpense = {
  id: 5, name: 'Electricity', category: 'Electricity', shop: null, kind: 'variable', amount: null, start_date: '2026-10-01', active: true,
}

let list: ExpenseList
let templates: RecurringExpense[]

function renderPage(shop?: 'beauty' | 'fashion') {
  return render(<ToastProvider><AdminExpensesPage shop={shop} /></ToastProvider>)
}

beforeEach(() => {
  list = { results: [exp({}), exp({ id: 2, description: 'Hangers', amount: '1500.00', category: 'Equipment', date_purchased: '2026-09-30' })], count: 2, total: '46500.00', pending_count: 0 }
  templates = []
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url === '/admin/expenses/') return { data: list }
    if (url === '/admin/recurring-expenses/') return { data: templates }
    return { data: [] }
  })
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} })
})

const expenseCalls = () => vi.mocked(api.get).mock.calls.filter(c => c[0] === '/admin/expenses/')

describe('AdminExpensesPage', () => {
  it('loads only this shop\'s expenses and shows the total', async () => {
    renderPage('fashion')
    expect(await screen.findAllByText('Jacket bale')).not.toHaveLength(0)
    expect(expenseCalls()[0][1]).toEqual({ params: { shop: 'fashion' } })
    expect(screen.getByText('KES 46,500.00')).toBeInTheDocument()
    expect(screen.getByText('2 expenses')).toBeInTheDocument()
  })

  it('on the all-shops page labels each cost with its shop, including Shared', async () => {
    list = { results: [exp({ id: 7, description: 'Shop rent', category: 'Rent', shop: null, amount: '30000.00' }), exp({})], count: 2, total: '75000.00', pending_count: 0 }
    renderPage()
    expect((await screen.findAllByText('Shared')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fashion').length).toBeGreaterThan(0)
    expect(expenseCalls()[0][1]).toEqual({ params: {} })
  })

  it('flags bills awaiting their amount and lets the admin enter it', async () => {
    list = { results: [exp({ id: 8, description: 'Electricity', amount: null, is_pending: true, category: 'Electricity', shop: null, recurring: 5 }), exp({})], count: 2, total: '45000.00', pending_count: 1 }
    renderPage()
    expect(await screen.findByText(/1 bill awaiting its amount/i)).toBeInTheDocument()
    expect(screen.getAllByText('Awaiting amount').length).toBeGreaterThan(0)

    await userEvent.click(screen.getAllByRole('button', { name: /enter amount for electricity/i })[0])
    await userEvent.type(await screen.findByLabelText(/bill amount/i), '4500')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/expenses/8/', { amount: '4500' }))
  })

  it('adds an expense through the form and refreshes the list', async () => {
    renderPage('beauty')
    await screen.findAllByText('Jacket bale')
    const before = expenseCalls().length
    await userEvent.click(screen.getByRole('button', { name: /add expense/i }))
    await userEvent.type(await screen.findByLabelText(/what was it for/i), 'Serum restock')
    await userEvent.type(screen.getByLabelText(/amount/i), '12000')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/expenses/', expect.objectContaining({ description: 'Serum restock', shop: 'beauty' })))
    await waitFor(() => expect(expenseCalls().length).toBeGreaterThan(before))
  })

  it('deletes only after confirmation', async () => {
    renderPage('fashion')
    await screen.findAllByText('Hangers')
    await userEvent.click(screen.getAllByRole('button', { name: /delete hangers/i })[0])
    expect(api.delete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/admin/expenses/2/'))
  })

  it('filters by category and date range', async () => {
    renderPage('fashion')
    await screen.findAllByText('Jacket bale')
    await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), 'Equipment')
    await waitFor(() => expect(expenseCalls().at(-1)![1]).toEqual({ params: { shop: 'fashion', category: 'Equipment' } }))
    await userEvent.type(screen.getByLabelText(/from date/i), '2026-09-01')
    await waitFor(() => expect(expenseCalls().at(-1)![1]).toEqual({ params: { shop: 'fashion', category: 'Equipment', date_from: '2026-09-01' } }))
  })

  it('lists recurring costs and can pause one', async () => {
    templates = [rent, electricity]
    renderPage()
    const section = await screen.findByRole('region', { name: /recurring expenses/i })
    expect(await within(section).findByText('Monthly rent')).toBeInTheDocument()
    expect(within(section).getByText('KES 30,000.00 / month')).toBeInTheDocument()
    expect(within(section).getByText('Amount varies')).toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: /pause monthly rent/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/recurring-expenses/4/', { active: false }))
  })

  it('on a shop page shows only that shop\'s recurring costs', async () => {
    templates = [{ ...rent, shop: 'fashion', name: 'Fashion lease' }, { ...rent, id: 9, shop: 'beauty', name: 'Beauty lease' }, rent]
    renderPage('fashion')
    const section = await screen.findByRole('region', { name: /recurring expenses/i })
    expect(await within(section).findByText('Fashion lease')).toBeInTheDocument()
    expect(within(section).queryByText('Beauty lease')).not.toBeInTheDocument()
    expect(within(section).queryByText('Monthly rent')).not.toBeInTheDocument()  // shared ones live on the all-shops page
  })

  it('opens the change history of an expense', async () => {
    renderPage('fashion')
    await screen.findAllByText('Jacket bale')
    await userEvent.click(screen.getAllByRole('button', { name: /history of jacket bale/i })[0])
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/audit/', { params: { kind: 'expense', ref: 1 } }))
    expect(await screen.findByText(/no changes recorded/i)).toBeInTheDocument()
  })
})
