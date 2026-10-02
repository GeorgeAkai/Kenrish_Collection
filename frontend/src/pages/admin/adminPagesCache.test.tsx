import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { ToastProvider } from '@/contexts/ToastContext'
import CatalogueAdmin from '@/components/admin/CatalogueAdmin'
import AnalyticsView from '@/components/admin/AnalyticsView'
import AdminActivityLogsPage from './AdminActivityLogsPage'
import AdminClothesCategoriesPage from './AdminClothesCategoriesPage'
import AdminSlotConfigPage from './AdminSlotConfigPage'
import AdminGalleryPage from './AdminGalleryPage'
import AdminInvoicesPage from './AdminInvoicesPage'
import AdminOffersPage from './AdminOffersPage'
import AdminOrdersPage from './AdminOrdersPage'
import AdminReservationsPage from './AdminReservationsPage'
import AdminReviewsPage from './AdminReviewsPage'
import AdminServiceSalesPage from './AdminServiceSalesPage'
import AdminServicesPage from './AdminServicesPage'
import AdminStagingPage from './AdminStagingPage'
import AdminUsersPage from './AdminUsersPage'

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const when = '2026-10-01T09:00:00Z'

interface Case {
  name: string
  page: () => ReactElement
  /** what each endpoint the page reads returns */
  data: Record<string, unknown>
  /** text that only appears once that data has arrived */
  sees: string | RegExp
  /** live data (always re-read behind the old copy on return) rather than data kept while fresh */
  alwaysRefreshes?: boolean
}

const cases: Case[] = [
  {
    name: 'Offers', page: () => <AdminOffersPage />, sees: 'Eid Special',
    data: { '/admin/offers/': [{ id: 1, name: 'Eid Special', description: 'd', offer_price: '999.00', image: null, created_at: when }] },
  },
  {
    name: 'Services', page: () => <AdminServicesPage />, sees: 'Knotless Braids',
    data: { '/admin/services/': [{ id: 1, name: 'Knotless Braids', short_description: 's', full_description: 'f', price: null, price_from: '2000', price_to: '3500', image: null }] },
  },
  {
    name: 'Gallery', page: () => <AdminGalleryPage shop="beauty" />, sees: 'Bridal nails',
    data: { '/admin/gallery/': [{ id: 1, service: 'nails', file: '/media/x.jpg', description: 'Bridal nails', uploaded_at: when, like_count: 2, user_has_liked: false, is_video: false }] },
  },
  {
    name: 'Clothes categories', page: () => <AdminClothesCategoriesPage />, sees: 'Menswear',
    data: { '/admin/clothes-categories/': [{ id: 1, name: 'Menswear', slug: 'menswear', item_count: 3 }] },
  },
  {
    name: 'Customer reviews', page: () => <AdminReviewsPage />, sees: 'Aisha Njeri',
    data: { '/admin/reviews/': [{ id: 1, customer_name: 'Aisha Njeri', customer_label: '', text: 'Lovely', rating: 5, shop: '', is_published: true, created_at: when }] },
  },
  {
    name: 'Users', page: () => <AdminUsersPage />, sees: 'janewairimu',
    data: { '/admin/users/': [{ id: 2, username: 'janewairimu', email: 'j@example.com', is_staff: false, date_joined: when, last_login: null, login_count: 3, added_by: null, has_wishlist: false }] },
  },
  {
    name: 'Customer orders', page: () => <AdminOrdersPage />, sees: /shopper42/,
    data: { '/admin/orders/': { results: [{ id: 7, customer_username: 'shopper42', status: 'PENDING', status_display: 'Pending', total_amount: '1600.00', notes: '', admin_notes: '', created_at: when, items: [] }], pending_count: 1 } },
  },
  {
    name: 'Reservations', page: () => <AdminReservationsPage />, sees: 'amina_k',
    data: {
      '/admin/reservations/': { results: [{ id: 3, service: 1, service_name: 'Braids', reservation_date: '2026-10-05', reservation_time: '10:00:00', notes: '', status: 'PENDING', status_display: 'Pending', admin_notes: '', customer_username: 'amina_k', created_at: when }], pending_count: 1 },
      '/admin/services/': [], '/admin/users/': [],
    },
  },
  {
    name: 'Service sales', page: () => <AdminServiceSalesPage />, sees: 'Mercy Atieno',
    data: {
      '/admin/service-sales/': { results: [{ id: 1, service: null, service_name: 'Braids', amount: '1500.00', payment_method: 'cash', customer_name: 'Mercy Atieno', customer_phone: '', notes: '', served_at: when, created_at: when, created_by_username: 'admin' }], count: 1, total_amount: '1500.00' },
      '/services/': [],
    },
  },
  {
    name: 'Invoices', page: () => <AdminInvoicesPage />, sees: 'KRC-20261001-0001',
    data: { '/admin/invoices/': [{ id: 1, invoice_number: 'KRC-20261001-0001', customer_name: 'Kamau', customer_phone: '0712', created_at: when, grand_total: '5000.00', created_by_username: 'admin' }] },
  },
  {
    name: 'Products', page: () => <CatalogueAdmin title="Products" endpoint="/admin/products" itemType="product" />, sees: 'Vitamin C Serum',
    data: { '/admin/products/': [{ id: 1, name: 'Vitamin C Serum', description: 'd', price: '1500.00', cost_price: '800.00', stock_quantity: 5, reorder_level: 2, image: null, is_published: true }] },
  },
  {
    name: 'Slot configuration', page: () => <AdminSlotConfigPage />, sees: 'Hot Oil Treatment',
    data: { '/admin/slot-configs/': { configs: [{ id: 1, service: 1, service_name: 'Hot Oil Treatment', worker_count: 2, slot_duration_minutes: 30, start_time: '08:00:00', end_time: '20:00:00', active_days: [0, 1, 2], is_active: true, updated_at: when }], unconfigured_services: [] } },
  },
  {
    name: 'Activity logs', page: () => <AdminActivityLogsPage />, sees: '/clearance-sale', alwaysRefreshes: true,
    data: {
      '/admin/activity/stats/': {
        totals: { events: 10, page_views: 8, product_views: 2, unique_visitors: 4, signed_in_users: 1, logins: 1, failed_logins: 0, actions: 1 },
        daily: [], top_pages: [{ path: '/clearance-sale', views: 4 }], top_products: [], top_searches: [], top_users: [], recent_failed_logins: [],
      },
    },
  },
  {
    name: 'Analytics (a shop)', page: () => <AnalyticsView scope="beauty" title="Beauty Analytics" />, sees: 'Dr Rashel Serum',
    data: {
      '/admin/analytics/summary/': { revenue: 1000, expenses: 200, net_profit: 800 },
      '/admin/analytics/sales-trend/': [],
      '/admin/analytics/cash-flow/': [],
      '/admin/analytics/expenses-breakdown/': [],
      '/admin/analytics/top-sellers/': { products: [{ name: 'Dr Rashel Serum', type: 'product', units_sold: 9 }], handbags: [], clothes: [], services: [] },
      '/admin/analytics/inventory-alerts/': [],
      '/admin/analytics/stock-value/': { total_value: 5000 },
      '/admin/analytics/shop-breakdown/': { totals: { beauty: 1000, fashion: 0 }, expenses: { beauty: 200, fashion: 0 }, top_shop: 'beauty', active_bookings: 2 },
    },
  },
  {
    name: 'Draft products', page: () => <AdminStagingPage />, sees: /no draft products/i,
    data: { '/admin/staging/': [] },
  },
]

