import { useState } from 'react'
import { AlertTriangle, Download, X } from 'lucide-react'
import api from '@/lib/axios'

interface Deleted { sales: number; service_sales: number; expenses: number; cash_flow: number }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Wipes every dashboard figure (product sales, service sales, expenses, cash flow).
 * Guarded by a typed confirmation because it can't be undone; "save a copy" downloads
 * a JSON snapshot first.
 */
export default function ResetDashboardModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState('')
  const [saveCopy, setSaveCopy] = useState(true)
  const [phase, setPhase] = useState<'confirm' | 'busy' | 'done' | 'failed'>('confirm')
  const [deleted, setDeleted] = useState<Deleted | null>(null)

  async function reset() {
    setPhase('busy')
    try {
      const { data } = await api.post('/admin/analytics/reset/', { save: saveCopy })
      if (saveCopy && data.snapshot) {
        const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kenrish-dashboard-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      setDeleted(data.deleted)
      setPhase('done')
    } catch {
      setPhase('failed')
    }
  }

  const ready = typed.trim().toUpperCase() === 'RESET'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] px-4" role="dialog" aria-modal="true" aria-label="Reset dashboard">
      <div className="bg-card border border-border rounded-[20px] p-6 w-full max-w-md shadow-2xl">
        {phase === 'confirm' && (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 text-danger">
                <AlertTriangle size={22} />
                <h3 className="font-heading text-xl font-semibold">Reset the dashboard?</h3>
              </div>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 -mr-2 flex items-center justify-center rounded-full hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              This permanently deletes <strong className="text-foreground">all product sales, service sales, expenses and cash-flow records</strong> for
              both Kenrish Beauty and Kenrish Fashion, so every chart and total starts from zero. It cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Products, services, clothes, stock levels, orders and reservations are <strong className="text-foreground">not</strong> touched.
            </p>
            <label className="flex items-center gap-2.5 text-sm mb-4 cursor-pointer">
              <input type="checkbox" checked={saveCopy} onChange={e => setSaveCopy(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
              <Download size={14} className="text-muted-foreground" /> Download a JSON copy first
            </label>
            <label className="block text-sm font-medium mb-1.5" htmlFor="reset-confirm">Type <span className="font-bold">RESET</span> to confirm</label>
            <input id="reset-confirm" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" autoFocus
              className="input-field mb-5" placeholder="RESET" />
            <div className="flex gap-3">
              <button onClick={reset} disabled={!ready}
                className="flex-1 h-11 rounded-full bg-danger text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                Reset dashboard
              </button>
              <button onClick={onClose} className="btn-modern btn-modern--secondary flex-1 text-sm">Cancel</button>
            </div>
          </>
        )}
        {phase === 'busy' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Resetting dashboard…</p>
          </div>
        )}
        {phase === 'done' && deleted && (
          <>
            <h3 className="font-heading text-xl font-semibold mb-2">Dashboard reset</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Cleared {plural(deleted.sales, 'product sale')}, {plural(deleted.service_sales, 'service sale')},{' '}
              {plural(deleted.expenses, 'expense')} and {plural(deleted.cash_flow, 'cash-flow record')}.
            </p>
            <button onClick={onDone} className="btn-modern btn-modern--primary w-full text-sm font-semibold">Close &amp; refresh</button>
          </>
        )}
        {phase === 'failed' && (
          <>
            <h3 className="font-heading text-xl font-semibold mb-2 text-danger">Reset failed</h3>
            <p className="text-sm text-muted-foreground mb-5">Nothing was deleted. Please try again.</p>
            <button onClick={() => setPhase('confirm')} className="btn-modern btn-modern--secondary w-full text-sm">Back</button>
          </>
        )}
      </div>
    </div>
  )
}
