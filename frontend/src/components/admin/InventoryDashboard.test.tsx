import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import type { InventorySummary } from '@/lib/types'
import InventoryDashboard from './InventoryDashboard'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn() } }))

const summary: InventorySummary = {
  item_count: 12, stock_value: '125000.00', low_stock_count: 3, out_of_stock_count: 1,
  today_sales_total: '4500.00', today_sales_count: 2, month_sales_count: 17,
}

beforeEach(() => {
  vi.mocked(api.get).mockReset().mockResolvedValue({ data: summary })
})

const renderDash = (shop?: 'beauty' | 'fashion') => render(
  <MemoryRouter><InventoryDashboard shop={shop} basePath={shop ? `/admin/${shop}/inventory` : '/admin/inventory'} /></MemoryRouter>,
)
const card = (name: RegExp) => screen.getByRole('link', { name })

describe('InventoryDashboard', () => {
  it('offers every inventory task as a clickable card that opens its own page', () => {
    renderDash('fashion')
    expect(card(/stock overview/i)).toHaveAttribute('href', '/admin/fashion/inventory/stock')
    expect(card(/add stock/i)).toHaveAttribute('href', '/admin/fashion/inventory/add-stock')
    expect(card(/record sale/i)).toHaveAttribute('href', '/admin/fashion/inventory/record-sale')
    expect(card(/sales history/i)).toHaveAttribute('href', '/admin/fashion/inventory/sales')
    expect(card(/scan receipt/i)).toHaveAttribute('href', '/admin/fashion/inventory/scan-receipt')
    expect(card(/low stock alerts/i)).toHaveAttribute('href', '/admin/fashion/inventory/low-stock')
  })

  it('asks for the numbers of the shop it is showing', async () => {
    renderDash('beauty')
    await screen.findByText('KES 125,000.00')
    expect(api.get).toHaveBeenCalledWith('/admin/inventory/summary/', { params: { shop: 'beauty' } })
  })

  it('shows one live number on each card', async () => {
    renderDash('beauty')
    expect(await within(card(/stock overview/i)).findByText('KES 125,000.00')).toBeInTheDocument()
    expect(card(/stock overview/i)).toHaveTextContent('12 items')
    expect(card(/add stock/i)).toHaveTextContent('1')
    expect(card(/add stock/i)).toHaveTextContent('out of stock')
    expect(card(/record sale/i)).toHaveTextContent('KES 4,500.00')
    expect(card(/record sale/i)).toHaveTextContent('2 sales today')
    expect(card(/sales history/i)).toHaveTextContent('17')
    expect(card(/sales history/i)).toHaveTextContent('sales this month')
    expect(card(/low stock alerts/i)).toHaveTextContent('3')
  })

  it('flags low stock in red only when something needs attention', async () => {
    const { unmount } = renderDash('beauty')
    await within(card(/low stock alerts/i)).findByText('3')
    expect(card(/low stock alerts/i)).toHaveAttribute('data-tone', 'alert')
    unmount()

    vi.mocked(api.get).mockResolvedValue({ data: { ...summary, low_stock_count: 0, out_of_stock_count: 0 } })
    renderDash('beauty')
    await within(card(/low stock alerts/i)).findByText(/all stocked up/i)
    expect(card(/low stock alerts/i)).toHaveAttribute('data-tone', 'calm')
    expect(card(/add stock/i)).toHaveTextContent('Everything is in stock')
  })

  it('uses the right grammar for a single sale', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...summary, today_sales_count: 1, month_sales_count: 1, item_count: 1 } })
    renderDash()
    await screen.findByText('1 sale today')
    expect(card(/sales history/i)).toHaveTextContent('1')
    expect(card(/stock overview/i)).toHaveTextContent('1 item')
    expect(api.get).toHaveBeenCalledWith('/admin/inventory/summary/', { params: {} })
  })

  it('stays usable when the numbers cannot be loaded', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline'))
    renderDash('beauty')
    expect(await screen.findByText(/could not load the latest numbers/i)).toBeInTheDocument()
    expect(card(/record sale/i)).toHaveAttribute('href', '/admin/beauty/inventory/record-sale')
  })

  it('scan receipt has no number, just what it does', () => {
    renderDash('beauty')
    expect(card(/scan receipt/i)).toHaveTextContent(/add stock from a supplier receipt/i)
  })
})
