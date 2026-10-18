# NEXT360 — Dussehra App Launch Website

Premium cinematic launch experience for the **NEXT360 mobile app**, launching on
**Vijayadashami, October 20, 2026**. Includes a cinematic intro, a real-time
IST countdown, and automatic redirection to the official Google Play listing
the moment the app goes live.

Built with vanilla HTML, CSS and JavaScript — no build step, no dependencies.

---

## 1. Folder structure

```
intro/
├── index.html          # Page structure (intro overlay, hero, countdown, sections, live overlay)
├── style.css           # All styling — dark navy/gold theme, responsive, reduced-motion
├── script.js           # ALL logic: config, intro, countdown, launch state, redirect
├── assets/
│   ├── next360-logo.png    # ← ADD THE OFFICIAL LOGO HERE (not yet supplied)
│   ├── next360-logo.svg    # Bundled placeholder wordmark (used until PNG is added)
│   ├── favicon.svg         # Favicon (replace with branded version when available)
│   └── intro.mp4           # ← OPTIONAL: cinematic video (see below)
└── docs/
    └── video-generation-prompt.md   # Full prompt package to produce intro.mp4
```

**The site works immediately, before any assets are added:**
- Missing `next360-logo.png` → the bundled SVG placeholder is shown
  (and if that is removed too, an elegant typographic “NEXT360” wordmark).
- Missing `intro.mp4` → a real-time **canvas-rendered cinematic intro**
  (all 5 scenes: diyas, particles, circuit energy, logo reveal, launch
  announcement) plays automatically. Generating the MP4 is an optional upgrade.

---

## 2. Configuration — the only file you edit: `script.js`

Open `script.js` and find the **CONFIGURATION** block at the top:

```js
const LAUNCH_DATE = "2026-10-20T10:00:00+05:30";
const PLAY_STORE_URL = "";
const LAUNCH_MODE = "countdown";
```

| Variable | Meaning |
|----------|---------|
| `LAUNCH_DATE` | The single source of truth for launch. ISO-8601 **with UTC offset**. Default = Oct 20 2026, 10:00 AM IST. Change the time here if needed — do not add a second date anywhere else. |
| `PLAY_STORE_URL` | The **official** Google Play listing URL. Leave `""` until the real listing is published. The site validates the URL (must be `https://play.google.com/store/apps/details?id=...`) and will **never** invent an app id or redirect to a fake listing. |
| `LAUNCH_MODE` | `"countdown"` (default) or `"live"`. Switch to `"live"` after the app is published. |

Also configurable just below: `REDIRECT_DELAY_MS` (default `2000`) — how long the
“NEXT360 Is Live!” screen waits before auto-redirecting.

### Adding the official logo

1. Export the official NEXT360 logo as a transparent PNG (recommended ≥ 768 px wide).
2. Save it as `assets/next360-logo.png` (replace the placeholder path — the file
   does not exist yet; the site detects this and uses the SVG placeholder).
3. The header, hero, finale, live overlay, and canvas intro all pick it up automatically.
4. Keep the original proportions — do not crop, recolor, or restyle the official mark.

### Adding the cinematic video (optional upgrade)

1. Follow `docs/video-generation-prompt.md` to produce the intro with an AI video
   tool (Runway, Kling, Veo, Sora) or a motion-graphics artist (After Effects).
2. Export as H.264 MP4, 16:9, ≤ 30 s, ≤ ~25 MB, no audio required.
3. Save as `assets/intro.mp4`.
4. Done — the player prefers the video automatically and only falls back to the
   canvas film if the video is missing or fails to load.
   Add a visible **Skip Intro** button and a **Replay Cinematic Intro** button in the hero.

---

## 3. How launch-day behavior works

- The countdown is computed from `Date.parse(LAUNCH_DATE)` against the visitor’s
  real clock every second — it is never a manually decreasing counter, and it is
  **not** affected by whether the visitor has opened the page before.
