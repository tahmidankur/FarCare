/* =========================================================
   FarCore — pure logic with no DOM or storage access.
   Loaded as a plain <script> in the browser (window.FarCore)
   and required by the unit tests (module.exports).
   ========================================================= */
(function (root) {
  'use strict';

  const DEFAULT_TZ = 'America/Toronto';

  /* ---------------- Timezones ---------------- */

  function isValidTimezone(tz) {
    if (typeof tz !== 'string' || !tz) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; }
    catch { return false; }
  }

  // The device's own timezone, e.g. "America/Vancouver"
  function detectTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return isValidTimezone(tz) ? tz : DEFAULT_TZ;
    } catch { return DEFAULT_TZ; }
  }

  // Every IANA zone the browser knows (418 or so), with a short fallback list
  function allTimezones() {
    let list = [];
    try { if (Intl.supportedValuesOf) list = Intl.supportedValuesOf('timeZone'); } catch { /* old browser */ }
    if (!list.length) {
      list = ['America/Vancouver', 'America/Edmonton', 'America/Toronto', 'America/Halifax',
        'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London',
        'Europe/Paris', 'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Dubai',
        'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];
    }
    // Browsers list some zones under old names (Asia/Calcutta). Show the
    // current name where the browser understands it.
    list = list.map(tz => (RENAMED[tz] && isValidTimezone(RENAMED[tz]) ? RENAMED[tz] : tz));
    // Some browsers leave UTC out of the list
    if (!list.includes('UTC')) list = [...list, 'UTC'];
    return [...new Set(list)];
  }

  const RENAMED = {
    'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu',
    'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Rangoon': 'Asia/Yangon',
    'Europe/Kiev': 'Europe/Kyiv', 'America/Godthab': 'America/Nuuk',
    'Atlantic/Faeroe': 'Atlantic/Faroe', 'Pacific/Truk': 'Pacific/Chuuk',
    'Pacific/Ponape': 'Pacific/Pohnpei', 'Pacific/Enderbury': 'Pacific/Kanton',
    'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  };

  // "UTC+5:30" for a zone right now
  function utcOffsetLabel(tz, now = Date.now()) {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
        .formatToParts(now).find(p => p.type === 'timeZoneName');
      const v = part ? part.value.replace('GMT', 'UTC') : 'UTC';
      // "UTC+05:45" -> "UTC+5:45", "UTC-03:00" -> "UTC-3"
      return v === 'UTC' ? 'UTC+0' : v.replace(/:00$/, '').replace(/([+-])0(\d)/, '$1$2');
    } catch { return ''; }
  }

  // "Asia/Ho_Chi_Minh" -> "Ho Chi Minh"
  function tzCity(tz) {
    const last = String(tz).split('/').pop();
    return last.replace(/_/g, ' ');
  }

  // Friendly label: "Dhaka (UTC+6)"
  function tzLabel(tz, now) {
    if (!tz) return '';
    const off = utcOffsetLabel(tz, now);
    return off ? `${tzCity(tz)} (${off})` : tzCity(tz);
  }

  // "Asia/Dhaka" -> "Asia"
  function tzRegion(tz) {
    const i = String(tz).indexOf('/');
    return i > 0 ? tz.slice(0, i) : 'Other';
  }

  /* ---------------- Calendar days ---------------- */

  // The calendar date ("2026-03-09") of a moment, in a given timezone
  function dateKey(ts, tz) {
    const zone = isValidTimezone(tz) ? tz : undefined;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(ts));
    const get = t => parts.find(p => p.type === t).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  // Step a "YYYY-MM-DD" key by whole calendar days. Works in UTC, so a
  // daylight-saving change can never skip or repeat a day.
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return t.toISOString().slice(0, 10);
  }

  function daysBetween(fromKey, toKey) {
    const a = Date.UTC(...fromKey.split('-').map((v, i) => i === 1 ? v - 1 : +v));
    const b = Date.UTC(...toKey.split('-').map((v, i) => i === 1 ? v - 1 : +v));
    return Math.round((b - a) / 86400000);
  }

  // Hour of the day (0–23) in a timezone
  function hourIn(tz, now = Date.now()) {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: isValidTimezone(tz) ? tz : undefined, hour: 'numeric', hourCycle: 'h23',
    }).format(now);
    return Number(h);
  }

  /* ---------------- History ---------------- */

  // An entry counts once it has been sent. Older entries have no status.
  function counts(entry) {
    return entry && entry.status !== 'pending';
  }

  // Consecutive days with a check-in, counting back from today
  // (or from yesterday, if there is none yet today)
  function streak(history, tz, now = Date.now()) {
    const days = new Set((history || []).filter(counts).map(h => dateKey(h.timestamp, tz)));
    if (!days.size) return 0;
    let cur = dateKey(now, tz);
    if (!days.has(cur)) cur = addDays(cur, -1);
    let n = 0;
    while (days.has(cur)) { n++; cur = addDays(cur, -1); }
    return n;
  }

  // Calendar days since the latest check-in (0 = today, 1 = yesterday)
  function daysSinceLast(history, tz, now = Date.now()) {
    const sent = (history || []).filter(counts);
    if (!sent.length) return null;
    const latest = Math.max(...sent.map(h => h.timestamp));
    return daysBetween(dateKey(latest, tz), dateKey(now, tz));
  }

  // "Today", "Yesterday" or null for a history entry's day
  function relativeDayLabel(ts, tz, now = Date.now()) {
    const k = dateKey(ts, tz);
    const today = dateKey(now, tz);
    if (k === today) return 'Today';
    if (k === addDays(today, -1)) return 'Yesterday';
    return null;
  }

  // Should the dashboard nag? Not straight after midnight: if the last
  // check-in was yesterday, wait until the reminder time has passed today.
  function shouldShowMissedBanner(days, tz, reminderTime = '09:00', now = Date.now()) {
    if (days === null || days < 1) return false;
    if (days >= 2) return true;
    const remindHour = Number(String(reminderTime).split(':')[0]) || 9;
    return hourIn(tz, now) >= remindHour;
  }

  /* ---------------- Contacts ---------------- */

  // Normalise a WhatsApp number to E.164 ("+8801712345678").
  // Returns { ok, value } or { ok:false, error }.
  function normalizePhone(input) {
    let s = String(input || '').trim();
    if (!s) return { ok: false, error: 'Please enter their WhatsApp number' };
    if (/[^\d\s()+.-]/.test(s)) {
      return { ok: false, error: 'Use digits only, like +880 1712 345678' };
    }
    s = s.replace(/[\s().-]/g, '');
    if (s.startsWith('00')) s = '+' + s.slice(2);
    if (!s.startsWith('+')) {
      return { ok: false, error: 'Start with + and the country code, like +880 1712 345678' };
    }
    if (s.indexOf('+', 1) !== -1) return { ok: false, error: 'That number has a stray +' };
    const digits = s.slice(1);
    if (digits.startsWith('0')) {
      return { ok: false, error: 'Country codes never start with 0. Drop the 0 after the +' };
    }
    if (digits.length < 7 || digits.length > 15) {
      return { ok: false, error: 'That number looks too ' + (digits.length < 7 ? 'short' : 'long') };
    }
    return { ok: true, value: '+' + digits };
  }

  // "+8801712345678" -> "+880 1712 345 678" (display only)
  function formatPhone(e164) {
    const d = String(e164 || '').replace(/\D/g, '');
    if (!d) return '';
    return '+' + d.replace(/^(\d{1,3})(\d{3,4})(\d{3})(\d+)$/, '$1 $2 $3 $4');
  }

  function validateEmail(input) {
    const s = String(input || '').trim();
    if (!s) return { ok: false, error: 'Please enter their email address' };
    if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(s)) {
      return { ok: false, error: "That email address doesn't look right" };
    }
    return { ok: true, value: s };
  }

  // Everything a contact needs before it can be saved
  function validateContact(c) {
    if (!String(c.name || '').trim()) return { ok: false, error: 'Please enter a name' };
    if (!isValidTimezone(c.timezone)) return { ok: false, error: 'Please pick their timezone' };
    const out = { ...c, name: c.name.trim(), relationship: String(c.relationship || '').trim() };
    if (c.preferredMethod === 'email') {
      const e = validateEmail(c.email);
      if (!e.ok) return e;
      out.email = e.value;
      out.phone = c.phone ? (normalizePhone(c.phone).value || '') : '';
    } else {
      const p = normalizePhone(c.phone);
      if (!p.ok) return p;
      out.phone = p.value;
      out.email = c.email ? (validateEmail(c.email).value || '') : '';
      out.preferredMethod = 'whatsapp';
    }
    return { ok: true, value: out };
  }

  /* ---------------- Sending ---------------- */

  // The link that opens WhatsApp or the mail app. { ok, url } or { ok:false, error }
  function buildSendUrl(method, contact, message) {
    const body = encodeURIComponent(message || '');
    if (method === 'email') {
      const e = validateEmail(contact && contact.email);
      if (!e.ok) return { ok: false, error: 'No valid email address saved' };
      // Encode the address itself so ? or & can't break the link
      const to = e.value.split('@').map(encodeURIComponent).join('@');
      return { ok: true, url: `mailto:${to}?subject=${encodeURIComponent('FarCare Check-In')}&body=${body}` };
    }
    const p = normalizePhone(contact && contact.phone);
    if (!p.ok) return { ok: false, error: 'No valid WhatsApp number saved' };
    return { ok: true, url: `https://wa.me/${p.value.slice(1)}?text=${body}` };
  }

  // A soft note about the other person's local time
  function familyTimeHint(tz, now = Date.now()) {
    const h = hourIn(tz, now);
    if (h >= 23 || h < 6) return "Probably asleep. They'll see it in the morning.";
    if (h < 8) return 'Early morning for them.';
    if (h >= 21) return 'Getting late for them.';
    return '';
  }

  /* ---------------- Backup ---------------- */

  const DEFAULT_TEMPLATES = [
    { id: 't1', text: "I'm okay! Everything is fine. Don't worry about me", category: 'general' },
    { id: 't2', text: "Busy with class/work but safe. I'll call you later!", category: 'general' },
    { id: 't3', text: 'I reached home safely', category: 'arrival' },
    { id: 't4', text: 'Good morning! Doing well today', category: 'morning' },
    { id: 't5', text: 'Goodnight! Love you lots', category: 'night' },
    { id: 't6', text: "Everything is fine. I'll call when I'm free", category: 'general' },
  ];

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const str = (v, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');

  // Check a parsed backup and return a cleaned copy, dropping any item with
  // the wrong shape. Throws when the file can't be used at all.
  function sanitizeBackup(d) {
    if (!isObj(d) || !d.farcare_version) throw new Error('Not a FarCare backup');
    for (const key of ['contacts', 'history', 'templates']) {
      if (d[key] !== undefined && !Array.isArray(d[key])) throw new Error('Bad ' + key);
    }
    const out = { skipped: 0 };

    if (isObj(d.user)) {
      out.user = {
        name: str(d.user.name, 80),
        myTimezone: isValidTimezone(d.user.myTimezone) ? d.user.myTimezone : detectTimezone(),
        familyTimezone: isValidTimezone(d.user.familyTimezone) ? d.user.familyTimezone : 'Asia/Dhaka',
      };
    }

    if (d.contacts) {
      out.contacts = [];
      for (const c of d.contacts) {
        if (!isObj(c) || !str(c.name) || !str(c.id)) { out.skipped++; continue; }
        out.contacts.push({
          id: str(c.id, 64), name: str(c.name, 80), relationship: str(c.relationship, 80),
          timezone: isValidTimezone(c.timezone) ? c.timezone : 'Asia/Dhaka',
          preferredMethod: c.preferredMethod === 'email' ? 'email' : 'whatsapp',
          phone: str(c.phone, 32), email: str(c.email, 254),
        });
      }
    }

    if (d.history) {
      out.history = [];
      for (const h of d.history) {
        if (!isObj(h) || !Number.isFinite(h.timestamp) || h.timestamp <= 0) { out.skipped++; continue; }
        out.history.push({
          id: str(h.id, 64) || 'h_' + h.timestamp, timestamp: h.timestamp,
          contactId: str(h.contactId, 64), contactName: str(h.contactName, 80) || 'Contact',
          message: str(h.message, 1000), method: h.method === 'email' ? 'email' : 'whatsapp',
          ...(h.status === 'pending' ? { status: 'pending' } : {}),
        });
      }
      out.history.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (d.templates) {
      out.templates = [];
      for (const t of d.templates) {
        if (!isObj(t) || !str(t.text).trim()) { out.skipped++; continue; }
        out.templates.push({ id: str(t.id, 64) || 't_' + out.templates.length, text: str(t.text, 1000), category: str(t.category, 32) || 'general' });
      }
      // The check-in sheet needs at least one message
      if (!out.templates.length) throw new Error('A backup needs at least one message template');
    }

    if (isObj(d.settings)) {
      out.settings = {
        reminderTime: /^\d{2}:\d{2}$/.test(d.settings.reminderTime) ? d.settings.reminderTime : '09:00',
        notificationsEnabled: d.settings.notificationsEnabled === true,
        theme: 'light',
      };
    }
    return out;
  }

  const FarCore = {
    DEFAULT_TZ, DEFAULT_TEMPLATES,
    isValidTimezone, detectTimezone, allTimezones, utcOffsetLabel, tzCity, tzLabel, tzRegion,
    dateKey, addDays, daysBetween, hourIn,
    counts, streak, daysSinceLast, relativeDayLabel, shouldShowMissedBanner,
    normalizePhone, formatPhone, validateEmail, validateContact,
    buildSendUrl, familyTimeHint, sanitizeBackup,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FarCore;
  else root.FarCore = FarCore;
})(typeof self !== 'undefined' ? self : this);
