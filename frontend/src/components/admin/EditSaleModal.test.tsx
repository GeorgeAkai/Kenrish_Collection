import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import type { Sale } from '@/lib/types'
import EditSaleModal from './EditSaleModal'

vi.mock('@/lib/axios', () => ({ default: { patch: vi.fn(), get: vi.fn() } }))

const sale: Sale = {
  id: 7, item_name: 'Vitamin C Serum', item_type: 'product', quantity: 3, unit_price: '500.00',
  total_amount: '1500.00', customer_name: 'Mary', customer_phone: '0712345678',
  created_at: '2026-10-01T09:00:00Z', created_by_username: 'admin', edited: false, edit_count: 0,
}

beforeEach(() => {
  vi.mocked(api.patch).mockReset()
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get).mockResolvedValue({ data: [] })
})

describe('EditSaleModal', () => {
  it('shows current values with the item read-only, and PATCHes only what changed', async () => {
    const updated = { ...sale, quantity: 4, total_amount: '2000.00', edited: true, edit_count: 1 }
    vi.mocked(api.patch).mockResolvedValue({ data: updated })
    const onSaved = vi.fn()
    render(<EditSaleModal sale={sale} onClose={vi.fn()} onSaved={onSaved} />)

    expect(screen.getByText('Vitamin C Serum')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /item/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/quantity/i)).toHaveValue(3)

    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '4')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated))
    expect(api.patch).toHaveBeenCalledWith('/admin/inventory/sales/7/', { quantity: 4 })
  })

  it('can correct price and customer details, and cannot save when nothing changed', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: sale })
    render(<EditSaleModal sale={sale} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await userEvent.clear(screen.getByLabelText(/unit price/i))
    await userEvent.type(screen.getByLabelText(/unit price/i), '450')
    await userEvent.clear(screen.getByLabelText(/customer name/i))
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Mary W')
    await userEvent.clear(screen.getByLabelText(/customer phone/i))
    await userEvent.type(screen.getByLabelText(/customer phone/i), '0799000111')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/inventory/sales/7/', {
      unit_price: '450', customer_name: 'Mary W', customer_phone: '0799000111',
    }))
  })

  it('shows the server error and stays open when the edit is rejected', async () => {
    vi.mocked(api.patch).mockRejectedValue({ response: { data: { detail: 'Insufficient stock for Serum. Available: 7, additional needed: 17' } } })
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(<EditSaleModal sale={sale} onClose={onClose} onSaved={onSaved} />)
    await userEvent.clear(screen.getByLabelText(/quantity/i))
    await userEvent.type(screen.getByLabelText(/quantity/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the edit history of an already-edited sale', async () => {
    const edited = { ...sale, edited: true, edit_count: 1 }
    vi.mocked(api.get).mockResolvedValue({ data: [{
      id: 1, editor_username: 'akai', created_at: '2026-10-02T08:30:00Z',
      before: { quantity: 3, unit_price: '500.00', customer_name: 'Mary', customer_phone: '0712345678' },
      after: { quantity: 4, unit_price: '450.00', customer_name: 'Mary', customer_phone: '0712345678' },
    }] })
    render(<EditSaleModal sale={edited} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(await screen.findByText(/akai/)).toBeInTheDocument()
    expect(screen.getByText(/Quantity: 3 → 4/)).toBeInTheDocument()
    expect(screen.getByText(/Unit price: 500\.00 → 450\.00/)).toBeInTheDocument()
    expect(screen.queryByText(/Customer name:/)).not.toBeInTheDocument() // unchanged fields are omitted
    expect(api.get).toHaveBeenCalledWith('/admin/inventory/sales/7/edits/')
  })

  it('does not request history for a sale that was never edited', () => {
    render(<EditSaleModal sale={sale} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(api.get).not.toHaveBeenCalled()
  })
})
