# ZuriVolt Gadgets — Production Deployment & Credential Guide

## 1. Environment Variables to Provide
Set these securely in your hosting provider's Secrets / Environment Variables panel (never hardcode secret keys in frontend files):

- `JWT_SECRET`: Strong random string (32+ chars) for signing auth cookies.
- `PAYSTACK_SECRET_KEY`: Starts with `sk_test_...` for Test Mode or `sk_live_...` for Live Mode (Server-only).
- `VITE_PAYSTACK_PUBLIC_KEY`: Starts with `pk_test_...` or `pk_live_...`.
- `VITE_WHATSAPP_NUMBER`: Your WhatsApp Business number in international format without `+` (e.g., `2348091234567`). You can also update this live inside **Admin Dashboard -> Reports & Settings**.
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` (Optional if connecting external Supabase project).
- `SUPABASE_SERVICE_ROLE_KEY` (Server/Edge Function only — never expose in `VITE_*`).

## 2. Connecting Your Supabase Project (Database + RLS + Storage + Edge Functions)
1. Create a project at `https://supabase.com`.
2. Open **SQL Editor** in your Supabase Dashboard and execute `supabase/migrations/001_initial_schema.sql` to create all 18+ relational tables, RLS policies, storage buckets (`product-images`, `category-images`, `store-assets`), and atomic inventory RPCs.
3. Deploy the Paystack Edge Functions using Supabase CLI:
   ```bash
   supabase functions deploy paystack-initialize
   supabase functions deploy paystack-verify
   supabase functions deploy paystack-webhook
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_key
   ```

## 3. Switching Paystack from Test Mode to Live Mode
1. Log in to your Paystack Dashboard (`https://dashboard.paystack.com`).
2. Complete Paystack business verification / compliance in Nigeria.
3. Toggle your Paystack Dashboard from **Test Mode** to **Live Mode**.
4. Copy your **Live Secret Key** (`sk_live_...`) into `PAYSTACK_SECRET_KEY` and **Live Public Key** (`pk_live_...`) into `VITE_PAYSTACK_PUBLIC_KEY`.
5. In Paystack Settings -> **API Keys & Webhooks**, set your Live Webhook URL to:
   `https://yourdomain.com/api/paystack/webhook` (or your Supabase Edge Function URL).

## 4. Production Build & Custom Domain
1. Build the frontend bundle: `npm run build`
2. Start the production server: `npm run start`
3. Deploy to Cloud Run, Railway, Render, or a VPS with Node.js 20+, then point your `.ng` or `.com` domain's A/CNAME DNS records and enable HTTPS/TLS.
