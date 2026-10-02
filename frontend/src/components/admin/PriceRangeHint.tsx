import { formatPriceRange } from '@/lib/utils'

/** Shows an item's selling range under the price field. Selling outside it is allowed (demand and supply
 *  decide), so this only flags it. */
export default function PriceRangeHint({ price, maxPrice, unitPrice }: {
  price: string
  maxPrice?: string | null
  unitPrice: string
}) {
  const low = Number(price)
  const high = maxPrice == null || maxPrice === '' ? null : Number(maxPrice)
  if (high === null || high <= low) return null

  const entered = unitPrice === '' ? null : Number(unitPrice)
  const outside = entered !== null && !Number.isNaN(entered) && (entered < low || entered > high)

  return (
    <div className="mt-1 text-xs">
      <p className="text-muted-foreground">Usual range: {formatPriceRange(price, maxPrice)}</p>
      {outside && (
        <p role="status" className="text-amber-700">Outside the usual range. You can still record this price.</p>
      )}
    </div>
  )
}
