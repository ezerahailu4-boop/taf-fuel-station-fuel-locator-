# TAF Fuel Finder ⛽🇪🇹

> Official Telegram Bot & Telegram Mini App for TAF Fuel Stations in Ethiopia.
> Real-time reported fuel availability (Benzine, Diesel, Kerosene), geolocation search, map exploration, instant arrival alerts, and multi-tier staff administration.

---

## 🚀 Overview & Build Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | PostgreSQL & Prisma Schema, Telegram HMAC Auth, Session JWT, RBAC, Rate Limiter, i18n Scaffold | ✅ Complete |
| **Phase 2** | Station & Fuel Status Pipeline, Stale Expiry Engine, Staff Branch Admin Portal (`/branch`) | ✅ Complete |
| **Phase 3** | Customer Telegram Mini App (Home, `/nearest`, `/stations`, `/map` with Leaflet, Realtime Broadcast) | ✅ Complete |
| **Phase 4** | Telegram Bot Commands (`/start`, `/nearest`, `/stations`, `/check`, `/notifications`), Webhook, Outbox Worker, Subscriptions (`/alerts`) | ✅ Complete |
| **Phase 5** | Super Admin Management Dashboard (`/admin`), Station & Fuel CRUD, Global Settings, Analytics, Audit Log | ✅ Complete |
| **Phase 6** | Production Hardening, Next.js 16 Turbo Compilation, Vitest Suite (183 tests, 21 test suites passed) | ✅ Complete |

---

## 📍 Configured Primary Station

- **Station Name:** Tolroad TAF Station
- **Branch:** Tolroad
- **City:** Adama
- **Area:** Adama-Finfinee Expressway
- **Location:** [Adama-Finfinee Rest Stop on Google Maps](https://www.google.com/maps/place/Adama-Finfinee+Rest+Stop/@8.751643,39.0160711,198m)
- **Coordinates:** Latitude `8.751643`, Longitude `39.0160711`
- **Assigned Super Admin & Branch Admin:** Telegram ID `2074368152`

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router with Turbopack) & React 19
- **Languages:** TypeScript (strict mode)
- **Database & Storage:** PostgreSQL on Supabase (with Supavisor pooling & Direct connection)
- **ORM:** Prisma 7 with `@prisma/adapter-pg`
- **Realtime:** Supabase Realtime Broadcast (Zero client credentials leaked)
- **Styling:** Tailwind CSS 4 with custom TAF brand palette (Green `#00843D`, Gold `#FCD116`, Red `#D92B2B`)
- **Maps:** Leaflet & OpenStreetMap (No costly third-party API keys required)
- **Localization:** `next-intl` (Full English + Amharic / አማርኛ support)
- **Testing:** Vitest (183 unit & integration tests)

---

## 🔐 Environment Variables (`.env`)

```env
# ---- Database (Supabase Postgres) ----
DATABASE_URL="postgresql://postgres.paafawytsvsinbyywayr:[YOUR-DATABASE-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.paafawytsvsinbyywayr.supabase.co:5432/postgres"

# ---- Supabase Realtime (Broadcast) ----
NEXT_PUBLIC_SUPABASE_URL="https://paafawytsvsinbyywayr.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-secret-key"

# ---- Telegram ----
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_BOT_USERNAME="taf_fuel_bot"
TELEGRAM_WEBHOOK_SECRET="your-telegram-webhook-secret"
TELEGRAM_MINI_APP_URL="http://localhost:3000"

# ---- App Settings ----
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="your-session-secret-at-least-32-chars"
INIT_DATA_MAX_AGE_SECONDS="86400"
SESSION_TTL_SECONDS="43200"

# ---- Seed Admin ----
SEED_SUPER_ADMIN_TELEGRAM_ID="2074368152"
```

---

## 📦 Quick Start & Deployment Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Replace `[YOUR-DATABASE-PASSWORD]` in `.env` with your Supabase database password, then run:
```bash
# Push Prisma schema to your Supabase PostgreSQL database
npx prisma db push

# Apply Row Level Security deny-all protections
npm run db:rls

# Seed the Tolroad TAF Station, 3 fuel types, and Super Admin
npm run db:seed
```

### 3. Run Locally & Run Tests
```bash
# Run unit & integration tests (183 tests)
npm test

# Run TypeScript typecheck
npm run typecheck

# Start local Next.js development server
npm run dev
```

### 4. Setup Telegram Webhook & Bot Menu
For Telegram webhooks and Mini App testing, expose your server with a public HTTPS tunnel (e.g. Cloudflare Tunnel or ngrok):
```bash
# Example using Cloudflare Tunnel
npx cloudflared tunnel --url http://localhost:3000

# Set NEXT_PUBLIC_APP_URL to your tunnel URL in .env, then run:
npm run bot:setup
```
This automatically registers the webhook with Telegram and uploads command menus in both **English** and **Amharic** (`/start`, `/nearest`, `/stations`, `/check`, `/notifications`, `/admin`, `/help`).

### 5. Production Build
```bash
npm run build
```

---

## 📱 User Journeys & Route Directory

### Customer Mini App (`/`)
- **Home (`/`):** Quick-find nearby stations, fuel type chips, recently updated stations, status refresh badge.
- **Nearest (`/nearest`):** Privacy-first geolocation lookup. Stations reporting fuel available/limited rank top (🥇🥈🥉). Coordinates are never saved in DB or cookies.
- **Stations List (`/stations`):** Search by branch name, filter by fuel type, availability, city, or radius.
- **Station Detail (`/stations/[id]`):** Per-fuel availability, staleness warnings, 1-tap subscription bell, phone dialer, navigation directions (Google Maps, Apple Maps, OpenStreetMap).
- **Interactive Map (`/map`):** Color-coded Leaflet pins with fuel badges, interactive drawer popups, and zoom-to-station routing.
- **Alerts & Subscriptions (`/alerts`):** Manage active station notifications and view delivered alert logs.

### Branch Station Admin (`/branch`)
- One-tap status updates (`AVAILABLE`, `LIMITED`, `OUT_OF_STOCK`).
- Confirmation drawer to prevent accidental updates.
- "Still Accurate ✓" button to reset staleness timers without modifying stock status.
- Station status switch (`OPEN`, `CLOSED`, `TEMPORARILY_CLOSED`, `MAINTENANCE`).
- Station activity timeline.

### Super Admin Dashboard (`/admin`)
- Accessible by `SUPER_ADMIN` and `VIEWER` roles.
- **Stations Manager:** Add new stations, edit location, assign branch managers by Telegram ID, activate/deactivate stations.
- **Fuel Types Manager:** Add fuels, edit localized names (English / Amharic), reorder display index.
- **Settings Manager:** Configure global radius, stale timeout thresholds, auto-notification cooldowns.
- **Analytics:** Anonymous KPI metrics, search trends, top requested fuels.
- **Audit Logs:** Immutable chronological log of all price/stock changes and administrative actions.

---

## 🛡️ Security & Privacy Guarantees

1. **Zero Location Logging:** Customer GPS coordinates are processed entirely in-memory for distance calculations and never persisted to database tables, logs, or cookies.
2. **Telegram Cryptographic Verification:** All `initData` payloads from the Mini App and webhooks are validated using HMAC-SHA256 signatures before granting session tokens.
3. **Role-Based Access Control (RBAC):** Station branch admins are scoped strictly to their assigned station; cross-station updates are blocked and logged as security events.
4. **Resilient Webhook & Cron Delivery:** Notifications are dispatched via an asynchronous outbox table with exponential backoff and automatic detection of blocked bot users.
