/* =========================================================
   FarCare — Storage Layer + Shared Utilities
   ========================================================= */

const Storage = {
  KEYS: {
    USER:      'farcare_user',
    CONTACTS:  'farcare_contacts',
    HISTORY:   'farcare_history',
    SETTINGS:  'farcare_settings',
    TEMPLATES: 'farcare_templates',
    ONBOARDED: 'farcare_onboarded',
  },

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  /* ---- User ---- */
  getUser()      { return this._get(this.KEYS.USER) || { name: '', myTimezone: 'America/Toronto', familyTimezone: 'Asia/Dhaka' }; },
  setUser(data)  { this._set(this.KEYS.USER, { ...this.getUser(), ...data }); },

  /* ---- Contacts ---- */
  getContacts()  { return this._get(this.KEYS.CONTACTS) || []; },
  setContacts(a) { this._set(this.KEYS.CONTACTS, a); },
  addContact(c) {
    c.id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const list = this.getContacts();
    list.push(c);
    this.setContacts(list);
    return c;
  },
  updateContact(id, data) {
    this.setContacts(this.getContacts().map(c => c.id === id ? { ...c, ...data } : c));
  },
  deleteContact(id) {
    this.setContacts(this.getContacts().filter(c => c.id !== id));
  },
  getContact(id) { return this.getContacts().find(c => c.id === id) || null; },

  /* ---- History ---- */
  getHistory()   { return this._get(this.KEYS.HISTORY) || []; },
  addHistory(entry) {
    entry.id        = 'h_' + Date.now();
    entry.timestamp = Date.now();
    const list = this.getHistory();
    list.unshift(entry);
    this._set(this.KEYS.HISTORY, list);
    return entry;
  },
  clearHistory() { this._set(this.KEYS.HISTORY, []); },

  /* ---- Settings ---- */
  getSettings() {
    return this._get(this.KEYS.SETTINGS) || {
      reminderTime: '09:00',
      notificationsEnabled: false,
      theme: 'light',
    };
  },
  setSettings(data) { this._set(this.KEYS.SETTINGS, { ...this.getSettings(), ...data }); },

  /* ---- Templates ---- */
  getTemplates() {
    return this._get(this.KEYS.TEMPLATES) || this.defaultTemplates();
  },
  setTemplates(arr) { this._set(this.KEYS.TEMPLATES, arr); },
  defaultTemplates() {
    return [
      { id: 't1', text: "I'm okay! Everything is fine. Don't worry about me 💙",      category: 'general' },
      { id: 't2', text: "Busy with class/work but safe. I'll call you later!",           category: 'general' },
      { id: 't3', text: "I reached home safely 🏠",                                       category: 'arrival' },
      { id: 't4', text: "Good morning from Canada! Doing well today 🌞",                  category: 'morning' },
      { id: 't5', text: "Goodnight! Love you lots 🌙",                                    category: 'night'   },
      { id: 't6', text: "Everything is fine. I'll call when I'm free ❤️",                category: 'general' },
    ];
  },

  /* ---- Onboarding ---- */
  isOnboarded()  { return !!this._get(this.KEYS.ONBOARDED); },
  setOnboarded() { this._set(this.KEYS.ONBOARDED, true); },

  /* ---- Stats ---- */
  getStreak() {
    const history = this.getHistory();
    if (!history.length) return 0;
    const days = new Set(history.map(h => new Date(h.timestamp).toDateString()));
    let streak = 0;
    let cur    = new Date();
    // if no checkin today, start counting from yesterday
    if (!days.has(cur.toDateString())) {
      cur = new Date(cur.getTime() - 86400000);
    }
    while (days.has(cur.toDateString())) {
      streak++;
      cur = new Date(cur.getTime() - 86400000);
    }
    return streak;
  },

  // Counts calendar days, so 1 means the last check-in was yesterday
  getDaysSinceLast() {
    const h = this.getHistory();
    if (!h.length) return null;
    const last  = new Date(h[0].timestamp); last.setHours(0, 0, 0, 0);
    const today = new Date();               today.setHours(0, 0, 0, 0);
    return Math.round((today - last) / 86400000);
  },

  /* ---- Backup ---- */
  exportData() {
    return JSON.stringify({
      farcare_version: 1,
      exportedAt: new Date().toISOString(),
      user:      this.getUser(),
      contacts:  this.getContacts(),
      history:   this.getHistory(),
      settings:  this.getSettings(),
      templates: this.getTemplates(),
    }, null, 2);
  },
  importData(jsonStr) {
    const d = JSON.parse(jsonStr);
    // Make sure this really is a FarCare backup before overwriting anything
    if (!d || !d.farcare_version) throw new Error('Not a FarCare backup');
    for (const key of ['contacts', 'history', 'templates']) {
      if (d[key] && !Array.isArray(d[key])) throw new Error('Bad ' + key);
    }
    if (d.user)      this._set(this.KEYS.USER,      d.user);
    if (d.contacts)  this._set(this.KEYS.CONTACTS,  d.contacts);
    if (d.history)   this._set(this.KEYS.HISTORY,   d.history);
    if (d.settings)  this._set(this.KEYS.SETTINGS,  d.settings);
    if (d.templates) this._set(this.KEYS.TEMPLATES, d.templates);
  },
};

/* =========================================================
   Shared UI Utilities
   ========================================================= */

