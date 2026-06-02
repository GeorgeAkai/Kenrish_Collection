import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/axios'
import CatalogueCard from '@/components/CatalogueCard'
import { useWishlist } from '@/hooks/useWishlist'
import type { Handbag, PaginatedResponse } from '@/lib/types'

export default function HandbagsPage() {
  const [params, setParams] = useSearchParams()
  const page = parseInt(params.get('page') || '1')
  const [data, setData] = useState<PaginatedResponse<Handbag> | null>(null)
  const [loading, setLoading] = useState(true)
  const { isInWishlist, toggle } = useWishlist()

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    api.get(`/handbags/?page=${page}`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [page])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="section-heading">Handbags</h1>
        {data && <p className="text-sm text-muted-foreground mt-1">{data.count} items</p>}
      </div>

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse border border-border">
              <div className="h-[250px] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="product-grid">
            {data?.results.map(h => (
              <CatalogueCard key={h.id} item={h} href={`/handbags/${h.id}`}
                inWishlist={isInWishlist('handbags', h.id)} onWishlist={() => toggle('handbags', h.id)} />
            ))}
          </div>
          {data?.count === 0 && <p className="text-center text-muted-foreground py-20">No handbags available yet.</p>}
          {data && (data.next || data.previous) && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <button disabled={!data.previous} onClick={() => setParams({ page: String(page - 1) })}
                className="btn-modern">← Prev</button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <button disabled={!data.next} onClick={() => setParams({ page: String(page + 1) })}
                className="btn-modern">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