- **Before launch:** countdown ticks; intro plays on first load.
- **After the scheduled time** (even if the visitor’s first-ever visit is days later):
  the page opens directly in the live state — a polished “NEXT360 Is Live!”
  overlay with “The wait is over. Welcome to NEXT360!”, an official
  **Open on Google Play** button, and an automatic redirect after ~2 seconds
  (only if `PLAY_STORE_URL` is a validated real listing URL).
- If `PLAY_STORE_URL` is still empty on launch day, visitors see a clear
  fallback message (“The official app listing will be available here shortly…”)
  and **no** redirect and **no** fake badge.
- The countdown ticking to zero while the page is open also triggers the live
  state immediately — no reload needed.
- `LAUNCH_MODE = "live"` skips the countdown entirely and shows the launch
  announcement + Play button the moment the page opens.

---

## 4. Testing instructions

### Testing the countdown without waiting until launch

Use query parameters (they override config **only for that browser session** —
real visitors are never affected):

| URL | What it does |
|-----|--------------|
| `index.html?launch=2026-10-18T10:00:00%2B05:30` | Pretend launch is Oct 18 2026 10:00 IST |
| `index.html?launch=2030-01-01T00:00:00%2B05:30` | Far-future date → check long countdowns (days > 99 also work) |
| `index.html?launch=`*(any past ISO time)* | Past date → page should open **directly in the live state** |
| `index.html?mode=live` | Force live mode (overlay + Play button, no countdown) |
| `index.html?mode=countdown` | Force countdown mode |

Quick end-to-end redirect test:

1. Set `PLAY_STORE_URL` to the real listing (or any valid `https://play.google.com/store/apps/details?id=some.real.id` while testing).
2. Open `index.html?launch=` + an ISO time ~30 seconds in the future, e.g.
   `index.html?launch=2026-10-18T00:00:00%2B05:30` if that is soon, or compute
   now+30 s in your timezone with offset.
3. Watch the countdown hit zero → live overlay appears → auto-redirect fires after 2 s.
4. Clear `PLAY_STORE_URL` back to `""` and repeat — you should see the fallback
   message instead of any button or redirect.

### Desktop browsers
- Chrome / Edge / Firefox / Safari (latest two versions).
- Check: intro plays (or skips via button), replay works, countdown ticks,
  scroll reveals animate, resize from 4K to 600 px wide without breakage.
- DevTools → Network → set “Slow 4G” and reload: the canvas intro should still
  run smoothly (it has no network dependency).

### Android (Chrome, Samsung Internet)
- Add the site to the home screen or open the URL.
- Muted autoplay with `playsinline` should start the intro immediately.
- Rotate portrait ↔ landscape: countdown reflows, intro canvas resizes.
- Background the tab for a minute, return: countdown must show the **correct**
  remaining time (it will, because it is timestamp-based).

### iPhone / iPad (Safari)
- iOS requires `playsinline` + `muted` for autoplay — both are set.
- Test on a physical device if possible (iOS Simulator sometimes blocks autoplay).
- Check Dynamic Island / notch devices: the intro overlay uses `100svh` so
  controls are not hidden by browser chrome.
- “Reduce Motion” enabled (Settings → Accessibility → Motion): the intro is
  skipped automatically and the site is shown immediately.

### Release simulation
- `?mode=live` on every device class before launch day.
- After flipping `LAUNCH_MODE` to `"live"` in `script.js`, hard-refresh
  (Ctrl+Shift+R / Cmd+Shift+R) to bypass cache.

---

## 5. Deployment

Any static host works. Recommended (free tier, custom domain support):

### Netlify (recommended)
1. Drag this folder onto https://app.netlify.com/drop — or connect a Git repo.
2. Build command: *(none)*. Publish directory: the repo root.
3. Domain → Add custom domain → follow DNS instructions (Netlify gives free HTTPS).

### Cloudflare Pages
1. https://pages.cloudflare.com → Create project → connect repo.
2. Build command: none. Output directory: `/`.
3. Add your custom domain under Custom Domains.

