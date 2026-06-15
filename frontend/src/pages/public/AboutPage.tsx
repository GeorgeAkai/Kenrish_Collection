import { Sparkles, MapPin, Clock, Phone, Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <div>
      {/* Hero */}
      <section
        className="relative py-24 px-4 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C3060 0%, #9B3D78 50%, #A85090 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-6">
            <Sparkles size={26} className="text-white" />
          </div>
          <h1
            className="text-4xl lg:text-5xl font-bold mb-4 text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('about.title')}
          </h1>
          <p className="text-white/70 leading-relaxed text-base">
            {t('about.subtitle')}
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-5 py-16">
        <div className="space-y-5 text-muted-foreground leading-relaxed">
          <p
            className="text-lg text-foreground font-medium"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('about.p1')}
          </p>
          <p>{t('about.p2')}</p>
          <p>{t('about.p3')}</p>
        </div>

        {/* Values strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Star,     labelKey: 'about.v1Label', descKey: 'about.v1Desc' },
            { icon: Heart,    labelKey: 'about.v2Label', descKey: 'about.v2Desc' },
            { icon: Sparkles, labelKey: 'about.v3Label', descKey: 'about.v3Desc' },
          ].map(({ icon: Icon, labelKey, descKey }) => (
            <div key={labelKey} className="flex flex-col gap-2 p-5 rounded-2xl bg-secondary/50 border border-border">
              <Icon size={20} className="text-primary" />
              <p className="font-semibold text-sm text-foreground">{t(labelKey)}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Info cards */}
      <section className="bg-muted/40 py-12 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: MapPin, titleKey: 'about.locationLabel', detail: 'Shabaab, Nakuru, Kenya', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' },
            { icon: Clock,  titleKey: 'about.hoursLabel',   detail: t('about.hoursDetail'),   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
            { icon: Phone,  titleKey: 'about.contactLabel', detail: '0708 440390', href: 'tel:+254708440390', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
          ].map(({ icon: Icon, titleKey, detail, color, href }) => (
            <div key={titleKey} className="bg-background rounded-2xl p-6 text-center border card-hover">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-4`}>
                <Icon size={22} />
              </div>
              <h3 className="font-semibold mb-1">{t(titleKey)}</h3>
              {href
                ? <a href={href} className="text-sm text-primary hover:underline">{detail}</a>
                : <p className="text-sm text-muted-foreground">{detail}</p>
              }
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t('about.ctaTitle')}
          </h2>
          <p className="text-muted-foreground mb-7 text-sm leading-relaxed">
            {t('about.ctaDesc')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="tel:+254708440390" className="btn-primary">
              {t('about.callBtn')}
            </a>
            <Link to="/reservation" className="btn-outline">
              {t('about.bookBtn')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
