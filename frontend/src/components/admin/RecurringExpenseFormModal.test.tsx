import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { nairobiDateKey } from '@/lib/utils'
import type { RecurringExpense } from '@/lib/types'
import RecurringExpenseFormModal from './RecurringExpenseFormModal'

vi.mock('@/lib/axios', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))

const rent: RecurringExpense = {
  id: 4, name: 'Monthly rent', category: 'Rent', shop: null, kind: 'fixed', amount: '30000.00',
  start_date: '2026-10-01', active: true,
}

beforeEach(() => {
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
})

describe('RecurringExpenseFormModal', () => {
  it('creates a fixed monthly cost, starting this month by default', async () => {
    const onSaved = vi.fn()
    render(<RecurringExpenseFormModal onClose={vi.fn()} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(/what repeats/i), 'Monthly rent')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Rent')
    await userEvent.type(screen.getByLabelText(/monthly amount/i), '30000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/admin/recurring-expenses/', {
      name: 'Monthly rent', category: 'Rent', shop: '', kind: 'fixed', amount: '30000',
      start_date: nairobiDateKey().slice(0, 8) + '01',
    })
  })

  it('a variable bill has no amount field and is entered each month when the bill arrives', async () => {
    render(<RecurringExpenseFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText(/how much/i), 'variable')
    expect(screen.queryByLabelText(/monthly amount/i)).not.toBeInTheDocument()
    expect(screen.getByText(/enter the amount each month/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/what repeats/i), 'Electricity')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Electricity')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const body = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>
    expect(body).toMatchObject({ name: 'Electricity', kind: 'variable' })
    expect(body).not.toHaveProperty('amount')
  })

  it('on a shop page the cost is filed under that shop and the shop picker is hidden', async () => {
    render(<RecurringExpenseFormModal shop="fashion" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText(/^shop/i)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/what repeats/i), 'Mannequin lease')
    await userEvent.type(screen.getByLabelText(/monthly amount/i), '2000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ shop: 'fashion' })
  })

  it('editing sends only what changed', async () => {
    render(<RecurringExpenseFormModal template={rent} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
    await userEvent.clear(screen.getByLabelText(/monthly amount/i))
    await userEvent.type(screen.getByLabelText(/monthly amount/i), '32000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/recurring-expenses/4/', { amount: '32000' }))
  })

  it('shows the server message when saving fails', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { data: { amount: ['A fixed expense needs an amount greater than zero.'] } } })
    render(<RecurringExpenseFormModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/what repeats/i), 'Rent')
    await userEvent.type(screen.getByLabelText(/monthly amount/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A fixed expense needs an amount')
  })
})
