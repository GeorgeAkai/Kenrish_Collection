import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import type { InventoryItem, InventorySummary, Sale } from '@/lib/types'
import AdminInventoryPage from './AdminInventoryPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const item = (over: Partial<InventoryItem>): InventoryItem => ({
  id: 1, name: 'Item', item_type: 'product', stock_quantity: 5, reorder_level: 2, cost_price: '100.00', price: '200.00',
  max_price: null, is_low_stock: false, inventory_value: '500.00', ...over,
})
const items: InventoryItem[] = [
  item({ id: 1, name: 'Serum', stock_quantity: 10, inventory_value: '2000.00' }),
  item({ id: 2, name: 'Lotion', stock_quantity: 0, is_low_stock: true, inventory_value: '0.00' }),
  item({ id: 3, name: 'Soap', stock_quantity: 3, reorder_level: 5, is_low_stock: true, inventory_value: '150.00' }),
  item({ id: 4, name: 'Denim Jacket', item_type: 'clothes', stock_quantity: 4, reorder_level: 1, inventory_value: '1200.00' }),
  item({ id: 5, name: 'Leather Tote', item_type: 'handbag', stock_quantity: 2, reorder_level: 2, is_low_stock: true, inventory_value: '2000.00' }),
]
const sale: Sale = {
  id: 9, item_name: 'Serum', item_type: 'product', quantity: 2, unit_price: '500.00', total_amount: '1000.00',
  customer_name: 'Mary', customer_phone: '0712111111', created_at: '2026-10-01T09:00:00Z', created_by_username: 'admin',
  edited: false, edit_count: 0,
}
const summary: InventorySummary = {
  item_count: 3, stock_value: '2150.00', low_stock_count: 2, out_of_stock_count: 1,
  today_sales_total: '1000.00', today_sales_count: 1, month_sales_count: 4,
}

beforeEach(() => {
  vi.mocked(api.get).mockReset().mockImplementation(async (url: string) => {
    if (url === '/admin/inventory/summary/') return { data: summary }
    if (url === '/admin/inventory/') return { data: items }
    if (url === '/admin/inventory/sales/') return { data: { results: [sale] } }
    return { data: [] }
  })
})

function renderAt(path: string, shop?: 'beauty' | 'fashion') {
  const base = shop ? `/admin/${shop}/inventory` : '/admin/inventory'
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={base} element={<AdminInventoryPage shop={shop} />} />
        <Route path={`${base}/:section`} element={<AdminInventoryPage shop={shop} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminInventoryPage as a dashboard', () => {
  it('opens on a dashboard of cards instead of a strip of tabs', async () => {
    renderAt('/admin/beauty/inventory', 'beauty')
    expect(await screen.findByRole('link', { name: /record sale/i })).toHaveAttribute('href', '/admin/beauty/inventory/record-sale')
    expect(screen.queryByRole('button', { name: /^add stock$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('opens a card on its own page with a way back to the dashboard', async () => {
    renderAt('/admin/beauty/inventory', 'beauty')
    await userEvent.click(await screen.findByRole('link', { name: /record sale/i }))
    expect(await screen.findByRole('heading', { name: /record sale/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()      // the item picker
    await userEvent.click(screen.getByRole('link', { name: /inventory/i }))
    expect(await screen.findByRole('link', { name: /sales history/i })).toBeInTheDocument()
  })

  it('can be opened straight at any section, so every page can be bookmarked', async () => {
    renderAt('/admin/beauty/inventory/sales', 'beauty')
    expect(await screen.findByRole('heading', { name: /sales history/i })).toBeInTheDocument()
    expect((await screen.findAllByText('Mary')).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /inventory/i })).toHaveAttribute('href', '/admin/beauty/inventory')
  })

  it('stock overview lists only this shop\'s items', async () => {
    renderAt('/admin/beauty/inventory/stock', 'beauty')
    expect((await screen.findAllByText('Serum')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Denim Jacket')).not.toBeInTheDocument()
    expect(screen.queryByText('Leather Tote')).not.toBeInTheDocument()
  })

  it('the fashion shop sees its clothes and handbags', async () => {
    renderAt('/admin/fashion/inventory/stock', 'fashion')
    expect((await screen.findAllByText('Denim Jacket')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Leather Tote').length).toBeGreaterThan(0)
    expect(screen.queryByText('Serum')).not.toBeInTheDocument()
  })

  it('low stock alerts list the items to reorder, emptiest first', async () => {
    renderAt('/admin/beauty/inventory/low-stock', 'beauty')
    const list = await screen.findByRole('list', { name: /low stock/i })
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map(r => r.textContent)).toEqual([expect.stringContaining('Lotion'), expect.stringContaining('Soap')])
    expect(rows[0]).toHaveTextContent('Out of stock')
    expect(rows[1]).toHaveTextContent('3 left')
    expect(rows[1]).toHaveTextContent('reorder at 5')
    expect(within(rows[0]).getByRole('link', { name: /add stock/i })).toHaveAttribute('href', '/admin/beauty/inventory/add-stock')
  })

  it('says so when nothing needs reordering', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => ({ data: url === '/admin/inventory/' ? [items[0]] : summary }))
    renderAt('/admin/beauty/inventory/low-stock', 'beauty')
    expect(await screen.findByText(/nothing needs reordering/i)).toBeInTheDocument()
  })

  it('an unknown section falls back to the dashboard', async () => {
    renderAt('/admin/beauty/inventory/nonsense', 'beauty')
    expect(await screen.findByRole('link', { name: /stock overview/i })).toBeInTheDocument()
  })

  it('the old shop-less address still works', async () => {
    renderAt('/admin/inventory')
    expect(await screen.findByRole('link', { name: /stock overview/i })).toHaveAttribute('href', '/admin/inventory/stock')
  })

  it('sales can still be corrected from the sales history page', async () => {
    renderAt('/admin/beauty/inventory/sales', 'beauty')
    await userEvent.click((await screen.findAllByRole('button', { name: /edit sale of serum/i }))[0])
    expect(await screen.findByRole('dialog', { name: /edit sale/i })).toBeInTheDocument()
  })
})
