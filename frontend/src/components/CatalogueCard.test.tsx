import { render, screen } from '@testing-library/react'
import { type ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '@/contexts/LanguageContext'
import CatalogueCard from './CatalogueCard'

const itemNoImage = {
  id: 1,
  name: 'Dr. Rashel Vitamin C Serum',
  price: '1500.00',
  image: null,
  average_rating: 0,
  stock_quantity: 0,
}

const itemWithImage = {
  id: 2,
  name: 'Luxury Handbag',
  price: '3500.00',
  image: 'https://example.com/bag.jpg',
  average_rating: 4.5,
  stock_quantity: 10,
}

function renderCard(
  item: typeof itemNoImage,
  lang: 'en' | 'sw' = 'en',
  props: Partial<ComponentProps<typeof CatalogueCard>> = {}
) {
  localStorage.setItem('kenrish-lang', lang)
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CatalogueCard item={item} href="/products/1" {...props} />
      </LanguageProvider>
    </MemoryRouter>
  )
}

afterEach(() => localStorage.clear())

describe('CatalogueCard', () => {
  // ── Tracer bullet ───────────────────────────────────────────────────
  it('renders the item name', () => {
    renderCard(itemNoImage)
    expect(screen.getByText('Dr. Rashel Vitamin C Serum')).toBeInTheDocument()
  })

  it('renders the formatted price', () => {
    renderCard(itemNoImage)
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
  })

  // ── English strings (should already pass) ──────────────────────────
  it('shows "No image" placeholder in English when image is null', () => {
    renderCard(itemNoImage, 'en')
    expect(screen.getByText('No image')).toBeInTheDocument()
  })

  it('shows "Sold out" badge in English when stock is 0', () => {
    renderCard(itemNoImage, 'en')
    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  it('shows "View Details" hover bar in English', () => {
    renderCard(itemNoImage, 'en')
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  // ── Swahili strings (RED — CatalogueCard currently ignores lang) ───
  it('shows "Hakuna picha" in Swahili when image is null', () => {
    renderCard(itemNoImage, 'sw')
    expect(screen.getByText('Hakuna picha')).toBeInTheDocument()
  })

  it('shows "Imeisha" badge in Swahili when stock is 0', () => {
    renderCard(itemNoImage, 'sw')
    expect(screen.getByText('Imeisha')).toBeInTheDocument()
  })

  it('shows "Angalia Maelezo" hover bar in Swahili', () => {
    renderCard(itemNoImage, 'sw')
    expect(screen.getByText('Angalia Maelezo')).toBeInTheDocument()
  })

  // ── Wishlist heart always present in DOM ───────────────────────────
  it('renders wishlist button when onWishlist prop is provided', () => {
    renderCard(itemNoImage, 'en', { onWishlist: () => {} })
    expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument()
  })

  it('shows "Remove from wishlist" aria-label when item is in wishlist', () => {
    renderCard(itemNoImage, 'en', { onWishlist: () => {}, inWishlist: true })
    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument()
  })

  // ── No wishlist button when no handler ────────────────────────────
  it('does not render wishlist button when onWishlist is not provided', () => {
    renderCard(itemWithImage, 'en')
    expect(screen.queryByRole('button', { name: /wishlist/i })).not.toBeInTheDocument()
  })
})