### GitHub Pages
1. Push this folder to a repo (e.g. `next360-launch`).
2. Settings → Pages → Deploy from branch → `main` / root.
3. For a custom domain: Settings → Pages → Custom domain → set CNAME record
   at your registrar (GitHub provides free HTTPS automatically).

### Vercel
1. `npx vercel` from the folder, or import the repo at https://vercel.com.
2. Framework preset: **Other**. No build command.

### Pre-launch checklist for any host
- [ ] HTTPS enabled (required for autoplay and for a trustworthy launch page)
- [ ] `assets/next360-logo.png` uploaded (official logo)
- [ ] `assets/intro.mp4` uploaded (optional — canvas intro covers absence)
- [ ] `PLAY_STORE_URL` still `""` and `LAUNCH_MODE` still `"countdown"`
- [ ] Test the page on a real phone over mobile data

---

## 6. Release-day checklist

**One week before (Oct 13, 2026)**
- [ ] Confirm the official Google Play listing is submitted and on track for approval on Oct 20
- [ ] Obtain the final listing URL (`https://play.google.com/store/apps/details?id=…`)
- [ ] Produce/upload `assets/intro.mp4` if a video intro is wanted
- [ ] Confirm the official logo PNG is final and in `assets/next360-logo.png`

**Launch morning (Oct 20, 2026)**
- [ ] Verify the Play Store listing is **publicly visible** (open the URL in an incognito window on a phone that is not signed into a developer account)
- [ ] Open `index.html?mode=live` locally and confirm: live overlay, valid Play button, redirect fires
- [ ] Edit `script.js`:
  - `PLAY_STORE_URL` → `"https://play.google.com/store/apps/details?id=<real.app.id>"`
  - `LAUNCH_MODE` → `"live"`
- [ ] Deploy / push the updated `script.js`
- [ ] Purge CDN cache if applicable (Netlify: clear cache; Cloudflare: Purge Everything)
- [ ] Hard-refresh and test on desktop + Android + iPhone in incognito
- [ ] Confirm redirect lands on the real listing, not a 404

**After launch**
- [ ] Monitor analytics (optional: add your analytics snippet to `index.html`)
- [ ] Keep the page live as a permanent brand URL, or redirect the domain to the Play listing
- [ ] Archive the countdown version by reverting `LAUNCH_MODE` only in a backup branch — never keep two conflicting launch dates in the code

---

## 7. Quality & performance notes

- **Single launch date** — one `LAUNCH_DATE` constant; the calendar link, countdown, and copy all derive from configuration, so there are no conflicting dates.
- **Reduced motion** — `prefers-reduced-motion` skips the intro, disables particles, and shows all content immediately.
- **Performance** — hero particles pause when the tab is hidden; DPR is capped at 2; the canvas intro has zero network dependencies; video is `preload="auto"` and muted.
- **Accessibility** — countdown uses `role="timer"` / `aria-live`, skip button is keyboard accessible, contrast meets AA on all body text, all decorative canvases are `aria-hidden`.
- **No fake claims** — no fabricated app id, no fake Play badge before launch, no invented company information. Copy sticks to the approved launch messages.

---

## 8. What still needs to be supplied

| Item | Status | Where it goes |
|------|--------|---------------|
| Official NEXT360 logo (PNG, transparent) | **Not supplied** — SVG placeholder bundled | `assets/next360-logo.png` |
| Official Play Store listing URL | **Not supplied** — config left empty by design | `script.js` → `PLAY_STORE_URL` |
| Cinematic intro MP4 | **Not supplied** — canvas film plays instead | `assets/intro.mp4` (prompt pack in `docs/`) |
| Exact launch time (if not 10:00 AM IST) | Default configured; edit if needed | `script.js` → `LAUNCH_DATE` |
| Licensed music bed (if using the MP4) | Optional | Mixed into the video in post |