function mockServer(data: Record<string, unknown>) {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url in data) return { data: data[url] }
    throw new Error(`unexpected GET ${url}`)
  })
}

const shown = (c: Case) => (
  <MemoryRouter><ToastProvider>{c.page()}</ToastProvider></MemoryRouter>
)

beforeEach(() => {
  vi.mocked(api.get).mockReset()
})

describe.each(cases)('admin page: $name', c => {
  it('shows its data', async () => {
    mockServer(c.data)
    render(shown(c))
    expect((await screen.findAllByText(c.sees)).length).toBeGreaterThan(0)
  })

  it('comes back instantly after you step away, without asking the server again', async () => {
    mockServer(c.data)
    const first = render(shown(c))
    await screen.findAllByText(c.sees)
    const requests = vi.mocked(api.get).mock.calls.length
    first.unmount()                                                   // step away to another page

    render(shown(c))                                                  // come back
    expect(screen.getAllByText(c.sees).length).toBeGreaterThan(0)      // there at once, no loading state
    if (!c.alwaysRefreshes) expect(vi.mocked(api.get).mock.calls.length).toBe(requests)   // nothing re-requested while fresh
  })
})

describe('admin pages after a save', () => {
  it('Customer reviews: deleting one refreshes the list from the server', async () => {
    const user = (await import('@testing-library/user-event')).default
    let reviews = [{ id: 1, customer_name: 'Aisha Njeri', customer_label: '', text: 'Lovely', rating: 5, shop: '', is_published: true, created_at: when }]
    vi.mocked(api.get).mockImplementation(async () => ({ data: reviews }))
    vi.mocked(api.delete).mockResolvedValue({ data: {} })
    render(shown(cases.find(c => c.name === 'Customer reviews')!))
    await screen.findAllByText('Aisha Njeri')

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0])
    reviews = []
    await user.click(await screen.findByRole('button', { name: /^delete$/i }))
    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument()
    expect(screen.queryByText('Aisha Njeri')).not.toBeInTheDocument()
  })
})
