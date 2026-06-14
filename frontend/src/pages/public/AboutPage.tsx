import { Sparkles, MapPin, Clock, Phone, Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section
        className="relative py-24 px-4 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C3060 0%, #9B3D78 50%, #A85090 100%)' }}
      >
        {/* Decorative circles */}
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
            About Kenrish Collection
          </h1>
          <p className="text-white/70 leading-relaxed text-base">
            Where fashion meets beauty in the heart of Nakuru, Kenya
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
            Kenrish Collection is a premium fashion and cosmetics boutique located in Shabaab, Nakuru, Kenya.
          </p>
          <p>
            We are dedicated to bringing you the latest trends in fashion, handbags, and beauty products at
            affordable prices. Our curated collection features handpicked items that reflect both modern style
            and timeless elegance.
          </p>
          <p>
            Whether you're looking for the perfect outfit, a statement handbag, or quality cosmetics, Kenrish
            Collection has something for every woman. We take pride in offering exceptional customer service
            and a personalized shopping experience.
          </p>
        </div>

        {/* Values strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Star, label: 'Curated Quality', desc: 'Every product is hand-selected for quality and style.' },
            { icon: Heart, label: 'Client First', desc: 'Personalized service and expert advice, always.' },
            { icon: Sparkles, label: 'Authentic Only', desc: '100% genuine products sourced from trusted suppliers.' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col gap-2 p-5 rounded-2xl bg-secondary/50 border border-border">
              <Icon size={20} className="text-primary" />
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Info cards */}
      <section className="bg-muted/40 py-12 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: MapPin, title: 'Location', detail: 'Shabaab, Nakuru, Kenya', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' },
            { icon: Clock, title: 'Hours', detail: 'Mon–Sat: 8AM–8PM', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
            { icon: Phone, title: 'Contact', detail: '0708 440390', href: 'tel:+254708440390', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
          ].map(({ icon: Icon, title, detail, color, href }) => (
            <div key={title} className="bg-background rounded-2xl p-6 text-center border card-hover">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-4`}>
                <Icon size={22} />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
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
            Come Visit Us
          </h2>
          <p className="text-muted-foreground mb-7 text-sm leading-relaxed">
            Experience our collection in person. Our team is ready to help you find your perfect look.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="tel:+254708440390" className="btn-primary">
              📞 Call 0708 440390
            </a>
            <Link to="/reservation" className="btn-outline">
              Book an Appointment
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
