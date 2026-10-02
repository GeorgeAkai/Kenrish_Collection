import { describe, expect, it } from 'vitest'
import { NAV } from './AdminLayout'

const group = (label: string) => {
  const entry = NAV.find(e => e.label === label)
  if (!entry || entry.kind !== 'group') throw new Error(`no group called ${label}`)
  return entry
}
const labels = (label: string) => group(label).children.map(c => c.label)

describe('admin sidebar', () => {
  it('has just the eight top-level links, in order', () => {
    expect(NAV.map(e => e.label)).toEqual([
      'Executive Dashboard',
      'Customer & Order Management',
      'Kenrish Beauty',
      'Kenrish Fashion',
      'Expense Management',
      'Employees Management',
      'Invoices',
      'Offers',
    ])
  })

  it('gathers everything about customers under Customer & Order Management', () => {
    expect(labels('Customer & Order Management')).toEqual(['Customers', 'Customer Orders', 'Customer Reviews', 'Users', 'Activity Logs'])
    const paths = group('Customer & Order Management').children.map(c => c.to)
    expect(paths).toEqual(['/admin/customers', '/admin/orders', '/admin/reviews', '/admin/users', '/admin/users/activity'])
  })

  it('moves Service Time Settings under Kenrish Beauty', () => {
    const beauty = group('Kenrish Beauty').children
    expect(beauty.find(c => c.label === 'Service Time Settings')?.to).toBe('/admin/slot-config')
  })

  it('leaves no link out: every page that was in the sidebar is still reachable', () => {
    const all = NAV.flatMap(e => (e.kind === 'group' ? e.children.map(c => c.to) : [e.to]))
    for (const path of [
      '/admin/executive', '/admin/expenses', '/admin/employees', '/admin/orders', '/admin/reviews', '/admin/customers',
      '/admin/users', '/admin/users/activity', '/admin/slot-config', '/admin/invoices', '/admin/offers',
      '/admin/beauty/analytics', '/admin/products', '/admin/services', '/admin/beauty/service-sales', '/admin/beauty/staging',
      '/admin/reservations', '/admin/beauty/gallery', '/admin/beauty/inventory', '/admin/beauty/expenses',
      '/admin/fashion/analytics', '/admin/clothes', '/admin/fashion/categories', '/admin/handbags',
      '/admin/fashion/inventory', '/admin/fashion/gallery', '/admin/fashion/expenses',
    ]) {
      expect(all, path).toContain(path)
    }
  })

  it('has no duplicate links', () => {
    const all = NAV.flatMap(e => (e.kind === 'group' ? e.children.map(c => c.to) : [e.to]))
    expect(new Set(all).size).toBe(all.length)
  })
})
