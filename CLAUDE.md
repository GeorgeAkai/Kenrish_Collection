# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Kenrish Collection — an e-commerce and salon management platform for a beauty salon in Nakuru, Kenya. It combines a Django backend (server-rendered templates + REST API) with a React/TypeScript SPA frontend, and an AI chatbot ("Rexi") powered via OpenRouter.

## Development Commands

### Backend (Django)

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations and start dev server
python manage.py makemigrations
python manage.py migrate
python manage.py runserver

# Or use the convenience script (does both steps)
bash local_run_server.sh

# Run tests
python manage.py test

# Run a single test
python manage.py test app1.tests.TestClassName.test_method_name

# Collect static files (needed before Docker build)
python manage.py collectstatic --noinput
```

### Frontend (React SPA)

The frontend lives in the root directory (not a `frontend/` subfolder). Vite is the build tool; pnpm is used for the workspace.

```bash
# Install
npm install   # or: pnpm install

# Dev server
npm run dev   # Vite dev server

# Production build (output goes to frontend/dist, served by Django)
npm run build
```

### Docker

```bash
docker compose up --build       # Full stack (Postgres + Django)
docker compose up               # Reuse existing build
```

## Architecture

### Two Rendering Modes

Django serves **two separate UIs**:

1. **Django template views** (`templates/` directory, `app1/views.py`) — the original server-rendered interface for all product, admin, inventory, and user management pages. Protected by `@login_required` + `@user_passes_test(is_admin)` decorators directly in views.

2. **React SPA** (`frontend/src/`) — a newer Vite/React/TypeScript interface built from Figma designs. Built to `frontend/dist/`, served as static files by Django. A catch-all `re_path` in `kenrish/urls.py` sends any non-API, non-admin, non-media request to `react_index()`, which serves the React `index.html`. The React app communicates exclusively via the REST API at `/api/`.

Both UIs are live simultaneously. The SPA catch-all is the **last** URL pattern.

### Django Apps

- **`app1/`** — core app. Contains all models, the template-based views, forms, signals, inventory views, and the AI chatbot integration stub (`ai_chatbot.py`). The `backends.py` file enables login by email or username.
- **`api/`** — DRF REST API consumed by the React SPA. JWT auth via `djangorestframework-simplejwt` (15-min access tokens, 7-day refresh). All endpoints under `/api/`.
- **`chatbot/`** — standalone chatbot app. `ai_service.py` calls OpenRouter API (model: `microsoft/wizardlm-2-8x22b`). Loads a knowledge base from `chatbot/data/knowledge_base.json`. The chatbot is also accessible via the REST API at `api/chatbot/stream/`.
- **`kenrish/`** — Django project config. Settings auto-select SQLite (dev, no `DB_HOST` set) or PostgreSQL (production, `DB_HOST` env var present).

### Models & Data Patterns

Three parallel product types — **Product**, **Handbag**, **Clothes** — each with:
- Inventory fields (`stock_quantity`, `cost_price`, `reorder_level`)
- A stored `average_rating` float updated via `update_average_rating()` called from Rating model `save()`
- `is_low_stock` and `inventory_value` properties (Clothes defines them directly; Product/Handbag get them via monkey-patching at the bottom of `models.py`)

**`InventoryTransaction.save()`** adjusts stock on first creation only. **`Sale.save()`** also adjusts stock and auto-creates a `CashFlow` revenue entry — do not also create an `InventoryTransaction` of type `SALE` for the same sale or stock will be decremented twice.

**`Invoice`** auto-generates numbers in the format `KRC-YYYYMMDD-NNNN` in its `save()`.

### Frontend Structure

```
frontend/src/
  pages/
    public/    # Customer-facing pages (Home, Products, Handbags, Clothes, Gallery, etc.)
    admin/     # Staff pages (Dashboard, Inventory, Users, Invoices, Analytics, etc.)
    auth/      # Login/register flows
  components/  # Shared UI components (shadcn/ui + Radix + MUI)
  contexts/    # React context providers (auth, cart, etc.)
  hooks/       # Custom hooks
  lib/         # API client utilities
```

UI components use **shadcn/ui** (Radix primitives + Tailwind CSS v4). Path alias `@` maps to `frontend/src/`.

### Authentication

- Django sessions: template views use `@login_required`, session timeout is 15 minutes (`SESSION_COOKIE_AGE = 900`), reset on every request.
- JWT: React SPA uses Bearer tokens (access 15 min, refresh 7 days) via `/api/auth/login/` and `/api/auth/token/refresh/`.
- Custom backend (`app1/backends.py`) allows login with email OR username.

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | PostgreSQL (omit `DB_HOST` to use SQLite) |
| `OPENROUTER_API_KEY` | AI chatbot (required for chatbot to work) |
| `OPENROUTER_MODEL` | OpenRouter model override (default in `chatbot/ai_service.py`) |

## Known Quirks

- `app1/views.py` has duplicate imports of `django.contrib.auth.models.User` and two functions both named `admin_user_wishlist` (different signatures/templates). This is intentional to preserve existing behavior — do not consolidate without testing both call sites.
- `app1/views_optimized.py` exists as an alternative optimized views file; it is not currently wired into URLs.
- `kenrish/urls.py` appends URL patterns in two separate blocks after the main `urlpatterns` list (inventory/reservations block, then the React catch-all). The catch-all **must remain last**.
- `STATIC_ROOT` is `staticfiles/` and `frontend/dist/` is also listed in `STATICFILES_DIRS`, so the React build is collected into Django's static file pipeline for production.
