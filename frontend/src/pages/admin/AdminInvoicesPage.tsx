import { useEffect, useState, useRef } from 'react'
import api from '@/lib/axios'
import { formatKES, formatDateTime, formatDate } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

const LOGO_URL =
  'https://fyejjrqtkivnscygihyx.supabase.co/storage/v1/object/public/kenrish-bucket/gallery/ChatGPT_Image_Jun_4_2025_03_18_38_PM.png'

interface LineItem {
  item_type: 'product' | 'handbag' | 'clothes'
  item_id: string
  quantity: string
  unit_price: string
}

interface CatalogItem {
  id: number
  name: string
  price: string
}

function PrintableInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <div className="p-8 font-sans text-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <img
            src={LOGO_URL}
            alt="Kenrish Collection"
            style={{ width: '72px', height: 'auto', display: 'block', marginBottom: '8px' }}
          />
          <h1 className="text-2xl font-bold">Kenrish Collection</h1>
          <p className="text-gray-600 mt-1">Shabaab, Nakuru, Kenya</p>
          <p className="text-gray-600">Tel: 0708 440390</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-800">{invoice.invoice_number}</p>
          <p className="text-gray-600 mt-1">{formatDate(invoice.created_at)}</p>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded">
        <h2 className="font-semibold text-gray-700 mb-2">Bill To:</h2>
        <p className="font-medium">{invoice.customer_name}</p>
        {invoice.customer_phone && <p className="text-gray-600">{invoice.customer_phone}</p>}
      </div>

      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2">Description</th>
            <th className="text-center py-2">Qty</th>
            <th className="text-right py-2">Unit Price</th>
            <th className="text-right py-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{item.item_name} <span className="text-gray-500 capitalize">({item.item_type})</span></td>
              <td className="text-center py-2">{item.quantity}</td>
              <td className="text-right py-2">{formatKES(item.unit_price)}</td>
              <td className="text-right py-2">{formatKES(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-400 font-bold">
            <td colSpan={3} className="text-right py-3">TOTAL</td>
            <td className="text-right py-3">{formatKES(invoice.grand_total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-8 text-center text-gray-500 text-xs border-t pt-4">
        <p>Thank you for shopping at Kenrish Collection!</p>
        <p>Mon–Sat 8AM–8PM · Shabaab, Nakuru, Kenya</p>
      </div>
    </div>
  )
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Create form state
  const [customer, setCustomer] = useState({ name: '', phone: '' })
  const [lines, setLines] = useState<LineItem[]>([{ item_type: 'product', item_id: '', quantity: '1', unit_price: '' }])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [catalog, setCatalog] = useState<Record<string, CatalogItem[]>>({ product: [], handbag: [], clothes: [] })

  const fetchInvoices = () => {
    api.get('/admin/invoices/').then(r => setInvoices(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchInvoices() }, [])

  // Load product/handbag/clothes lists when the create modal opens
  useEffect(() => {
    if (!showCreate) return
    const endpoints: Record<string, string> = { product: '/products/', handbag: '/handbags/', clothes: '/clothes/' }
    Promise.all(
      Object.entries(endpoints).map(([key, path]) =>
        api.get(path).then(r => [key, r.data.results ?? r.data] as [string, CatalogItem[]])
      )
    ).then(entries => setCatalog(Object.fromEntries(entries))).catch(console.error)
  }, [showCreate])

  async function viewDetail(id: number) {
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/admin/invoices/${id}/`)
      setViewInvoice(data)
    } finally {
      setLoadingDetail(false)
    }
  }

  function addLine() {
    setLines(prev => [...prev, { item_type: 'product', item_id: '', quantity: '1', unit_price: '' }])
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, key: keyof LineItem, value: string) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      // Changing type resets the selected item and price
      if (key === 'item_type') {
        return { ...l, item_type: value as LineItem['item_type'], item_id: '', unit_price: '' }
      }
      // Selecting an item auto-fills its price
      if (key === 'item_id') {
        const found = catalog[l.item_type]?.find(p => String(p.id) === value)
        return { ...l, item_id: value, unit_price: found ? found.price : l.unit_price }
      }
      return { ...l, [key]: value }
    }))
  }

  async function handleCreate() {
    if (!customer.name.trim()) { setCreateError('Customer name is required.'); return }
    const items = lines.map(l => ({
      item_type: l.item_type,
      item_id: parseInt(l.item_id),
      quantity: parseInt(l.quantity),
      unit_price: parseFloat(l.unit_price),
    }))
    if (items.some(i => !i.item_id || !i.quantity || isNaN(i.unit_price))) {
      setCreateError('Please fill all line items correctly.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await api.post('/admin/invoices/', {
        customer_name: customer.name,
        customer_phone: customer.phone,
        items,
      })
      setShowCreate(false)
      setCustomer({ name: '', phone: '' })
      setLines([{ item_type: 'product', item_id: '', quantity: '1', unit_price: '' }])
      fetchInvoices()
    } catch (err: unknown) {
      const response = (err as { response?: { data?: Record<string, string[]> } }).response
      setCreateError(response?.data ? JSON.stringify(response.data) : 'Failed to create invoice.')
    } finally {
      setCreating(false)
    }
  }

  function handlePrint() {
    if (!printRef.current) return
    const html = printRef.current.innerHTML
    const win = window.open('', '_blank')!
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Invoice ${viewInvoice?.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; }
      </style>
      </head><body>${html}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const grandTotal = lines.reduce((sum, l) => {
    const qty = parseInt(l.quantity) || 0
    const price = parseFloat(l.unit_price) || 0
    return sum + qty * price
  }, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <button onClick={() => { setShowCreate(true); setCreateError('') }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
          + Create Invoice
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading…</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {invoices.length === 0 && <p className="py-10 text-center text-muted-foreground text-sm">No invoices yet.</p>}
            {invoices.map(inv => (
              <div key={inv.id} className="border border-border rounded-xl p-4 space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-sm">{inv.customer_name}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-sm">{formatKES(inv.grand_total)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(inv.created_at)} · {inv.created_by_username}</p>
                <button onClick={() => viewDetail(inv.id)}
                  className="w-full text-xs px-3 py-2 border rounded-lg hover:bg-muted transition-colors">
                  View / Print
                </button>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(inv.created_at)}</td>
                    <td className="px-4 py-3 font-semibold">{formatKES(inv.grand_total)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.created_by_username}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => viewDetail(inv.id)}
                        className="text-xs px-3 py-1.5 border rounded hover:bg-muted">
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No invoices yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Create Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name *</label>
                  <input type="text" required className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone (+254…)</label>
                  <input type="tel" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="+254700000000" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Line Items</h4>
                  <button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:gap-2 items-end">
                      <div className="col-span-1 sm:col-span-3">
                        <label className="block text-xs text-muted-foreground mb-1">Type</label>
                        <select value={line.item_type} onChange={e => updateLine(i, 'item_type', e.target.value as LineItem['item_type'])}
                          className="w-full border rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="product">Product</option>
                          <option value="handbag">Handbag</option>
                          <option value="clothes">Clothes</option>
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-4">
                        <label className="block text-xs text-muted-foreground mb-1">Item Name</label>
                        <select value={line.item_id} onChange={e => updateLine(i, 'item_id', e.target.value)}
                          className="w-full border rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">Select {line.item_type}…</option>
                          {catalog[line.item_type]?.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">No. of Items</label>
                        <input type="number" min="1"
                          className="w-full border rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">Price (KES)</label>
                        <input type="number" step="any"
                          className="w-full border rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end justify-end pb-0.5">
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <span className="text-sm text-muted-foreground">Estimated total: </span>
                  <span className="font-bold">{formatKES(grandTotal)}</span>
                </div>
              </div>

              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3">
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create Invoice'}
                </button>
                <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-md py-2 text-sm hover:bg-muted">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View / Print Invoice Modal */}
      {(viewInvoice || loadingDetail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b no-print">
              <h3 className="font-semibold">{viewInvoice?.invoice_number}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90">
                  🖨 Print
                </button>
                <button onClick={() => setViewInvoice(null)} className="text-muted-foreground text-xl px-2">✕</button>
              </div>
            </div>
            {loadingDetail ? (
              <div className="text-center py-10 text-muted-foreground">Loading…</div>
            ) : viewInvoice && (
              <div ref={printRef}>
                <PrintableInvoice invoice={viewInvoice} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
