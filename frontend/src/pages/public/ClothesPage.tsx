import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/axios'
import CatalogueCard from '@/components/CatalogueCard'
import { useWishlist } from '@/hooks/useWishlist'
import type { Clothes, PaginatedResponse } from '@/lib/types'

export default function ClothesPage() {
  const [params, setParams] = useSearchParams()
  const page = parseInt(params.get('page') || '1')
  const [data, setData] = useState<PaginatedResponse<Clothes> | null>(null)
  const [loading, setLoading] = useState(true)
  const { isInWishlist, toggle } = useWishlist()

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    api.get(`/clothes/?page=${page}`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      {/* Page hero */}
      <section className="py-14 px-5 text-center bg-secondary/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">New This Season</p>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Clothing
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Elevated basics, statement pieces &amp; everything in between — styled for real life.
          </p>
          {data && <p className="text-xs text-muted-foreground mt-3">{data.count} items available</p>}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="product-card animate-pulse">
                <div className="aspect-[4/5] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded-full w-3/4" />
                  <div className="h-3 bg-muted rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="product-grid">
              {data?.results.map(c => (
                <CatalogueCard
                  key={c.id}
                  item={c}
                  href={`/clothes/${c.id}`}
                  inWishlist={isInWishlist('clothes', c.id)}
                  onWishlist={() => toggle('clothes', c.id)}
                />
              ))}
            </div>
            {data?.count === 0 && (
              <p className="text-center text-muted-foreground py-20">No clothes available yet.</p>
            )}
            {data && (data.next || data.previous) && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  disabled={!data.previous}
                  onClick={() => setParams({ page: String(page - 1) })}
                  className="btn-modern btn-modern--secondary"
                >
                  ← Previous
                </button>
                <span className="text-sm text-muted-foreground">Page {page}</span>
                <button
                  disabled={!data.next}
                  onClick={() => setParams({ page: String(page + 1) })}
                  className="btn-modern btn-modern--primary"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
