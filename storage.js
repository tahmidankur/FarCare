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
  // Returns false (and tells the user) if the browser refuses to save,
  // e.g. storage is full or turned off in private mode
  _set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (err) {
      console.error('FarCare could not save', key, err);
      if (typeof showToast === 'function') {
        showToast("Couldn't save. Your browser's storage is full or turned off.", 'error');
      }
      return false;
    }
  },

  /* ---- User ---- */
  getUser() {
    const saved = this._get(this.KEYS.USER);
    return {
      name: '',
      myTimezone: FarCore.detectTimezone(),
      familyTimezone: 'Asia/Dhaka',
      ...(saved && typeof saved === 'object' ? saved : {}),
    };
  },
  setUser(data)  { return this._set(this.KEYS.USER, { ...this.getUser(), ...data }); },
  // The timezone every "today" is worked out in
  tz() { return this.getUser().myTimezone || FarCore.detectTimezone(); },

  /* ---- Contacts ---- */
  getContacts()  { const v = this._get(this.KEYS.CONTACTS); return Array.isArray(v) ? v : []; },
  setContacts(a) { return this._set(this.KEYS.CONTACTS, a); },
  addContact(c) {
    c.id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const list = this.getContacts();
    list.push(c);
    return this.setContacts(list) ? c : null;
  },
  updateContact(id, data) {
    return this.setContacts(this.getContacts().map(c => c.id === id ? { ...c, ...data } : c));
  },
  deleteContact(id) {
    return this.setContacts(this.getContacts().filter(c => c.id !== id));
  },
  getContact(id) { return this.getContacts().find(c => c.id === id) || null; },

  /* ---- History ----
     A check-in starts as status "pending" when WhatsApp or email opens,
     and only counts once the user says it was sent. Entries saved by
     older versions have no status and count as sent. */
  getHistory()     { const v = this._get(this.KEYS.HISTORY); return Array.isArray(v) ? v : []; },
  getSentHistory() { return this.getHistory().filter(FarCore.counts); },
  addHistory(entry) {
    entry.id        = 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    entry.timestamp = Date.now();
    const list = this.getHistory();
    list.unshift(entry);
    return this._set(this.KEYS.HISTORY, list) ? entry : null;
  },
  updateHistory(id, data) {
    return this._set(this.KEYS.HISTORY, this.getHistory().map(h => h.id === id ? { ...h, ...data } : h));
  },
  deleteHistory(id) {
    return this._set(this.KEYS.HISTORY, this.getHistory().filter(h => h.id !== id));
  },
  getPendingCheckin() { return this.getHistory().find(h => h.status === 'pending') || null; },
  clearHistory() { return this._set(this.KEYS.HISTORY, []); },

  /* ---- Settings ---- */
  getSettings() {
    return this._get(this.KEYS.SETTINGS) || {
      reminderTime: '09:00',
      notificationsEnabled: false,
      theme: 'light',
    };
  },
  setSettings(data) { return this._set(this.KEYS.SETTINGS, { ...this.getSettings(), ...data }); },

  /* ---- Templates ---- */
  // Always returns at least one usable template, so the check-in sheet can't break
  getTemplates() {
    const saved = this._get(this.KEYS.TEMPLATES);
    const usable = Array.isArray(saved)
      ? saved.filter(t => t && typeof t.text === 'string' && t.text.trim())
      : [];
    return usable.length ? usable : this.defaultTemplates();
  },
  setTemplates(arr) { return this._set(this.KEYS.TEMPLATES, arr); },
  defaultTemplates() { return FarCore.DEFAULT_TEMPLATES.map(t => ({ ...t })); },

  /* ---- Onboarding ---- */
  isOnboarded()  { return !!this._get(this.KEYS.ONBOARDED); },
  setOnboarded() { this._set(this.KEYS.ONBOARDED, true); },

  /* ---- Stats ---- */
  // Both use the profile timezone and step whole calendar days, so a
  // daylight-saving change or a flight doesn't shift the count
  getStreak()        { return FarCore.streak(this.getHistory(), this.tz()); },
  // Counts calendar days, so 1 means the last check-in was yesterday
  getDaysSinceLast() { return FarCore.daysSinceLast(this.getHistory(), this.tz()); },

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
  // Parse and check a backup without saving anything. Throws if it can't
  // be used; otherwise returns a cleaned copy (bad items dropped)
  parseBackup(jsonStr) { return FarCore.sanitizeBackup(JSON.parse(jsonStr)); },
  // Save a backup that parseBackup() already cleaned
  applyBackup(d) {
    let ok = true;
    if (d.user)      ok = this._set(this.KEYS.USER,      d.user)      && ok;
    if (d.contacts)  ok = this._set(this.KEYS.CONTACTS,  d.contacts)  && ok;
    if (d.history)   ok = this._set(this.KEYS.HISTORY,   d.history)   && ok;
    if (d.settings)  ok = this._set(this.KEYS.SETTINGS,  d.settings)  && ok;
    if (d.templates) ok = this._set(this.KEYS.TEMPLATES, d.templates) && ok;
    if (ok) this.setOnboarded();
    return ok;
  },
  importData(jsonStr) { return this.applyBackup(this.parseBackup(jsonStr)); },
};

