import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwksByUrl = new Map();
const refreshing = new Map();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64url(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}

// Keep the existing cookie key and encoding so changing the client does not log users out.
export function cookieStorage(cookies, cookieOptions = {}) {
  const local = new Map();
  const defaults = { path: '/', sameSite: 'lax', httpOnly: false, maxAge: 60 * 60 * 24 * 30, ...cookieOptions };
  return {
    async getItem(name) {
      if (cookies.cacheWrites !== false && local.has(name)) return local.get(name);
      const all = await cookies.getAll();
      let value = all.find(cookie => cookie.name === name)?.value;
      if (value === undefined) {
        const chunks = [];
        for (let index = 0; ; index++) {
          const chunk = all.find(cookie => cookie.name === `${name}.${index}`);
          if (!chunk) break;
          chunks.push(chunk.value);
        }
        value = chunks.length ? chunks.join('') : null;
      }
      if (!value) return null;
      if (value.startsWith('base64-')) return decoder.decode(fromBase64url(value.slice(7)));
      return value;
    },
    async setItem(name, value) {
      const all = await cookies.getAll();
      const encoded = `base64-${base64url(encoder.encode(value))}`;
      const chunks = [];
      for (let start = 0; start < encoded.length; start += 3180) chunks.push(encoded.slice(start, start + 3180));
      const next = chunks.map((part, index) => ({ name: chunks.length === 1 ? name : `${name}.${index}`, value: part, options: defaults }));
      const names = new Set(next.map(cookie => cookie.name));
      const removed = all.filter(cookie => (cookie.name === name || cookie.name.startsWith(`${name}.`)) && !names.has(cookie.name))
        .map(cookie => ({ name: cookie.name, value: '', options: { ...defaults, maxAge: 0 } }));
      local.set(name, value);
      await cookies.setAll([...removed, ...next], {});
    },
    async removeItem(name) {
      const all = await cookies.getAll();
      local.set(name, null);
      const names = new Set([name, ...all.filter(cookie => cookie.name.startsWith(`${name}.`)).map(cookie => cookie.name)]);
      await cookies.setAll([...names].map(name => ({ name, value: '', options: { ...defaults, maxAge: 0 } })), {});
    },
  };
}

