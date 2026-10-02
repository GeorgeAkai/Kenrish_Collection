# 01 Customer identity on sales

Type: AFK

## What to build

Every product sale and service sale that includes a customer phone is linked to one customer record. Phones are normalized to `+2547XXXXXXXX`, so `0712…`, `712…` and `+254712…` match. If a registered user has that phone on their profile, the sale links to them. Otherwise a "Customer not in App" record is found or created, keyed by the normalized phone. If that person later registers with the number, the walk-in history merges into their account. A sale with no phone stays anonymous and creates no customer. Existing sales are backfilled.

## Acceptance criteria

- [ ] Phone normalization handles `07…`, `7…`, `+254…` and `254…` forms, and rejects invalid input without failing the sale
- [ ] Recording a product or service sale with a phone links it to a registered user, or to a walk-in customer flagged "not in app"
- [ ] A sale with no phone is saved with no customer link
- [ ] Registering a user with a walk-in's phone merges that customer's sales into the account
- [ ] A backfill migration or command links existing sales and is safe to run twice
- [ ] Phone numbers are never exposed through public API endpoints
- [ ] Tests cover matching, walk-in creation, anonymous sales and the merge

## Blocked by

None - can start immediately
