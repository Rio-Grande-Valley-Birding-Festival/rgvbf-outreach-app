/**
 * js/options.js
 * -------------
 * The lists an admin picks from when setting up a device.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS SEPARATE FROM app.js
 * Event and Collected by used to be free-text boxes. Free text is how Cvent
 * ended up holding SEAZ26, SEABF-26, seabf26 and "Southeast Arizona 2026" as
 * four different events, and the website form alone spelled seven ways across
 * 1,393 contacts. Nothing downstream can undo that; the only real fix is to
 * make the wrong value impossible to enter.
 *
 * It is its own file so that adding next year's event is a one-line edit to a
 * list, with no chance of breaking the app while doing it.
 *
 * --------------------------------------------------------------------------
 *  THESE STRINGS MUST MATCH CVENT EXACTLY -- character for character.
 * --------------------------------------------------------------------------
 * Each one is written into a Cvent field on the contact. Cvent rejects
 * anything that is not one of its own dropdown options, so a typo here means
 * that event's sign-ups reach Cvent with no source at all.
 *
 * TO ADD AN EVENT (both steps, in this order):
 *   1. In Apps Script, run addSourceOption('Rio Grande Delta Festival').
 *      That adds it to the Cvent dropdown.
 *   2. Add the identical string to EVENT_OPTIONS below, commit, and bump
 *      CACHE_NAME in service-worker.js so devices pick it up.
 *
 * Step 1 before step 2. An option in the app that does not exist in Cvent
 * silently loses the source on every sign-up that uses it.
 */

/* Booth and tabling events only. -> Cvent "Outreach Source".
 *
 * Deliberately NOT here, even though they are valid Cvent options: "Website
 * Form", "Email Campaign", "Guest of Registrant" and "QR Code". Those
 * describe how a sign-up arrived, not a table a volunteer is standing at --
 * the website form and the QR endpoint set them on their own, and a
 * volunteer picking one by accident would be a lie in the data.
 *
 * Alphabetical except for the last two: "Referral" and "Other" sit at the
 * bottom because they are the fallbacks, not events. */
const EVENT_OPTIONS = [
  "Biggest Week",
  "Brownsville",
  "Cape May",
  "San Diego",
  "Southeast Arizona",
  "Space Coast",
  "Texas Master Naturalists",
  "Tubac",
  "Referral",
  "Other",
];

/* How the sign-up was captured. -> Cvent "Designation".
 *
 * This used to be a free-text box holding a volunteer's name or a device
 * label ("Maria", "Table 2 iPad"). It is now the capture method, because
 * that is what Cvent needs. Who collected a sign-up moved to the separate,
 * optional Volunteer setting, which stays on the sheet and is never sent to
 * Cvent. */
const COLLECTED_BY_OPTIONS = ["Tablet", "Phone", "QR Code"];

/* Devices already in the field have a value saved in localStorage from the
 * old free-text days. Anything not recognised here is treated as unset and
 * the admin is asked to pick again -- which is the point. These two are
 * mapped rather than cleared only because they are unambiguous. */
const LEGACY_COLLECTED_BY = {
  "outreach tablet": "Tablet",
  "outreach phone": "Phone",
};

/* The Volunteer setting is deliberately NOT a list. It is a free-text name,
 * optional, set once per device by whoever is working that table, and it
 * never leaves the spreadsheet -- so a typo in it costs nothing, and a fixed
 * list of volunteer names would need editing before every event. */
