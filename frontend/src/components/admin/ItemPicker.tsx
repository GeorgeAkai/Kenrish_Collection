import { useEffect, useState, type KeyboardEvent } from 'react'
import { formatKES } from '@/lib/utils'
import type { InventoryItem } from '@/lib/types'

const GROUPS: { type: InventoryItem['item_type']; label: string }[] = [
  { type: 'product', label: 'Beauty Products' },
  { type: 'clothes', label: 'Clothes' },
  { type: 'handbag', label: 'Handbags' },
]

interface Props {
  items: InventoryItem[]
  selected: InventoryItem | null
  onSelect: (item: InventoryItem | null) => void
}

const optionId = (i: InventoryItem) => `item-picker-${i.item_type}-${i.id}`

export default function ItemPicker({ items, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)

  // Keep the text in step with the parent's selection (e.g. the form resets after a sale).
  useEffect(() => { setQuery(selected ? selected.name : '') }, [selected])

  const q = query.trim().toLowerCase()
  const visible = items.filter(i => i.name.toLowerCase().includes(q))
  // Display order (grouped), which is also the keyboard order.
  const ordered = GROUPS.flatMap(g => visible.filter(i => i.item_type === g.type))

  function choose(item: InventoryItem) {
    onSelect(item)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => Math.min(a + 1, ordered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && open && ordered[active]) {
      e.preventDefault() // don't submit the sale form
      choose(ordered[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls="item-picker-list"
        aria-activedescendant={open && ordered[active] ? optionId(ordered[active]) : undefined}
        className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Select or search an item…"
        autoComplete="off"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); if (selected) onSelect(null) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div id="item-picker-list" role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {ordered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>}
          {GROUPS.map(g => {
            const groupItems = visible.filter(i => i.item_type === g.type)
            return groupItems.length > 0 && (
              <div key={g.type} role="group" aria-label={g.label}>
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">{g.label}</div>
                {groupItems.map(i => (
                  <div
                    key={i.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected?.id === i.id && selected.item_type === i.item_type}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${ordered[active] === i ? 'bg-muted' : ''}`}
                    onMouseDown={e => { e.preventDefault(); choose(i) }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{i.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatKES(i.price)}</span>
                    </div>
                    <div className={`text-xs ${i.stock_quantity > 0 ? 'text-muted-foreground' : 'text-red-600'}`}>
                      {i.stock_quantity > 0 ? `${i.stock_quantity} in stock` : 'Out of stock'}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
