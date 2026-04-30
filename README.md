# FarCare 💙

**A mobile-first family check-in web app for people living far from home.**

FarCare helps international students, immigrants, and workers abroad send quick "I'm okay" updates to their family — with one tap, no sign-up, no stress.

> Built with HTML, CSS, and vanilla JavaScript. All data lives on your device.

---

## The Problem

When you live abroad, you're busy. Your family is worried. A quick "I'm okay" message would take five seconds to write — but you forget, and they wait.

FarCare makes that five-second message a one-tap habit.

---

## Live Demo

> Deploy to Netlify or Vercel and paste your link here.

---

## Features

### v1 (this repo)
- **One-tap check-in** — opens WhatsApp or Email with a pre-filled warm message, ready to send
- **Multiple contacts** — manage everyone you check in with
- **Template messages** — 6 default messages, fully editable; add your own
- **Check-in history** — every check-in logged with contact, message, method, and timestamp
- **Streak counter** — see how many days in a row you've checked in
- **Missed check-in banner** — gentle reminder when it's been more than a day
- **Live timezone clocks** — your time and your family's time, side by side
- **Daily reminder** — browser notification at your chosen time (requires tab open)
- **Export / Import backup** — download a JSON backup; restore it anytime
- **Mobile-first UI** — card layout, bottom nav, works on all screen sizes

### Planned — v2
- Parent-facing status page: share a private link so family can check on you anytime, without sending a message
- Cloud sync via Firebase or Supabase
- Background push notifications via PWA

---

## Screenshots

> Add screenshots here after deployment. Suggested shots: dashboard, onboarding, check-in sheet, history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | `localStorage` |
| Messaging | `wa.me` (WhatsApp) · `mailto:` (Email) |
| Fonts | Nunito via Google Fonts |
| Deployment | Netlify / Vercel (static) |

No frameworks. No build tools. No dependencies. Open `index.html` and it works.

---

## Project Structure

```
farcare/
├── index.html        # Dashboard — main check-in screen
├── contacts.html     # Add, edit, delete contacts
├── history.html      # Check-in log and stats
├── settings.html     # Profile, reminders, templates, backup
├── style.css         # All shared styles
├── storage.js        # Data layer + shared utilities
├── assets/
│   └── icon-192.png  # App icon (add your own)
└── README.md
```

---

## Getting Started

### Run locally

No build step needed.

```bash
git clone https://github.com/your-username/farcare.git
cd farcare
```

Then open `index.html` in your browser — or use a local server for the best experience:

```bash
# Python
python -m http.server 3000

# Node
npx serve .
```

Visit `http://localhost:3000`.

### Deploy to Netlify (free)

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Select your repo — no build command, publish directory is `/`
4. Click Deploy

### Deploy to Vercel (free)

```bash
npx vercel
```

---

## How It Works

### Data model

Everything is saved to `localStorage` under these keys:

| Key | What it stores |
|---|---|
| `farcare_user` | Your name and timezone settings |
| `farcare_contacts` | Array of contacts (name, relationship, phone, email, method) |
| `farcare_history` | Array of check-in records |
| `farcare_settings` | Reminder time, notification preference |
| `farcare_templates` | Message template array |
| `farcare_onboarded` | Whether first-time setup is complete |

### Check-in flow

1. Tap **I'm Okay** on the dashboard
2. A sheet appears — pick a contact, a message template, and a send method
3. FarCare opens WhatsApp (`wa.me/[phone]?text=...`) or your email client with the message ready
4. You tap send in that app
5. FarCare logs the check-in to history

### WhatsApp links

```js
`https://wa.me/${phone}?text=${encodeURIComponent(message)}`
```

This opens a WhatsApp chat with the message pre-filled. The user still taps send — this is intentional and honest. WhatsApp does not allow automated sending from web links.

### Reminder limitation

Browser notifications only fire while the FarCare tab is open. This is a known limitation of plain web apps. A future PWA upgrade will add a service worker to support background reminders.

---

## Backup & Restore

Your data lives only on your device. Clearing your browser data will wipe it.

**To back up:** Settings → Export Data → saves a `.json` file to your downloads.

**To restore:** Settings → Import Data → select your backup file.

The backup format:

```json
{
  "farcare_version": 1,
  "exportedAt": "2026-04-30T...",
  "user": { ... },
  "contacts": [ ... ],
  "history": [ ... ],
  "settings": { ... },
  "templates": [ ... ]
}
```

---

## Roadmap

### v2 — The Parent Status Page
The headline feature. Every check-in will write to a cloud database. You share a private link like `farcare.app/u/abc123` with your parents. They open it anytime and see:

> *Last check-in: 2 hours ago — "I'm okay, busy with class."*

No account needed for the parent. No app to install. Just a link.

**Stack for v2:** Next.js · Supabase (or Firebase) · Vercel

### v3 — PWA
- Install to home screen
- Background push notifications that fire even when the browser is closed
- Offline support

### v4 — Family Circles
- Multiple family members on one status page
- Per-viewer link permissions

---

## Development Notes

### Adding a new page

1. Copy the nav HTML block from any existing page
2. Add your page link to the nav (update `href` on all four pages)
3. Include `style.css` and `storage.js`
4. Call `initNav()` on `DOMContentLoaded` — it auto-highlights the active tab

### Editing default templates

Open `storage.js` and edit the `defaultTemplates()` method. These only apply to new users; existing users manage templates in Settings.

### Adding a timezone

Add an entry to the `TIMEZONES` array in `storage.js`:

```js
{ label: 'Nigeria — Lagos (WAT +1)', value: 'Africa/Lagos' }
```

---

## Known Limitations

| Limitation | Workaround / Fix |
|---|---|
| Reminders only work with tab open | PWA service worker (planned v3) |
| Data is device-only | Export backup regularly; cloud sync in v2 |
| WhatsApp requires manual send tap | By design — WhatsApp does not allow web auto-send |
| No offline mode | PWA planned for v3 |

---

## Contributing

This is a portfolio project, but feedback and suggestions are welcome.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-idea`
3. Commit your changes
4. Open a pull request

---

## License

MIT — free to use, modify, and share.

---

## Author

Built by **Tahmid Hossain Ankur**

- GitHub: [@your-username](https://github.com/tahmidankur)
- LinkedIn: [your-profile](https://linkedin.com/in/tahmidankur)

---

*FarCare is not an emergency app. It is a warm, everyday reassurance tool for families separated by distance.*
