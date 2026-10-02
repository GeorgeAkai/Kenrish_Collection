# 10 Inventory card dashboard

Type: HITL (visual redesign: review before finalizing)

## What to build

`/admin/{shop}/inventory` becomes a grid of clickable cards: Stock Overview, Add Stock, Record Sale, Sales History, Scan Receipt and Low Stock Alerts. Each card shows one live number: stock value, items low on stock (in red), today's sales total, and so on. Each card opens its own route, such as `/admin/fashion/inventory/record-sale`, with a "← Inventory" link at the top, so browser back and direct links work. The tab strip is removed. The sidebar entry and the staging page's "Go to Inventory" link still land on the card dashboard.

## Acceptance criteria

- [ ] The card dashboard renders for Beauty and Fashion, scoped to each shop's data
- [ ] Each card shows a correct live metric and opens its sub-page
- [ ] Each sub-page has its own route, works on refresh, and has a back link
- [ ] All existing functionality from the old tabs is reachable and unchanged
- [ ] The old `/admin/inventory` route and existing links still work
- [ ] Layout works at phone width
- [ ] The admin reviews and approves the visual design

## Blocked by

None - can start immediately
