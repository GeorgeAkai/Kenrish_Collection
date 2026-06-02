import { useEffect, useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { formatKES, formatDateTime } from '@/lib/utils'
import type { InventoryItem, Sale } from '@/lib/types'

type Tab = 'inventory' | 'add-stock' | 'record-sale' | 'sales'

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Add stock form
  const [stockForm, setStockForm] = useState({ item_type: 'product', item_id: '', quantity: '', cost_price: '' })
  const [stockSaving, setStockSaving] = useState(false)
  const [stockMsg, setStockMsg] = useState('')

  // Record sale form
  const [saleForm, setSaleForm] = useState({ item_type: 'product', item_id: '', quantity: '1', unit_price: '', customer_name: '', customer_phone: '' })
  const [saleSaving, setSaleSaving] = useState(false)
  const [saleMsg, setSaleMsg] = useState('')

  useEffect(() => {
    if (tab === 'inventory') {
      setLoading(true)
      api.get('/admin/inventory/').then(r => setInventory(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
    } else if (tab === 'sales') {
      setLoading(true)
      api.get('/admin/inventory/sales/').then(r => setSales(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
    }
  }, [tab])

  async function handleAddStock(e: FormEvent) {
    e.preventDefault()
    setStockSaving(true)
    setStockMsg('')
    try {
      await api.post('/admin/inventory/add-stock/', {
        item_type: stockForm.item_type,
        item_id: parseInt(stockForm.item_id),
        quantity: parseInt(stockForm.quantity),
        cost_price: parseFloat(stockForm.cost_price),
      })
      setStockMsg('Stock added successfully!')
      setStockForm({ item_type: 'product', item_id: '', quantity: '', cost_price: '' })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, string[]> } }).response
      setStockMsg(response?.data ? JSON.stringify(response.data) : 'Failed to add stock.')
    } finally {
      setStockSaving(false)
    }
  }

  async function handleRecordSale(e: FormEvent) {
    e.preventDefault()
    setSaleSaving(true)
    setSaleMsg('')
    try {
      await api.post('/admin/inventory/record-sale/', {
        item_type: saleForm.item_type,
        item_id: parseInt(saleForm.item_id),
        quantity: parseInt(saleForm.quantity),
        unit_price: parseFloat(saleForm.unit_price),
        customer_name: saleForm.customer_name,
        customer_phone: saleForm.customer_phone,
      })
      setSaleMsg('Sale recorded successfully!')
      setSaleForm({ item_type: 'product', item_id: '', quantity: '1', unit_price: '', customer_name: '', customer_phone: '' })
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, string[]> } }).response
      setSaleMsg(response?.data ? JSON.stringify(response.data) : 'Failed to record sale.')
    } finally {
      setSaleSaving(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'inventory', label: 'Inventory' },
    { key: 'add-stock', label: 'Add Stock' },
    { key: 'record-sale', label: 'Record Sale' },
    { key: 'sales', label: 'Sales History' },
  ]

  const itemTypeSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
      <option value="product">Product</option>
      <option value="handbag">Handbag</option>
      <option value="clothes">Clothes</option>
    </select>
  )

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Inventory Management</h2>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md -mb-px transition-colors ${tab === t.key ? 'bg-background border border-b-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        loading ? <div className="text-center py-10 text-muted-foreground">Loading…</div> : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {inventory.length === 0 && <p className="py-10 text-center text-muted-foreground text-sm">No inventory data.</p>}
              {inventory.map(item => (
                <div key={`${item.item_type}-${item.id}`} className="border border-border rounded-xl p-4 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.item_type}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${item.is_low_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.stock_quantity}{item.is_low_stock ? ' ⚠' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Cost: {formatKES(item.cost_price)}</span>
                    <span>Price: {formatKES(item.price)}</span>
                    <span className="font-medium text-foreground">Value: {formatKES(item.inventory_value)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Stock</th>
                    <th className="text-left px-4 py-3 font-medium">Cost</th>
                    <th className="text-left px-4 py-3 font-medium">Price</th>
                    <th className="text-left px-4 py-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={`${item.item_type}-${item.id}`} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{item.item_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.is_low_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {item.stock_quantity} {item.is_low_stock && '⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatKES(item.cost_price)}</td>
                      <td className="px-4 py-3">{formatKES(item.price)}</td>
                      <td className="px-4 py-3 font-medium">{formatKES(item.inventory_value)}</td>
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No inventory data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {tab === 'add-stock' && (
        <div className="max-w-md">
          <form onSubmit={handleAddStock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Type</label>
              {itemTypeSelect(stockForm.item_type, v => setStockForm(f => ({ ...f, item_type: v })))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item ID</label>
              <input type="number" required className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.item_id} onChange={e => setStockForm(f => ({ ...f, item_id: e.target.value }))} placeholder="Enter item ID" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" required min="1" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price per Unit (KES)</label>
              <input type="number" required step="any" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.cost_price} onChange={e => setStockForm(f => ({ ...f, cost_price: e.target.value }))} />
            </div>
            {stockMsg && <p className={`text-sm ${stockMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{stockMsg}</p>}
            <button type="submit" disabled={stockSaving} className="btn-modern btn-modern--primary">
              {stockSaving ? 'Adding…' : 'Add Stock'}
            </button>
          </form>
        </div>
      )}

      {tab === 'record-sale' && (
        <div className="max-w-md">
          <form onSubmit={handleRecordSale} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Type</label>
              {itemTypeSelect(saleForm.item_type, v => setSaleForm(f => ({ ...f, item_type: v })))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item ID</label>
              <input type="number" required className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={saleForm.item_id} onChange={e => setSaleForm(f => ({ ...f, item_id: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" required min="1" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={saleForm.quantity} onChange={e => setSaleForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Price (KES)</label>
              <input type="number" required step="any" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={saleForm.unit_price} onChange={e => setSaleForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer Name</label>
              <input type="text" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={saleForm.customer_name} onChange={e => setSaleForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer Phone (+254…)</label>
              <input type="tel" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={saleForm.customer_phone} onChange={e => setSaleForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+254700000000" />
            </div>
            {saleMsg && <p className={`text-sm ${saleMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{saleMsg}</p>}
            <button type="submit" disabled={saleSaving} className="btn-modern btn-modern--primary">
              {saleSaving ? 'Recording…' : 'Record Sale'}
            </button>
          </form>
        </div>
      )}

      {tab === 'sales' && (
        loading ? <div className="text-center py-10 text-muted-foreground">Loading…</div> : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {sales.length === 0 && <p className="py-10 text-center text-muted-foreground text-sm">No sales recorded.</p>}
              {sales.map(s => (
                <div key={s.id} className="border border-border rounded-xl p-4 space-y-1.5 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.item_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.item_type}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-sm">{formatKES(s.total_amount)}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Qty: {s.quantity} @ {formatKES(s.unit_price)}</span>
                    {s.customer_name && <span>{s.customer_name}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</p>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-left px-4 py-3 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 font-medium">Unit Price</th>
                    <th className="text-left px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.item_name}<span className="text-muted-foreground ml-1 text-xs capitalize">({s.item_type})</span></td>
                      <td className="px-4 py-3">{s.quantity}</td>
                      <td className="px-4 py-3">{formatKES(s.unit_price)}</td>
                      <td className="px-4 py-3 font-semibold">{formatKES(s.total_amount)}</td>
                      <td className="px-4 py-3">{s.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.created_at)}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No sales recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  )
}
