/**
 * app.js
 * ------
 * Wires up the form, saves every sign-up locally first (offline-first),
 * and syncs anything unsent to a Google Sheet whenever the device has
 * internet.
 *
 * >>> SET THIS to the Web App URL you get after deploying the Apps Script
 *     from the apps-script/Code.gs file in this project (see README.md). <<<
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkraAIb2dDuvs3pG5mxe-IfghuQ15IrOTcbjtqKfz6RuYUK94JKduQi6n1yTaUmr56Yw/exec";

/**
 * >>> SET THIS to the SAME random string you put in SHARED_SECRET at the
 *     top of apps-script/Code.gs. Anyone who has both this URL and this
 *     secret can write to the Sheet, so treat it like a lightweight API
 *     key: don't post it anywhere public outside this file. <<<
 */
const APP_SHARED_SECRET = "e6PEquFDHUXu";

const LAST_EVENT_KEY = "rgvbf_last_event_location";
const COLLECTED_BY_KEY = "rgvbf_collected_by";

const form = document.getElementById("contactForm");
const fields = {
  firstName: document.getElementById("firstName"),
  lastName: document.getElementById("lastName"),
  email: document.getElementById("email"),
  country: document.getElementById("country"),
  state: document.getElementById("state"),
  stateOther: document.getElementById("stateOther"),
};
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const syncBtn = document.getElementById("syncBtn");
const syncBtnLabel = document.getElementById("syncBtnLabel");
const pendingPill = document.getElementById("pendingPill");
const toastEl = document.getElementById("toast");
const submitBtn = document.getElementById("submitBtn");
const dataSummaryEl = document.getElementById("dataSummary");
const dataSummaryTopEl = document.getElementById("dataSummaryTop");
const setupWarningEl = document.getElementById("setupWarning");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearSyncedBtn = document.getElementById("clearSyncedBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const eventNameDisplay = document.getElementById("eventNameDisplay");
const changeEventBtn = document.getElementById("changeEventBtn");
const collectedByDisplay = document.getElementById("collectedByDisplay");
const changeCollectedByBtn = document.getElementById("changeCollectedByBtn");

// ---------- Event / Location (admin-set, not part of the volunteer form) ----------
// This used to be a field every volunteer filled in on every sign-up. Now
// it's set once by whoever's setting up the device before an event, via the
// small "Change" link, and every sign-up on this device silently uses that
// same value until someone changes it again -- one less thing to type (or
// get wrong) per person signed up.
let currentEventLocation = "";

function refreshEventDisplay() {
  eventNameDisplay.textContent = currentEventLocation || "Not set — tap Change";
}
function loadLastEvent() {
  currentEventLocation = (localStorage.getItem(LAST_EVENT_KEY) || "").trim();
  refreshEventDisplay();
}
function rememberEvent(value) {
  currentEventLocation = value.trim();
  localStorage.setItem(LAST_EVENT_KEY, currentEventLocation);
  refreshEventDisplay();
  refreshSetupWarning();
}
loadLastEvent();

changeEventBtn.addEventListener("click", () => {
  const next = window.prompt(
    "Event / Location name for sign-ups collected on this device:",
    currentEventLocation
  );
  if (next === null) return; // cancelled
  if (!next.trim()) {
    showToast("Event/Location can't be blank.");
    return;
  }
  rememberEvent(next);
  showToast(`Now collecting for: ${currentEventLocation}`);
});

// ---------- Collected By (admin-set, not part of the volunteer form) ----------
// Same pattern as Event/Location: there's no way for a website to see the
// device's actual name or the phone's owner/account name (browsers don't
// expose that, on purpose, for privacy reasons) -- so instead, whoever's
// using a given phone/tablet sets their own name (or a device label like
// "Table 2 iPad") once, and it's silently attached to every sign-up from
// that device afterward. Required, like Event/Location, since knowing who
// collected each entry is the whole point of adding this.
let currentCollectedBy = "";

function refreshCollectedByDisplay() {
  collectedByDisplay.textContent = currentCollectedBy || "Not set — tap Change";
}
function loadLastCollectedBy() {
  currentCollectedBy = (localStorage.getItem(COLLECTED_BY_KEY) || "").trim();
  refreshCollectedByDisplay();
}
function rememberCollectedBy(value) {
  currentCollectedBy = value.trim();
  localStorage.setItem(COLLECTED_BY_KEY, currentCollectedBy);
  refreshCollectedByDisplay();
  refreshSetupWarning();
}
loadLastCollectedBy();

// ---------- "setup needed" banner ----------
// The Event / Collected by controls now live in the "Event setup" card near
// the bottom of the page, out of the volunteer's way. The downside is that
// nothing up top would reveal an un-set device until someone tried to Save
// and got rejected -- so show a banner near the form, but ONLY while
// something is actually missing. Normal (fully set up) state shows nothing.
function refreshSetupWarning() {
  const missing = [];
  if (!currentEventLocation) missing.push("Event");
  if (!currentCollectedBy) missing.push("Collected by");

  if (missing.length === 0) {
    setupWarningEl.style.display = "none";
    return;
  }

  setupWarningEl.textContent =
    `Setup needed: ${missing.join(" and ")} not set — ` +
    `scroll down to "Event setup" before collecting sign-ups.`;
  setupWarningEl.style.display = "";
}
refreshSetupWarning();

changeCollectedByBtn.addEventListener("click", () => {
  const next = window.prompt(
    "Your name or a label for this device (e.g. \"Maria\" or \"Table 2 iPad\"):",
    currentCollectedBy
  );
  if (next === null) return; // cancelled
  if (!next.trim()) {
    showToast("Collected By can't be blank.");
    return;
  }
  rememberCollectedBy(next);
  showToast(`Now logging sign-ups as collected by: ${currentCollectedBy}`);
});

// ---------- country / state (both optional) ----------
// The State dropdown only makes sense for US (or unspecified) addresses.
// For any other explicitly-chosen country, swap it for a free-text
// "State / Province / Region" box instead, since "state" isn't a universal
// concept. Neither field is required -- someone can leave both on "Prefer
// not to say" and submit just fine.
function isUnitedStatesOrUnset() {
  return fields.country.value === "United States" || fields.country.value === "";
}
function updateStateFieldVisibility() {
  const showStateDropdown = isUnitedStatesOrUnset();
  fields.state.style.display = showStateDropdown ? "" : "none";
  fields.stateOther.style.display = showStateDropdown ? "none" : "";
}
fields.country.addEventListener("change", updateStateFieldVisibility);
updateStateFieldVisibility();

function currentStateValue() {
  return isUnitedStatesOrUnset() ? fields.state.value : fields.stateOther.value.trim();
}

// ---------- validation ----------
function isValidEmail(value) {
  // Email is required, so an empty value is invalid here.
  if (!value || !value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateForm() {
  let valid = true;

  const checks = [
    [fields.firstName, fields.firstName.value.trim().length > 0],
    [fields.lastName, fields.lastName.value.trim().length > 0],
    [fields.email, isValidEmail(fields.email.value)],
  ];

  checks.forEach(([input, ok]) => {
    const fieldWrapper = input.closest(".field") || input.parentElement;
    fieldWrapper.classList.toggle("invalid", !ok);
    if (!ok) valid = false;
  });

  return valid;
}

// ---------- toast ----------
let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// ---------- online/offline status ----------
function refreshStatusBar() {
  const online = navigator.onLine;
  statusBar.classList.toggle("online", online);
  statusBar.classList.toggle("offline", !online);
  statusText.textContent = online ? "Online" : "Offline — saving locally";
}
window.addEventListener("online", () => {
  refreshStatusBar();
  syncPending();
});
window.addEventListener("offline", refreshStatusBar);

// ---------- pending count pill ----------
async function refreshPendingPill() {
  const count = await RgvbfDB.countUnsynced();
  pendingPill.style.display = count > 0 ? "inline-block" : "none";
  pendingPill.textContent = count;
}

// ---------- "stored on this device" summary (shown both near the top and
// again down by the Export/Clear tools) ----------
async function refreshDataSummary() {
  const [total, pending] = await Promise.all([RgvbfDB.countAll(), RgvbfDB.countUnsynced()]);
  const synced = total - pending;

  let fullText;
  let topText;
  if (total === 0) {
    fullText = "No sign-ups stored on this device yet.";
    topText = "0 sign-ups stored on this device";
  } else {
    fullText =
      `${total} sign-up${total === 1 ? "" : "s"} total — ` +
      `${synced} synced, ${pending} pending sync.`;
    topText =
      `${total} sign-up${total === 1 ? "" : "s"} stored on this device` +
      (pending > 0 ? ` (${pending} pending sync)` : "");
  }

  dataSummaryEl.textContent = fullText;
  dataSummaryTopEl.textContent = topText;
}

// ---------- CSV export ----------
function csvEscape(value) {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function recordsToCsv(records) {
  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Location / Event",
    "Collected On Device At",
    "Country",
    "State",
    "Collected By",
    "Synced To Sheet",
    "Synced At",
  ];
  const rows = records.map((r) => [
    r.firstName,
    r.lastName,
    r.email,
    r.eventLocation,
    r.createdAt,
    r.country || "",
    r.state || "",
    r.collectedBy || "",
    r.synced ? "Yes" : "No",
    r.syncedAt || "",
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

async function exportCsv() {
  const records = await RgvbfDB.getAll();
  if (records.length === 0) {
    showToast("No sign-ups stored on this device yet.");
    return;
  }

  const csv = recordsToCsv(records);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `rgvbf-outreach-signups-${stamp}.csv`;

  // On phones/tablets that support it, this opens the native share sheet
  // (Gmail, Outlook, Drive, Files, AirDrop, etc.) so a volunteer can send
  // the file straight to email or cloud storage without any extra setup.
  try {
    const file = new File([csv], filename, { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "RGVBF Outreach Sign-Ups",
        text: `${records.length} sign-up${records.length === 1 ? "" : "s"} exported from the RGVBF Outreach app.`,
      });
      showToast(`Exported ${records.length} sign-up${records.length === 1 ? "" : "s"}.`);
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") {
      // Volunteer opened the share sheet and cancelled -- not an error.
      return;
    }
    // Sharing failed for some other reason (unsupported combo, etc.) --
    // fall through to a plain download instead.
  }

  // Fallback: a normal file download (works in every browser, including desktop).
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`Exported ${records.length} sign-up${records.length === 1 ? "" : "s"}.`);
}

exportCsvBtn.addEventListener("click", () => {
  exportCsv().catch((err) => {
    console.error(err);
    showToast("Couldn't export right now. Please try again.");
  });
});

// ---------- clearing stored records ----------
clearSyncedBtn.addEventListener("click", async () => {
  const total = await RgvbfDB.countAll();
  const pending = await RgvbfDB.countUnsynced();
  const syncedCount = total - pending;

  if (syncedCount === 0) {
    showToast("Nothing to clear — no synced sign-ups yet.");
    return;
  }

  const confirmed = window.confirm(
    `Clear ${syncedCount} sign-up${syncedCount === 1 ? "" : "s"} already synced to the Google Sheet?\n\n` +
      `They will stay in the Sheet — this only removes them from this device. This can't be undone.`
  );
  if (!confirmed) return;

  const removed = await RgvbfDB.deleteSynced();
  showToast(`Cleared ${removed} synced sign-up${removed === 1 ? "" : "s"} from this device.`);
  await refreshPendingPill();
  await refreshDataSummary();
});

clearAllBtn.addEventListener("click", async () => {
  const total = await RgvbfDB.countAll();
  const pending = await RgvbfDB.countUnsynced();

  if (total === 0) {
    showToast("Nothing to clear — this device has no stored sign-ups.");
    return;
  }

  let warning = `Clear ALL ${total} sign-up${total === 1 ? "" : "s"} stored on this device?\n\nThis can't be undone.`;
  if (pending > 0) {
    warning =
      `This device has ${pending} sign-up${pending === 1 ? "" : "s"} NOT YET synced to the Google Sheet.\n\n` +
      `Clearing now will permanently delete ${pending === 1 ? "it" : "them"} before ${pending === 1 ? "it" : "they"} ` +
      `ever reach${pending === 1 ? "es" : ""} the Sheet, along with everything else on this device (${total} total).\n\n` +
      `Export a CSV backup first if you're not sure. Continue anyway?`;
  }

  const confirmed = window.confirm(warning);
  if (!confirmed) return;

  const removed = await RgvbfDB.deleteAll();
  showToast(`Cleared all ${removed} sign-up${removed === 1 ? "" : "s"} from this device.`);
  await refreshPendingPill();
  await refreshDataSummary();
});

// ---------- form submit: ALWAYS save locally first ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentEventLocation) {
    showToast('Set the Event first — see "Event setup" at the bottom of this page.');
    return;
  }

  if (!currentCollectedBy) {
    showToast('Set "Collected by" first — see "Event setup" at the bottom of this page.');
    return;
  }

  if (!validateForm()) {
    showToast("Please fix the highlighted fields.");
    return;
  }

  submitBtn.disabled = true;

  const record = {
    firstName: fields.firstName.value.trim(),
    lastName: fields.lastName.value.trim(),
    email: fields.email.value.trim(),
    country: fields.country.value,
    state: currentStateValue(),
    eventLocation: currentEventLocation,
    collectedBy: currentCollectedBy,
  };

  try {
    await RgvbfDB.addContact(record);

    showToast(`Saved ${record.firstName} ${record.lastName}. Ready for the next person!`);

    // Reset the personal + optional fields; the event/location isn't a form
    // field anymore, so it's untouched here.
    fields.firstName.value = "";
    fields.lastName.value = "";
    fields.email.value = "";
    fields.country.value = "";
    fields.state.value = "";
    fields.stateOther.value = "";
    updateStateFieldVisibility();
    fields.firstName.focus();

    await refreshPendingPill();
    await refreshDataSummary();

    if (navigator.onLine) syncPending();
  } catch (err) {
    console.error(err);
    showToast("Something went wrong saving this entry. Please try again.");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- syncing to Google Sheets ----------
let syncing = false;

async function syncPending() {
  if (syncing) return;
  if (!navigator.onLine) return;
  if (APPS_SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    return; // not configured yet — silently skip so offline saving still works
  }

  const unsynced = await RgvbfDB.getUnsynced();
  if (unsynced.length === 0) return;

  syncing = true;
  syncBtnLabel.textContent = "Syncing…";
  let successCount = 0;
  let failed = false;

  for (const record of unsynced) {
    const payload = JSON.stringify({ ...record, secret: APP_SHARED_SECRET });
    let delivered = false;

    try {
      // Prefer navigator.sendBeacon: it's built specifically for "fire this
      // request and don't wait for a response" delivery, and -- unlike
      // fetch() -- browsers keep it alive even if the tab/app gets
      // backgrounded or the screen locks right after tapping Sync (a very
      // realistic scenario for a volunteer at a table). This is the main
      // fix for syncing that silently never completes on some phones
      // (observed on iPhone) while working fine on desktop.
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
        delivered = navigator.sendBeacon(APPS_SCRIPT_URL, blob);
      }

      if (!delivered) {
        // Fallback for browsers without sendBeacon, or if it couldn't be
        // queued (e.g. over its small size limit -- shouldn't happen for
        // one record, but just in case).
        //
        // Two deliberate choices here to work reliably with Google Apps
        // Script:
        //  1. Content-Type "text/plain" (not "application/json") keeps this
        //     a "simple request" so the browser doesn't send a CORS
        //     preflight (an OPTIONS request) first -- Apps Script Web Apps
        //     don't handle those.
        //  2. mode: "no-cors" means we fire the request and don't try to
        //     read the response back. Apps Script's own response headers
        //     vary, and if the browser can't read them it normally *fails
        //     the whole request* even though the row was already written to
        //     the Sheet -- which would make the app retry forever and
        //     create duplicate rows.
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: payload,
        });
        delivered = true;
      }
    } catch (err) {
      delivered = false;
    }

    if (!delivered) {
      // Genuine failure to even send the request. Stop here; we'll retry
      // automatically (see the periodic retry below) or on the next manual
      // tap / "online" event.
      failed = true;
      break;
    }

    await RgvbfDB.markSynced(record.id);
    successCount++;
  }

  syncing = false;
  syncBtnLabel.textContent = "Sync now";
  await refreshPendingPill();
  await refreshDataSummary();

  if (successCount > 0) {
    showToast(`Synced ${successCount} sign-up${successCount === 1 ? "" : "s"} to the Google Sheet.`);
  } else if (failed) {
    // Previously this failed completely silently, which left people staring
    // at a pending count that never moved with no idea why. Now at least
    // say something -- the automatic retry (below) will keep trying.
    showToast("Couldn't sync right now. Will keep trying automatically.");
  }
}

syncBtn.addEventListener("click", () => {
  if (!navigator.onLine) {
    showToast("Still offline — entries are saved and will sync automatically once you're back online.");
    return;
  }
  syncPending();
});

// ---------- register the service worker (offline app shell) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}

// ---------- periodic auto-retry ----------
// Sync isn't guaranteed to succeed on the first try on every device/network
// (mobile connections drop, phones get backgrounded mid-request, etc.), and
// a volunteer at a table won't necessarily notice a stuck "pending" count or
// remember to keep tapping Sync. Quietly retry every 45 seconds whenever the
// device is online and something is still waiting.
setInterval(() => {
  if (navigator.onLine) syncPending();
}, 45000);

// Also retry whenever the app comes back into view/foreground (e.g. a
// volunteer switches back to it after using another app) or the screen
// wakes up, since that's often exactly when a phone regains connectivity.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && navigator.onLine) {
    syncPending();
  }
});

// ---------- init ----------
refreshStatusBar();
refreshPendingPill();
refreshDataSummary();
if (navigator.onLine) syncPending();
