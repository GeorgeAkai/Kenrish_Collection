import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES, formatDateTime } from '@/lib/utils'
import type { InventoryItem, Sale } from '@/lib/types'

type Tab = 'inventory' | 'add-stock' | 'record-sale' | 'sales' | 'scan-receipt'
type ScanStage = 'upload' | 'review' | 'done'

interface ScannedItem {
  receiptName: string
  quantity: number
  unit_cost: number
  price: string
  linkedKey: string
  newItemType: 'product' | 'handbag' | 'clothes'
  skip: boolean
}

function ScanReceiptPanel({ inventory }: { inventory: InventoryItem[] }) {
  const navigate = useNavigate()
  const [stage, setStage] = useState<ScanStage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [addedCount, setAddedCount] = useState(0)
  const [createdCount, setCreatedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function pickFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  async function handleScan() {
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await api.post('/admin/receipt/parse/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const parsed: ScannedItem[] = (res.data.items ?? []).map(
        (i: { name: string; quantity: number; unit_cost: number }) => ({
          receiptName: i.name,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
          price: '',
          linkedKey: '',
          newItemType: 'product' as const,
          skip: false,
        })
      )
      setItems(parsed)
      setStage('review')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Failed to scan receipt. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  function updateItem<K extends keyof ScannedItem>(index: number, field: K, value: ScannedItem[K]) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  async function handleConfirm() {
    const active = items.filter(it => !it.skip)
    if (active.length === 0) {
      setError('All items are skipped. Uncheck at least one.')
      return
    }
    const toSend = active.map(it => {
      if (it.linkedKey) {
        const [item_type, id] = it.linkedKey.split(':')
        return { action: 'link', item_type, product_id: Number(id), quantity: it.quantity, unit_cost: it.unit_cost, price: parseFloat(it.price) || 0 }
      }
      return { action: 'create', name: it.receiptName, item_type: it.newItemType, quantity: it.quantity, unit_cost: it.unit_cost, price: parseFloat(it.price) || 0 }
    })
    setConfirming(true)
    setError('')
    try {
      const res = await api.post('/admin/receipt/confirm/', { items: toSend })
      setAddedCount(res.data.added ?? 0)
      setCreatedCount(res.data.created ?? 0)
      setStage('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Confirm failed. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    setStage('upload')
    setFile(null)
    setPreview(null)
    setError('')
    setItems([])
    setAddedCount(0)
    setCreatedCount(0)
  }

  if (stage === 'done') {
    return (
      <div className="space-y-4 max-w-lg">
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-5 space-y-1">
          <p className="font-semibold text-green-800 dark:text-green-300">Receipt confirmed</p>
          {addedCount > 0 && (
            <p className="text-sm text-green-700 dark:text-green-400">
              {addedCount} existing product{addedCount !== 1 ? 's' : ''} restocked.
            </p>
          )}
          {createdCount > 0 && (
            <p className="text-sm text-green-700 dark:text-green-400">
              {createdCount} new draft product{createdCount !== 1 ? 's' : ''} created — complete their details before publishing.
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {createdCount > 0 && (
            <button onClick={() => navigate('/admin/staging')} className="btn-modern btn-modern--primary">
              Complete Draft Products →
            </button>
          )}
          <button onClick={reset} className="btn-modern flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
            <ScanLine size={14} />
            Scan Another
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'review') {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold">Review Extracted Items</h3>
            <p className="text-sm text-muted-foreground">
              Link each row to an existing product and optionally set the selling price.
            </p>
          </div>
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            ← Rescan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Receipt Item</th>
                <th className="text-left px-3 py-2 font-medium">Qty</th>
                <th className="text-left px-3 py-2 font-medium">Cost (KES)</th>
                <th className="text-left px-3 py-2 font-medium">Selling (KES)</th>
                <th className="text-left px-3 py-2 font-medium">Link to Existing Product</th>
                <th className="text-left px-3 py-2 font-medium">Type (if new)</th>
                <th className="px-3 py-2 font-medium text-center">Skip</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className={`border-t transition-opacity ${it.skip ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 font-medium">{it.receiptName}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-16 border rounded px-2 py-1 text-sm bg-background"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={it.unit_cost}
                      onChange={e => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="w-24 border rounded px-2 py-1 text-sm bg-background"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      value={it.price}
                      placeholder="—"
                      onChange={e => updateItem(i, 'price', e.target.value)}
                      className="w-24 border rounded px-2 py-1 text-sm bg-background"
                    />
                  </td>
                  <td className="px-3 py-2 min-w-52">
                    <select
                      value={it.linkedKey}
                      onChange={e => updateItem(i, 'linkedKey', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm bg-background"
                    >
                      <option value="">— create new draft —</option>
                      {inventory.map(inv => (
                        <option
                          key={`${inv.item_type}:${inv.id}`}
                          value={`${inv.item_type}:${inv.id}`}
                        >
                          [{inv.item_type}] {inv.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={it.linkedKey ? '' : it.newItemType}
                      disabled={!!it.linkedKey}
                      onChange={e => updateItem(i, 'newItemType', e.target.value as ScannedItem['newItemType'])}
                      className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-40 w-24"
                    >
                      <option value="product">Product</option>
                      <option value="handbag">Handbag</option>
                      <option value="clothes">Clothes</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={it.skip}
                      onChange={e => updateItem(i, 'skip', e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No items extracted. Try rescanning with a clearer image.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="btn-modern btn-modern--primary"
        >
          {confirming ? 'Saving…' : 'Confirm & Add Stock'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Upload a photo of a supplier receipt. AI will extract product names, quantities, and unit
        prices automatically.
      </p>

      <div
        className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) pickFile(f)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) pickFile(f)
          }}
        />
        {preview ? (
          <img src={preview} alt="Receipt preview" className="max-h-48 object-contain rounded-lg" />
        ) : (
          <div className="text-center space-y-2 pointer-events-none">
            <ScanLine size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleScan}
        disabled={!file || scanning}
        className="btn-modern btn-modern--primary flex items-center gap-2"
      >
        {scanning ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Scanning…
          </>
        ) : (
          <>
            <ScanLine size={14} />
            Scan Receipt
          </>
        )}
      </button>
    </div>
  )
}

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Add stock form
  const [stockForm, setStockForm] = useState({ item_type: 'product', item_id: '', quantity: '', cost_price: '', price: '' })
  const [stockSaving, setStockSaving] = useState(false)
  const [stockMsg, setStockMsg] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [stockSelected, setStockSelected] = useState<InventoryItem | null>(null)
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const stockSearchRef = useRef<HTMLDivElement>(null)

  // Record sale form
  const [saleForm, setSaleForm] = useState({ item_type: 'product', item_id: '', quantity: '1', unit_price: '', customer_name: '', customer_phone: '' })
  const [saleSaving, setSaleSaving] = useState(false)
  const [saleMsg, setSaleMsg] = useState('')
  const [saleSearch, setSaleSearch] = useState('')
  const [saleSelected, setSaleSelected] = useState<InventoryItem | null>(null)
  const [showSaleDropdown, setShowSaleDropdown] = useState(false)
  const saleSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'inventory') {
      setLoading(true)
      api.get('/admin/inventory/').then(r => setInventory(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
    } else if (tab === 'sales') {
      setLoading(true)
      api.get('/admin/inventory/sales/').then(r => setSales(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
    } else if (tab === 'scan-receipt' || tab === 'record-sale' || tab === 'add-stock') {
      if (inventory.length === 0)
        api.get('/admin/inventory/').then(r => setInventory(r.data.results ?? r.data)).catch(console.error)
    }
  }, [tab])

  async function handleAddStock(e: FormEvent) {
    e.preventDefault()
    if (!stockSelected) { setStockMsg('Please select an item from the list.'); return }
    setStockSaving(true)
    setStockMsg('')
    try {
      await api.post('/admin/inventory/add-stock/', {
        item_type: stockSelected.item_type,
        item_id: stockSelected.id,
        quantity: parseInt(stockForm.quantity),
        unit_cost: parseFloat(stockForm.cost_price),
        ...(stockForm.price ? { new_price: parseFloat(stockForm.price) } : {}),
      })
      setStockMsg('Stock added successfully!')
      setStockForm({ item_type: 'product', item_id: '', quantity: '', cost_price: '', price: '' })
      setStockSearch('')
      setStockSelected(null)
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, string[]> } }).response
      setStockMsg(response?.data ? JSON.stringify(response.data) : 'Failed to add stock.')
    } finally {
      setStockSaving(false)
    }
  }

  async function handleRecordSale(e: FormEvent) {
    e.preventDefault()
    if (!saleSelected) { setSaleMsg('Please select an item from the list.'); return }
    setSaleSaving(true)
    setSaleMsg('')
    try {
      await api.post('/admin/inventory/record-sale/', {
        item_type: saleSelected.item_type,
        item_id: saleSelected.id,
        quantity: parseInt(saleForm.quantity),
        unit_price: parseFloat(saleForm.unit_price),
        customer_name: saleForm.customer_name,
        customer_phone: saleForm.customer_phone,
      })
      setSaleMsg('Sale recorded successfully!')
      setSaleForm({ item_type: 'product', item_id: '', quantity: '1', unit_price: '', customer_name: '', customer_phone: '' })
      setSaleSearch('')
      setSaleSelected(null)
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
    { key: 'scan-receipt', label: 'Scan Receipt' },
  ]


  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Inventory Management</h2>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md -mb-px transition-colors whitespace-nowrap ${tab === t.key ? 'bg-background border border-b-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.key === 'scan-receipt' && <ScanLine size={12} className="inline mr-1.5 -mt-0.5" />}
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
                    <span>Buying: {formatKES(item.cost_price)}</span>
                    <span>Selling: {formatKES(item.price)}</span>
                    <span className="font-medium text-foreground" title="Stock Value = units in stock × buying price">Stock Value: {formatKES(item.inventory_value)}</span>
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
                    <th className="text-left px-4 py-3 font-medium">Buying Price</th>
                    <th className="text-left px-4 py-3 font-medium">Selling Price</th>
                    <th className="text-left px-4 py-3 font-medium" title="Stock Value = units in stock × buying price">Stock Value ⓘ</th>
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
            <div ref={stockSearchRef} className="relative">
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search by name…"
                value={stockSearch}
                autoComplete="off"
                onChange={e => {
                  setStockSearch(e.target.value)
                  setStockSelected(null)
                  setShowStockDropdown(true)
                }}
                onFocus={() => setShowStockDropdown(true)}
                onBlur={() => setTimeout(() => setShowStockDropdown(false), 150)}
              />
              {showStockDropdown && stockSearch.length > 0 && (() => {
                const q = stockSearch.toLowerCase()
                const hits = inventory.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8)
                return hits.length > 0 ? (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {hits.map(item => (
                      <li
                        key={`${item.item_type}-${item.id}`}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                        onMouseDown={() => {
                          setStockSelected(item)
                          setStockSearch(item.name)
                          setShowStockDropdown(false)
                        }}
                      >
                        <span className="font-medium truncate">{item.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">{item.item_type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-background border rounded-md shadow px-3 py-2 text-sm text-muted-foreground">No items found</div>
                )
              })()}
              {stockSelected && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {stockSelected.item_type} · {stockSelected.stock_quantity} in stock
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" required min="1" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Buying Price per Unit (KES)</label>
              <input type="number" required step="any" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.cost_price} onChange={e => setStockForm(f => ({ ...f, cost_price: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price per Unit (KES) <span className="text-muted-foreground font-normal">— optional, updates the listed price</span></label>
              <input type="number" step="any" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={stockForm.price} onChange={e => setStockForm(f => ({ ...f, price: e.target.value }))} placeholder="Leave blank to keep current price" />
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
            <div ref={saleSearchRef} className="relative">
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search by name…"
                value={saleSearch}
                autoComplete="off"
                onChange={e => {
                  setSaleSearch(e.target.value)
                  setSaleSelected(null)
                  setShowSaleDropdown(true)
                }}
                onFocus={() => setShowSaleDropdown(true)}
                onBlur={() => setTimeout(() => setShowSaleDropdown(false), 150)}
              />
              {showSaleDropdown && saleSearch.length > 0 && (() => {
                const q = saleSearch.toLowerCase()
                const hits = inventory.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8)
                return hits.length > 0 ? (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {hits.map(item => (
                      <li
                        key={`${item.item_type}-${item.id}`}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                        onMouseDown={() => {
                          setSaleSelected(item)
                          setSaleSearch(item.name)
                          setSaleForm(f => ({ ...f, unit_price: item.price ?? '' }))
                          setShowSaleDropdown(false)
                        }}
                      >
                        <span className="font-medium truncate">{item.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">{item.item_type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-background border rounded-md shadow px-3 py-2 text-sm text-muted-foreground">No items found</div>
                )
              })()}
              {saleSelected && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {saleSelected.item_type} · {saleSelected.stock_quantity} in stock · selling at {formatKES(saleSelected.price)}
                </p>
              )}
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

      {tab === 'scan-receipt' && <ScanReceiptPanel inventory={inventory} />}
    </div>
  )
}
