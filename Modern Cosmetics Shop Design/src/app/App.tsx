import { useState } from "react";
import {
  Sun, Moon, ShoppingBag, Search, Menu, X,
  Star, ChevronRight, Scissors, Sparkles, Heart,
  Instagram, Twitter, Facebook, Phone, MapPin, Clock,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const allProducts = {
  beauty: [
    {
      name: "Rose Gold Glow Serum",
      price: "$89",
      originalPrice: "$110",
      rating: 4.9,
      reviews: 284,
      img: "https://images.unsplash.com/photo-1608979048467-6194dabc6a3d?w=400&h=500&fit=crop&auto=format",
      tag: "Bestseller",
      brand: "Lumière Lab",
    },
    {
      name: "Velvet Matte Collection",
      price: "$45",
      originalPrice: null,
      rating: 4.7,
      reviews: 412,
      img: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400&h=500&fit=crop&auto=format",
      tag: "New",
      brand: "Maison Beauty",
    },
    {
      name: "Luminous Foundation",
      price: "$62",
      originalPrice: null,
      rating: 4.8,
      reviews: 189,
      img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=500&fit=crop&auto=format",
      tag: null,
      brand: "Éclat Studio",
    },
    {
      name: "Artisan Brush Set",
      price: "$120",
      originalPrice: "$150",
      rating: 5.0,
      reviews: 97,
      img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=500&fit=crop&auto=format",
      tag: "Limited",
      brand: "Lumière Lab",
    },
  ],
  bags: [
    {
      name: "Cognac Leather Tote",
      price: "$345",
      originalPrice: null,
      rating: 4.9,
      reviews: 156,
      img: "https://images.unsplash.com/photo-1589363358751-ab05797e5629?w=400&h=500&fit=crop&auto=format",
      tag: "Exclusive",
      brand: "Atelier M",
    },
    {
      name: "Ivory Structured Clutch",
      price: "$210",
      originalPrice: null,
      rating: 4.8,
      reviews: 89,
      img: "https://images.unsplash.com/photo-1682745230951-8a5aa9a474a0?w=400&h=500&fit=crop&auto=format",
      tag: "New",
      brand: "Blanc Couture",
    },
    {
      name: "Pebbled Crossbody",
      price: "$275",
      originalPrice: "$320",
      rating: 4.7,
      reviews: 201,
      img: "https://images.unsplash.com/photo-1559563458-527698bf5295?w=400&h=500&fit=crop&auto=format",
      tag: null,
      brand: "Atelier M",
    },
    {
      name: "Scarlet Evening Bag",
      price: "$189",
      originalPrice: null,
      rating: 4.9,
      reviews: 63,
      img: "https://images.unsplash.com/photo-1591348278900-019a8a2a8b1d?w=400&h=500&fit=crop&auto=format",
      tag: "Trending",
      brand: "Rouge Collection",
    },
  ],
  clothing: [
    {
      name: "Curated Spring Edit",
      price: "$148",
      originalPrice: null,
      rating: 4.8,
      reviews: 312,
      img: "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=400&h=500&fit=crop&auto=format",
      tag: "New Season",
      brand: "Softest Stitch",
    },
    {
      name: "Elevated Basics Set",
      price: "$95",
      originalPrice: "$120",
      rating: 4.6,
      reviews: 445,
      img: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=400&h=500&fit=crop&auto=format",
      tag: null,
      brand: "Form Studio",
    },
    {
      name: "Boutique Essentials",
      price: "$210",
      originalPrice: null,
      rating: 4.9,
      reviews: 178,
      img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=500&fit=crop&auto=format",
      tag: "Curated",
      brand: "Maison Lumière",
    },
    {
      name: "Designer Capsule",
      price: "$380",
      originalPrice: "$450",
      rating: 5.0,
      reviews: 42,
      img: "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=400&h=500&fit=crop&auto=format",
      tag: "Premium",
      brand: "Atelier M",
    },
  ],
};

const services = [
  {
    title: "Master Barber Studio",
    subtitle: "Classic & Modern Cuts",
    description:
      "Precision cuts, hot towel shaves, beard sculpting, and signature grooming treatments delivered by our certified master barbers.",
    price: "From $45",
    duration: "45–90 min",
    img: "https://images.unsplash.com/photo-1635273051937-a0ddef9573b6?w=700&h=800&fit=crop&auto=format",
    slots: ["9:00 AM", "11:00 AM", "2:00 PM", "4:30 PM"],
    gradient: "from-violet-900/65 via-slate-900/40 to-transparent",
  },
  {
    title: "Hairstylist Salon",
    subtitle: "Color, Cut & Style",
    description:
      "Full-service hair artistry — cuts, balayage, color correction, keratin treatments, blowouts, and bridal styling.",
    price: "From $75",
    duration: "60–180 min",
    img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=700&h=800&fit=crop&auto=format",
    slots: ["10:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"],
    gradient: "from-fuchsia-900/65 via-violet-900/40 to-transparent",
  },
];

const testimonials = [
  {
    name: "Isabella Chen",
    role: "Regular Client since 2021",
    text: "Maison Lumière completely transformed my beauty routine. The team is exceptional — from the curated skincare to the barber who gave me the best cut of my life.",
    rating: 5,
    initials: "IC",
    color: "bg-fuchsia-400",
  },
  {
    name: "Marcus Fontaine",
    role: "Style Enthusiast",
    text: "The handbag selection is unlike anything else in the city. Every visit feels like discovering something rare. And the barber service? I've never felt so sharp.",
    rating: 5,
    initials: "MF",
    color: "bg-violet-500",
  },
  {
    name: "Sophia Williams",
    role: "Beauty Editor",
    text: "I've reviewed hundreds of boutiques for work. Maison Lumière stands apart — the product curation, the ambience, and the hairstylist services are all world-class.",
    rating: 5,
    initials: "SW",
    color: "bg-pink-400",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}
        />
      ))}
      <span className="text-[11px] text-muted-foreground ml-1">({count})</span>
    </div>
  );
}

