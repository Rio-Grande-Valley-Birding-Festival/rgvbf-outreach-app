/**
 * Code.gs
 * -------
 * This runs on GOOGLE'S servers (not in the app itself), inside a Google
 * Sheet. It receives sign-ups and appends each one as a new row.
 *
 * Two things write to it:
 *   1. The volunteer app (index.html + js/app.js) — staff at events.
 *   2. The QR sign-up page (qr/index.html) — the public, from printed codes.
 *
 * Both land in the same "Sign-Ups" tab with the same columns. QR sign-ups
 * are identifiable by "QR Code" in the Collected By column.
 *
 * SETUP (see README.md for the full step-by-step):
 *  1. Create a Google Sheet (e.g. "RGVBF Outreach Sign-Ups").
 *  2. In that sheet: Extensions > Apps Script.
 *  3. Delete the placeholder code and paste this whole file in.
 *  4. Set SHARED_SECRET and QR_SHARED_SECRET below to two DIFFERENT random
 *     strings of your choosing (see README).
 *  5. Click Deploy > New deployment > type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  6. Copy the Web App URL it gives you.
 *  7. Paste that URL into:
 *       - APPS_SCRIPT_URL + APP_SHARED_SECRET   in js/app.js
 *       - APPS_SCRIPT_URL + QR_SHARED_SECRET    in qr/js/qr-config.js
 *
 * Every time you EDIT this script after the first deployment, you must do
 * Deploy > Manage deployments > Edit (pencil) > New version > Deploy, or
 * your changes won't take effect.
 *
 * WHY SHARED SECRETS?
 * The Web App URL has to be "Anyone" access with no Google login, so that
 * volunteers on personal phones with no RGVBF Google account can submit
 * sign-ups offline -- and so the public can sign up from a magazine. That
 * also means anyone who finds the URL could otherwise POST junk rows into
 * this Sheet. Requiring a matching secret stops random/bot submissions
 * without adding a login step. It's not perfect security -- anyone willing
 * to read the app's source closely enough will find the secret too -- but
 * it blocks casual and automated abuse, which is the realistic threat.
 *
 * WHY TWO SECRETS?
 * The QR page is printed in magazines and handed to the general public, so
 * its secret is by far the most exposed. Keeping it separate means that if
 * it ever gets scraped and abused, you rotate QR_SHARED_SECRET alone: the
 * printed codes keep working (they only point at a URL) and the volunteer
 * app and every phone running it are untouched.
 */

const SHEET_NAME = "Sign-Ups"; // change if you want the tab named differently

// Volunteer app secret. Must match APP_SHARED_SECRET in js/app.js.
// Pick your own random string, 20+ characters.
const SHARED_SECRET = "PASTE_YOUR_OWN_RANDOM_SECRET_HERE";

// Public QR page secret. Must match QR_SHARED_SECRET in qr/js/qr-config.js.
// MUST be a DIFFERENT string from SHARED_SECRET above.
const QR_SHARED_SECRET = "PASTE_A_DIFFERENT_RANDOM_SECRET_HERE";

// What the Collected By column says for QR sign-ups. Forced server-side, so
// a tampered-with page still can't disguise a QR entry as a volunteer one.
const QR_COLLECTED_BY = "QR Code";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Empty request." });
    }

    const data = JSON.parse(e.postData.contents);
    const source = identifySource(data.secret);

    if (source === null) {
      // Wrong (or unset) secret -- reject. Returning "ok" here on purpose
      // would help an attacker probe for the right value; instead we return
      // an error but still HTTP 200 (Apps Script always does), so it doesn't
      // reveal anything useful.
      return jsonResponse({ status: "error", message: "Unauthorized." });
    }

    // Two identical submissions can legitimately arrive when a browser
    // couldn't read our reply to the first one and retried. Without this
    // check that produces a duplicate row; with it, the retry is a no-op
    // and the sender still gets a clean "ok".
    if (data.submissionId && alreadyRecorded(data.submissionId)) {
      return jsonResponse({ status: "ok", message: "Already recorded." });
    }

    // Serialize appends so two simultaneous scans can't land on the same row.
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = getOrCreateSheet();
      sheet.appendRow([
        new Date(),               // when the server received it
        data.firstName || "",
        data.lastName || "",
        data.email || "",
        data.eventLocation || "",
        data.createdAt || "",     // when it was actually collected on the device
        data.country || "",       // optional -- may be blank
        data.state || "",         // optional -- may be blank
        // Volunteers send their own name/device label. QR sign-ups get the
        // fixed label regardless of what the page claimed.
        source === "qr" ? QR_COLLECTED_BY : (data.collectedBy || ""),
      ]);
      if (data.submissionId) markRecorded(data.submissionId);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ status: "ok" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Lets you open the Web App URL in a browser to sanity-check it's alive.
function doGet(e) {
  return jsonResponse({ status: "ok", message: "RGVBF outreach endpoint is running." });
}

/**
 * Returns "app" for the volunteer app, "qr" for the public QR page, or
 * null if the secret is missing, wrong, or still a placeholder.
 */
function identifySource(secret) {
  if (!secret) return null;
  if (SHARED_SECRET.indexOf("PASTE_") === -1 && secret === SHARED_SECRET) return "app";
  if (QR_SHARED_SECRET.indexOf("PASTE_") === -1 && secret === QR_SHARED_SECRET) return "qr";
  return null;
}

// Retries happen within seconds, so a short-lived cache is enough -- no need
// to scan the Sheet or keep a permanent list.
function alreadyRecorded(submissionId) {
  return CacheService.getScriptCache().get("sub_" + submissionId) !== null;
}
function markRecorded(submissionId) {
  CacheService.getScriptCache().put("sub_" + submissionId, "1", 21600); // 6 hours
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Received At",
      "First Name",
      "Last Name",
      "Email",
      "Location / Event",
      "Collected On Device At",
      "Country",
      "State",
      "Collected By",
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
