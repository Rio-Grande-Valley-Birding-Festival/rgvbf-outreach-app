# RGVBF Outreach Sign-Up App

A simple, free, phone/tablet-friendly app for collecting contact sign-ups
(First name, Last name, Phone, Email, Location/Event) at events. It works
completely offline and syncs to a Google Sheet once the device has internet
again.

This is a **Progressive Web App (PWA)** — a website that installs on a phone
or tablet like a real app (icon on the home screen, opens full-screen, works
offline), with no App Store, no developer account fees, and no code review
delays. Updating it is just updating files on GitHub.

---

## How it works (plain language)

1. A volunteer opens the app on a phone/tablet (it can be pinned to the home
   screen like any app).
2. They type in a person's info and tap **Save sign-up**. This is saved
   *instantly to the device itself* — it never waits on the internet.
3. If there's no signal, the entry just sits on the device, safely stored,
   with a "pending" counter showing how many are waiting.
4. Once the device has Wi-Fi or cell data again, the app automatically (or
   you can tap **Sync now**) sends every pending entry to a Google Sheet
   that everyone at RGVBF can see.
5. The **Location / Event** field remembers what you typed last, so if
   you're staffing one table all day you don't retype it for every person —
   it stays as the default until you change it, including the next time the
   app is opened.
6. First name, last name, email, and location/event are required; phone is
   optional.

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
4. Click the **Save** icon (or Ctrl+S).
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → choose **Web app**.
   - Description: "RGVBF outreach endpoint" (or anything).
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**.
6. The first time, Google will ask you to **authorize** the script — click
   through the consent screens (it may show an "unverified app" warning
   since it's your own private script; click **Advanced → Go to
   [project name] (unsafe)** — this is expected for personal/organization
   scripts you wrote yourself).
7. Copy the **Web app URL** it gives you (looks like
   `https://script.google.com/macros/s/XXXXXXX/exec`).

### Point the app at your Sheet

1. Open `js/app.js` in your GitHub repo (click the file, then the pencil/edit icon).
2. Find this line near the top:
   ```js
   const APPS_SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace the placeholder text with the URL you copied, keeping the quotes:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXX/exec";
   ```
4. Commit the change directly on GitHub.
5. Give it a minute, then reload the app on your phone (you may need to
   uninstall/reinstall or clear the site's cache once, since the service
   worker caches the old file — see "Updating the app" below).

Any sign-up saved from now on will sync to that Google Sheet whenever the
device is online.

> If your Workspace admin has locked down Apps Script or "Anyone" access,
> you may need IT to approve this once — it's a one-time setup, not a
> per-use approval.

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
├── index.html          The sign-up form (what people see)
├── manifest.json        Makes it installable like an app
├── service-worker.js     Makes it work with no internet
├── js/
│   ├── db.js             Stores sign-ups on the device (IndexedDB)
│   └── app.js            Form logic + syncing to Google Sheets
├── assets/
│   └── rgvbf-logo.png    The festival logo, shown in the header
├── icons/                App icons, generated from the logo (home screen icon)
├── apps-script/
│   └── Code.gs           Paste into Google Sheets → Apps Script
└── README.md             This file
```

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
