/**
 * qr-config.js
 * ------------
 * The only file you need to edit to add or change QR codes.
 *
 * Each QR code points at this page with a short code on the end:
 *
 *     https://YOUR-SITE/qr/?src=rgv-vision-aug-2026
 *                                 ^^^^^^^^^^^^^^^^^^
 *                                 the "slug"
 *
 * The slug decides what gets written into the Location / Event column.
 * The person scanning never sees it and can't change it.
 */

const QR_CONFIG = {

  /* ---------------------------------------------------------------
     1. Where sign-ups go.
     Use the SAME Web App URL as the volunteer app (js/app.js) —
     both write to the same Sheet, same columns.
     --------------------------------------------------------------- */
  APPS_SCRIPT_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",

  /* ---------------------------------------------------------------
     2. The QR secret.

     IMPORTANT: this must NOT be the same string as the volunteer
     app's APP_SHARED_SECRET. Set QR_SHARED_SECRET in Code.gs to a
     second, different random string and paste it here.

     Why separate: this page is public and printed in magazines, so
     its secret is the most exposed thing you have. Keeping it
     separate means that if it ever gets abused, you rotate this one
     string and every printed QR keeps working — without touching the
     volunteer app or the phones already using it.
     --------------------------------------------------------------- */
  QR_SHARED_SECRET: "PASTE_A_DIFFERENT_RANDOM_SECRET_HERE",

  /* ---------------------------------------------------------------
     3. What lands in the "Collected By" column for QR sign-ups.
     Code.gs enforces this server-side too, so it can't be faked.
     --------------------------------------------------------------- */
  COLLECTED_BY: "QR Code",

  /* ---------------------------------------------------------------
     4. Your QR placements.

       "slug-in-the-url": "What you want to see in the Sheet"

     Tip: include the issue/month. Six months from now you'll want to
     know which *issue* pulled, not just which magazine.
     --------------------------------------------------------------- */
  PLACEMENTS: {
    "rgv-vision-aug-2026":  "Magazine – RGV Vision – Aug 2026",
    "texas-highways-2026":  "Magazine – Texas Highways – 2026",
    "birdwatching-fall-26": "Magazine – BirdWatching – Fall 2026",
    "chamber-flyer":        "Flyer – Harlingen Chamber",
    "visitor-center":       "Rack Card – Harlingen Visitor Center"
  },

  /* ---------------------------------------------------------------
     5. Show the visitor a small "Signing up from …" line?
     Reassures people the code worked. Set to false to hide it.
     --------------------------------------------------------------- */
  SHOW_SOURCE_NOTE: true
};
