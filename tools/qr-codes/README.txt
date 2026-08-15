THESE ARE REAL, WORKING CODES.

They point at the live site:

    https://rio-grande-valley-birding-festival.github.io/rgvbf-outreach-app/qr/


BUT DON'T PRINT YET - ONE STEP IS MISSING
-----------------------------------------
The QR page is live, but it isn't connected to the Google Sheet yet, so it
currently tells visitors "This page isn't finished being set up." Until that
is done, a scan reaches the page but no sign-up is recorded.

To finish it:
  1. In the Sheet: Extensions - Apps Script. Paste in the new Code.gs.
     Put your EXISTING secret back into SHARED_SECRET, and a NEW different
     random string into QR_SHARED_SECRET.
  2. Deploy - Manage deployments - pencil - New version - Deploy.
  3. Edit qr/js/qr-config.js on GitHub: paste in the Web App URL and that
     new QR secret.

Then scan a code, sign up with a fake name, and confirm the row appears in
the Sheet with "Collected By = QR Code". Delete the test row.


MINIMUM PRINT SIZE: 1.6 INCHES (4 cm)
-------------------------------------
This matters. The site address is long (99 characters), which makes a dense
57-module code. Tested against a simulated phone camera - half resolution
and slight focus blur - these stop decoding below 1.6".

Printing one smaller to fit an ad layout will produce codes that look fine
on screen and fail in people's hands.

A shorter address would fix this. Moving to qr.rgvbf.org would cut the URL
to 45 characters and a 41-module code, which stays readable down to 1.2".
Worth doing before a large print run - and printed codes survive the move,
because GitHub redirects the old address to the new one.


WHAT YOU GET FOR EACH PLACEMENT
-------------------------------
    <slug>.svg          black QR with the RGVBF logo in the middle
    <slug>.png          the same, 300 dpi, with a caption underneath
    <slug>-plain.svg    no logo, pure black
    <slug>-plain.png    the same, 300 dpi
    index.csv           every code and the address it points to

Send the .svg to a designer or print shop - vector artwork stays sharp at
any size. The .png is for everything else (email, a Word document, a proof).

Use the -plain files when a printer quotes single-colour/spot-colour work.


ABOUT THE LOGO IN THE MIDDLE
----------------------------
QR codes carry redundant data specifically so they still scan when part of
them is obscured. These use the highest redundancy setting, and the logo
covers about 8% of the code - well inside what it can recover.

Every code here was decoded again after being generated, both as drawn and
after being shrunk by half and blurred. Any that failed was deleted rather
than written. So if a file is here, it scanned on the bench.

That is not the same as scanning on glossy paper under bad light, so still
test one physical proof before a full print run.
