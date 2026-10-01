import { Auth, cookieStorage } from './auth.mjs';
import { Query } from './rest.mjs';

export class DatabaseClient {
  constructor(url, key, options = {}) {
    if (!url || !key) throw new Error('DB API URL and key are required');
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.headers = options.global?.headers || {};
    this.fetch = options.global?.fetch || ((...args) => globalThis.fetch(...args));
    this.auth = new Auth(this, options.auth);
  }
  from(table) { return new Query(this, encodeURIComponent(table)); }
  rpc(name, args = {}, options = {}) {
    const query = new Query(this, `rpc/${encodeURIComponent(name)}`, options.head ? 'HEAD' : options.get ? 'GET' : 'POST', options.get || options.head ? undefined : args);
    if (options.get || options.head) {
      for (const [key, value] of Object.entries(args)) query.url.searchParams.set(key, Array.isArray(value) ? `{${value.join(',')}}` : String(value));
    }
    if (options.count) query.prefer('count', options.count);
    return query;
  }
}

export function createClient(url, key, options) { return new DatabaseClient(url, key, options); }

export function createServerClient(url, key, options) {
  const storageKey = options.auth?.storageKey || `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
  return createClient(url, key, { ...options, auth: { ...options.auth, storageKey, storage: cookieStorage(options.cookies, options.cookieOptions) } });
}

const browsers = new Map();
export function createBrowserClient(url, key, options = {}) {
  if (typeof document === 'undefined') return createClient(url, key, options);
  const cacheKey = `${url}:${key}`;
  if (options.isSingleton !== false && browsers.has(cacheKey)) return browsers.get(cacheKey);
  const cookies = {
    cacheWrites: false,
    getAll: () => document.cookie.split(';').map(part => {
      const index = part.indexOf('=');
      return { name: part.slice(0, index).trim(), value: decodeURIComponent(part.slice(index + 1)) };
    }).filter(cookie => cookie.name),
    setAll: values => {
      for (const { name, value, options } of values) {
        document.cookie = `${name}=${encodeURIComponent(value)}; Path=${options.path || '/'}; Max-Age=${options.maxAge}; SameSite=Lax${options.secure ? '; Secure' : ''}`;
      }
    },
  };
  const client = createServerClient(url, key, { ...options, cookies, cookieOptions: { secure: location.protocol === 'https:', ...options.cookieOptions } });
  if (options.isSingleton !== false) browsers.set(cacheKey, client);
  return client;
}
