# DATA SOLUTION – Connect & Stay Ahead!

A Kenyan mobile-data e-commerce website for buying affordable Safaricom data, SMS, and minutes packages quickly and securely via Lipa na M-PESA.

- **Business:** DATA SOLUTION
- **Tagline:** CONNECT & STAY AHEAD!
- **Contact:** 0798507804
- **M-PESA Till:** 3090748 (Victor – Safaricom)
- **Currency:** KSh

---

## Features

- **Package Catalog** — Bingwa Data, SMS Deals, Minutes Deals, Highlighted Offers, and Tunukiwa Deals.
- **Instant Purchase** — Customers select a package, enter their phone number, and pay via Lipa na M-PESA.
- **Order Tracking** — Customers look up their order by order number + phone number.
- **Admin Dashboard** — Secure admin login to manage packages, view orders, and monitor payments.
- **PWA Support** — Installable on mobile devices with offline app-shell caching.
- **Secure Payments** — Payment verification happens server-side only; the frontend is never trusted for payment confirmation.
- **Audit Logging** — All critical actions (order creation, payment verification, admin actions) are logged for accountability.

---

## Tech Stack

| Layer           | Technology                                   |
|-----------------|----------------------------------------------|
| Frontend        | Vite + React + TypeScript                    |
| PWA             | Service Worker (sw.js) + manifest            |
| Backend (BaaS)  | Supabase (PostgreSQL + RLS + Edge Functions) |
| Payments        | M-PESA via Tuma API (server-side verification)|
| Hosting         | Cloudflare Pages                             |

---

## Project Structure

```
data-solution/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Tables, indexes, triggers
│       ├── 002_seed_packages.sql     # Seed package data
│       ├── 003_rls_policies.sql      # Row Level Security + SECURITY DEFINER fn
│       └── 004_create_admin.sql      # Initial admin user (placeholder password)
├── web/
│   ├── public/
│   │   ├── manifest.json            # PWA manifest
│   │   ├── sw.js                     # Service worker
│   │   ├── robots.txt                # SEO robots
│   │   ├── sitemap.xml               # SEO sitemap
│   │   ├── _headers                  # Cloudflare Pages security headers
│   │   └── _redirects                # Cloudflare Pages SPA redirects
│   └── src/
│       └── lib/
│           ├── packages.ts           # Static package fallback data
│           └── types.ts             # TypeScript types (Package, Order, etc.)
├── .env.example                      # Environment variable documentation
├── .gitignore
└── README.md
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd data-solution/web
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

> **CRITICAL:** Never commit `.env` to version control. The `.gitignore` already excludes it.

#### Frontend Variables (exposed to client — `VITE_` prefix):

| Variable                   | Description                          |
|----------------------------|--------------------------------------|
| `VITE_SUPABASE_URL`        | Supabase project URL                 |
| `VITE_SUPABASE_ANON_KEY`   | Supabase anon/public key (safe for client) |

#### Backend Variables (server-side only — NEVER expose to frontend):

| Variable                    | Description                                     |
|-----------------------------|-------------------------------------------------|
| `SUPABASE_URL`              | Supabase project URL (same as VITE_)            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS)        |
| `SUPABASE_ANON_KEY`         | Supabase anon key                               |
| `TUMA_API_KEY`              | Tuma API key for payment verification           |
| `TUMA_API_SECRET`           | Tuma API secret                                 |
| `TUMA_WEBHOOK_SECRET`       | Webhook secret for verifying webhook payloads   |
| `ADMIN_JWT_SECRET`          | JWT signing secret for admin authentication     |
| `MPESA_TILL_NUMBER`         | M-PESA Till number (3090748)                    |
| `MPESA_TILL_NAME`           | M-PESA Till name (Victor – Safaricom)           |
| `BUSINESS_PHONE`            | Business contact phone (0798507804)            |

---

## Database Migrations

Run the SQL migrations in order using the Supabase Dashboard SQL Editor or the Supabase CLI:

### Option A: Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### Option B: Supabase Dashboard

Navigate to **SQL Editor** and run each file in order:

1. `001_initial_schema.sql` — Creates all tables, indexes, and triggers.
2. `002_seed_packages.sql` — Seeds package data (idempotent via `ON CONFLICT`).
3. `003_rls_policies.sql` — Enables RLS and creates security policies.
4. `004_create_admin.sql` — Creates the initial admin user (placeholder password).

> All migrations are idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

---

## Edge Functions Deployment

Supabase Edge Functions handle secure, server-side operations. Deploy from the `supabase/functions/` directory:

```bash
# Deploy a single function
supabase functions deploy create-order --no-verify-jwt

# Deploy payment verification
supabase functions deploy verify-payment --no-verify-jwt

# Deploy admin auth
supabase functions deploy admin-auth --no-verify-jwt

