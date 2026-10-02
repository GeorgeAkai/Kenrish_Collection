import { useState, type FormEvent } from 'react'
import api from '@/lib/axios'
import { useAdminQuery, useInvalidateAdmin } from '@/lib/adminQuery'
import { formatKES } from '@/lib/utils'
import type { Offer } from '@/lib/types'
import InlineConfirm from '@/components/InlineConfirm'
import { useConfirm } from '@/hooks/useConfirm'
import FileDropZone from '@/components/admin/FileDropZone'

export default function AdminOffersPage() {
  const del = useConfirm<number>()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', offer_price: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Remembered between visits; `fetch()` after a save refreshes it everywhere.
  const list = useAdminQuery<{ results?: Offer[] } & Offer[], Offer[]>('/admin/offers/', { select: r => r.results ?? r })
  const offers = list.data ?? []
  const loading = list.isPending
  const fetch = useInvalidateAdmin()

  async function handleDelete(id: number) {
    del.cancel()
    await api.delete(`/admin/offers/${id}/`)
    fetch()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (imageFile) fd.append('image', imageFile)
      await api.post('/admin/offers/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowForm(false)
      setForm({ name: '', description: '', offer_price: '' })
      setImageFile(null)
      fetch()
    } catch {
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Offers</h2>
        <button onClick={() => { setShowForm(true); setError('') }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
          + Add Offer
        </button>
      </div>

      {loading ? <div className="text-center py-10 text-muted-foreground">Loading…</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map(offer => (
            <div key={offer.id} className="border rounded-lg overflow-hidden">
              {offer.image && <img src={offer.image} alt={offer.name} className="w-full h-40 object-cover" />}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{offer.name}</h3>
                  <span className="text-amber-500 font-bold">{formatKES(offer.offer_price)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                <div className="flex gap-2 mt-3">
                  {del.isAsking(offer.id) ? (
                    <InlineConfirm onConfirm={() => handleDelete(offer.id)} onCancel={del.cancel} />
                  ) : (
                    <button onClick={() => del.ask(offer.id)} className="text-xs px-3 py-1.5 border rounded text-red-500 hover:bg-red-50">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <p className="text-muted-foreground col-span-3 py-10 text-center">No offers yet.</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Add Offer</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name <span className="text-danger" aria-hidden="true">*</span></label>
                <input type="text" required className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description <span className="text-danger" aria-hidden="true">*</span></label>
                <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Offer price (KES) <span className="text-danger" aria-hidden="true">*</span></label>
                <input type="number" required min="0" step="any" className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.offer_price} onChange={e => setForm(f => ({ ...f, offer_price: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Image <span className="text-danger" aria-hidden="true">*</span></label>
                <FileDropZone file={imageFile} onFileChange={setImageFile} />
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
