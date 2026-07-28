// ===========================================================
// JoJo Delivery — configuration
// Fill these in once your Railway API is deployed and you have a
// Paystack account. See README.md for step-by-step instructions.
// ===========================================================

const RUSHRIDA_CONFIG = {
  API_BASE_URL: "https://YOUR-APP-NAME.up.railway.app", // no trailing slash — from Railway after deploy
  PAYSTACK_PUBLIC_KEY: "YOUR_PAYSTACK_PUBLIC_KEY",       // Paystack Dashboard → Settings → API Keys (use pk_test_ while testing)

  RIDER_NAME: "Your Rider's Name",
  RIDER_PHONE: "2348000000000",                          // international format, used for WhatsApp deep links
  SERVICE_CITY: "Warri",

  // Display copy for the booking form. Prices here are for show only —
  // the server recalculates the real price from its own tier list, so
  // editing this alone won't change what customers are charged. Keep
  // this in sync with server/src/tiers.js when you change pricing.
  TIERS: [
    { id: "bike_light",  label: "Bike – Light Package", desc: "Docs, small parcels, under 5kg", price: 1500 },
    { id: "bike_medium", label: "Bike – Medium Package", desc: "Boxes, groceries, 5–15kg", price: 2500 },
    { id: "bike_rush",   label: "Rush Delivery", desc: "Priority, picked up within 20 mins", price: 3500 },
    { id: "bike_multi",  label: "Multi-Stop Run", desc: "2–4 drop-off points", price: 4500 }
  ]
};
