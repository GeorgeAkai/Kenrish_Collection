import { useEffect, useState } from 'react'
import { Heart, Play } from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import { isVideoUrl } from '@/lib/utils'
import type { GalleryImage } from '@/lib/types'

type GalleryTab = 'all' | 'hairdressing' | 'barber' | 'nails'

const TABS: { key: GalleryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hairdressing', label: 'Hairdressing' },
  { key: 'barber', label: 'Cuts' },
  { key: 'nails', label: 'Nails' },
]

const NAILS_SERVICES = ['nails', 'manicure', 'pedicure']

export default function GalleryPage() {
  const { isAuthenticated } = useAuth()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)
  const [activeTab, setActiveTab] = useState<GalleryTab>('all')

  useEffect(() => {
    api.get('/gallery/').then(r => setImages(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function toggleLike(id: number) {
    if (!isAuthenticated) { window.location.href = '/login'; return }
    setLiking(id)
    try {
      const { data } = await api.post(`/gallery/${id}/like/`)
      setImages(imgs => imgs.map(img => img.id === id
        ? { ...img, user_has_liked: data.liked, like_count: data.like_count }
        : img
      ))
      if (lightbox?.id === id) {
        setLightbox(prev => prev ? { ...prev, user_has_liked: data.liked, like_count: data.like_count } : null)
      }
    } finally {
      setLiking(null)
    }
  }

  const filtered = activeTab === 'all'
    ? images
    : activeTab === 'nails'
      ? images.filter(img => NAILS_SERVICES.includes(img.service ?? ''))
      : images.filter(img => img.service === activeTab)

  return (
    <div>
      {/* Page hero */}
      <section className="py-14 px-5 text-center bg-secondary/40">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">Visual Stories</p>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Gallery
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Our work &amp; collection, beautifully captured
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Category tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border hover:bg-muted text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="break-inside-avoid animate-pulse bg-muted rounded-2xl" style={{ height: `${180 + (i % 3) * 60}px` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No {activeTab === 'all' ? 'gallery' : TABS.find(t => t.key === activeTab)?.label.toLowerCase()} items yet.</p>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className="break-inside-avoid group relative overflow-hidden rounded-2xl cursor-pointer card-soft"
                onClick={() => setLightbox(item)}
              >
                {isVideoUrl(item.file, item.is_video) ? (
                  <>
                    <video
                      src={item.file}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-black/70 transition-colors">
                        <Play size={18} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.file}
                    alt={item.description || 'Gallery image'}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center justify-between">
                      {item.description && (
                        <p className="text-white text-xs line-clamp-1 flex-1 mr-2">{item.description}</p>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); toggleLike(item.id) }}
                        disabled={liking === item.id}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${
                          item.user_has_liked
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
                        }`}
                      >
                        <Heart size={12} fill={item.user_has_liked ? 'currentColor' : 'none'} />
                        {item.like_count}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
            <div className="max-w-3xl max-h-full" onClick={e => e.stopPropagation()}>
              {lightbox.is_video ? (
                <video
                  src={lightbox.file}
                  controls
                  autoPlay
                  className="max-h-[80vh] w-auto rounded-xl"
                />
              ) : (
                <img
                  src={lightbox.file}
                  alt={lightbox.description || ''}
                  className="max-h-[80vh] w-auto object-contain rounded-xl"
                />
              )}
              <div className="mt-3 flex items-center justify-between px-1">
                {lightbox.description && <p className="text-white/80 text-sm">{lightbox.description}</p>}
                <button
                  onClick={() => toggleLike(lightbox.id)}
                  disabled={liking === lightbox.id}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ml-auto ${
                    lightbox.user_has_liked
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <Heart size={14} fill={lightbox.user_has_liked ? 'currentColor' : 'none'} />
                  {lightbox.like_count}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
