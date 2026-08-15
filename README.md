# RGVBF Outreach Sign-Up App

A simple, free, phone/tablet-friendly app for collecting contact sign-ups
(First name, Last name, Email — plus optional Country/State) at events. It
works completely offline and syncs to a Google Sheet once the device has
internet again.

This is a **Progressive Web App (PWA)** — a website that installs on a phone
or tablet like a real app (icon on the home screen, opens full-screen, works
offline), with no App Store, no developer account fees, and no code review
delays. Updating it is just updating files on GitHub.

---

## How it works (plain language)

1. Before an event, someone sets up the device: opens the app and taps the
   **Change** link next to "Event:" near the top, and types in the event or
   location name once, then does the same for **"Collected by:"** — their
   own name, or a label for the device (see "Setting the event and
   collector before each event" below).
2. From then on, anyone — staff, volunteers, whoever's talking to people —
   can hand the phone/tablet around and just fill in **First name, Last
   name, Email**, then tap **Save sign-up**. Those three are required,
   deliberately short, since people are often lukewarm about signing up in
   the first place and every extra required box is one more reason to say
   no. **Country** and **State** are also on the form but marked
   "(optional)" — no asterisk, nothing blocks submission if they're left on
   "Prefer not to say." If Country is set to something other than United
   States (or left unset), the State box automatically turns into a
   free-text "State / Province / Region" field instead of the dropdown,
   since "state" isn't how every country organizes itself.
3. Each save is *instant, to the device itself* — it never waits on the
   internet.
4. If there's no signal, the entry just sits on the device, safely stored,
   with a "pending" counter showing how many are waiting.
5. Once the device has Wi-Fi or cell data again, the app automatically (or
   you can tap **Sync now**) sends every pending entry to a Google Sheet
   that everyone at RGVBF can see.
6. A short notice at the top of the app tells people their info is for
   RGVBF's internal records only and isn't shared or sold.

### Setting the event and collector before each event

Neither Location/Event nor "who collected this" are part of the sign-up
form — both are set once per device via small **"Change"** links near the
top, so whoever's actually collecting sign-ups doesn't see them or have to
think about them at all:

- **Event: ___ · Change** — the event/location name for every sign-up on
  this device.
- **Collected by: ___ · Change** — your name, or a label for the device
  itself (e.g. "Table 2 iPad"), so you can tell later which staff member or
  device brought in a given entry. There's no way for a website to see a
  phone's actual device name or the owner's account name (browsers don't
  expose that, for privacy reasons) — this is the practical stand-in: type
  it in once, and it's attached automatically after that.

Tap **Change** on either one, type the value into the prompt that appears,
and it's saved on that device and silently attached to every sign-up from
then on — including the next time the app is opened, until someone changes
it again. If either one has never been set on a device, the app will
refuse to save a sign-up and remind you to tap Change first, so entries
never end up with a blank/unknown location or collector.

### Managing what's stored on a device

Every sign-up stays on the device it was entered on, even after it's synced
to the Sheet — nothing is ever deleted automatically. Scroll down on the
app to the **"Stored on this device"** section for three tools:

- **Export CSV** — saves a spreadsheet of everything on that device. On a
  phone/tablet this opens the native share sheet so you can send it
  straight to an email, Google Drive, or the Files app; on a desktop
  browser it just downloads. Good to do before clearing anything, or just
  as a periodic backup.
- **Clear synced sign-ups** — removes only the entries already confirmed in
  the Google Sheet, freeing up space on the device. Anything still waiting
  to sync is left alone.
- **Clear ALL sign-ups** — wipes everything on that device, including
  anything not yet synced. It warns you (and shows how many un-synced
  entries would be lost) before doing anything, since this can't be undone.

---

## Part 1 — Create a free GitHub account

GitHub is where the app's code will live, and it's what lets you (or anyone
you ask) update the app later, plus it gives you free hosting for it.

1. Go to **github.com** and click **Sign up**.
2. Use an email you check regularly (your RGVBF email is fine).
3. Pick a username, verify your email — the free plan is all this project needs.

---

## Part 2 — Create the repository (the project's home on GitHub)

1. Once logged in, click the **+** in the top right → **New repository**.
2. Name it something like `rgvbf-outreach-app`.
3. Set visibility to **Private** (keeps this out of public view).
4. Leave "Add a README" unchecked (we already have one).
5. Click **Create repository**.

### Upload this project

The easiest way with no command-line experience:

1. On the new repo's page, click **uploading an existing file**.
2. Drag in every file and folder from the `rgvbf-outreach-app` folder you
   received (keep the folder structure: `index.html`, `manifest.json`,
   `service-worker.js`, the `js/` folder, the `icons/` folder, the
   `apps-script/` folder, and this `README.md`).
3. Scroll down, add a commit message like "Initial version", click
   **Commit changes**.

(If you'd rather use Git from the command line later, that works too —
`git clone`, copy files in, `git add . && git commit -m "..." && git push` —
but the drag-and-drop upload above is enough to get started.)

---

## Part 3 — Turn on GitHub Pages (free hosting)

This is what gives the app a real web address that phones/tablets can open
and install from.

1. In your repo, go to **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment", set **Source** to **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Click **Save**.
4. Wait 1–2 minutes, then refresh — GitHub shows you a URL like:
   `https://YOUR-USERNAME.github.io/rgvbf-outreach-app/`
5. Open that URL on a phone or tablet.

**Installing it like an app:**
- **Android (Chrome):** open the URL → menu (⋮) → **Add to Home screen** / **Install app**.
- **iPhone/iPad (Safari):** open the URL → Share icon → **Add to Home Screen**.

Once installed, it opens full-screen with its own icon, and works offline
after that first load.

> Note: because this repo is **private**, GitHub Pages sites from private
> repos are only available on paid GitHub plans (Pro/Team). If Pages
> doesn't turn on for a private repo on your plan, either upgrade, or make
> the repo public (there's no sensitive data or secret keys in this code —
> the only thing kept private is the Google Sheet itself and its Apps
> Script URL, which isn't secret either but isn't advertised).

---

## Part 4 — Connect it to a Google Sheet (RGVBF Workspace account)

This part uses **Google Apps Script**, a free tool built into Google
Sheets. No coding platform or subscription needed beyond your normal
RGVBF Google Workspace account.

1. Log into the RGVBF Google account, go to **sheets.google.com**, create a
   new blank sheet. Name it e.g. **"RGVBF Outreach Sign-Ups"**.
2. In the sheet, go to **Extensions → Apps Script**.
3. Delete everything in the code editor, and paste in the entire contents
   of `apps-script/Code.gs` from this project.
4. Pick a random secret string (anything unguessable — e.g. mash the
   keyboard for 20+ characters, or use a password generator). Near the top
   of the pasted code, find:
   ```js
   const SHARED_SECRET = "PASTE_YOUR_OWN_RANDOM_SECRET_HERE";
   ```
   and replace the placeholder with your chosen string, keeping the quotes.
   **Why:** see the "Keeping random people out of your Sheet" note below —
   this is what stops anyone who finds your Web App URL from writing junk
   rows into it.
5. Click the **Save** icon (or Ctrl+S).
6. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → choose **Web app**.
   - Description: "RGVBF outreach endpoint" (or anything).
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**.
7. The first time, Google will ask you to **authorize** the script — click
   through the consent screens (it may show an "unverified app" warning
   since it's your own private script; click **Advanced → Go to
   [project name] (unsafe)** — this is expected for personal/organization
   scripts you wrote yourself).
8. Copy the **Web app URL** it gives you (looks like
   `https://script.google.com/macros/s/XXXXXXX/exec`).

### Point the app at your Sheet

1. Open `js/app.js` in your GitHub repo (click the file, then the pencil/edit icon).
2. Find these two lines near the top:
   ```js
   const APPS_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   const APP_SHARED_SECRET = "PASTE_YOUR_OWN_RANDOM_SECRET_HERE";
   ```
3. Replace both placeholders, keeping the quotes: the URL you copied, and
   the **exact same** secret string you set in `SHARED_SECRET` in Code.gs
   (step 4 above — they must match character-for-character):
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXX/exec";
   const APP_SHARED_SECRET = "your-random-string-here";
   ```
4. Commit the change directly on GitHub.
5. Bump the cache version in `service-worker.js` too (see "Updating the
   app later" below) so phones pick up the change quickly.
6. Give it a minute, then reload the app on your phone (you may need to
   uninstall/reinstall or clear the site's cache once, since the service
   worker caches the old file).

Any sign-up saved from now on will sync to that Google Sheet whenever the
device is online.

> If your Workspace admin has locked down Apps Script or "Anyone" access,
> you may need IT to approve this once — it's a one-time setup, not a
> per-use approval.

> **If your live "Sign-Ups" tab currently has columns exactly matching
> "Received At, First Name, Last Name, Email, Location/Event, Collected On
> Device At" (six columns, no Country/State):** Country and State are back,
> but added at the very **end** this time, so nothing needs to shift.
> Before your next sync, just add two new header cells after "Collected On
> Device At": type **"Country"** in the next empty column and **"State"**
> in the one after that. Existing rows and columns are untouched — this
> only adds two new ones for future sign-ups to fill in (or leave blank,
> since both are optional).
>
> If your Sheet still has the older "Country"/"State" columns positioned
> right after "Last Name" (from an even earlier version), delete those two
> columns first, then add the fresh "Country" and "State" headers at the
> end as described above.

> **New: "Collected By" column.** Add one more header in the column right
> after "State" — type **"Collected By"**. This records whatever name or
> device label was set via the app's "Collected by · Change" link, so you
> can tell who brought in each sign-up. Like Country/State, this is simply
> added at the end, so nothing else needs to move.

### Keeping random people out of your Sheet

Because volunteers need to submit sign-ups from personal phones with no
Google login, the Web App has to allow "Anyone" — there's no way to check
who's submitting. That's fine as long as the URL stays reasonably private,
but if your GitHub repo is **public** (required for free GitHub Pages
hosting), anyone can open `js/app.js` and read the URL straight out of the
code.

The `secret` string above is the safeguard: every submission from the app
includes it, and `Code.gs` silently ignores any request where it's missing
or wrong. So even though the URL is technically visible in a public repo,
a bot or random visitor hitting it directly without the matching secret
won't be able to write anything to your Sheet.

This isn't unbreakable — someone who deliberately reads through your
public repo's code will find the secret sitting right next to the URL. It
stops opportunistic/automated abuse, not a determined targeted attacker.
If you ever need stronger protection (e.g. this Sheet starts holding more
sensitive data), the real fix is keeping the repo private, which requires
GitHub Pro (or another host that supports private static sites).

---

## Part 5 — QR codes for magazines and print

The volunteer app covers people you meet in person. QR codes cover people who
find you in a magazine, on a flyer, or on a rack card — they scan, sign
themselves up, and land in the **same Sheet, same columns**.

The difference is where Location and Collected By come from. In the app, a
volunteer sets them once per device. With a QR code, **the code itself decides
them**: each printed code carries a short tag, and that tag maps to a placement
name. Everyone who scans the magazine ad is recorded against that magazine,
with `Collected By = QR Code`. Neither value is shown to the person scanning
and neither can be edited by them.

```
Magazine ad  →  QR  →  …/qr/?src=rgv-vision-aug-2026
                            ↓
                   the "Stay Connected" page
                   (Location = "Magazine – RGV Vision – Aug 2026",
                    Collected By = "QR Code"  — both hidden)
                            ↓
                   the same Google Sheet
```

**The printed address never changes.** The QR points at your own site, and the
site decides what that tag means. If you retire a magazine, retarget a code, or
rebuild the whole page, you edit one config file — nothing gets reprinted.

### One-time setup

1. **Add the second secret.** In `Code.gs` you now have two:

   ```js
   const SHARED_SECRET    = "…";  // volunteer app, unchanged
   const QR_SHARED_SECRET = "…";  // NEW — must be a different random string
   ```

   They must differ. The QR page is public and printed in magazines, so its
   secret is the most exposed thing you have. Keeping it separate means that if
   it's ever scraped and abused, you rotate that one string — printed codes keep
   working, and the volunteer app and the phones running it are untouched.

   Re-deploy after editing: **Deploy → Manage deployments → pencil → New
   version → Deploy.** Changes don't take effect until you do.

2. **Fill in `qr/js/qr-config.js`** — the same Web App URL the volunteer app
   uses, plus the QR secret you just set.

3. **List your placements** in the same file:

   ```js
   PLACEMENTS: {
     "rgv-vision-aug-2026": "Magazine – RGV Vision – Aug 2026",
   }
   ```

   Left side is the tag in the URL. Right side is written verbatim into the
   Location column, so write it the way you want to read it in the Sheet.

4. **Check it's live.** Open `https://YOUR-SITE/qr/?src=rgv-vision-aug-2026` in
   a browser. If the config is still on placeholders the page says so and
   refuses to accept sign-ups, rather than thanking people while saving nothing.

### Generating the codes

`tools/placements.csv` holds the same list in spreadsheet form. Then:

```bash
pip install qrcode pillow
python3 tools/generate_qr.py --base-url https://YOUR-SITE/qr/
```

You get, in `tools/qr-codes/`, four files per placement plus an `index.csv`
listing every code and where it points:

| File | Use it for |
|---|---|
| `<slug>.svg` | Black QR with the RGVBF logo in the middle. Give this to the designer or print shop — vector, sharp at any size. |
| `<slug>.png` | The same at 300dpi with a caption underneath, for email and documents. |
| `<slug>-plain.svg` | No logo, pure black. For single-colour printing, or codes too small for a logo to read. |
| `<slug>-plain.png` | The same at 300dpi. |

**About the logo in the middle.** QR codes carry redundant data so they still
scan when partly obscured, and these use the highest redundancy setting. The
logo covers about 8% of the code — comfortably inside what it can recover, with
room left for the damage a real printed code picks up from ink spread, folds and
glare.

The script decodes every code it generates, both as drawn and after shrinking it
by half and blurring it, and refuses to write one that fails either test. So a
file that exists scanned on the bench. That still isn't glossy paper under bad
light, so test one physical proof before a full print run.

The script refuses to run if a slug in `placements.csv` is missing from
`qr-config.js` — that mismatch is the one mistake that's expensive, because it
only shows up as `Unmapped QR – …` rows after the magazine is already printed.

### Adding a placement later

1. Add a line to `PLACEMENTS` in `qr/js/qr-config.js`
2. Add the matching row to `tools/placements.csv`
3. Re-run `generate_qr.py`
4. Commit and push

About two minutes. No changes to the volunteer app, Code.gs, or the Sheet.

### Before anything goes to a printer

Scan the actual code, submit a junk entry, and confirm the row appears in the
Sheet with the right Location and `Collected By = QR Code`. Then delete the test
row. A code that's wrong on screen is a two-minute fix; a code that's wrong in
40,000 copies of a magazine is not.

### Naming placements

Put the issue and month in the name — `Magazine – RGV Vision – Aug 2026`, not
`RGV Vision`. When you're deciding next year's ad budget you'll want to know
which *issue* pulled, not just which publication.

### What this doesn't do

The QR page is public, so anyone who reads its source can find the endpoint and
the QR secret. A hidden honeypot field blocks ordinary bots, and duplicate
submissions are de-duplicated server-side, but a determined person could still
push junk rows tagged `QR Code`. If that ever happens: rotate
`QR_SHARED_SECRET`, re-deploy, update `qr-config.js`, and delete the junk rows.
Because it's tagged, it's easy to find and filter.

---

## Updating the app later

Because of the offline caching (the service worker), phones may keep
showing an older cached version for a bit after you push changes. To force
an update to show up sooner: open `service-worker.js` in the repo and bump
the version number in this line, then commit:

```js
const CACHE_NAME = "rgvbf-outreach-v1"; // change to v2, v3, etc.
```

That tells every installed copy of the app "here's a new version," and it
will refresh itself next time it's opened with a connection.

---

## Project files

```
rgvbf-outreach-app/
├── index.html            The volunteer sign-up form (what staff see)
├── manifest.json         Makes it installable like an app
├── service-worker.js     Makes it work with no internet
├── js/
│   ├── db.js             Stores sign-ups on the device (IndexedDB)
│   └── app.js            Form logic + syncing to Google Sheets
├── assets/
│   └── rgvbf-logo.png    The festival logo, shown in the header
├── icons/                App icons, generated from the logo (home screen icon)
├── apps-script/
│   └── Code.gs           Paste into Google Sheets → Apps Script
├── qr/                   The public QR sign-up page (Part 5)
│   ├── index.html        "Stay Connected" page people reach by scanning
│   └── js/
│       ├── qr-config.js  ← the only file you edit to add/change QR codes
│       ├── qr-app.js     Form logic for the QR page
│       └── geo.js        Country/state lists, copied from index.html
├── tools/                Not part of the website — run locally
│   ├── placements.csv    Your list of QR placements
│   ├── generate_qr.py    Turns that list into print-ready QR files
│   └── qr-codes/         Generated .svg / .png / index.csv
└── README.md             This file
```

> `qr/js/geo.js` holds a copy of the country and state lists from
> `index.html`, so both forms offer identical choices and the Sheet gets
> identical spellings. If you ever change one, change the other to match.

## Branding

- **Header:** shows the RGVBF logo, the org name, and the program name
  ("Outreach Contact Information"). All of that markup is near the top of
  `index.html`, just after `<header>`.
- **Colors:** the green (`#12410a`) and orange (`#e85923`) used throughout
  were sampled directly from the logo file you provided, since the app
  couldn't pull the live stylesheet colors from rgvbf.org directly. They're
  defined once at the top of `index.html` in the `:root { --green: ...;
  --accent: ...; }` block — change them there and the whole app updates. If
  you have RGVBF's exact brand hex codes (from a style guide or your web
  host), swap them in for a pixel-perfect match to the website.
- **Swapping the logo:** replace `assets/rgvbf-logo.png` with an updated
  file of the same name, and re-run the icon generation (or just ask
  whoever's maintaining this to regenerate `icons/icon-192.png` and
  `icons/icon-512.png` from the new logo — same idea, centered on a white
  square with a bit of padding).
- **Extra fields:** add an `<input>` in `index.html`, read its `.value` in
  `js/app.js`'s submit handler, and add a matching column in `Code.gs`'s
  `appendRow(...)` call.
