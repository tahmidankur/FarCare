# FarCare

A small web app for sending your family a quick "I'm okay" when you live far away, aimed at international students and anyone else whose family is a few time zones off.

Live: https://far-care.vercel.app

## How it works

Tap **I'm okay**, pick who to send it to and which message, and FarCare opens WhatsApp (`wa.me` link) or your email app with the message filled in. You still press send yourself. Each check-in is saved to your history.

## Features

- Multiple contacts, each with WhatsApp or email as the default
- Editable message templates
- Check-in history and a daily streak
- A banner if you haven't checked in for more than a day
- Clocks for your time zone and your family's
- Daily reminder notification (only fires while the app is open)
- Export and import a JSON backup
- Installable as a PWA

All data stays in `localStorage` on your device. There's no account and no server.

## Running locally

No build step. Serve the folder with anything:

```bash
python3 -m http.server 3000
```

## Files

- `index.html` - dashboard and check-in sheet
- `contacts.html`, `history.html`, `settings.html` - the other tabs
- `storage.js` - localStorage wrapper plus shared helpers (icons, toasts, sheets, reminders)
- `style.css` - all styles
- `sw.js` - service worker for offline use

## Limitations

- Reminders need the app open; there's no push server.
- Data lives on one device, so export a backup if you clear your browser.

## Next

A private status link family could open to see your last check-in without you sending anything. That needs a small backend, probably Supabase.
