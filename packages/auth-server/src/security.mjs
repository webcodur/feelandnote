import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';

export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const challenge = value => createHash('sha256').update(value).digest('base64url');
export const equal = (left, right) => typeof left === 'string' && typeof right === 'string'
  && Buffer.byteLength(left) === Buffer.byteLength(right)
  && timingSafeEqual(Buffer.from(left), Buffer.from(right));

export class AuthError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, code, message) => { throw new AuthError(status, code, message); };

export function redirectAllowed(value, siteUrl, allowedOrigins) {
  try {
    const url = new URL(value || siteUrl);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)
      || !new Set([new URL(siteUrl).origin, ...allowedOrigins]).has(url.origin)) return false;
    return true;
  } catch { return false; }
}
export function validatePassword(password) {
  // bcrypt ignores bytes after 72; reject rather than silently truncating credentials.
  if (typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password) > 72) {
    fail(422, 'weak_password', 'Password must contain at least 6 characters and at most 72 UTF-8 bytes');
  }
}
export function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    fail(422, 'email_address_invalid', 'Invalid email address');
  }
  return value.trim().toLowerCase();
}
export function publicUser(row, identities = []) {
  return {
    id: row.id, aud: row.aud || 'authenticated', role: row.role || 'authenticated', email: row.email,
    email_confirmed_at: row.email_confirmed_at, confirmed_at: row.confirmed_at,
    phone: row.phone || '', last_sign_in_at: row.last_sign_in_at,
    app_metadata: row.raw_app_meta_data || {}, user_metadata: row.raw_user_meta_data || {},
    identities: identities.map(({ id, provider_id, user_id, provider, identity_data, created_at, updated_at, last_sign_in_at }) =>
      ({ id, identity_id: id, provider_id, user_id, provider, identity_data, created_at, updated_at, last_sign_in_at })),
    created_at: row.created_at, updated_at: row.updated_at, is_anonymous: !!row.is_anonymous,
  };
}
export function usableUser(row) {
  if (!row || row.deleted_at || row.is_anonymous || row.is_sso_user
    || (row.banned_until && new Date(row.banned_until).getTime() > Date.now())) {
    fail(400, 'invalid_credentials', 'Invalid login credentials');
  }
}
export class BrowserState {
  constructor(secret) { this.key = createHash('sha256').update(secret).digest(); }
  async seal(payload) {
    return new EncryptJWT(payload).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt().setExpirationTime('10m').encrypt(this.key);
  }
  async open(value) {
    try { return (await jwtDecrypt(value, this.key, { keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] })).payload; }
    catch { fail(400, 'bad_oauth_state', 'OAuth state is invalid or expired'); }
  }
}
export class RateLimit {
  constructor({ interval = 60_000, limit = 20, maximum = 10_000, now = Date.now } = {}) {
    Object.assign(this, { interval, limit, maximum, now }); this.entries = new Map();
  }
  check(key) {
    const now = this.now();
    let entry = this.entries.get(key);
    if (!entry || entry.until <= now) {
      if (this.entries.size >= this.maximum) {
        for (const [name, value] of this.entries) if (value.until <= now) this.entries.delete(name);
        if (this.entries.size >= this.maximum) fail(429, 'over_request_rate_limit', 'Too many requests');
      }
      entry = { count: 0, until: now + this.interval }; this.entries.set(key, entry);
    }
    if (++entry.count > this.limit) fail(429, 'over_request_rate_limit', 'Too many requests');
  }
}
