import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { formatDateTime } from '@/lib/utils'
import ModalShell from './ModalShell'

interface AuditEntry {
  id: number
  action: 'edit' | 'delete'
  actor_username: string
  created_at: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

const label = (key: string) => (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, ' ')
const show = (v: unknown) => (v === null || v === undefined || v === '' ? '(blank)' : String(v))

/** Who corrected or deleted a record, when, and the values before and after. Read-only, permanent trail. */
export default function AuditHistoryModal({ kind, objectRef, title, onClose }: {
  kind: string
  objectRef: number
  title: string
  onClose: () => void
}) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)

  useEffect(() => {
    api.get('/admin/audit/', { params: { kind, ref: objectRef } })
      .then(r => setEntries(r.data))
      .catch(() => setEntries([]))
  }, [kind, objectRef])

  return (
    <ModalShell title="Change history" subtitle={title} onClose={onClose}>
      {entries === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {entries?.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded.</p>}
      <ul className="space-y-3">
        {entries?.map(e => (
          <li key={e.id} className="text-sm border rounded-md p-3">
            <p className="font-medium">
              {e.action === 'delete' ? `Deleted by ${e.actor_username}` : `Edited by ${e.actor_username}`} · {formatDateTime(e.created_at)}
            </p>
            {e.action === 'edit' && e.before && e.after && Object.keys(e.after).filter(k => e.before![k] !== e.after![k]).map(k => (
              <p key={k} className="text-muted-foreground">{label(k)}: {show(e.before![k])} → {show(e.after![k])}</p>
            ))}
            {e.action === 'delete' && e.before && Object.entries(e.before).map(([k, v]) => (
              <p key={k} className="text-muted-foreground">{label(k)}: {show(v)}</p>
            ))}
          </li>
        ))}
      </ul>
    </ModalShell>
  )
}