/** Flash a toast message */
function showToast(msg, type = 'default') {
  let el = document.getElementById('fc-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fc-toast';
    el.className = 'fc-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className   = 'fc-toast fc-toast--' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/** Make text safe to put inside innerHTML (stops names like "<b>" turning into HTML) */
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Shorten long text and add "…" only when something was cut */
function shortText(text = '', max = 28) {
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
}

/** Get initials from a name */
function initials(name = '') {
  return (name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase() || '?').slice(0, 2);
}

/** Deterministic avatar colour class */
function avatarColor(name = '') {
  const colours = ['av-blue', 'av-green', 'av-warm', 'av-purple', 'av-rose'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colours[h % colours.length];
}

/** "2 hours ago" relative time */
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)          return 'Just now';
  if (d < 3600000)        return Math.floor(d / 60000)   + 'm ago';
  if (d < 86400000)       return Math.floor(d / 3600000) + 'h ago';
  if (d < 172800000)      return 'Yesterday';
  return Math.floor(d / 86400000) + ' days ago';
}

/** Short date label */
function shortDate(ts) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format time HH:MM */
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/** Open a bottom-sheet overlay and move keyboard focus into it */
let lastFocused = null;
function openSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  lastFocused = document.activeElement;
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    el.classList.add('open');
    const first = focusableIn(el)[0];
    if (first) first.focus();
  });
}

/** Close a bottom-sheet overlay and put focus back where it was */
function closeSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  setTimeout(() => { el.style.display = 'none'; }, 300);
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

function focusableIn(el) {
  return [...el.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
    .filter(f => f.offsetParent !== null);
}

/* Keyboard support shared by every page */
document.addEventListener('keydown', e => {
  // The open sheet on top is the last visible one in the page
  const openSheets = [...document.querySelectorAll('.sheet-overlay.open')]
    .filter(el => el.style.display !== 'none');
  const sheet = openSheets[openSheets.length - 1];

  // Escape closes the open sheet (onboarding has to be finished, so it stays)
  if (e.key === 'Escape' && sheet && sheet.id !== 'onboarding-overlay') {
    closeSheet(sheet.id);
  }

  // Keep Tab inside the open sheet
  if (e.key === 'Tab' && sheet) {
    const items = focusableIn(sheet);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Let Enter and Space press things marked role="button"
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
    e.preventDefault();
    e.target.click();
  }
});

/** Set the active nav item based on current page filename */
function initNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(a => {
    const href = a.getAttribute('href');
    const match =
      (href === 'index.html'   && (page === 'index.html' || page === '')) ||
      (href === page);
    if (match) a.classList.add('active');
    else        a.classList.remove('active');
  });
}

/* ---- Timezone list ---- */
const TIMEZONES = [
  { label: 'Canada — Vancouver (PT)',      value: 'America/Vancouver' },
  { label: 'Canada — Calgary (MT)',         value: 'America/Edmonton'  },
  { label: 'Canada — Toronto (ET)',         value: 'America/Toronto'   },
  { label: 'Canada — Halifax (AT)',         value: 'America/Halifax'   },
  { label: 'USA — New York (ET)',           value: 'America/New_York'  },
  { label: 'USA — Chicago (CT)',            value: 'America/Chicago'   },
  { label: 'USA — Los Angeles (PT)',        value: 'America/Los_Angeles'},
  { label: 'UK — London',                   value: 'Europe/London'     },
  { label: 'Europe — Paris / Berlin',       value: 'Europe/Paris'      },
  { label: 'Bangladesh — Dhaka (BST +6)',   value: 'Asia/Dhaka'        },
  { label: 'India — Kolkata (IST +5:30)',   value: 'Asia/Kolkata'      },
  { label: 'Pakistan — Karachi (PKT +5)',   value: 'Asia/Karachi'      },
  { label: 'UAE — Dubai (+4)',              value: 'Asia/Dubai'        },
  { label: 'Singapore (+8)',                value: 'Asia/Singapore'    },
  { label: 'China — Shanghai (+8)',         value: 'Asia/Shanghai'     },
  { label: 'Japan — Tokyo (+9)',            value: 'Asia/Tokyo'        },
  { label: 'Australia — Sydney',           value: 'Australia/Sydney'  },
  { label: 'New Zealand — Auckland',        value: 'Pacific/Auckland'  },
];

/** Build a <select> of timezones, pre-selecting a value */
function tzSelect(id, selectedValue, cls = '') {
  const opts = TIMEZONES.map(tz =>
    `<option value="${tz.value}" ${tz.value === selectedValue ? 'selected' : ''}>${tz.label}</option>`
  ).join('');
  return `<select id="${id}" class="form-input form-select ${cls}">${opts}</select>`;
}

/* =========================================================
   Daily reminder
   Browsers can only run this timer while FarCare is open,
   so every page starts it when it loads.
   ========================================================= */
let reminderTimer = null;

function scheduleReminder() {
  clearTimeout(reminderTimer);
  const settings = Storage.getSettings();
  if (!settings.notificationsEnabled || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const [h, m] = (settings.reminderTime || '09:00').split(':').map(Number);
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  reminderTimer = setTimeout(() => {
    // No reminder needed if you already checked in today
    if (Storage.getDaysSinceLast() !== 0) showReminder();
    scheduleReminder(); // set up tomorrow's reminder
  }, next - now);
}

function showReminder() {
  const user  = Storage.getUser();
  const title = 'FarCare';
  const options = {
    body: `Hey ${user.name || 'there'}! Time to check in with your family.`,
    icon: 'icons/icon-192.png',
    tag:  'farcare-reminder',
  };
  // Android only shows notifications through the service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
  } else {
    new Notification(title, options);
  }
}

window.addEventListener('DOMContentLoaded', scheduleReminder);
