import { useEffect, useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { formatKES } from '@/lib/utils'
import type { Service } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import FileDropZone from '@/components/admin/FileDropZone'

function formatPriceRange(s: Service) {
  if (!s.price_from) return s.price ? formatKES(s.price) : 'Price on request'
  if (!s.price_to) return `From ${formatKES(s.price_from)}`
  return `${formatKES(s.price_from)} – ${formatKES(s.price_to)}`
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const del = useConfirm<number>()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState({ name: '', short_description: '', full_description: '', price_from: '', price_to: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchServices = () => {
    api.get('/admin/services/').then(r => setServices(r.data.results ?? r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchServices() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', short_description: '', full_description: '', price_from: '', price_to: '' })
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name,
      short_description: s.short_description,
      full_description: s.full_description,
      price_from: s.price_from ?? s.price ?? '',
      price_to: s.price_to ?? '',
    })
    setImageFile(null)
    setError('')
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    del.cancel()
    await api.delete(`/admin/services/${id}/`)
    fetchServices()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('short_description', form.short_description)
      fd.append('full_description', form.full_description)
      if (form.price_from) fd.append('price_from', form.price_from)
      if (form.price_to) fd.append('price_to', form.price_to)
      if (imageFile) fd.append('image', imageFile)
      if (editing) await api.patch(`/admin/services/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      else await api.post('/admin/services/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowForm(false)
      fetchServices()
    } catch {
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Services</h2>
        <button onClick={openCreate} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">+ Add Service</button>
      </div>

      {loading ? <div className="text-center py-10 text-muted-foreground">Loading…</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="border rounded-lg overflow-hidden">
              {s.image && <img src={s.image} alt={s.name} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-primary font-bold mt-1 text-sm">{formatPriceRange(s)}</p>
                <p className="text-xs text-muted-foreground">Price range</p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.short_description}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(s)} className="text-xs px-3 py-1.5 border rounded hover:bg-muted">Edit</button>
                  {del.isAsking(s.id) ? (
                    <InlineConfirm onConfirm={() => handleDelete(s.id)} onCancel={del.cancel} />
                  ) : (
                    <button onClick={() => del.ask(s.id)} className="text-xs px-3 py-1.5 border rounded text-red-500 hover:bg-red-50">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="text-muted-foreground col-span-3 py-10 text-center">No services yet.</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Service</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" required
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Description</label>
                <input type="text" required
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} />
              </div>

              {/* Price range */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-0.5">Price Range (KES)</p>
                  <p className="text-xs text-muted-foreground">Set a range so customers understand the price varies by complexity or duration. Leave "up to" blank if you only want a starting price.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">From</label>
                    <input type="number" step="any" min="0" placeholder="e.g. 500"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.price_from} onChange={e => setForm(f => ({ ...f, price_from: e.target.value }))} />
                  </div>
                  <div className="flex items-end pb-2 text-muted-foreground text-sm">–</div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">Up to (optional)</label>
                    <input type="number" step="any" min="0" placeholder="e.g. 2000"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.price_to} onChange={e => setForm(f => ({ ...f, price_to: e.target.value }))} />
                  </div>
                </div>
                {(form.price_from || form.price_to) && (
                  <p className="text-xs text-primary font-medium">
                    Preview: {
                      form.price_from && form.price_to
                        ? `KES ${Number(form.price_from).toLocaleString()} – KES ${Number(form.price_to).toLocaleString()}`
                        : form.price_from
                        ? `From KES ${Number(form.price_from).toLocaleString()}`
                        : ''
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Description</label>
                <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.full_description} onChange={e => setForm(f => ({ ...f, full_description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Image</label>
                <FileDropZone
                  file={imageFile}
                  onFileChange={setImageFile}
                  currentUrl={editing?.image ?? null}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border rounded-md py-2 text-sm hover:bg-muted">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
