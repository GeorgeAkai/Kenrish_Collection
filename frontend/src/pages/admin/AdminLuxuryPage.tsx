import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, X, Gem } from 'lucide-react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import FileDropZone from '@/components/admin/FileDropZone'
import { useToast } from '@/contexts/ToastContext'

interface LuxuryItem {
  id: number
  name: string
  description: string
  image: string | null
  material: string
  dimensions: string
  provenance: string
  edition_size: number | null
  price: string | null
  availability: 'available' | 'reserved' | 'sold'
  is_published: boolean
}

const AVAILABILITY_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  sold: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

const FIELDS = [
  { name: 'name', label: 'Name', required: true },
  { name: 'description', label: 'Description', type: 'textarea' as const },
  { name: 'material', label: 'Material' },
  { name: 'dimensions', label: 'Dimensions' },
  { name: 'provenance', label: 'Provenance', type: 'textarea' as const },
  { name: 'edition_size', label: 'Edition Size', type: 'number' as const },
  { name: 'price', label: 'Price (KES) — leave blank for "Price on Application"', type: 'number' as const },
]

export default function AdminLuxuryPage() {
  const [items, setItems] = useState<LuxuryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<LuxuryItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [availability, setAvailability] = useState<LuxuryItem['availability']>('available')
  const [isPublished, setIsPublished] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const del = useConfirm<number>()
  const toast = useToast()

  function fetch() {
    api.get<{ results: LuxuryItem[] }>('/admin/luxury/').then(r => setItems(r.data.results ?? [])).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  function openCreate() {
    setEditing(null)
    setForm({})
    setAvailability('available')
    setIsPublished(true)
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: LuxuryItem) {
    setEditing(item)
    const f: Record<string, string> = {}
    FIELDS.forEach(field => { f[field.name] = String((item as unknown as Record<string, unknown>)[field.name] ?? '') })
    setForm(f)
    setAvailability(item.availability)
    setIsPublished(item.is_published)
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    del.cancel()
    try {
      await api.delete(`/admin/luxury/${id}/`)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      toast.error('Could not delete this item.')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      FIELDS.forEach(f => { if (form[f.name]) fd.append(f.name, form[f.name]) })
      fd.append('availability', availability)
      fd.append('is_published', String(isPublished))
      if (imageFile) fd.append('image', imageFile)
      const headers = { 'Content-Type': 'multipart/form-data' }
      if (editing) {
        await api.patch(`/admin/luxury/${editing.id}/`, fd, { headers })
      } else {
        await api.post('/admin/luxury/', fd, { headers })
      }
      setShowForm(false)
      fetch()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } }).response?.data
      if (data && typeof data === 'object') {
        setError(Object.entries(data as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join('; '))
      } else {
        setError('Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Gem size={18} className="text-primary" /> Luxury Items</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} items</p>
        </div>
        <button onClick={openCreate} className="btn-modern btn-modern--primary flex items-center gap-2 text-sm font-medium">
          <Plus size={16} /> Add New
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No luxury items yet.</p>
      ) : (
        <div className="border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Availability</th>
                <th className="text-left px-4 py-3 font-medium">Published</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.price ? formatKES(item.price) : <span className="text-muted-foreground italic">POA</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AVAILABILITY_BADGE[item.availability]}`}>{item.availability}</span>
                  </td>
                  <td className="px-4 py-3">{item.is_published ? 'Yes' : 'Draft'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil size={14} /></button>
                      {del.isAsking(item.id) ? (
                        <InlineConfirm label="Delete?" onConfirm={() => handleDelete(item.id)} onCancel={del.cancel} />
                      ) : (
                        <button onClick={() => del.ask(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <h3 className="text-base font-semibold">{editing ? 'Edit Item' : 'Add Luxury Item'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <FileDropZone file={imageFile} onFileChange={setImageFile} currentUrl={editing?.image} />
              {FIELDS.map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1">{f.label} {f.required && '*'}</label>
                  {f.type === 'textarea' ? (
                    <textarea rows={2} className="input-field resize-none" value={form[f.name] ?? ''} onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))} />
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      required={f.required}
                      className="input-field"
                      value={form[f.name] ?? ''}
                      onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Availability</label>
                <select className="input-field" value={availability} onChange={e => setAvailability(e.target.value as LuxuryItem['availability'])}>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                Published (visible on /luxury)
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