function memoryStorage() {
  const values = new Map();
  return { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
}

export class Auth {
  constructor(client, options = {}) {
    this.client = client;
    this.key = options.storageKey || `sb-${new URL(client.url).hostname.split('.')[0]}-auth-token`;
    this.storage = options.storage || memoryStorage();
    this.refreshEnabled = options.autoRefreshToken !== false;
    this.admin = {
      updateUserById: async (id, attributes) => {
        const result = await this.request(`admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: attributes, token: client.key });
        return { data: { user: result.data?.user || result.data }, error: result.error };
      },
    };
  }
  async request(path, { method = 'GET', body, token, query } = {}) {
    try {
      const url = new URL(`${this.client.url}/auth/v1/${path}`);
      for (const [key, value] of Object.entries(query || {})) if (value !== undefined) url.searchParams.set(key, value);
      const headers = new Headers(this.client.headers);
      headers.set('apikey', this.client.key);
      headers.set('Authorization', `Bearer ${token || this.client.key}`);
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      const response = await this.client.fetch(url.toString(), {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
      });
      const text = await response.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch { data = { message: text }; } }
      if (!response.ok) return { data: null, error: { name: 'AuthApiError', message: data?.msg || data?.message || data?.error_description || data?.error || response.statusText, status: response.status, code: data?.error_code || data?.code } };
      return { data, error: null };
    } catch (cause) {
      return { data: null, error: { name: 'AuthRetryableFetchError', message: cause.message || String(cause), status: 0 } };
    }
  }
  async readSession() {
    try {
      const raw = await this.storage.getItem(this.key);
      const session = raw ? JSON.parse(raw) : null;
      return session?.access_token && session?.refresh_token ? session : null;
    } catch { return null; }
  }
  async saveSession(data) {
    if (!data?.access_token || !data.refresh_token) return null;
    const session = { ...data, expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in };
    await this.storage.setItem(this.key, JSON.stringify(session));
    return session;
  }
  async getSession() {
    let session = await this.readSession();
    if (!session) return { data: { session: null }, error: null };
    if (session.expires_at <= Date.now() / 1000 + 30 && this.refreshEnabled) {
      // Browser tabs share a lock; concurrent server requests share the in-flight exchange.
      const exchange = async () => {
        const current = await this.readSession();
        if (current && current.expires_at > Date.now() / 1000 + 30) return { data: current, error: null };
        const refreshToken = current?.refresh_token || session.refresh_token;
        const key = `${this.client.url}:${refreshToken}`;
        let pending = refreshing.get(key);
        if (!pending) {
          pending = this.request('token', { method: 'POST', query: { grant_type: 'refresh_token' }, body: { refresh_token: refreshToken } });
          refreshing.set(key, pending);
          void pending.finally(() => refreshing.delete(key));
        }
        return pending;
      };
      const exchangeAndSave = async () => {
        const result = await exchange();
        return result.error ? result : { ...result, data: await this.saveSession(result.data) };
      };
      const result = typeof navigator !== 'undefined' && navigator.locks
        ? await navigator.locks.request(`auth:${this.key}`, exchangeAndSave) : await exchangeAndSave();
      if (result.error) {
        // Do not erase a session on transient gateway or network errors.
        if ([400, 401, 403].includes(result.error.status)) await this.storage.removeItem(this.key);
        return { data: { session: null }, error: result.error };
      }
      session = result.data;
    }
    return { data: { session }, error: null };
  }
  async accessToken() {
    const { data, error } = await this.getSession();
    if (error) throw Object.assign(new Error(error.message), error);
    return data.session?.access_token ?? null;
  }
  async getUser(jwt) {
    const loaded = jwt ? { data: { session: { access_token: jwt } }, error: null } : await this.getSession();
    if (loaded.error) return { data: { user: null }, error: loaded.error };
    const token = loaded.data.session?.access_token;
    if (!token) return { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing', status: 400 } };
    const result = await this.request('user', { token });
    return { data: { user: result.data }, error: result.error };
  }
  async getClaims(jwt) {
    try {
      const token = jwt || await this.accessToken();
      if (!token) return { data: null, error: null };
      const issuer = `${this.client.url}/auth/v1`;
      let jwks = jwksByUrl.get(issuer);
      if (!jwks) {
        jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
          headers: { apikey: this.client.key, Authorization: `Bearer ${this.client.key}` },
        });
        jwksByUrl.set(issuer, jwks);
      }
      const verified = await jwtVerify(token, jwks, { issuer, audience: 'authenticated', algorithms: ['ES256', 'RS256'] });
      if (!verified.payload.sub || !verified.payload.exp) throw new Error('JWT is missing required claims');
      return { data: { claims: verified.payload }, error: null };
    } catch (cause) {
      return { data: null, error: { name: 'AuthInvalidJwtError', message: cause.message || String(cause), status: 401 } };
    }
  }
  async sessionResult(result) {
    const session = result.error ? null : await this.saveSession(result.data);
    return { data: { user: session?.user || result.data?.user || (result.data?.id ? result.data : null), session }, error: result.error };
  }
  async signInWithPassword(credentials) {
    return this.sessionResult(await this.request('token', { method: 'POST', query: { grant_type: 'password' }, body: credentials }));
  }
  async signUp({ email, password, options = {} }) {
    const pkce = await this.pkce();
    return this.sessionResult(await this.request('signup', { method: 'POST', query: { redirect_to: options.emailRedirectTo }, body: { email, password, data: options.data, ...pkce } }));
  }
  async pkce() {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
    await this.storage.setItem(`${this.key}-code-verifier`, JSON.stringify(verifier));
    return { code_challenge: base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)))), code_challenge_method: 's256' };
  }
  async signInWithOAuth({ provider, options = {} }) {
    const challenge = await this.pkce();
    const url = new URL(`${this.client.url}/auth/v1/authorize`);
    for (const [key, value] of Object.entries({ provider, redirect_to: options.redirectTo, scopes: options.scopes, ...challenge, ...options.queryParams })) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    if (typeof window !== 'undefined' && !options.skipBrowserRedirect) window.location.assign(url.toString());
    return { data: { provider, url: url.toString() }, error: null };
  }
  async exchangeCodeForSession(code) {
    let verifier;
    try { verifier = JSON.parse(await this.storage.getItem(`${this.key}-code-verifier`)); } catch { /* Missing or malformed verifier fails closed. */ }
    if (!verifier) return { data: { user: null, session: null }, error: { message: 'PKCE code verifier missing', status: 400, code: 'bad_code_verifier' } };
    const result = await this.request('token', { method: 'POST', query: { grant_type: 'pkce' }, body: { auth_code: code, code_verifier: verifier.split('/')[0] } });
    if (!result.error) await this.storage.removeItem(`${this.key}-code-verifier`);
    return this.sessionResult(result);
  }
  async verifyOtp(params) { return this.sessionResult(await this.request('verify', { method: 'POST', body: params })); }
  async resetPasswordForEmail(email, options = {}) {
    const challenge = await this.pkce();
    const result = await this.request('recover', { method: 'POST', query: { redirect_to: options.redirectTo }, body: { email, ...challenge } });
    return { data: result.data, error: result.error };
  }
  async updateUser(attributes) {
    const loaded = await this.getSession();
    if (loaded.error) return { data: { user: null }, error: loaded.error };
    const token = loaded.data.session?.access_token;
    if (!token) return { data: { user: null }, error: { message: 'Auth session missing', status: 400 } };
    const result = await this.request('user', { method: 'PUT', body: attributes, token });
    if (!result.error) {
      const session = await this.readSession();
      if (session) await this.saveSession({ ...session, user: result.data });
    }
    return { data: { user: result.data }, error: result.error };
  }
  async signOut({ scope = 'global' } = {}) {
    const loaded = await this.getSession();
    if (loaded.error && ![400, 401, 403].includes(loaded.error.status)) return { error: loaded.error };
    const token = loaded.data.session?.access_token;
    const result = token ? await this.request('logout', { method: 'POST', token, query: { scope } }) : { error: null };
    if (result.error && ![401, 403, 404].includes(result.error.status)) return { error: result.error };
    if (scope !== 'others') {
      await this.storage.removeItem(this.key);
      await this.storage.removeItem(`${this.key}-code-verifier`);
    }
    return { error: null };
  }
}
