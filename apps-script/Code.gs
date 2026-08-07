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
 *  4. Click Deploy > New deployment > type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Copy the Web App URL it gives you.
 *  6. Paste that URL into APPS_SCRIPT_URL near the top of js/app.js.
 *
 * Every time you EDIT this script after the first deployment, you must
 * do Deploy > Manage deployments > Edit (pencil) > New version > Deploy,
 * or your changes won't take effect.
 */

const SHEET_NAME = "Sign-Ups"; // change if you want the tab named differently

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      new Date(),               // when the server received it
      data.firstName || "",
      data.lastName || "",
      data.phone || "",
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
      "Phone",
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
