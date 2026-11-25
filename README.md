# FarCare

A small web app for sending your family a quick "I'm okay" when you live far away, aimed at international students and anyone else whose family is a few time zones off.

Live: https://far-care.vercel.app

## How it works

Tap **I'm okay**, pick who to send it to and which message (edit it if you like), and FarCare opens WhatsApp (`wa.me` link) or your email app with the message filled in. You still press send yourself. When you come back, FarCare asks whether it sent, and only confirmed check-ins count toward your history and streak.

## Features

- Multiple contacts, each with WhatsApp or email as the default
- Editable message templates
- Check-in history and a daily streak
- A banner if you haven't checked in for more than a day
- Clocks for your time zone and your family's, with a hint when it's the middle of the night for them
- Every time zone your browser knows, with search, and your own detected automatically
- WhatsApp numbers checked and stored in international (E.164) format
- Daily reminder notification (only fires while the app is open)
- Export and import a JSON backup (import shows what it will replace and asks first; you can also restore during setup on a new phone)
- Installable as a PWA

All data stays in `localStorage` on your device. There's no account and no server.

## Running locally

No build step. Serve the folder with anything:

```bash
python3 -m http.server 3000
```

### Tests

```bash
npm install
npm run lint
npm test            # Vitest unit tests (pinned to America/Vancouver to catch DST bugs)
npx playwright install chromium
npm run test:e2e    # Playwright smoke test: onboarding, check-in, history, import
```

GitHub Actions runs lint, unit tests, Playwright and Lighthouse CI on every pull request.

## Files

- `index.html` - dashboard and check-in sheet
- `contacts.html`, `history.html`, `settings.html` - the other tabs
- `core.js` - pure logic with no DOM: dates and streaks, phone and email checks, send links, backup validation. Unit-tested
- `storage.js` - localStorage wrapper plus shared helpers (icons, toasts, sheets, the send flow, reminders)
- `fonts/` - self-hosted Nunito (copied from `@fontsource-variable/nunito` with `npm run fonts`)
- `vercel.json` - security headers (the Content Security Policy is report-only until inline scripts are removed)
- `style.css` - all styles
- `sw.js` - service worker for offline use

## Limitations

- Reminders need the app open; there's no push server.
- Data lives on one device, so export a backup if you clear your browser.

## Next

A private status link family could open to see your last check-in without you sending anything. That needs a small backend, probably Supabase.
