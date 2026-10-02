# 09 Login tracking

Type: AFK

## What to build

Record a `LoginEvent` (user, time, source: web session or JWT/app) on each successful login, for both Django session logins and `/api/auth/login/`. Token refreshes do not count. Counting starts at deployment, with the start date stored so the UI can show "Logins: 12 (since Oct 2026)". History is not faked from `last_login`. The count and last-seen value are exposed to admins for the customer profile.

## Acceptance criteria

- [ ] A successful session login creates one event, and a failed login creates none
- [ ] A successful JWT login creates one event, and a token refresh creates none
- [ ] The login count and last-seen value for a user are available through an admin-only endpoint
- [ ] The tracking start date is available so the UI can display it
- [ ] Login speed is not noticeably affected, and a logging failure never blocks a login
- [ ] Tests cover session login, JWT login, refresh and failed login

## Blocked by

None - can start immediately
