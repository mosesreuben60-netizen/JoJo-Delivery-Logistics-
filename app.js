// ===========================================================
// JoJo Delivery — shared helpers
// Loaded after config.js on every page. Talks to the Railway API
// (no Supabase client involved).
// ===========================================================

const CUSTOMER_TOKEN_KEY = "jojo_customer_token";
const CUSTOMER_PROFILE_KEY = "jojo_customer_profile";

function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}
function setCustomerSession(token, customer) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  if (customer) localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(customer));
}
function getCustomerProfile() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_KEY) || "null"); }
  catch { return null; }
}
function clearCustomerSession() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_PROFILE_KEY);
}

// Wrapper around fetch that talks to the API, attaches the customer's
// token when present, and throws a friendly error on failure.
async function apiFetch(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getCustomerToken();
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
  const phone = RUSHRIDA_CONFIG.WHATSAPP_NUMBER.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Applies rider name/city/tiers from config.js into any element with data-rr-* attrs
function applyBrandTokens() {
  document.querySelectorAll("[data-rr-rider]").forEach(el => el.textContent = RUSHRIDA_CONFIG.BUSINESS_NAME);
  document.querySelectorAll("[data-rr-city]").forEach(el => el.textContent = RUSHRIDA_CONFIG.SERVICE_CITY);
}
document.addEventListener("DOMContentLoaded", applyBrandTokens);
