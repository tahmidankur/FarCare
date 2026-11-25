// Loads core.js and storage.js the way the browser does (plain scripts),
// with a fake localStorage, so the Storage layer can be tested in Node.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function loadApp({ failWrites = false } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      store.set(k, String(v));
    },
    removeItem: k => store.delete(k),
  };
  const toasts = [];
  const noop = () => {};
  const ctx = {
    console, Intl, Date, Math, JSON, DOMException, setTimeout, clearTimeout,
    localStorage,
    document: { addEventListener: noop, querySelector: () => null, getElementById: () => null },
    addEventListener: noop,
    navigator: {},
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of ['core.js', 'storage.js']) {
    vm.runInContext(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'), ctx, { filename: f });
  }
  // storage.js declares these with const/function, so read them back out of the context
  const Storage = vm.runInContext('Storage', ctx);
  vm.runInContext('showToast = (m, t) => __toasts.push([m, t])', Object.assign(ctx, { __toasts: toasts }));
  return { Storage, FarCore: ctx.FarCore, store, toasts };
}
