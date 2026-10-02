# 06 Employees with payroll

Type: AFK

## What to build

An Employees page under Executive with a dashboard. Admins add employees with name, phone, email, start date, optional end date, monthly salary, shop (Beauty, Fashion or Both) and a weekly schedule (days and hours). The off day is derived from the schedule. The dashboard shows who is on shift today, who is off, total monthly payroll and headcount per shop.

Each month a salary expense is posted automatically using the recurring posting from issue 05. The first month is prorated by days worked from the start date. The last month is prorated up to the end date. Months fully inside the employment period get the full salary. A "Both" employee's salary is posted as Shared. Posted salaries can be edited, and edits are logged. Salaries are visible to admins only.

## Acceptance criteria

- [ ] Admin can add, edit and end an employee with all fields above
- [ ] The off day is derived from the schedule and shown in the list
- [ ] The dashboard shows on shift today, off today, total payroll and headcount per shop
- [ ] A salary expense posts once per employee per month and never duplicates
- [ ] Partial first and last months are prorated by days, and full months pay the full salary
- [ ] Shop attribution follows the employee's shop, with Both posted as Shared
- [ ] Employees with an end date in the past stop generating salaries
- [ ] Edits to a posted salary are logged
- [ ] Salary data is not exposed to non-admin users or public endpoints
- [ ] Tests cover proration, idempotency, end dates and attribution

## Blocked by

- 05 Expenses management
