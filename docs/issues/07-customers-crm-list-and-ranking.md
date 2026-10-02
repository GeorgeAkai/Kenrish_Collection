# 07 Customers CRM list and ranking

Type: AFK

## What to build

The Users page under Executive becomes a Customers page with tabs for registered users and "Customer not in App" walk-ins, plus a top-customer ranking at the top. Customers are ranked by total spend (product sales plus service sales) in Ksh. Ties break on purchase count. Each row shows spend, purchase count, last purchase date and phone. Walk-ins carry a badge. A shop filter (All, Beauty, Fashion) and a period filter (30 days, 90 days, this year, all time) apply to the ranking, defaulting to all shops and all time. Anonymous sales are excluded from the ranking. Clicking a row opens the customer profile (issue 08).

## Acceptance criteria

- [ ] Registered and walk-in customers appear in tabs, with a badge on walk-ins
- [ ] The ranking orders by total spend across product and service sales, and ties break on purchase count
- [ ] Shop and period filters change the ranking correctly
- [ ] Anonymous sales are excluded
- [ ] Registered users with no purchases still appear in the registered list
- [ ] The page is admin-only, and phone numbers do not appear in any public API
- [ ] Existing Users page actions remain available or are intentionally moved, and none are lost
- [ ] Tests cover ranking totals, the filters, tiebreak and exclusion of anonymous sales

## Blocked by

- 01 Customer identity on sales
