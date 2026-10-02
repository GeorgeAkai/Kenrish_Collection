# 04 Fashion price ranges

Type: AFK

## What to build

Clothes and Handbags can have an optional price range (`min_price`, `max_price`) so each piece in a bale can be sold at a different price. The admin form accepts the range. The storefront shows "Ksh 800 to 1,500" on the detail page and a "from" price in lists. Items with no range behave as today. Online orders use the minimum price. In Record Sale the unit price starts at the minimum and stays editable. Selling outside the range is allowed, with a small "outside range" notice and no block.

## Acceptance criteria

- [ ] Admin can set, change and clear a range on clothes and handbags, and the minimum cannot exceed the maximum
- [ ] The storefront shows a range on the detail page and a "from" price in listings, and single-price items are unchanged
- [ ] Online orders and the cart use the minimum price
- [ ] Record Sale defaults the price to the minimum and allows any price
- [ ] An out-of-range price shows a notice but is saved without error
- [ ] Existing items and APIs keep working with no range set
- [ ] Tests cover range validation, the default price and out-of-range sales

## Blocked by

None - can start immediately. Sequence it after 02 and 03 to avoid merge conflicts in the Record Sale form.
