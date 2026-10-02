import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PriceRangeHint from './PriceRangeHint'

describe('PriceRangeHint', () => {
  it('renders nothing for a single-price item', () => {
    const { container } = render(<PriceRangeHint price="500" maxPrice={null} unitPrice="500" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the range with no warning while the price is inside it', () => {
    render(<PriceRangeHint price="800" maxPrice="1500" unitPrice="1000" />)
    expect(screen.getByText(/KES 800\.00 – 1,500\.00/)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('warns, without blocking, when the price is outside the range', () => {
    const { rerender } = render(<PriceRangeHint price="800" maxPrice="1500" unitPrice="400" />)
    expect(screen.getByRole('status')).toHaveTextContent(/outside the usual range/i)
    rerender(<PriceRangeHint price="800" maxPrice="1500" unitPrice="2500" />)
    expect(screen.getByRole('status')).toHaveTextContent(/outside the usual range/i)
  })

  it('does not warn while the price field is empty', () => {
    render(<PriceRangeHint price="800" maxPrice="1500" unitPrice="" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
