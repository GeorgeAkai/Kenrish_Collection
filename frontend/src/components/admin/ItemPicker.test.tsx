import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { InventoryItem } from '@/lib/types'
import ItemPicker from './ItemPicker'

const item = (over: Partial<InventoryItem>): InventoryItem => ({
  id: 1, name: 'Item', item_type: 'product', stock_quantity: 5, reorder_level: 2,
  cost_price: '100', price: '500', max_price: null, is_low_stock: false, inventory_value: '500', ...over,
})

const items: InventoryItem[] = [
  item({ id: 1, name: 'Vitamin C Serum', item_type: 'product', price: '1500', stock_quantity: 8 }),
  item({ id: 2, name: 'Denim Jacket', item_type: 'clothes', price: '1200', stock_quantity: 3 }),
  item({ id: 3, name: 'Leather Handbag', item_type: 'handbag', price: '3500', stock_quantity: 0 }),
]

function Harness({ onSelect }: { onSelect?: (i: InventoryItem | null) => void }) {
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  return <ItemPicker items={items} selected={selected} onSelect={i => { setSelected(i); onSelect?.(i) }} />
}

describe('ItemPicker', () => {
  it('lists every item, grouped by category, when opened with no search text', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox'))

    const groups = screen.getAllByRole('group')
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual(['Beauty Products', 'Clothes', 'Handbags'])
    expect(within(groups[0]).getByText('Vitamin C Serum')).toBeInTheDocument()
    expect(within(groups[1]).getByText('Denim Jacket')).toBeInTheDocument()
    expect(within(groups[2]).getByText('Leather Handbag')).toBeInTheDocument()
  })

  it('filters case-insensitively as the admin types', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'jAcK')

    expect(screen.getByText('Denim Jacket')).toBeInTheDocument()
    expect(screen.queryByText('Vitamin C Serum')).not.toBeInTheDocument()
    expect(screen.queryByText('Leather Handbag')).not.toBeInTheDocument()
  })

  it('selecting an option reports it, closes the list and shows its name', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: /Denim Jacket/ }))

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, item_type: 'clothes' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('Denim Jacket')
  })

  it('shows stock and price on each option and marks out-of-stock items', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('combobox'))

    const jacket = screen.getByRole('option', { name: /Denim Jacket/ })
    expect(jacket).toHaveTextContent('3 in stock')
    expect(jacket).toHaveTextContent(/1,200/)
    expect(screen.getByRole('option', { name: /Leather Handbag/ })).toHaveTextContent('Out of stock')
    expect(jacket).not.toHaveTextContent('Out of stock')
  })

  it('can be driven from the keyboard', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Denim Jacket' }))

    await userEvent.clear(screen.getByRole('combobox'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the price range for an item that sells across a range', async () => {
    render(<ItemPicker items={[item({ id: 9, name: 'Mixed Bale Jacket', item_type: 'clothes', price: '800', max_price: '1500' })]}
      selected={null} onSelect={() => {}} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: /Mixed Bale Jacket/ })).toHaveTextContent('KES 800.00 – 1,500.00')
  })
})

