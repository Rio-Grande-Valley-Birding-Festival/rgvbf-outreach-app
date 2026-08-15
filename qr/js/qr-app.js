/**
 * qr-app.js
 * ---------
 * Public sign-up page reached by scanning a printed QR code.
 *
 * Differences from the volunteer app (js/app.js), and why:
 *
 *  - Location and "Collected By" come from the QR code itself, not from
 *    localStorage settings, and are never rendered as form fields. The
 *    person scanning cannot see or change them.
 *
 *  - No IndexedDB. A member of the public scans once and leaves; there's
 *    no device to keep a roster on. If the network fails mid-submit the
 *    entry parks in localStorage and retries on the next page load, which
 *    covers the realistic case (a moment of bad signal) without the
 *    complexity of a full offline store.
 *
 *  - Every submission carries a random submissionId. Code.gs ignores an
 *    id it has already written, so a retry can never create a duplicate
 *    row. This is what makes it safe to retry at all.
 */

const QUEUE_KEY = "rgvbf_qr_pending";
const PLACEHOLDER = /PASTE_/;

// ---------- which placement is this? ----------
const slug = (new URLSearchParams(location.search).get("src") || "").trim().toLowerCase();

function resolvePlacement() {
  if (QR_CONFIG.PLACEMENTS[slug]) return QR_CONFIG.PLACEMENTS[slug];
  // A typo in a print file shouldn't vanish silently — record it so it
  // shows up in the Sheet as something you can actually notice and fix.
  if (slug) return "Unmapped QR – " + slug;
  return "QR – no source code";
}
const placement = resolvePlacement();

// ---------- elements ----------
const el = (id) => document.getElementById(id);
const form = el("qrForm");
const submitBtn = el("submitBtn");
const fields = {
  firstName: el("firstName"),
  lastName: el("lastName"),
  email: el("email"),
  country: el("country"),
  state: el("state"),
  stateOther: el("stateOther"),
};

// ---------- build the country / state dropdowns from geo.js ----------
function fillSelect(select, items) {
  items.forEach((item) => {
    if (item.divider) {
      const opt = document.createElement("option");
      opt.disabled = true;
      opt.textContent = "──────────";
      select.appendChild(opt);
      return;
    }
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    select.appendChild(opt);
  });
}
fillSelect(fields.country, RGVBF_COUNTRIES);
fillSelect(fields.state, RGVBF_STATES);

// Same rule as the volunteer app: the U.S. state dropdown only makes sense
// for U.S. (or unstated) addresses; anything else gets a free-text box.
function isUnitedStatesOrUnset() {
  return fields.country.value === "United States" || fields.country.value === "";
}
function updateStateFieldVisibility() {
  const showDropdown = isUnitedStatesOrUnset();
  fields.state.style.display = showDropdown ? "" : "none";
  fields.stateOther.style.display = showDropdown ? "none" : "";
}
fields.country.addEventListener("change", updateStateFieldVisibility);
updateStateFieldVisibility();

function currentStateValue() {
  return isUnitedStatesOrUnset() ? fields.state.value : fields.stateOther.value.trim();
}

// ---------- source note ----------
if (QR_CONFIG.SHOW_SOURCE_NOTE && QR_CONFIG.PLACEMENTS[slug]) {
  el("sourceName").textContent = QR_CONFIG.PLACEMENTS[slug];
  el("sourceNote").style.display = "block";
}

// ---------- config guard ----------
// Without this, an unconfigured or mistyped deploy would show every visitor
// a cheerful "You're signed up!" while writing nothing to the Sheet — and
// you wouldn't find out until you went looking for a month of magazine
// sign-ups that were never there.
const misconfigured =
  PLACEHOLDER.test(QR_CONFIG.APPS_SCRIPT_URL) || PLACEHOLDER.test(QR_CONFIG.QR_SHARED_SECRET);

if (misconfigured) {
  el("configWarning").style.display = "block";
  submitBtn.disabled = true;
  submitBtn.textContent = "Not configured yet";
}

