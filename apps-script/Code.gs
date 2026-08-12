/**
 * Code.gs
 * -------
 * This runs on GOOGLE'S servers (not in the app itself), inside a Google
 * Sheet. It receives sign-ups from the app over the internet and appends
 * each one as a new row.
 *
 * SETUP (see README.md for full step-by-step with screenshots-style detail):
 *  1. Create a Google Sheet (e.g. "RGVBF Outreach Sign-Ups").
 *  2. In that sheet: Extensions > Apps Script.
 *  3. Delete the placeholder code and paste this whole file in.
 *  4. Set SHARED_SECRET below to a random string of your choosing (see README).
 *  5. Click Deploy > New deployment > type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  6. Copy the Web App URL it gives you.
 *  7. Paste that URL into APPS_SCRIPT_URL AND the same secret into
 *     APP_SHARED_SECRET, both near the top of js/app.js.
 *
 * Every time you EDIT this script after the first deployment, you must
 * do Deploy > Manage deployments > Edit (pencil) > New version > Deploy,
 * or your changes won't take effect.
 *
 * WHY A SHARED SECRET?
 * The Web App URL has to be "Anyone" access with no Google login, so that
 * volunteers on personal phones with no RGVBF Google account can submit
 * sign-ups offline. That also means anyone who finds the URL (e.g. by
 * reading js/app.js in the public GitHub repo) could otherwise POST junk
 * rows into this Sheet. Requiring every request to include a matching
 * secret string stops random/bot submissions without adding a login step
 * for volunteers. It's not perfect security -- anyone willing to read the
 * app's source code closely enough can find the secret too -- but it
 * blocks casual and automated abuse, which is the realistic threat here.
 */

const SHEET_NAME = "Sign-Ups"; // change if you want the tab named differently

// Must exactly match APP_SHARED_SECRET in js/app.js. Pick your own random
// string (letters/numbers, 20+ characters is plenty) -- do NOT leave this
// as the placeholder.
const SHARED_SECRET = "e6PEquFDHUXu";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (SHARED_SECRET === "PASTE_YOUR_OWN_RANDOM_SECRET_HERE" || data.secret !== SHARED_SECRET) {
      // Wrong (or unset) secret -- silently reject. Returning "ok" here on
      // purpose would help an attacker probe for the right value; instead
      // we return an error but still HTTP 200 (Apps Script always does),
      // so it doesn't reveal anything useful.
      return jsonResponse({ status: "error", message: "Unauthorized." });
    }

    const sheet = getOrCreateSheet();

    sheet.appendRow([
      new Date(),               // when the server received it
      data.firstName || "",
      data.lastName || "",
      data.country || "",
      data.state || "",
      data.email || "",
      data.eventLocation || "",
      data.createdAt || "",     // when it was actually collected on the device
    ]);

    return jsonResponse({ status: "ok" });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// Lets you open the Web App URL in a browser to sanity-check it's alive.
function doGet(e) {
  return jsonResponse({ status: "ok", message: "RGVBF outreach endpoint is running." });
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
      "Country",
      "State",
      "Email",
      "Location / Event",
      "Collected On Device At",
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
