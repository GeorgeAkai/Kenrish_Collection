import { getAdminPageTitle } from './AdminLayout'

describe('getAdminPageTitle', () => {
  // Tracer bullet
  it('returns "Dashboard" for /admin', () => {
    expect(getAdminPageTitle('/admin')).toBe('Dashboard')
  })

  // All known routes
  it('returns "Products" for /admin/products', () => {
    expect(getAdminPageTitle('/admin/products')).toBe('Products')
  })

  it('returns "Handbags" for /admin/handbags', () => {
    expect(getAdminPageTitle('/admin/handbags')).toBe('Handbags')
  })

  it('returns "Clothes" for /admin/clothes', () => {
    expect(getAdminPageTitle('/admin/clothes')).toBe('Clothes')
  })

  it('returns "Inventory" for /admin/inventory', () => {
    expect(getAdminPageTitle('/admin/inventory')).toBe('Inventory')
  })

  it('returns "Orders" for /admin/orders', () => {
    expect(getAdminPageTitle('/admin/orders')).toBe('Orders')
  })

  it('returns "Services" for /admin/services', () => {
    expect(getAdminPageTitle('/admin/services')).toBe('Services')
  })

  it('returns "Reservations" for /admin/reservations', () => {
    expect(getAdminPageTitle('/admin/reservations')).toBe('Reservations')
  })

  it('returns "Schedule Settings" for /admin/slot-config (renamed label)', () => {
    expect(getAdminPageTitle('/admin/slot-config')).toBe('Schedule Settings')
  })

  it('returns "Gallery" for /admin/gallery', () => {
    expect(getAdminPageTitle('/admin/gallery')).toBe('Gallery')
  })

  it('returns "Offers" for /admin/offers', () => {
    expect(getAdminPageTitle('/admin/offers')).toBe('Offers')
  })

  it('returns "Users" for /admin/users', () => {
    expect(getAdminPageTitle('/admin/users')).toBe('Users')
  })

  it('returns "Invoices" for /admin/invoices', () => {
    expect(getAdminPageTitle('/admin/invoices')).toBe('Invoices')
  })

  // Fallback
  it('returns "Admin" for unknown routes', () => {
    expect(getAdminPageTitle('/admin/unknown-page')).toBe('Admin')
  })
})
