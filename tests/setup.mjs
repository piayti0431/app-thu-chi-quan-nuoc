// Shared Test Setup Helper for Sổ Quán Nước Mía
// Provides unified browser environment mocks (window, localStorage, crypto, navigator) for Node tests.

export function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? String(store.get(key)) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] || null;
    },
    _raw: store,
  };
}

export function setupTestEnv(options = {}) {
  const storage = createMockStorage(options.storage || {});

  globalThis.window = {
    Capacitor: options.Capacitor || null,
    crypto: globalThis.crypto,
    localStorage: storage,
    location: {
      protocol: "http:",
      origin: "http://localhost:4173",
      href: "http://localhost:4173/",
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    ...options.window,
  };

  globalThis.localStorage = storage;

  if (!globalThis.navigator) {
    globalThis.navigator = {
      userAgent: "NodeTestRunner",
      onLine: true,
      serviceWorker: {
        register: async () => ({ scope: "/" }),
      },
      clipboard: {
        writeText: async () => {},
      },
    };
  }

  return { storage, window: globalThis.window };
}

export function resetTestEnv() {
  if (globalThis.localStorage && typeof globalThis.localStorage.clear === "function") {
    globalThis.localStorage.clear();
  }
}
