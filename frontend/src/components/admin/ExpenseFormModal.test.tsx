import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { nairobiDateKey } from '@/lib/utils'
import type { Expense } from '@/lib/types'
import ExpenseFormModal from './ExpenseFormModal'

vi.mock('@/lib/axios', () => ({ default: { post: vi.fn(), patch: vi.fn(), get: vi.fn() } }))

const bale: Expense = {
  id: 9, description: 'Jacket bale', amount: '45000.00', category: 'Fashion (Clothes)', shop: 'fashion',
  date_purchased: '2026-09-28', note: '50 pcs', is_pending: false, recurring: null, created_at: '2026-09-29T08:00:00Z',
}
const awaiting: Expense = {
  ...bale, id: 10, description: 'Electricity', amount: null, category: 'Electricity', shop: null,
  date_purchased: '2026-10-01', note: '', is_pending: true, recurring: 3,
}

const options = () => within(screen.getByLabelText(/category/i)).getAllByRole('option').map(o => o.textContent)

beforeEach(() => {
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.get).mockReset().mockResolvedValue({ data: [] })
})

describe('ExpenseFormModal', () => {
  it('on the Beauty page offers beauty and shared categories and files the expense under Beauty', async () => {
    const onSaved = vi.fn()
    render(<ExpenseFormModal shop="beauty" onClose={vi.fn()} onSaved={onSaved} />)

    expect(options()).toContain('Beauty Products')
    expect(options()).not.toContain('Fashion (Clothes)')
    expect(screen.queryByLabelText(/^shop/i)).not.toBeInTheDocument()  // the page already decides the shop

    await userEvent.type(screen.getByLabelText(/what was it for/i), 'Dr Rashel restock')
    await userEvent.type(screen.getByLabelText(/amount/i), '12000')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Beauty Products')
    await userEvent.type(screen.getByLabelText(/note/i), 'invoice 118')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/admin/expenses/', {
      description: 'Dr Rashel restock', amount: '12000', category: 'Beauty Products', shop: 'beauty',
      date_purchased: nairobiDateKey(), note: 'invoice 118',
    })
  })

  it('asks for the total price when a bale is bought, and defaults the date to today without allowing the future', () => {
    render(<ExpenseFormModal shop="fashion" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/amount \(total price if a bale\)/i)).toBeInTheDocument()
    const date = screen.getByLabelText(/date purchased/i)
    expect(date).toHaveValue(nairobiDateKey())
    expect(date).toHaveAttribute('max', nairobiDateKey())
  })

  it('in the all-shops view lets the admin choose Beauty, Fashion or Shared', async () => {
    render(<ExpenseFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    const shop = screen.getByLabelText(/^shop/i)
    expect(within(shop).getAllByRole('option').map(o => o.textContent)).toEqual(['Shared (both shops)', 'Beauty', 'Fashion'])
    expect(options()).toHaveLength(9)

    await userEvent.type(screen.getByLabelText(/what was it for/i), 'Shop rent')
    await userEvent.type(screen.getByLabelText(/amount/i), '30000')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Rent')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ shop: '', category: 'Rent' })
  })

  it('editing prefills the form and sends only what changed', async () => {
    const onSaved = vi.fn()
    render(<ExpenseFormModal shop="fashion" expense={bale} onClose={vi.fn()} onSaved={onSaved} />)
    expect(screen.getByLabelText(/what was it for/i)).toHaveValue('Jacket bale')
    expect(screen.getByRole('button', { name: /save expense/i })).toBeDisabled()  // nothing changed yet

    await userEvent.clear(screen.getByLabelText(/amount/i))
    await userEvent.type(screen.getByLabelText(/amount/i), '42000')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(api.patch).toHaveBeenCalledWith('/admin/expenses/9/', { amount: '42000' })
  })

  it('a bill awaiting its amount asks for the bill amount and saves just that', async () => {
    render(<ExpenseFormModal expense={awaiting} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText(/awaiting its bill/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/amount/i), '4500')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/expenses/10/', { amount: '4500' }))
  })

  it('shows the server message and stays open when saving fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { date_purchased: ['The purchase date cannot be in the future.'] } } })
    const onSaved = vi.fn()
    render(<ExpenseFormModal shop="beauty" onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(/what was it for/i), 'x')
    await userEvent.type(screen.getByLabelText(/amount/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /save expense/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The purchase date cannot be in the future.')
    expect(onSaved).not.toHaveBeenCalled()
  })
})