function ProductCard({
  product,
  wishlisted,
  onWishlist,
}: {
  product: (typeof allProducts.beauty)[0];
  wishlisted: boolean;
  onWishlist: () => void;
}) {
  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-border
                 bg-card
                 dark:bg-white/[0.04] dark:border-white/10
                 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1
                 transition-all duration-300"
    >
      <div className="relative aspect-[4/5] bg-muted overflow-hidden">
        <img
          src={product.img}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {product.tag && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-semibold rounded-full shadow-md">
            {product.tag}
          </span>
        )}
        <button
          onClick={onWishlist}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/85 backdrop-blur-sm
                     flex items-center justify-center opacity-0 group-hover:opacity-100
                     transition-all duration-200 hover:scale-110 shadow-md"
        >
          <Heart
            size={14}
            className={wishlisted ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}
          />
        </button>
        <div
          className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0
                      opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <button
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium
                       rounded-xl hover:opacity-90 transition-opacity shadow-lg"
          >
            Add to Bag
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[11px] text-muted-foreground mb-0.5">{product.brand}</p>
        <h3 className="font-medium text-foreground text-sm leading-snug mb-1.5">{product.name}</h3>
        <StarRating rating={product.rating} count={product.reviews} />
        <div className="flex items-center gap-2 mt-2">
          <span className="font-semibold text-foreground">{product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">{product.originalPrice}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Category = "beauty" | "bags" | "clothing";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("beauty");
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");

  const toggleWishlist = (name: string) =>
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const categories: { key: Category; label: string }[] = [
    { key: "beauty", label: "Beauty" },
    { key: "bags", label: "Handbags" },
    { key: "clothing", label: "Clothing" },
  ];

  const navLinks = ["Beauty", "Handbags", "Clothing", "Services", "About"];

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">

        {/* ═══ NAVIGATION ═══════════════════════════════════════════════════ */}
        <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-lg transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <a href="#" className="font-display text-xl font-semibold tracking-tight shrink-0">
              <span className="text-primary">Maison</span>
              <span className="text-foreground"> Lumière</span>
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {l}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="hidden sm:flex text-muted-foreground hover:text-foreground transition-colors p-1.5">
                <Search size={18} />
              </button>
              <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5">
                <ShoppingBag size={18} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                  3
                </span>
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-8 h-8 rounded-full flex items-center justify-center
                           bg-secondary text-secondary-foreground
                           hover:bg-primary hover:text-primary-foreground
                           transition-all duration-300"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1.5"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {menuOpen && (
            <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl px-6 py-5 flex flex-col gap-4">
              {navLinks.map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l}
                </a>
              ))}
            </div>
          )}
        </nav>

        {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-amber-50">
          {/* BG image */}
          <img
            src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1800&h=1000&fit=crop&auto=format"
            alt="Luxury cosmetics flat-lay"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Overlay — warm cream left panel in light; deep obsidian in dark */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F9F6FB]/96 via-[#F9F6FB]/75 to-[#F9F6FB]/10
                          dark:from-[#08060E]/97 dark:via-[#08060E]/80 dark:to-[#08060E]/15" />

          {/* Dark mode prismatic shimmer */}
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-violet-950/55 via-transparent to-fuchsia-950/30 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 py-28 w-full">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-8
                              bg-primary/10 text-primary border border-primary/25">
                <Sparkles size={11} />
                New Spring Collection — Now Available
              </div>

              <h1 className="font-display text-6xl lg:text-[5.5rem] font-semibold leading-[1.05] mb-7 text-foreground">
                Beauty,<br />
                <em className="text-primary">Redefined.</em>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                Curated cosmetics, designer handbags, elevated fashion, and world-class grooming — all under one roof on Rue de Lumière.
              </p>

              <div className="flex flex-wrap gap-4 mb-14">
                <a
                  href="#beauty"
                  className="px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium
                             hover:opacity-90 transition-all duration-200 flex items-center gap-2
                             shadow-xl shadow-primary/30"
                >
                  Shop Now <ChevronRight size={15} />
                </a>
                <a
                  href="#services"
                  className="px-8 py-3.5 border border-border rounded-full font-medium
                             hover:bg-secondary transition-all duration-200
                             dark:border-white/20 dark:bg-white/5 dark:backdrop-blur-sm dark:hover:bg-white/10"
                >
                  Book a Service
                </a>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-10">
                {[
                  ["2,400+", "Products"],
                  ["98%", "Client Satisfaction"],
                  ["15+", "Services"],
                ].map(([val, label]) => (
                  <div key={label}>
                    <div className="font-display text-2xl font-semibold text-foreground">{val}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ BANNER STRIP ════════════════════════════════════════════════════ */}
        <div className="bg-primary text-primary-foreground py-3 px-6 overflow-hidden">
          <div className="flex items-center justify-center gap-8 text-sm font-medium flex-wrap">
            <span>✦ Free shipping on orders over $150</span>
            <span className="hidden sm:block">✦ Complimentary gift wrapping</span>
            <span className="hidden md:block">✦ Same-day service bookings available</span>
            <span>✦ Loyalty rewards with every purchase</span>
          </div>
        </div>

        {/* ═══ COLLECTIONS ═══════════════════════════════════════════════════ */}
        <section id="beauty" className="py-24 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                Curated For You
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
                Our Collections
              </h2>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                    ${
                      activeCategory === key
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-secondary text-secondary-foreground hover:bg-muted dark:bg-white/5 dark:text-foreground dark:border dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {allProducts[activeCategory].map((product) => (
              <ProductCard
                key={product.name}
                product={product}
                wishlisted={wishlist.has(product.name)}
                onWishlist={() => toggleWishlist(product.name)}
              />
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              className="inline-flex items-center gap-2 px-7 py-3 border border-border rounded-full
                         text-sm font-medium hover:bg-secondary transition-colors
                         dark:border-white/15 dark:hover:bg-white/5"
            >
              View All {categories.find((c) => c.key === activeCategory)?.label}
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* ═══ FEATURE STRIP ════════════════════════════════════════════════ */}
        <section className="py-12 border-y border-border">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "✦", title: "Authentic Luxury", desc: "Every product is 100% authentic, sourced directly from brands." },
              { icon: "✦", title: "Expert Stylists", desc: "Our team has 10+ years of combined luxury beauty experience." },
              { icon: "✦", title: "Same-Day Booking", desc: "Book grooming appointments and walk in the same day." },
              { icon: "✦", title: "Easy Returns", desc: "30-day hassle-free returns on all unopened products." },
            ].map((f) => (
              <div key={f.title} className="flex flex-col gap-2">
                <span className="text-primary text-lg">{f.icon}</span>
                <h4 className="font-semibold text-sm text-foreground">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SERVICES ══════════════════════════════════════════════════════ */}
        <section id="services" className="py-24 relative overflow-hidden">
          {/* Light mode: warm secondary ground */}
          <div className="absolute inset-0 bg-secondary dark:hidden" />
          {/* Dark mode: deep gradient */}
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-[#110A1C] via-[#08060E] to-[#1A0818]" />
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-tr from-violet-950/45 via-transparent to-fuchsia-950/30 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                Expert Care
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-semibold mb-4">
                Beauty Services
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                Award-winning stylists and barbers, available by appointment or walk-in.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {services.map((svc) => (
                <div
                  key={svc.title}
                  className="group rounded-3xl overflow-hidden border border-border
                             bg-card
                             dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-2xl
                             hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
                >
                  {/* Image */}
                  <div className="relative h-64 bg-muted overflow-hidden">
                    <img
                      src={svc.img}
                      alt={svc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${svc.gradient}`} />
                    <div className="absolute bottom-5 left-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                       bg-white/15 backdrop-blur-md text-white border border-white/20">
                        <Scissors size={11} />
                        {svc.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-7">
                    <h3 className="font-display text-2xl font-semibold mb-2">{svc.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">{svc.description}</p>

                    {/* Price + Duration */}
                    <div className="flex gap-3 mb-6">
                      {[
                        ["Starting at", svc.price],
                        ["Duration", svc.duration],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          className="flex-1 rounded-xl bg-secondary dark:bg-white/5 p-3.5 text-center"
                        >
                          <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
                          <div className="font-semibold text-foreground text-sm">{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Time slots */}
                    <div className="mb-7">
                      <div className="text-xs text-muted-foreground mb-2.5">Available today</div>
                      <div className="flex flex-wrap gap-2">
                        {svc.slots.map((slot) => (
                          <button
                            key={slot}
                            className="px-3.5 py-1.5 text-xs rounded-lg border border-border
                                       dark:border-white/10 hover:border-primary hover:text-primary
                                       transition-colors font-medium"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-medium
                                 hover:opacity-90 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-primary/20"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ EDITORIAL BANNER ═══════════════════════════════════════════════ */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div
            className="relative rounded-3xl overflow-hidden min-h-[380px] flex items-center bg-amber-900"
            style={{
              background: darkMode
                ? "linear-gradient(135deg, #110A1C 0%, #08060E 40%, #180A16 100%)"
                : undefined,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1400&h=700&fit=crop&auto=format"
              alt="Clothing boutique interior"
              className="absolute inset-0 w-full h-full object-cover opacity-40 dark:opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1220]/90 via-[#1A1220]/60 to-transparent dark:from-[#08060E]/95 dark:via-[#08060E]/70 dark:to-transparent" />
            {darkMode && (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-fuchsia-900/20 pointer-events-none" />
            )}

            <div className="relative px-10 md:px-16 py-16 max-w-lg">
              <p className="text-xs font-semibold text-primary mb-3 tracking-[0.18em] uppercase">
                New This Season
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-semibold text-white leading-tight mb-5">
                The Art of Getting Dressed
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-8">
                Our spring clothing edit — elevated basics, statement pieces, and everything in between. Styled for real life, designed to last.
              </p>
              <button
                id="clothing"
                onClick={() => setActiveCategory("clothing")}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-foreground rounded-full
                           font-medium text-sm hover:opacity-90 transition-opacity shadow-xl"
              >
                Explore Clothing <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS ════════════════════════════════════════════════════ */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-muted/40 dark:bg-transparent" />
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-b from-[#08060E] via-[#100818] to-[#08060E]" />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-primary mb-2.5 tracking-[0.18em] uppercase">
                Client Love
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-semibold">What They Say</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl p-7 border border-border bg-card
                             dark:bg-white/[0.04] dark:backdrop-blur-xl dark:border-white/10
                             hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1
                             transition-all duration-300"
                >
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center
                                  text-white text-xs font-bold shrink-0`}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ NEWSLETTER ════════════════════════════════════════════════════ */}
        <section className="py-12 px-6">
          <div
            className="max-w-2xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
            style={{
              background: darkMode
                ? "linear-gradient(135deg, rgba(90,20,80,0.55) 0%, rgba(35,12,55,0.80) 50%, rgba(130,30,100,0.50) 100%)"
                : "linear-gradient(135deg, #7C3060 0%, #A85090 55%, #D4A8C8 100%)",
            }}
          >
            {/* Glass border in dark mode */}
            {darkMode && (
              <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />
            )}
            {darkMode && (
              <div className="absolute inset-0 backdrop-blur-3xl pointer-events-none" />
            )}

            <div className="relative">
              <Sparkles
                size={28}
                className="mx-auto mb-4 opacity-80"
                style={{ color: darkMode ? "#D48EC0" : "rgba(255,255,255,0.9)" }}
              />
              <h2
                className="font-display text-3xl font-semibold mb-3"
                style={{ color: darkMode ? "#F2EEF8" : "#fff" }}
              >
                Join the Inner Circle
              </h2>
              <p className="text-sm mb-8 max-w-xs mx-auto leading-relaxed"
                 style={{ color: darkMode ? "rgba(242,238,248,0.62)" : "rgba(255,255,255,0.82)" }}>
                First access to new arrivals, exclusive beauty events, and member-only offers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-5 py-3 rounded-full text-sm
                             bg-white/20 border border-white/30 backdrop-blur-sm
                             placeholder:text-white/55 focus:outline-none focus:ring-2 focus:ring-white/40"
                  style={{ color: darkMode ? "#F2EEF8" : "#fff" }}
                />
                <button
                  className="px-7 py-3 rounded-full font-medium text-sm whitespace-nowrap
                             hover:opacity-90 transition-opacity shadow-lg"
                  style={{
                    background: darkMode ? "#D48EC0" : "#fff",
                    color: darkMode ? "#1A0520" : "#7C3060",
                  }}
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ════════════════════════════════════════════════════════ */}
        <footer className="border-t border-border mt-8 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
              {/* Brand column */}
              <div className="col-span-2 md:col-span-2">
                <div className="font-display text-xl font-semibold mb-3">
                  <span className="text-primary">Maison</span> Lumière
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-[220px]">
                  Luxury beauty, fashion, and grooming since 2018. Located on Rue de Lumière, Paris.
                </p>
                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><MapPin size={12} className="text-primary" /> 12 Rue de Lumière, Paris 75008</span>
                  <span className="flex items-center gap-2"><Phone size={12} className="text-primary" /> +33 1 42 68 90 12</span>
                  <span className="flex items-center gap-2"><Clock size={12} className="text-primary" /> Mon–Sat 9am–8pm · Sun 11am–6pm</span>
                </div>
              </div>

              {/* Link columns */}
              {[
                {
                  title: "Shop",
                  links: ["Beauty Products", "Handbags", "Clothing", "Gift Sets", "New Arrivals"],
                },
                {
                  title: "Services",
                  links: ["Barber Studio", "Hairstylist", "Makeup Artist", "Nail Care", "Consultations"],
                },
                {
                  title: "Company",
                  links: ["About Us", "Careers", "Press", "Sustainability", "Contact"],
                },
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="font-semibold text-sm mb-4 text-foreground tracking-wide">{col.title}</h4>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border dark:border-white/10">
              <p className="text-xs text-muted-foreground">© 2025 Maison Lumière. All rights reserved.</p>

              {/* Social icons */}
              <div className="flex items-center gap-5">
                {[Instagram, Twitter, Facebook].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>

              <div className="flex gap-5 text-xs text-muted-foreground">
                {["Privacy", "Terms", "Cookies"].map((l) => (
                  <a key={l} href="#" className="hover:text-foreground transition-colors">
                    {l}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
