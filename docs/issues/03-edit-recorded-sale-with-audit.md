# 03 Edit a recorded sale, with audit

Type: AFK

## What to build

From Sales History the admin can correct a recorded sale's quantity, unit price and customer name/phone. The item cannot be changed. A wrong item means void and re-record. Each edit runs in one transaction: stock is adjusted by the quantity difference, the linked revenue `CashFlow` row is updated to the new total, and an `ActivityLog` entry records who edited, when, and the before and after values. The sale shows an "edited" badge and a per-sale edit history. An edit never double-adjusts stock, and it never creates an `InventoryTransaction` of type SALE.

## Acceptance criteria

- [ ] Editing quantity up or down adjusts stock by the difference, and an edit that would take stock below zero is rejected with a clear message
- [ ] Editing price or quantity updates the linked `CashFlow` revenue to the new total
- [ ] If the customer phone changes, the sale is re-linked to the matching customer (once issue 01 exists)
- [ ] Every edit writes an `ActivityLog` entry with actor, timestamp and before/after values
- [ ] The history table shows an "edited" badge and the edit history for that sale
- [ ] The edit is atomic: a failure leaves stock, `CashFlow` and the sale unchanged
- [ ] Item cannot be changed through the UI or the API
- [ ] Tests cover increase, decrease, price change, insufficient stock and rollback

## Blocked by

None - can start immediately. Sequence it after 01 to avoid merge conflicts in the sale code.
