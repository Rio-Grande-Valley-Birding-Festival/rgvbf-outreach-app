DO NOT SEND THESE TO A PRINTER YET.

The files in this folder are SAMPLES. They were generated against a
placeholder address:

    https://rgvbf.github.io/rgvbf-outreach-app/qr/

That is almost certainly not where your site actually lives, which means
these codes lead nowhere. They exist so you can see the output format
(vector .svg for the print shop, 300dpi .png with a caption, index.csv
listing every code).

Once your QR page is live at a real address, regenerate:

    python3 tools/generate_qr.py --base-url https://YOUR-REAL-SITE/qr/

That overwrites everything here with working codes. Then scan one with a
phone, submit a test entry, confirm it lands in the Google Sheet with the
right Location and "Collected By = QR Code", and delete the test row.

Only then send anything to print.
