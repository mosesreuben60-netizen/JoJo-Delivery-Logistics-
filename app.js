// ===========================================================
// JoJo Delivery — shared helpers
// Loaded after config.js on every page. Talks to the Railway API
// (no Supabase client involved).
// ===========================================================

const DRIVER_TOKEN_KEY = "jojo_driver_token";

function getDriverToken() {
  return localStorage.getItem(DRIVER_TOKEN_KEY);
}
function setDriverToken(token) {
  localStorage.setItem(DRIVER_TOKEN_KEY, token);
}
function clearDriverToken() {
  localStorage.removeItem(DRIVER_TOKEN_KEY);
}

// Wrapper around fetch that talks to the API, attaches the driver's
// token when present, and throws a friendly error on failure.
async function apiFetch(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getDriverToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${RUSHRIDA_CONFIG.API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Generates a short human-friendly tracking code client-side for display
// purposes only — the server always assigns the real one on creation.
function generateTrackingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `RR-${code}`;
}

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

// Status flow used across booking, tracking, and admin
const STATUS_FLOW = [
  { key: "pending",    label: "Booking received" },
  { key: "confirmed",  label: "Rider confirmed" },
  { key: "picked_up",  label: "Package picked up" },
  { key: "in_transit", label: "On the way" },
  { key: "delivered",  label: "Delivered" }
];

function statusIndex(status) {
  const i = STATUS_FLOW.findIndex(s => s.key === status);
  return i === -1 ? 0 : i;
}

function whatsappLink(message) {
  const phone = RUSHRIDA_CONFIG.RIDER_PHONE.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------
// Live location sharing — used on driver.html while a driver is "online".
// Uses the phone's own GPS (via the browser) as the location source.
// Sends an update roughly every 15 seconds, not on every GPS tick, to
// avoid hammering the API and draining battery.
// ---------------------------------------------------------------------
let _locationWatchId = null;
let _lastSentAt = 0;
const LOCATION_SEND_INTERVAL_MS = 15000;

function startSharingLocation(onUpdate) {
  if (!navigator.geolocation) {
    if (onUpdate) onUpdate({ error: "This device/browser doesn't support location sharing." });
    return;
  }
  _locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const now = Date.now();
      if (now - _lastSentAt >= LOCATION_SEND_INTERVAL_MS) {
        _lastSentAt = now;
        apiFetch("/api/drivers/me/location", {
          method: "PATCH",
          auth: true,
          body: { lat: latitude, lng: longitude }
        }).catch(() => {}); // a single dropped update isn't worth surfacing an error
      }
      if (onUpdate) onUpdate({ lat: latitude, lng: longitude });
    },
    (err) => {
      if (onUpdate) onUpdate({ error: "Couldn't get location — check location permissions." });
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

function stopSharingLocation() {
  if (_locationWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(_locationWatchId);
    _locationWatchId = null;
  }
}

// Applies rider name/city/tiers from config.js into any element with data-rr-* attrs
function applyBrandTokens() {
  document.querySelectorAll("[data-rr-rider]").forEach(el => el.textContent = RUSHRIDA_CONFIG.RIDER_NAME);
  document.querySelectorAll("[data-rr-city]").forEach(el => el.textContent = RUSHRIDA_CONFIG.SERVICE_CITY);
}
document.addEventListener("DOMContentLoaded", applyBrandTokens);