/* =========================================================
   Icons (simple line icons, same style as the bottom nav)
   In HTML:  <span data-icon="heart"></span>
   In JS:    icon('heart', 20)
   ========================================================= */
const ICONS = {
  heart:    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  message:  '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  mail:     '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/>',
  trash:    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  flame:    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  list:     '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  globe:    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  home:     '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/>',
  bell:     '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  alert:    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info:     '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function methodLabel(method) {
  return method === 'whatsapp' ? icon('message', 13) + ' WhatsApp' : icon('mail', 13) + ' Email';
}

/* Fill every <span data-icon="..."> on the page */
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.icon, el.dataset.size || 18);
  });
});

/* =========================================================
   Shared UI Utilities
   ========================================================= */

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

// Make text safe to put inside innerHTML (stops names like "<b>" turning into HTML)
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Shorten long text and add "…" only when something was cut
function shortText(text = '', max = 28) {
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
}

function initials(name = '') {
  return (name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase() || '?').slice(0, 2);
}

// Deterministic avatar colour class
function avatarColor(name = '') {
  const colours = ['av-blue', 'av-green', 'av-warm', 'av-purple', 'av-rose'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colours[h % colours.length];
}

// "2 hours ago" relative time
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)          return 'Just now';
  if (d < 3600000)        return Math.floor(d / 60000)   + 'm ago';
  if (d < 86400000)       return Math.floor(d / 3600000) + 'h ago';
  if (d < 172800000)      return 'Yesterday';
  return Math.floor(d / 86400000) + ' days ago';
}

// Open a bottom-sheet overlay and move keyboard focus into it
let lastFocused = null;
function openSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  lastFocused = document.activeElement;
  el.style.display = 'flex';
  setBackgroundInert(true);
  requestAnimationFrame(() => {
    el.classList.add('open');
    const first = focusableIn(el)[0];
    if (first) first.focus();
  });
}

// Close a bottom-sheet overlay and put focus back where it was
function closeSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  // Un-inert first so focus can go back to the page
  if (!document.querySelector('.sheet-overlay.open')) setBackgroundInert(false);
  setTimeout(() => { el.style.display = 'none'; }, 300);
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

