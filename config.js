// ===========================================================
// JoJo Active Logistics — configuration
// ===========================================================

const RUSHRIDA_CONFIG = {
  API_BASE_URL: "https://jojo-backend-production.up.railway.app", // your Railway URL, no trailing slash

  PAYSTACK_PUBLIC_KEY: "YOUR_PAYSTACK_PUBLIC_KEY", // Paystack Dashboard → Settings → API Keys

  BUSINESS_NAME: "JoJo Active Logistics",
  RIDER_PHONE: "2348105591555",       // used for the call/WhatsApp fallback links (international format)
  WHATSAPP_NUMBER: "2349019866988",   // separate WhatsApp number from the flyer
  SERVICE_CITY: "Warri",
  SERVICE_ADDRESS: "Airport Road by Westend Road, Delta State",

  // Map center for the home-screen map preview (Warri, Delta State)
  MAP_CENTER: { lat: 5.5160, lng: 5.7500 },

  // Display copy for the booking form. Prices here are for show only —
  // the server recalculates the real price from its own tier list. Keep
  // this in sync with server/src/tiers.js when you change pricing.
  TIERS: [
    { id: "bike_light",  label: "Bike – Light Package", desc: "Docs, small parcels, under 5kg", price: 1500 },
    { id: "bike_medium", label: "Bike – Medium Package", desc: "Boxes, groceries, 5–15kg", price: 2500 },
    { id: "bike_rush",   label: "Rush Delivery", desc: "Priority, picked up within 20 mins", price: 3500 },
    { id: "bike_multi",  label: "Multi-Stop Run", desc: "2–4 drop-off points", price: 4500 }
  ]
};
