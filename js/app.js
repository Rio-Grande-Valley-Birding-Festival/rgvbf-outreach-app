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

const form = document.getElementById("contactForm");
const fields = {
  firstName: document.getElementById("firstName"),
  lastName: document.getElementById("lastName"),
  country: document.getElementById("country"),
  state: document.getElementById("state"),
  stateOther: document.getElementById("stateOther"),
  email: document.getElementById("email"),
  eventLocation: document.getElementById("eventLocation"),
};
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const syncBtn = document.getElementById("syncBtn");
const syncBtnLabel = document.getElementById("syncBtnLabel");
const pendingPill = document.getElementById("pendingPill");
const toastEl = document.getElementById("toast");
const submitBtn = document.getElementById("submitBtn");
const dataSummaryEl = document.getElementById("dataSummary");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const clearSyncedBtn = document.getElementById("clearSyncedBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

// ---------- "remember the last event/location" ----------
// Pre-fill the Location/Event field with whatever was used last time,
// so a volunteer working one table/event all day doesn't retype it for
// every single sign-up. It stays as the default the NEXT time the app
// is launched too, until someone types a different value.
function loadLastEvent() {
  const saved = localStorage.getItem(LAST_EVENT_KEY);
  if (saved) fields.eventLocation.value = saved;
}
function rememberEvent(value) {
  localStorage.setItem(LAST_EVENT_KEY, value.trim());
}
loadLastEvent();

// ---------- country / state ----------
// The State dropdown only makes sense for US addresses. For any other
// country, swap it for a free-text "State / Province / Region" box instead,
// since "state" isn't a universal concept (provinces, regions, etc.).
function isUnitedStates() {
  return fields.country.value === "United States";
}
function updateStateFieldVisibility() {
  const usa = isUnitedStates();
  fields.state.style.display = usa ? "" : "none";
  fields.stateOther.style.display = usa ? "none" : "";
}
fields.country.addEventListener("change", updateStateFieldVisibility);
updateStateFieldVisibility();

function currentStateValue() {
  return isUnitedStates() ? fields.state.value : fields.stateOther.value.trim();
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
    [fields.country, fields.country.value.trim().length > 0],
    [isUnitedStates() ? fields.state : fields.stateOther, currentStateValue().length > 0],
    [fields.eventLocation, fields.eventLocation.value.trim().length > 0],
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

// ---------- "stored on this device" summary ----------
async function refreshDataSummary() {
  const [total, pending] = await Promise.all([RgvbfDB.countAll(), RgvbfDB.countUnsynced()]);
  const synced = total - pending;

  if (total === 0) {
    dataSummaryEl.textContent = "No sign-ups stored on this device yet.";
  } else {
    dataSummaryEl.textContent =
      `${total} sign-up${total === 1 ? "" : "s"} total — ` +
      `${synced} synced, ${pending} pending sync.`;
  }
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
    "Country",
    "State",
    "Email",
    "Location / Event",
    "Collected On Device At",
    "Synced To Sheet",
    "Synced At",
  ];
  const rows = records.map((r) => [
    r.firstName,
    r.lastName,
    r.country,
    r.state,
    r.email,
    r.eventLocation,
    r.createdAt,
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

  if (!validateForm()) {
    showToast("Please fix the highlighted fields.");
    return;
  }

  submitBtn.disabled = true;

  const record = {
    firstName: fields.firstName.value.trim(),
    lastName: fields.lastName.value.trim(),
    country: fields.country.value,
    state: currentStateValue(),
    email: fields.email.value.trim(),
    eventLocation: fields.eventLocation.value.trim(),
  };

  try {
    await RgvbfDB.addContact(record);
    rememberEvent(record.eventLocation);

    showToast(`Saved ${record.firstName} ${record.lastName}. Ready for the next person!`);

    // Reset only the personal fields; keep the event/location as-is.
    fields.firstName.value = "";
    fields.lastName.value = "";
    fields.country.value = "United States";
    fields.state.value = "";
    fields.stateOther.value = "";
    updateStateFieldVisibility();
    fields.email.value = "";
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

  for (const record of unsynced) {
    try {
      // Two deliberate choices here to work reliably with Google Apps Script:
      //  1. Content-Type "text/plain" (not "application/json") keeps this a
      //     "simple request" so the browser doesn't send a CORS preflight
      //     (an OPTIONS request) first -- Apps Script Web Apps don't handle
      //     those.
      //  2. mode: "no-cors" means we fire the request and don't try to read
      //     the response back. Apps Script's own response headers vary, and
      //     if the browser can't read them it normally *fails the whole
      //     request* even though the row was already written to the Sheet
      //     -- which would make the app retry forever and create duplicate
      //     rows. Since Code.gs always returns HTTP 200 for any request it
      //     receives, "the request didn't throw" is a reliable enough
      //     signal that it was delivered.
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...record, secret: APP_SHARED_SECRET }),
      });

      await RgvbfDB.markSynced(record.id);
      successCount++;
    } catch (err) {
      // Genuine network failure (e.g. connection dropped mid-sync).
      // Stop here; we'll retry on the next "online" event or manual tap.
      break;
    }
  }

  syncing = false;
  syncBtnLabel.textContent = "Sync now";
  await refreshPendingPill();
  await refreshDataSummary();

  if (successCount > 0) {
    showToast(`Synced ${successCount} sign-up${successCount === 1 ? "" : "s"} to the Google Sheet.`);
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

// ---------- init ----------
refreshStatusBar();
refreshPendingPill();
refreshDataSummary();
if (navigator.onLine) syncPending();
