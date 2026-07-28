# JoJo Active Logistics — setup guide

Three separate pieces:
1. **Customer site** (this folder, minus `server/`) — full customer accounts, app-style home screen, booking, tracking. Deploy to GitHub Pages.
2. **Driver portal** (separate repo, `jojo-driver-portal`) — driver signup/login, job claiming, live location sharing.
3. **Backend API** (`server/` folder, separate repo `jojo-backend`) — Node/Express + MongoDB on Railway, shared by both frontends.

## What changed in this version

- **Full customer accounts**: booking now requires signing up/logging in (name, email, phone, password). No more guest booking.
- **App-style home screen**: greeting, embedded map, "Where are you sending to?" search bar, Book/Track/History quick actions, delivery history list.
- **Real branding**: JoJo Active Logistics, blue/yellow color scheme, real contact details (phone 08105591555, WhatsApp 09019866988, Airport Road by Westend Road, Delta State).
- **Live map** on the tracking page (Leaflet + OpenStreetMap, free, no API key) showing the driver's real-time position once assigned.

## Backend changes to redeploy

New/changed files in `jojo-backend`:
- New: `src/models/Customer.js`, `src/routes/customers.js`
- Changed: `src/middleware/auth.js` (now exports `requireDriverAuth` and `requireCustomerAuth` separately), `src/models/Booking.js` (added `customerId`), `src/routes/bookings.js` (booking creation now requires customer login), `index.js` (registers the new customers route)

No new environment variables needed for this round — same `MONGO_URL`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ALLOWED_ORIGINS` as before.

## Config to update

In `config.js` (customer site — the driver portal has its own copy, keep both in sync if you change branding):
```js
API_BASE_URL: "...",              // your Railway URL
PAYSTACK_PUBLIC_KEY: "...",
RIDER_PHONE: "2348105591555",      // call fallback
WHATSAPP_NUMBER: "2349019866988",  // WhatsApp fallback
SERVICE_ADDRESS: "...",
MAP_CENTER: { lat: ..., lng: ... } // adjust to your actual base location
```

## Test checklist

- [ ] Sign up a new customer account at the customer site's home page
- [ ] Confirm the greeting, map, and empty delivery history render
- [ ] Search "Where are you sending to?" and confirm it lands on the booking form with drop-off prefilled
- [ ] Complete a test booking (Paystack test key) — confirm it requires being logged in
- [ ] Confirm the booking appears in "Recent deliveries" on the home screen after refreshing
- [ ] In the driver portal, claim the job and update its status
- [ ] On the tracking page, confirm the live map shows once the driver shares a location

## What's not built yet

- Saved/favorite addresses (currently every booking asks for pickup/drop-off fresh)
- Password reset flow for customers or drivers
- Admin oversight across all drivers/customers
- Hardware GPS tracker integration (the field exists on driver signup, not yet wired to a device)