// ---------- validation ----------
function isValidEmail(value) {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateForm() {
  let valid = true;
  [
    [fields.firstName, fields.firstName.value.trim().length > 0],
    [fields.lastName, fields.lastName.value.trim().length > 0],
    [fields.email, isValidEmail(fields.email.value)],
  ].forEach(([input, ok]) => {
    (input.closest(".field") || input.parentElement).classList.toggle("invalid", !ok);
    if (!ok) valid = false;
  });
  return valid;
}

// ---------- retry queue ----------
function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch (err) {
    return [];
  }
}
function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (err) {
    /* private browsing / storage full — nothing useful to do */
  }
}
function queueRecord(record) {
  const queue = readQueue();
  queue.push(record);
  writeQueue(queue);
}

// ---------- sending ----------
function newSubmissionId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

/**
 * Returns { ok, confirmed } — `confirmed` true only when the Apps Script
 * actually answered "ok". A readable response is attempted first so a real
 * failure can be reported honestly rather than papered over.
 *
 * The fallback is fire-and-forget: some browsers refuse to expose Apps
 * Script's cross-origin response even when the write succeeded. That means
 * the fallback can re-send a row the first attempt already wrote — which is
 * exactly why every record carries a submissionId that Code.gs de-duplicates.
 */
async function send(record) {
  const payload = JSON.stringify({ ...record, secret: QR_CONFIG.QR_SHARED_SECRET });
  const url = QR_CONFIG.APPS_SCRIPT_URL;
  const headers = { "Content-Type": "text/plain;charset=utf-8" };

  try {
    const res = await fetch(url, { method: "POST", headers, body: payload, redirect: "follow" });
    const data = await res.json();
    if (data && data.status === "ok") return { ok: true, confirmed: true };
    return { ok: false, confirmed: true, message: (data && data.message) || "Rejected." };
  } catch (err) {
    /* couldn't read the response — fall through */
  }

  try {
    await fetch(url, { method: "POST", mode: "no-cors", headers, body: payload });
    return { ok: true, confirmed: false };
  } catch (err) {
    return { ok: false, confirmed: false, network: true };
  }
}

async function flushQueue() {
  const queue = readQueue();
  if (!queue.length || misconfigured || !navigator.onLine) return;

  const remaining = [];
  for (const record of queue) {
    const result = await send(record);
    if (!result.ok && result.network) remaining.push(record);
  }
  writeQueue(remaining);
}

// ---------- submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Bots fill hidden fields; people can't see them.
  if (el("website").value) {
    showDone();
    return;
  }
  if (!validateForm()) {
    const firstBad = form.querySelector(".field.invalid input");
    if (firstBad) firstBad.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing you up…";

  const record = {
    submissionId: newSubmissionId(),
    firstName: fields.firstName.value.trim(),
    lastName: fields.lastName.value.trim(),
    email: fields.email.value.trim(),
    country: fields.country.value,
    state: currentStateValue(),
    eventLocation: placement,
    collectedBy: QR_CONFIG.COLLECTED_BY,
    createdAt: new Date().toISOString(),
  };

  const result = await send(record);

  if (result.ok) {
    showDone();
    return;
  }

  if (result.network) {
    // Genuinely offline. Keep it and retry when they next open the page.
    queueRecord(record);
    showDone(true);
    return;
  }

  // The server answered and said no — almost always a wrong secret.
  submitBtn.disabled = false;
  submitBtn.textContent = "Sign me up";
  el("submitError").style.display = "block";
});

function showDone(queued) {
  el("formView").style.display = "none";
  el("doneView").style.display = "block";
  if (queued) {
    el("doneMessage").textContent =
      "You're signed up. Your connection dropped, so we'll finish sending it " +
      "automatically — you don't need to do anything.";
  }
  window.scrollTo(0, 0);
}

// ---------- retry anything left over from a previous visit ----------
flushQueue();
window.addEventListener("online", flushQueue);
