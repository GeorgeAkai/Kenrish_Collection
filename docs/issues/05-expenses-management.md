# 05 Expenses management

Type: AFK

## What to build

An Expenses page in each shop (`/admin/beauty/expenses`, `/admin/fashion/expenses`) for recording purchases and running costs. The existing `Expense` model is extended with `date_purchased`, a `kind` (one-off, fixed recurring or variable recurring), a note, and a fixed category list: Beauty Products, Fashion (Clothes), Fashion (Handbags), Rent, Electricity, Water, Equipment, Salaries and Other. A bale is entered as one expense at its total price. Each expense is tagged Beauty, Fashion or Shared, with the page's shop as the default.

Recurring templates, such as "Monthly Rent, Ksh X, Shared", post automatically on the 1st of each month for fixed amounts. Variable templates, such as electricity, create a pending entry with no amount and show "awaiting amount" until the admin fills it in. Posting runs when an admin opens the Expenses or Employees page, or the dashboard, and is safe to run twice without duplicates. Edits and deletes are written to `ActivityLog`. The Executive dashboard has an "All shops" view that includes Shared items.

## Acceptance criteria

- [ ] Admin can add, edit and delete an expense with all the fields above
- [ ] Existing expenses keep working, with their category mapped or kept as Other
- [ ] Beauty and Fashion pages show their shop's expenses, and the Executive view shows all, including Shared
- [ ] Fixed recurring templates post once per month and never duplicate when posting runs repeatedly
- [ ] Variable templates create a pending entry that stays out of totals until an amount is entered
- [ ] Edits and deletes are logged with actor and before/after values
- [ ] Per-shop analytics and profit figures include the new expenses correctly
- [ ] Tests cover idempotent posting, pending entries, shop attribution and the audit log

## Blocked by

None - can start immediately
