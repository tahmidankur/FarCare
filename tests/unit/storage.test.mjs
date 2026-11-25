import { describe, it, expect } from 'vitest';
import { loadApp } from './load-app.mjs';

describe('bug 1: templates can never be empty', () => {
  it('falls back to defaults when stored templates are an empty list', () => {
    const { Storage, store } = loadApp();
    store.set('farcare_templates', '[]');
    expect(Storage.getTemplates().length).toBeGreaterThan(0);
    expect(Storage.getTemplates()[0].text).toBeTruthy();
  });
  it('refuses to import a backup with no templates and leaves data alone', () => {
    const { Storage, store } = loadApp();
    store.set('farcare_contacts', '[{"id":"c1","name":"Mom"}]');
    expect(() => Storage.importData(JSON.stringify({ farcare_version: 1, contacts: [], templates: [] }))).toThrow();
    expect(Storage.getContacts()).toHaveLength(1);
  });
  it('drops stored templates with no text', () => {
    const { Storage, store } = loadApp();
    store.set('farcare_templates', '[{"id":"a"},{"id":"b","text":"Hi"}]');
    expect(Storage.getTemplates()).toEqual([{ id: 'b', text: 'Hi' }]);
  });
});

describe('bug 8: failed writes are caught', () => {
  it('returns false and tells the user instead of throwing', () => {
    const { Storage, toasts } = loadApp({ failWrites: true });
    expect(() => Storage.setUser({ name: 'A' })).not.toThrow();
    expect(Storage.setUser({ name: 'A' })).toBe(false);
    expect(Storage.addContact({ name: 'Mom' })).toBe(null);
    expect(toasts.at(-1)[1]).toBe('error');
  });
});

describe('bug 5: pending check-ins', () => {
  it('only counts a check-in after it is confirmed', () => {
    const { Storage } = loadApp();
    const e = Storage.addHistory({ contactName: 'Mom', message: 'hi', method: 'whatsapp', status: 'pending' });
    expect(Storage.getStreak()).toBe(0);
    expect(Storage.getPendingCheckin().id).toBe(e.id);
    Storage.updateHistory(e.id, { status: 'sent' });
    expect(Storage.getStreak()).toBe(1);
    expect(Storage.getPendingCheckin()).toBe(null);
  });
  it('removes a check-in the user says did not send', () => {
    const { Storage } = loadApp();
    const e = Storage.addHistory({ contactName: 'Mom', message: 'hi', status: 'pending' });
    Storage.deleteHistory(e.id);
    expect(Storage.getHistory()).toHaveLength(0);
  });
});

describe('bug 6: import', () => {
  it('parses without saving, then saves only on apply', () => {
    const { Storage } = loadApp();
    const parsed = Storage.parseBackup(JSON.stringify({
      farcare_version: 1,
      history: [{ timestamp: 'bad' }, { timestamp: 1767225600000, contactName: 'Mom' }],
    }));
    expect(Storage.getHistory()).toHaveLength(0);
    expect(parsed.skipped).toBe(1);
    expect(Storage.applyBackup(parsed)).toBe(true);
    expect(Storage.getHistory()).toHaveLength(1);
    expect(Storage.isOnboarded()).toBe(true);
  });
});

describe('profile defaults', () => {
  it('defaults your timezone to the device, not Toronto', () => {
    const { Storage } = loadApp();
    expect(Storage.getUser().myTimezone).toBe('America/Vancouver');
  });
});
