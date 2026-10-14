import { TranslationCache } from './cache.mjs';

export const TARGETS = ['ja', 'zh', 'zh-Hant', 'es', 'fr', 'de', 'pt', 'it'];
export class TranslationError extends Error {
  constructor(code, cause) { super(code, { cause }); this.code = code; }
}
const stale = () => new TranslationError('superseded');
const deadline = (promise, milliseconds, onLate) => {
  let timedOut = false;
  let timer;
  const work = promise.then(value => {
    if (timedOut) onLate?.(value);
    return value;
  });
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { timedOut = true; reject(new TranslationError('timeout')); }, milliseconds);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
};

export class DeviceTranslation {
  constructor({ native = globalThis.Translator, storage = null, timeout = 90_000 } = {}) {
    this.native = native;
    this.cache = new TranslationCache(storage);
    this.timeout = timeout;
    this.target = 'en';
    this.epoch = 0;
    this.instance = null;
    this.pending = new Map();
    this.metrics = { calls: 0, hits: 0, shared: 0 };
  }
  async availability(target) {
    if (!TARGETS.includes(target)) return 'unavailable';
    if (!this.native) return 'missing-api';
    try { return await deadline(this.native.availability({ sourceLanguage: 'en', targetLanguage: target }), 10_000); }
    catch { return 'check-failed'; }
  }
  async activate(target, onProgress = () => {}) {
    if (!TARGETS.includes(target)) throw new TranslationError('unsupported-language');
    this.original();
    const epoch = this.epoch;
    this.target = target;
    if (!this.native) throw new TranslationError('missing-api');
    let instance;
    try {
      // Call create before the first await: retain the click's user activation.
      const created = this.native.create({ sourceLanguage: 'en', targetLanguage: target,
        monitor: monitor => monitor.addEventListener('downloadprogress', event => {
          if (epoch === this.epoch) onProgress(Math.round(event.loaded * 100));
        }),
      });
      instance = await deadline(created, this.timeout, late => late.destroy());
    } catch (cause) {
      if (epoch !== this.epoch) throw stale();
      throw cause instanceof TranslationError ? cause : new TranslationError('prepare-failed', cause);
    }
    if (epoch !== this.epoch) { instance.destroy(); throw stale(); }
    this.instance = instance;
  }
  original() {
    this.epoch += 1;
    this.instance?.destroy();
    this.instance = null;
    this.target = 'en';
    this.pending.clear();
  }
  async translate(text) {
    if (!text?.trim() || this.target === 'en') return text;
    const target = this.target;
    const epoch = this.epoch;
    const key = await this.cache.key(target, text);
    if (epoch !== this.epoch) throw stale();
    const cached = this.cache.get(key);
    if (cached !== null) { this.metrics.hits += 1; return cached; }
    if (!this.instance) throw new TranslationError('not-ready');
    if (this.pending.has(key)) { this.metrics.shared += 1; return this.pending.get(key); }
    const instance = this.instance;
    const job = (async () => {
      try {
        const pieces = text.split(/(\r?\n+)/);
        const translated = [];
        for (const piece of pieces) {
          if (epoch !== this.epoch) throw stale();
          if (!piece.trim()) { translated.push(piece); continue; }
          this.metrics.calls += 1;
          const part = await deadline(instance.translate(piece), this.timeout);
          if (!part?.trim()) throw new TranslationError('empty-result');
          translated.push(part);
        }
        const result = translated.join('');
        if (epoch !== this.epoch) throw stale();
        if (!result?.trim()) throw new TranslationError('empty-result');
        this.cache.set(key, result);
        return result;
      } catch (cause) {
        if (epoch !== this.epoch) throw stale();
        throw cause instanceof TranslationError ? cause : new TranslationError('translate-failed', cause);
      }
    })();
    this.pending.set(key, job);
    const cleanup = () => { if (this.pending.get(key) === job) this.pending.delete(key); };
    job.then(cleanup, cleanup);
    return job;
  }
}
