# 08 Customer profile dashboard

Type: AFK

## What to build

Clicking a customer opens a profile dashboard with metric tiles (total spend, purchases, last purchase, logins and last seen), a spend-over-time chart, and tabs for activity, wishlist and contact details. The activity tab is one timeline of sales, services, reservations, orders and reviews. The admin can edit a customer's name or phone inline, and the edit is logged. Walk-in customers get the same profile, without login or wishlist data. The logins tile shows the count and the date tracking began once issue 09 exists, and "not tracked yet" until then.

## Acceptance criteria

- [ ] The profile shows all metric tiles with correct values for registered and walk-in customers
- [ ] The spend chart shows spend over time using the shared chart style of the existing analytics
- [ ] The timeline merges all activity types in date order
- [ ] The wishlist tab shows a registered user's wishlist, and walk-ins show an empty state
- [ ] Editing name or phone works, re-links sales if the phone changes, and writes an `ActivityLog` entry
- [ ] Admin-only access
- [ ] Layout works on phone width
- [ ] Tests cover the metrics, timeline ordering and the logged edit

## Blocked by

- 07 Customers CRM list and ranking
