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

// ---------------------------------------------------------------------
// Smart delivery estimate — geocodes both addresses (via our backend,
// which proxies OpenStreetMap's free Nominatim service), then computes
// straight-line distance and a rough delivery time estimate. Not GPS-route
// accurate, but gives customers a useful ballpark instantly, for free.
// ---------------------------------------------------------------------
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(address) {
  try {
    const data = await apiFetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    return data.found ? { lat: data.lat, lng: data.lng } : null;
  } catch {
    return null;
  }
}

// Rough estimate: straight-line distance x a routing-inflation factor
// (real roads are never straight lines) at an assumed average bike speed
// for city traffic, plus a fixed pickup/handoff buffer.
async function estimateDelivery(pickupAddress, dropoffAddress) {
  const [from, to] = await Promise.all([geocode(pickupAddress), geocode(dropoffAddress)]);
  if (!from || !to) return null;

  const straightLineKm = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const roadDistanceKm = straightLineKm * 1.3; // rough road-vs-straight-line correction
  const avgSpeedKmh = 22; // conservative city bike speed accounting for traffic/stops
  const travelMinutes = (roadDistanceKm / avgSpeedKmh) * 60;
  const estimatedMinutes = Math.round(travelMinutes + 10); // + pickup/handoff buffer

  return {
    distanceKm: Math.round(roadDistanceKm * 10) / 10,
    estimatedMinutes
  };
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---------------------------------------------------------------------
// FAQ assistant — a lightweight, rule-based chat widget (keyword matching,
// no external API, no ongoing cost). Answers common questions instantly.
// This is NOT a general-purpose AI model; it's a fixed set of canned
// answers. A true LLM-powered version is possible later but needs an API
// key and has a per-message cost — ask if you want that upgrade.
// ---------------------------------------------------------------------
const FAQ_RULES = [
  { keywords: ["hour", "open", "close", "available", "time"], answer: "We're generally available every day — check the status chip on the booking page to see if a rider is online right now." },
  { keywords: ["price", "cost", "how much", "fee", "charge"], answer: "Pricing depends on delivery type: Light Package ₦1,500 · Medium Package ₦2,500 · Rush Delivery ₦3,500 · Multi-Stop Run ₦4,500." },
  { keywords: ["track", "where is my", "status", "delivered yet"], answer: "You can track any delivery in real time on our Track Delivery page using the tracking code from your booking confirmation." },
  { keywords: ["contact", "call", "whatsapp", "phone", "reach"], answer: "You can call us or reach us on WhatsApp — use the WhatsApp link on the booking page for the fastest response." },
  { keywords: ["cancel", "refund"], answer: "If your delivery hasn't been picked up yet, contact us directly via WhatsApp and we'll sort out a cancellation or refund." },
  { keywords: ["how", "book", "work"], answer: "Sign up or log in, tap Book Delivery, fill in pickup/drop-off details, pay to confirm, and you'll get a tracking code instantly." },
  { keywords: ["pay", "payment", "paystack"], answer: "Payments are handled securely through Paystack — card, bank transfer, or USSD are all supported." },
  { keywords: ["driver", "rider"], answer: "Our riders are verified with license and bank details on file. You'll see live tracking once a rider picks up your delivery." }
];

function matchFaq(message) {
  const lower = message.toLowerCase();
  for (const rule of FAQ_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.answer;
  }
  return "I'm not sure about that one — for anything specific, message us directly on WhatsApp and a real person will help.";
}

function initFaqWidget() {
  const bubble = document.createElement("button");
  bubble.textContent = "💬";
  bubble.setAttribute("aria-label", "Chat with us");
  Object.assign(bubble.style, {
    position: "fixed", bottom: "20px", right: "20px", width: "54px", height: "54px",
    borderRadius: "50%", background: "var(--yellow)", color: "var(--ink)", border: "none",
    fontSize: "1.4rem", cursor: "pointer", boxShadow: "0 8px 20px rgba(0,0,0,0.3)", zIndex: "999"
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed", bottom: "84px", right: "20px", width: "300px", maxWidth: "calc(100vw - 40px)",
    maxHeight: "420px", background: "var(--panel)", border: "1px solid var(--panel-line)",
    borderRadius: "14px", display: "none", flexDirection: "column", overflow: "hidden", zIndex: "999"
  });
  panel.innerHTML = `
    <div style="padding:14px 16px; background:var(--ink-soft); font-weight:600; font-size:0.9rem;">Quick help</div>
    <div id="faq-messages" style="flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; max-height:280px;">
      <div style="background:var(--ink-soft); padding:10px 12px; border-radius:10px; font-size:0.85rem;">Hi! Ask about pricing, tracking, hours, or how booking works.</div>
    </div>
    <form id="faq-form" style="display:flex; gap:8px; padding:12px; border-top:1px solid var(--panel-line);">
      <input id="faq-input" type="text" placeholder="Ask a question…" style="flex:1; padding:10px; font-size:0.85rem;">
      <button type="submit" class="btn btn-primary" style="padding:10px 14px; font-size:0.85rem;">Send</button>
    </form>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  bubble.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  });

  panel.querySelector("#faq-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = panel.querySelector("#faq-input");
    const messages = panel.querySelector("#faq-messages");
    const question = input.value.trim();
    if (!question) return;

    const userBubble = document.createElement("div");
    userBubble.style.cssText = "background:var(--blue); color:var(--paper); padding:10px 12px; border-radius:10px; font-size:0.85rem; align-self:flex-end; max-width:85%;";
    userBubble.textContent = question;
    messages.appendChild(userBubble);

    const answerBubble = document.createElement("div");
    answerBubble.style.cssText = "background:var(--ink-soft); padding:10px 12px; border-radius:10px; font-size:0.85rem; max-width:85%;";
    answerBubble.textContent = matchFaq(question);
    messages.appendChild(answerBubble);

    input.value = "";
    messages.scrollTop = messages.scrollHeight;
  });
}

// Applies rider name/city/tiers from config.js into any element with data-rr-* attrs
function applyBrandTokens() {
  document.querySelectorAll("[data-rr-rider]").forEach(el => el.textContent = RUSHRIDA_CONFIG.BUSINESS_NAME);
  document.querySelectorAll("[data-rr-city]").forEach(el => el.textContent = RUSHRIDA_CONFIG.SERVICE_CITY);
}
document.addEventListener("DOMContentLoaded", applyBrandTokens);