// Hide the page behind an open sheet from screen readers and the keyboard
function setBackgroundInert(on) {
  const app = document.querySelector('.app');
  if (!app) return;
  if (on) app.setAttribute('inert', '');
  else    app.removeAttribute('inert');
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

/* =========================================================
   Sending a check-in (shared by the dashboard and Contacts)
   1. Build the WhatsApp/email link and open it
   2. Save the check-in as "pending"
   3. Ask "Did it send?" so history only counts real sends
   ========================================================= */
function sendCheckin(contact, message, method, onDone) {
  const link = FarCore.buildSendUrl(method, contact, message);
  if (!link.ok) { showToast(link.error, 'error'); return false; }

  const entry = Storage.addHistory({
    contactId: contact.id, contactName: contact.name,
    message, method, status: 'pending',
  });
  if (!entry) return false;

  if (method === 'email') window.location.href = link.url;
  else window.open(link.url, '_blank', 'noopener');

  askDidItSend(entry, onDone);
  return true;
}

function askDidItSend(entry, onDone) {
  let el = document.getElementById('sent-check-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sent-check-overlay';
    el.className = 'sheet-overlay';
    el.style.display = 'none';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sent-check-title');
    el.innerHTML = `
      <div class="sheet">
        <div class="sheet-handle"></div>
        <h2 id="sent-check-title">Did your message send?</h2>
        <p class="sheet-sub" id="sent-check-sub"></p>
        <button class="btn btn-safe btn-full" data-sent="yes">Yes, it sent</button>
        <button class="btn btn-soft btn-full mt-8" data-sent="no">Not yet</button>
      </div>`;
    document.body.appendChild(el);
  }
  const app = method => method === 'email' ? 'your email app' : 'WhatsApp';
  el.querySelector('#sent-check-sub').textContent =
    `We opened ${app(entry.method)} with your message to ${entry.contactName}. It only counts once you've tapped Send there.`;

  el.onclick = e => {
    const btn = e.target.closest('[data-sent]');
    if (!btn) return;
    if (btn.dataset.sent === 'yes') {
      Storage.updateHistory(entry.id, { status: 'sent' });
      showToast('Check-in saved', 'success');
    } else {
      Storage.deleteHistory(entry.id);
      showToast('Not counted. Try again when you are ready.', 'default');
    }
    closeSheet('sent-check-overlay');
    if (onDone) onDone();
  };
  openSheet('sent-check-overlay');
}

// If the app was closed before answering, ask on the next visit
function resumePendingCheckin(onDone) {
  const pending = Storage.getPendingCheckin();
  if (pending) askDidItSend(pending, onDone);
}

// Set the active nav item based on current page filename
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

/* ---- Timezone picker ----
   Every zone the browser knows, grouped by region, with a search box. */
function tzLabel(tz) { return FarCore.tzLabel(tz); }

function tzSelect(id, selectedValue, cls = '') {
  const selected = FarCore.isValidTimezone(selectedValue) ? selectedValue : FarCore.detectTimezone();
  const now = Date.now();
  const groups = {};
  for (const tz of FarCore.allTimezones()) {
    (groups[FarCore.tzRegion(tz)] ||= []).push(tz);
  }
  const opts = Object.keys(groups).sort().map(region => {
    const items = groups[region]
      .map(tz => ({ tz, label: FarCore.tzLabel(tz, now) }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ tz, label }) =>
        `<option value="${escapeHtml(tz)}" ${tz === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`)
      .join('');
    return `<optgroup label="${escapeHtml(region.replace(/_/g, ' '))}">${items}</optgroup>`;
  }).join('');
  return `<input type="search" class="form-input tz-search" placeholder="Search a city, e.g. Lagos"
            aria-label="Search timezones" data-tz-filter="${escapeHtml(id)}" autocomplete="off">
          <select id="${escapeHtml(id)}" class="form-input form-select ${cls}">${opts}</select>`;
}

// Filter a timezone <select> as the user types in its search box
document.addEventListener('input', e => {
  const box = e.target.closest && e.target.closest('[data-tz-filter]');
  if (!box) return;
  const select = document.getElementById(box.dataset.tzFilter);
  if (!select) return;
  const q = box.value.trim().toLowerCase();
  let first = null;
  select.querySelectorAll('option').forEach(o => {
    const hay = (o.value.replace(/_/g, ' ') + ' ' + o.textContent).toLowerCase();
    const hit = !q || hay.includes(q);
    o.hidden = !hit;
    if (hit && !first) first = o;
  });
  select.querySelectorAll('optgroup').forEach(g => {
    g.hidden = ![...g.children].some(o => !o.hidden);
  });
  const cur = select.selectedOptions[0];
  if (first && (!cur || cur.hidden)) select.value = first.value;
});

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
