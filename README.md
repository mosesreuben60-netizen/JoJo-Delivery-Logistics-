# JoJo Delivery — setup guide

A booking + tracking + payments platform for one independent bike courier. Frontend is plain HTML/CSS/JS deployed on GitHub Pages. Backend is a Node/Express API on MongoDB, deployed on Railway (no auto-pausing). Payments are Paystack, verified server-side.

## What's in this folder

Frontend (deploy to GitHub Pages):
- `index.html` — landing page
- `book.html` — booking form + Paystack checkout
- `track.html` — public tracking lookup by code
- `admin.html` — rider dashboard (login required)
- `style.css`, `app.js`, `config.js` — shared styling, helpers, and settings

Backend (deploy to Railway) — everything inside `server/`:
- `index.js` — Express app entry point
- `src/models/` — MongoDB schemas (Booking, Availability)
- `src/routes/` — API endpoints (auth, bookings, availability, payments)
- `src/tiers.js` — pricing, kept server-side so it can't be tampered with
- `.env.example` — environment variables you'll need to set

## 1. Deploy the backend to Railway

1. Push the `server/` folder to its own GitHub repo (e.g. `jojo-api`), or a subfolder of one.
2. In Railway: **New Project → Deploy from GitHub repo**, point it at that repo. If `server/` is a subfolder, set the service's **Root Directory** to `server` in Settings.
3. Add a MongoDB database: **New → Database → Add MongoDB**. Railway will inject a `MONGO_URL` variable automatically into services in the same project — or copy it manually into your API service's variables if it doesn't auto-link.
4. Under your API service's **Variables** tab, add everything from `.env.example`:
   - `MONGO_URL` (from the Mongo plugin, or your own MongoDB Atlas URI)
   - `JWT_SECRET` — any long random string
   - `ADMIN_EMAIL` — the rider's login email
   - `ADMIN_PASSWORD_HASH` — see step 2 below
   - `PAYSTACK_SECRET_KEY` — from Paystack (starts `sk_test_` or `sk_live_`)
   - `ALLOWED_ORIGINS` — your GitHub Pages URL, comma-separated if more than one
5. Railway will build and deploy automatically. Once it's live, copy the public URL it gives you (something like `https://jojo-api-production.up.railway.app`).

## 2. Generate the rider's password hash

Locally, with Node installed:
```bash
cd server
npm install
npm run hash-password -- "the-password-you-want"
```
Copy the printed hash into `ADMIN_PASSWORD_HASH` on Railway.

## 3. Set up Paystack

1. Create an account at paystack.com (Nigerian business account).
2. In **Settings → API Keys & Webhooks**, copy both keys:
   - **Public key** → goes in the frontend's `config.js`
   - **Secret key** → goes in `PAYSTACK_SECRET_KEY` on Railway (never in frontend code)
3. Start with the `pk_test_` / `sk_test_` pair and test a full booking end to end before switching to live keys.

Payment flow: the frontend opens Paystack's checkout, then immediately calls the API's `/api/payments/verify` endpoint with the transaction reference. The API checks that reference directly with Paystack's servers before marking a booking paid — so a closed tab or tampered request can't fake a "paid" status.

## 4. Configure the frontend

In `config.js`:
```js
API_BASE_URL: "https://jojo-api-production.up.railway.app", // your Railway URL, no trailing slash
PAYSTACK_PUBLIC_KEY: "pk_test_...",
RIDER_NAME: "...",
RIDER_PHONE: "234...",   // used for the WhatsApp fallback link
SERVICE_CITY: "Warri",
TIERS: [ ... ]            // display copy only — see note below
```

**Important:** if you change prices, update them in **two** places: `config.js` (for display) and `server/src/tiers.js` (the real source of truth the API charges from). They're deliberately separate so a customer can't alter the price by editing the page.

## 5. Deploy the frontend to GitHub Pages

Same as Young Giant: push everything *outside* `server/` to a repo (or subfolder) and enable Pages in repo settings.

## Test checklist before going live

- [ ] Railway API is up — visiting its URL directly shows `{"status":"JoJo Delivery API is running"}`
- [ ] `npm run hash-password` ran, hash is set as `ADMIN_PASSWORD_HASH` on Railway
- [ ] admin.html login works with the rider's email/password
- [ ] Book a test delivery with the Paystack test key, confirm it appears in admin.html as paid
- [ ] Toggle availability off in admin.html, confirm book.html shows "Rider busy"
- [ ] Track the test booking by code on track.html, update status in admin.html, refresh track.html to confirm it moves
- [ ] Confirm `ALLOWED_ORIGINS` on Railway matches your actual GitHub Pages URL exactly (including https://)

## What's not built yet (v2 ideas)

- **SMS/WhatsApp auto-notifications**: right now customers check status by visiting `track.html`. To push notifications automatically, add a call to a provider like Termii or Africa's Talking inside the status-update route in `server/src/routes/bookings.js`.
- **Multi-rider support**: schema currently assumes one rider (`availability` is a single document, one admin login). If the courier ever hires help, `Availability` and the auth system both need a `riderId`.
- **Rate limiting** on the public endpoints (`/api/bookings` POST, `/api/payments/verify`) before this gets real traffic — worth adding `express-rate-limit` when you're ready.
