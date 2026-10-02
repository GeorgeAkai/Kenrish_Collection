import { getAdminPageTitle } from './AdminLayout'

describe('getAdminPageTitle', () => {
  // Tracer bullet
  it('returns "Dashboard" for /admin', () => {
    expect(getAdminPageTitle('/admin')).toBe('Dashboard')
  })

  // All known routes
  it('titles the expenses pages for each shop and for all shops', () => {
    expect(getAdminPageTitle('/admin/beauty/expenses')).toBe('Beauty Expenses')
    expect(getAdminPageTitle('/admin/fashion/expenses')).toBe('Fashion Expenses')
    expect(getAdminPageTitle('/admin/expenses')).toBe('Expense Management')
  })

  it('titles the employees page', () => {
    expect(getAdminPageTitle('/admin/employees')).toBe('Employees Management')
  })

  it('titles the customers page', () => {
    expect(getAdminPageTitle('/admin/customers')).toBe('Customers')
  })

  it('titles a customer profile whatever its address', () => {
    expect(getAdminPageTitle('/admin/customers/customer/12')).toBe('Customer Profile')
    expect(getAdminPageTitle('/admin/customers/user/5')).toBe('Customer Profile')
  })

  it('keeps the shop inventory title on each inventory sub-page', () => {
    expect(getAdminPageTitle('/admin/beauty/inventory/record-sale')).toBe('Beauty Inventory')
    expect(getAdminPageTitle('/admin/fashion/inventory/low-stock')).toBe('Fashion Inventory')
    expect(getAdminPageTitle('/admin/inventory/sales')).toBe('Inventory')
  })

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

  it('returns "Customer Orders" for /admin/orders', () => {
    expect(getAdminPageTitle('/admin/orders')).toBe('Customer Orders')
  })

  it('returns "Services" for /admin/services', () => {
    expect(getAdminPageTitle('/admin/services')).toBe('Services')
  })

  it('returns "Reservations" for /admin/reservations', () => {
    expect(getAdminPageTitle('/admin/reservations')).toBe('Reservations')
  })

  it('returns "Service Time Settings" for /admin/slot-config (renamed label)', () => {
    expect(getAdminPageTitle('/admin/slot-config')).toBe('Service Time Settings')
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
