import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import AnalyticsView from '@/components/admin/AnalyticsView'
import ResetDashboardModal from '@/components/admin/ResetDashboardModal'

/** Combined view of Kenrish Beauty and Kenrish Fashion. */
export default function AdminExecutiveDashboardPage() {
  const [resetOpen, setResetOpen] = useState(false)
  // Bumping the key remounts the view so it refetches after a reset.
  const [version, setVersion] = useState(0)

  return (
    <>
      <AnalyticsView
        key={version}
        scope="all"
        title="Executive overview"
        actions={
          <button onClick={() => setResetOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-danger/40 text-danger text-sm font-semibold hover:bg-danger-tint transition-colors">
            <RotateCcw size={14} /> Reset dashboard
          </button>
        }
      />
      {resetOpen && (
        <ResetDashboardModal
          onClose={() => setResetOpen(false)}
          onDone={() => { setResetOpen(false); setVersion(v => v + 1) }}
        />
      )}
    </>
  )
}
