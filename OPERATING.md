# Operating Guide

The one-page version. Full detail is in README.md.

---

## What goes on GitHub

**All of it.** Upload the whole `rgvbf-outreach-app` folder exactly as it is,
keeping the folder structure. Don't pick and choose — the site breaks if a
folder is missing.

For reference, what each part actually does:

| Folder | Used by the live website? |
|---|---|
| `index.html`, `manifest.json`, `service-worker.js`, `js/`, `assets/`, `icons/` | Yes — the volunteer app |
| `qr/` | Yes — the public QR sign-up page |
| `apps-script/Code.gs` | No — this is the copy you paste into Google Sheets. Kept here so it isn't lost. |
| `tools/` | No — you run these on your own computer to make QR codes |
| `README.md`, `OPERATING.md`, `.gitignore` | No — documentation |

The repo has to be **public** for free GitHub Pages hosting. That's expected —
see "Keeping random people out of your Sheet" in README.md for what that does
and doesn't expose.

---

## Your two addresses

Once GitHub Pages is on, you have:

```
Volunteer app   https://USERNAME.github.io/rgvbf-outreach-app/
QR sign-up page https://USERNAME.github.io/rgvbf-outreach-app/qr/?src=SLUG
```

`USERNAME` is your GitHub username. Both are permanent.

---

## First-time setup, in order

Order matters — each step needs the one before it.

1. **Upload the folder to GitHub** and turn on Pages
   (Settings → Pages → Deploy from a branch → `main` → `/ (root)`).

2. **Set up the Google Sheet.** Extensions → Apps Script, paste in
   `apps-script/Code.gs`, set **both** secrets to two different random strings,
   Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**.
   Copy the Web App URL.

3. **Point the volunteer app at it.** Edit `js/app.js` on GitHub: paste the Web
   App URL into `APPS_SCRIPT_URL` and the *first* secret into
   `APP_SHARED_SECRET`.

4. **Point the QR page at it.** Edit `qr/js/qr-config.js`: the same Web App URL,
   and the *second* (QR) secret.

5. **Make your QR codes.** Add your placements to `qr/js/qr-config.js` and
   `tools/placements.csv`, then on your own computer:

   ```
   pip install qrcode pillow
   python3 tools/generate_qr.py --base-url https://USERNAME.github.io/rgvbf-outreach-app/qr/
   ```

6. **Test before printing.** Scan a code, sign up with a fake name, confirm the
   row appears in the Sheet with the right Location and `Collected By = QR
   Code`. Delete the test row.

---

## Day to day

Almost everything is done by editing a file on github.com — click the file,
click the pencil icon, edit, click **Commit changes**. No software to install.

### Add a new QR code (the common one)

1. `qr/js/qr-config.js` → add a line inside `PLACEMENTS`:
   ```js
   "audubon-winter-27": "Magazine – Audubon – Winter 2027",
   ```
2. `tools/placements.csv` → add the matching row.
3. Re-run `generate_qr.py`, send the new `.svg` to the printer.

Live in about a minute. Nothing else changes.

### Retarget a code that's already printed

Change only the **right-hand side** in `qr-config.js`. The slug on the left is
what's printed — never change that, or the printed code stops working.

### Retire a placement

Leave it in `qr-config.js`. Deleting it means anyone scanning an old magazine
gets recorded as `Unmapped QR – …`. Old magazines stay in circulation for years.

### See where sign-ups came from

Filter the Sheet by the **Location / Event** column. Everything from a QR code
has `Collected By = QR Code`; everything else has a volunteer's name.

### Change the volunteer app

After editing any of `index.html`, `js/app.js`, `js/db.js`, or the icons, also
bump the version in `service-worker.js`:

```js
const CACHE_NAME = "rgvbf-outreach-v12";  // → v13
```

Otherwise phones keep showing the old version. **The QR page doesn't need
this** — it isn't cached, so edits to `qr/` appear immediately.

---

## If something looks wrong

| Symptom | Cause |
|---|---|
| QR page says "isn't finished being set up" | `qr-config.js` still has `PASTE_…` in it |
| Sign-ups say they worked but no rows appear | Secret mismatch between `qr-config.js` and `Code.gs`, **or** you edited Code.gs and didn't re-deploy |
| Rows appear as `Unmapped QR – something` | That slug is printed but missing from `PLACEMENTS` — add it and the rows fix themselves going forward |
| Volunteer app won't show your changes | Bump `CACHE_NAME` in `service-worker.js` |
| Changes to Code.gs seem ignored | Deploy → Manage deployments → pencil → **New version** → Deploy. Saving is not deploying. |

The one that bites people: **saving Code.gs does not deploy it.** Every single
edit needs a new version deployed.

---

## If someone abuses the QR page

It's public, so the endpoint and QR secret can be read by anyone determined
enough. If junk rows start appearing:

1. Change `QR_SHARED_SECRET` in Code.gs → deploy a new version.
2. Put the same new string in `qr/js/qr-config.js`.
3. Delete the junk rows (filter by `Collected By = QR Code`).

Printed codes keep working — they only point at a web address, and that hasn't
changed. The volunteer app is unaffected, because it uses the other secret.
