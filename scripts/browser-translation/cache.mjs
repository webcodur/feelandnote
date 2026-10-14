const PREFIX = 'fn-device-translation-v2:';
const MAX_ENTRIES = 250;
const MAX_CHARACTERS = 400_000;

export class TranslationCache {
  constructor(storage = null) { this.storage = storage; this.memory = new Map(); }
  remember(key, value) {
    this.memory.set(key, value);
    if (this.memory.size > MAX_ENTRIES) this.memory.delete(this.memory.keys().next().value);
  }
  async key(target, text) {
    const bytes = new TextEncoder().encode(JSON.stringify(['en', target, text]));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return PREFIX + [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  get(key) {
    if (this.memory.has(key)) return this.memory.get(key);
    try {
      const value = this.storage?.getItem(key);
      if (value) { this.remember(key, value); return value; }
    } catch { /* Private browsing / disabled storage: use memory. */ }
    return null;
  }
  set(key, value) {
    this.remember(key, value);
    try {
      if (!this.storage || value.length > MAX_CHARACTERS) return;
      const keys = Object.keys(this.storage).filter(item => item.startsWith(PREFIX));
      let size = keys.reduce((total, item) => total + (this.storage.getItem(item)?.length || 0), 0);
      while (keys.length >= MAX_ENTRIES || size + value.length > MAX_CHARACTERS) {
        const oldest = keys.shift();
        if (!oldest) break;
        size -= this.storage.getItem(oldest)?.length || 0;
        this.storage.removeItem(oldest);
      }
      this.storage.setItem(key, value);
    } catch { /* Storage quota never prevents reading. */ }
  }
  clear() {
    this.memory.clear();
    try {
      Object.keys(this.storage || {}).filter(key => key.startsWith(PREFIX))
        .forEach(key => this.storage.removeItem(key));
    } catch { /* Only clear this feature's cache. */ }
  }
}
