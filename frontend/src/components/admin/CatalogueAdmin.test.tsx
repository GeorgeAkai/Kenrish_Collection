import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import CatalogueAdmin from './CatalogueAdmin'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const jacket = {
  id: 5, name: 'Mixed Bale Jacket', price: '800.00', max_price: '1500.00', cost_price: '300.00',
  description: 'd', stock_quantity: 4, reorder_level: 2, image: null, is_published: true,
}

function renderAdmin(itemType: 'product' | 'handbag' | 'clothes', items: unknown[] = []) {
  vi.mocked(api.get).mockResolvedValue({ data: items })
  return render(<ToastProvider><CatalogueAdmin title="Things" endpoint="/admin/things" itemType={itemType} /></ToastProvider>)
}

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} })
  vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
})

describe('CatalogueAdmin price range', () => {
  it('offers a maximum price for clothes and handbags but not for beauty products', async () => {
    const { unmount } = renderAdmin('clothes')
    await userEvent.click(await screen.findByRole('button', { name: /add new/i }))
    expect(screen.getByLabelText(/maximum price/i)).toBeInTheDocument()
    unmount()

    renderAdmin('product')
    await userEvent.click(await screen.findByRole('button', { name: /add new/i }))
    expect(screen.queryByLabelText(/maximum price/i)).not.toBeInTheDocument()
  })

  it('prefills the range when editing and sends a blank maximum when it is cleared', async () => {
    renderAdmin('clothes', [jacket])
    const edit = (await screen.findAllByRole('button', { name: /edit/i }))[0]
    await userEvent.click(edit)

    const max = screen.getByLabelText(/maximum price/i)
    expect(max).toHaveValue(1500)
    await userEvent.clear(max)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(api.patch).toHaveBeenCalled())
    const body = vi.mocked(api.patch).mock.calls[0][1] as FormData
    expect(body.get('max_price')).toBe('')   // explicit blank so the server clears the range
    expect(body.get('price')).toBe('800.00')
  })

  it('lists a ranged item with its range', async () => {
    renderAdmin('clothes', [jacket])
    const rows = await screen.findAllByText(/KES 800\.00 – 1,500\.00/)
    expect(rows.length).toBeGreaterThan(0)
    expect(within(rows[0].closest('tr') ?? document.body).getByText('Mixed Bale Jacket')).toBeInTheDocument()
  })
})