# Set secrets (never hardcode in code)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set TUMA_API_KEY=your-key
supabase secrets set TUMA_API_SECRET=your-secret
supabase secrets set TUMA_WEBHOOK_SECRET=your-webhook-secret
supabase secrets set ADMIN_JWT_SECRET=your-jwt-secret
```

### Recommended Edge Functions

| Function            | Purpose                                         |
|---------------------|--------------------------------------------------|
| `create-order`      | Creates an order in the database (service_role)  |
| `verify-payment`    | Verifies M-PESA payment via Tuma API             |
| `payment-webhook`   | Receives Tuma webhook callbacks                  |
| `fulfill-order`     | Credits the customer's package after payment     |
| `admin-auth`        | Handles admin login (password → JWT)            |

---

## Cloudflare Pages Deployment

### 1. Build the Frontend

```bash
cd web
npm run build
```

This outputs to `web/dist/`.

### 2. Deploy to Cloudflare Pages

#### Option A: Dashboard (Direct Upload)

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/).
2. Create a new project → "Direct Upload."
3. Upload the `web/dist/` directory.

#### Option B: Git Integration

1. Push your repository to GitHub/GitLab.
2. In Cloudflare Pages, connect the repository.
3. Set build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `web/dist`
4. Add environment variables (only `VITE_*` variables — Cloudflare Pages builds run client-side).

### 3. Security Headers & Redirects

The `web/public/_headers` and `web/public/_redirects` files are automatically picked up by Cloudflare Pages:

- **`_headers`** — Sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, and `Referrer-Policy`.
- **`_redirects`** — SPA fallback: all routes serve `/index.html` with a 200 status.

---

## Security Notes

### Row Level Security (RLS)

All tables have RLS enabled. The security model:

| Table         | Public Access                          | service_role Access |
|---------------|----------------------------------------|----------------------|
| `packages`    | SELECT (active only)                   | Full CRUD            |
| `orders`      | Via `get_order_by_number()` fn only    | Full CRUD            |
| `payments`    | **NONE**                               | Full CRUD            |
| `audit_logs`  | **NONE**                               | INSERT + SELECT      |
| `admin_users` | **NONE**                               | Full CRUD            |

- Customers can only look up their own orders using the `get_order_by_number(p_order_number, p_phone)` SECURITY DEFINER function, which requires both the order number AND the matching phone number.
- Payments, audit logs, and admin users are **never** accessible publicly.

### Payment Verification Architecture

> **NEVER trust the frontend for payment confirmation.**

The payment flow is:

1. **Customer** selects a package and enters their phone number.
2. **Frontend** sends the order details to the `create-order` edge function.
3. **Edge function** creates an order with status `awaiting_payment` and returns the order number + M-PESA Till instructions.
4. **Customer** sends payment to M-PESA Till **3090748** (Victor – Safaricom).
5. **Tuma API webhook** (`payment-webhook` edge function) receives the payment notification server-side.
6. **Edge function** verifies the payment via the Tuma API (using `TUMA_API_KEY` and `TUMA_API_SECRET` — never exposed to the client).
7. If verified, the edge function:
   - Records the payment in the `payments` table (with unique `provider_transaction_id` to prevent duplicates).
   - Updates the order's `payment_status` to `payment_confirmed`.
   - Triggers `fulfill-order` to credit the customer's package.
   - Logs the action in `audit_logs`.
8. **Frontend** polls or receives a real-time update that the order is `completed`.

**Key security principles:**
- The frontend **never** has access to the service role key.
- Payment verification **always** happens server-side via the Tuma API.
- The `provider_transaction_id` has a unique constraint, preventing duplicate payment processing.
- All payment and admin actions are logged in `audit_logs`.

### Service Worker

The PWA service worker (`sw.js`):
- **NEVER** caches `/api/` or `/functions/` endpoints.
- **NEVER** caches payment, order, or M-PESA-related responses.
- Only caches static shell assets (HTML, CSS, JS, images) for offline support.
- Cleans up old cache versions on activation.

---

## Admin Setup

After running the database migrations:

1. The `admin_users` table contains a row with email `admin@datasolution.co.ke` and a **placeholder password hash** that will not work.

2. **Set the real admin password** using one of:

   **Option A: Admin Auth Edge Function (recommended)**
   ```bash
   supabase functions deploy admin-auth --no-verify-jwt
   # Then call the function with a "set-password" action to hash and store the real password
   ```

   **Option B: Manual SQL Update**
   ```sql
   UPDATE admin_users
   SET password_hash = '<bcrypt_hash_from_your_hashing_tool>'
   WHERE email = 'admin@datasolution.co.ke';
   ```

3. The admin login flow:
   - Admin sends email + password to the `admin-auth` edge function.
   - The function verifies the bcrypt hash against `admin_users`.
   - If valid, it signs a JWT using `ADMIN_JWT_SECRET` and returns it.
   - The admin dashboard uses the JWT for authenticated requests to edge functions.

---

## License

This project is proprietary to DATA SOLUTION. All rights reserved.
