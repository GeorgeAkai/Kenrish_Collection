import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Shared dialog frame for the analytics drill-downs: bottom sheet on phones, centred card on desktop. */
export default function ModalShell({ title, subtitle, onClose, children }: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px] sm:p-4"
      role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-[20px] shadow-2xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <h3 className="font-heading text-xl font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" autoFocus className="w-9 h-9 -mr-1 flex items-center justify-center rounded-full hover:bg-secondary"><X size={18} /></button>
        </div>
        <div className="overflow-auto p-5">{children}</div>
      </div>
    </div>
  )
}
