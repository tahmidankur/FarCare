import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const FarCore = createRequire(import.meta.url)('../../core.js');
const VAN = 'America/Vancouver';

// A moment given as wall-clock time in Vancouver
const van = (iso, offset) => Date.parse(`${iso}${offset}`);

describe('calendar days', () => {
  it('steps whole days across the spring DST change', () => {
    expect(FarCore.addDays('2026-03-09', -1)).toBe('2026-03-08');
    expect(FarCore.addDays('2026-03-08', -1)).toBe('2026-03-07');
    expect(FarCore.addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('works out the date in the given timezone, not the device', () => {
    const ts = Date.parse('2026-06-01T03:00:00Z');
    expect(FarCore.dateKey(ts, VAN)).toBe('2026-05-31');
    expect(FarCore.dateKey(ts, 'Asia/Dhaka')).toBe('2026-06-01');
  });
});

describe('bug 3: streak across daylight saving', () => {
  // DST starts 8 Mar 2026 at 02:00 in Vancouver (PST -08:00 -> PDT -07:00)
  const history = [
    { timestamp: van('2026-03-07T20:00:00', '-08:00') },
    { timestamp: van('2026-03-08T20:00:00', '-07:00') },
    { timestamp: van('2026-03-09T00:15:00', '-07:00') },
  ];
  const now = van('2026-03-09T00:30:00', '-07:00');

  it('counts all three days at 00:30 on 9 March', () => {
    expect(FarCore.streak(history, VAN, now)).toBe(3);
  });

  it('labels 8 March as Yesterday on 9 March', () => {
    expect(FarCore.relativeDayLabel(history[1].timestamp, VAN, now)).toBe('Yesterday');
    expect(FarCore.relativeDayLabel(history[0].timestamp, VAN, now)).toBe(null);
  });

  it('also survives the autumn change', () => {
    // DST ends 1 Nov 2026
    const h = [
      { timestamp: van('2026-10-31T22:00:00', '-07:00') },
      { timestamp: van('2026-11-01T22:00:00', '-08:00') },
    ];
    expect(FarCore.streak(h, VAN, van('2026-11-02T00:10:00', '-08:00'))).toBe(2);
  });

  it('starts from yesterday when there is no check-in yet today', () => {
    expect(FarCore.streak(history.slice(0, 2), VAN, van('2026-03-09T12:00:00', '-07:00'))).toBe(2);
    expect(FarCore.streak(history.slice(0, 1), VAN, van('2026-03-09T12:00:00', '-07:00'))).toBe(0);
  });
});

describe('bug 4: days use the profile timezone', () => {
  it('a Dhaka profile does not shift when the device is in Vancouver', () => {
    // 23:00 Dhaka on 1 June = 10:00 Vancouver on 1 June
    const h = [{ timestamp: Date.parse('2026-06-01T17:00:00Z') }];
    const now = Date.parse('2026-06-01T19:00:00Z'); // 01:00 on 2 June in Dhaka
    expect(FarCore.daysSinceLast(h, 'Asia/Dhaka', now)).toBe(1);
    expect(FarCore.daysSinceLast(h, VAN, now)).toBe(0);
  });
});

describe('bug 5: unconfirmed sends do not count', () => {
  const now = Date.parse('2026-06-02T18:00:00Z');
  it('ignores pending check-ins in the streak and days-since', () => {
    const h = [
      { timestamp: Date.parse('2026-06-02T17:00:00Z'), status: 'pending' },
      { timestamp: Date.parse('2026-06-01T17:00:00Z'), status: 'sent' },
    ];
    expect(FarCore.streak(h, VAN, now)).toBe(1);
    expect(FarCore.daysSinceLast(h, VAN, now)).toBe(1);
  });
  it('treats old entries without a status as sent', () => {
    expect(FarCore.streak([{ timestamp: now - 1000 }], VAN, now)).toBe(1);
  });
  it('returns null when nothing has been sent', () => {
    expect(FarCore.daysSinceLast([{ timestamp: now, status: 'pending' }], VAN, now)).toBe(null);
  });
});

describe('bug 2: WhatsApp numbers', () => {
  it.each([
    ['+880 1712-345678', '+8801712345678'],
    ['+1 (604) 555-0199', '+16045550199'],
    ['00 44 7700 900123', '+447700900123'],
  ])('accepts %s', (input, out) => {
    expect(FarCore.normalizePhone(input)).toEqual({ ok: true, value: out });
  });

  it.each([
    ['not a number'],
    [''],
    ['01712345678'],   // local number, no country code
    ['+0171234567'],   // country code starting with 0
    ['+12345'],        // too short
    ['+1234567890123456'], // too long
  ])('rejects %j', input => {
    const r = FarCore.normalizePhone(input);
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('validateContact stores the normalised number', () => {
    const r = FarCore.validateContact({ name: ' Ammu ', timezone: 'Asia/Dhaka', preferredMethod: 'whatsapp', phone: '+880 1712 345678' });
    expect(r.ok).toBe(true);
    expect(r.value.phone).toBe('+8801712345678');
    expect(r.value.name).toBe('Ammu');
  });

  it('validateContact refuses a bad email for the email channel', () => {
    expect(FarCore.validateContact({ name: 'A', timezone: 'UTC', preferredMethod: 'email', email: 'nope' }).ok).toBe(false);
  });
});

describe('bug 7: send links', () => {
  it('encodes the email address in the mailto link', () => {
    const r = FarCore.buildSendUrl('email', { email: "o'neil+mom@example.com" }, 'Hi & bye');
    expect(r.ok).toBe(true);
    expect(r.url).toBe("mailto:o'neil%2Bmom@example.com?subject=FarCare%20Check-In&body=Hi%20%26%20bye");
  });
  it('refuses an address that could break the link', () => {
    expect(FarCore.buildSendUrl('email', { email: 'a@b.com?cc=x@y.com' }, 'x').ok).toBe(false);
  });
  it('builds a wa.me link without the + and without leading zeros', () => {
    const r = FarCore.buildSendUrl('whatsapp', { phone: '+880 1712 345678' }, "I'm okay");
    expect(r.url).toBe("https://wa.me/8801712345678?text=I'm%20okay");
  });
  it('refuses an unusable saved number before opening anything', () => {
    expect(FarCore.buildSendUrl('whatsapp', { phone: 'not a number' }, 'x').ok).toBe(false);
  });
});

describe('bugs 1 and 6: backup checks', () => {
  const base = { farcare_version: 1 };
  it('rejects a backup with an empty template list', () => {
    expect(() => FarCore.sanitizeBackup({ ...base, templates: [] })).toThrow(/template/);
  });
  it('rejects files that are not FarCare backups', () => {
    expect(() => FarCore.sanitizeBackup({ hello: 1 })).toThrow();
    expect(() => FarCore.sanitizeBackup({ ...base, history: 'x' })).toThrow();
  });
  it('drops history entries with a bad timestamp', () => {
    const d = FarCore.sanitizeBackup({ ...base, history: [
      { timestamp: 'yesterday', contactName: 'Mom' },
      { timestamp: 1767225600000, contactName: 'Mom', message: 'hi' },
      null,
    ] });
    expect(d.history).toHaveLength(1);
    expect(d.skipped).toBe(2);
  });
  it('drops contacts without a name or id and fixes bad timezones', () => {
    const d = FarCore.sanitizeBackup({ ...base, contacts: [
      { id: 'c1', name: 'Mom', timezone: 'Mars/Olympus' },
      { name: 'No id' },
    ] });
    expect(d.contacts).toEqual([expect.objectContaining({ id: 'c1', timezone: 'Asia/Dhaka', preferredMethod: 'whatsapp' })]);
  });
  it('drops blank templates but keeps good ones', () => {
    const d = FarCore.sanitizeBackup({ ...base, templates: [{ text: '  ' }, { id: 't', text: 'Hi' }] });
    expect(d.templates).toEqual([{ id: 't', text: 'Hi', category: 'general' }]);
  });
});

describe('bug 9: missed-check-in banner timing', () => {
  it('stays quiet just after midnight when the last check-in was yesterday', () => {
    expect(FarCore.shouldShowMissedBanner(1, VAN, '09:00', van('2026-06-02T00:30:00', '-07:00'))).toBe(false);
  });
  it('shows once the reminder time has passed', () => {
    expect(FarCore.shouldShowMissedBanner(1, VAN, '09:00', van('2026-06-02T09:30:00', '-07:00'))).toBe(true);
  });
  it('always shows after two or more days', () => {
    expect(FarCore.shouldShowMissedBanner(2, VAN, '09:00', van('2026-06-02T00:30:00', '-07:00'))).toBe(true);
  });
  it('never shows with no history or a check-in today', () => {
    expect(FarCore.shouldShowMissedBanner(null, VAN)).toBe(false);
    expect(FarCore.shouldShowMissedBanner(0, VAN)).toBe(false);
  });
});

describe('timezones', () => {
  it('offers the full IANA list', () => {
    const list = FarCore.allTimezones();
    expect(list.length).toBeGreaterThan(300);
    for (const tz of ['Africa/Lagos', 'Asia/Manila', 'Asia/Kathmandu', 'Asia/Kolkata', 'America/Sao_Paulo']) {
      expect(list).toContain(tz);
    }
  });
  it('makes friendly labels', () => {
    expect(FarCore.tzLabel('Asia/Kathmandu')).toBe('Kathmandu (UTC+5:45)');
    expect(FarCore.tzLabel('America/Sao_Paulo')).toBe('Sao Paulo (UTC-3)');
  });
  it('detects the device timezone', () => {
    expect(FarCore.detectTimezone()).toBe(VAN);
  });
  it('gives a hint when it is the middle of the night for family', () => {
    expect(FarCore.familyTimeHint('Asia/Dhaka', Date.parse('2026-06-01T19:00:00Z'))).toMatch(/asleep/);
    expect(FarCore.familyTimeHint('Asia/Dhaka', Date.parse('2026-06-01T06:00:00Z'))).toBe('');
  });
});
