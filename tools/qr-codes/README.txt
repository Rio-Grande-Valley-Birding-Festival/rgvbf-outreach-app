DO NOT SEND THESE TO A PRINTER YET.

The files in this folder are SAMPLES. They were generated against a
placeholder address:

    https://rgvbf.github.io/rgvbf-outreach-app/qr/

That is almost certainly not where your site actually lives, which means
these codes lead nowhere. They exist so you can see the output format.


WHAT YOU GET FOR EACH PLACEMENT
-------------------------------

    <slug>.svg          black QR with the RGVBF logo in the middle
    <slug>.png          the same, 300 dpi, with a caption underneath
    <slug>-plain.svg    no logo, pure black
    <slug>-plain.png    the same, 300 dpi
    index.csv           every code and the address it points to

Send the .svg to a designer or print shop — vector artwork stays sharp at
any size, from a business card to a banner. The .png is for everything else
(email, a Word document, a quick proof).

Use the -plain files when a printer quotes single-colour/spot-colour work,
or when the code sits somewhere too small for the logo to read anyway.


ABOUT THE LOGO IN THE MIDDLE
----------------------------

QR codes carry redundant data specifically so they still scan when part of
them is obscured. These use the highest redundancy setting, and the logo
covers about 8% of the code — well inside what it can recover.

Every code in this folder was decoded again after being generated, both as
drawn and after being shrunk by half and blurred (roughly: printed small and
photographed by someone not holding still). Any code that failed either test
was deleted rather than written. So if a file is here, it scanned on the
bench.

That is not the same as scanning on glossy paper under bad light, so still
test one physical proof before a full print run.


BEFORE PRINTING
---------------

    python3 tools/generate_qr.py --base-url https://YOUR-REAL-SITE/qr/

That overwrites everything here with working codes. Then scan one with a
phone, submit a test entry, confirm it lands in the Google Sheet with the
right Location and "Collected By = QR Code", and delete the test row.

Only then send anything to print.
