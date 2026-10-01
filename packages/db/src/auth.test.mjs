import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createClient, createServerClient, createBrowserClient } from './index.mjs';

const key = 'sb-db-auth-token';
function session(overrides = {}) {
  return { access_token: 'access-test', refresh_token: 'refresh-test', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: 'member-one' }, ...overrides };
}
function fixture({ initial = [], respond = () => Response.json({ id: 'member-one' }), url = 'https://db.example.test' } = {}) {
  const values = new Map(initial.map(cookie => [cookie.name, cookie.value]));
  const writes = [];
  const requests = [];
  const cookies = {
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    setAll: all => {
      writes.push(...all);
      for (const cookie of all) {
        if (cookie.options.maxAge === 0) values.delete(cookie.name);
        else values.set(cookie.name, cookie.value);
      }
    },
  };
  const options = { cookies, global: { fetch: async (url, init) => { requests.push({ url: new URL(url), ...init }); return respond(url, init); } } };
  return { db: createServerClient(url, 'public-test-key', options), values, writes, requests, options };
}

test('legacy base64 session cookies survive the client migration; getUser validates with Auth', async () => {
  const original = session({ user: { id: 'member-one', user_metadata: { name: '아가톤' } } });
  const encoded = 'base64-' + Buffer.from(JSON.stringify(original)).toString('base64url');
  const { db, requests } = fixture({ initial: [{ name: `${key}.0`, value: encoded.slice(0, 80) }, { name: `${key}.1`, value: encoded.slice(80) }] });
  assert.deepEqual((await db.auth.getSession()).data.session, original);
  assert.equal((await db.auth.getUser()).data.user.id, 'member-one');
  assert.equal(requests[0].url.pathname, '/auth/v1/user');
  assert.equal(requests[0].headers.get('Authorization'), 'Bearer access-test');
});

test('long Unicode sessions are chunked; replacing and signing out removes every stale chunk', async () => {
  const { db, values, writes } = fixture();
  await db.auth.saveSession(session({ user: { id: 'member-one', user_metadata: { name: '한글'.repeat(1500) } } }));
  assert(values.size > 1);
  const reader = createServerClient('https://db.example.test', 'public-test-key', { cookies: { getAll: () => [...values].map(([name, value]) => ({ name, value })), setAll: () => {} } });
  assert.equal((await reader.auth.getSession()).data.session.user.user_metadata.name, '한글'.repeat(1500));
  await db.auth.saveSession(session());
  assert.deepEqual([...values.keys()], [key]);
  await db.auth.signOut({ scope: 'local' });
  assert.equal(values.size, 0);
  assert(writes.some(cookie => cookie.name === `${key}.0` && cookie.options.maxAge === 0));
});

test('concurrent requests refresh once and each receives the new cookies', async () => {
  const initial = [{ name: key, value: JSON.stringify(session({ expires_at: 1 })) }];
  let exchanges = 0;
  const respond = async () => { exchanges++; await new Promise(resolve => setTimeout(resolve, 20)); return Response.json(session({ access_token: 'fresh-test', refresh_token: 'rotated-test' })); };
  const first = fixture({ initial, respond });
  const second = fixture({ initial, respond });
  const results = await Promise.all([first.db.auth.getSession(), second.db.auth.getSession()]);
  assert.equal(exchanges, 1);
  for (const result of results) assert.equal(result.data.session.access_token, 'fresh-test');
  assert(first.writes.length && second.writes.length);
  assert.equal(first.requests[0].url.searchParams.get('grant_type'), 'refresh_token');
});

test('transient refresh errors retain the session; invalid refresh credentials clear it', async () => {
  for (const status of [503, 400]) {
    const { db, values } = fixture({ initial: [{ name: key, value: JSON.stringify(session({ expires_at: 1 })) }], respond: () => Response.json({ msg: 'failed', error_code: 'test_error' }, { status }) });
    const result = await db.auth.getSession();
    assert.equal(result.error.status, status);
    assert.equal(result.data.session, null);
    assert.equal(values.has(key), status === 503);
  }
});

test('user lookup, update and logout preserve refresh failures without erasing the session', async () => {
  for (const operation of [auth => auth.getUser(), auth => auth.updateUser({ password: 'test-only' }), auth => auth.signOut()]) {
    const { db, values } = fixture({ initial: [{ name: key, value: JSON.stringify(session({ expires_at: 1 })) }], respond: () => Response.json({ message: 'Auth temporarily unavailable' }, { status: 503 }) });
    assert.equal((await operation(db.auth)).error.status, 503);
    assert(values.has(key));
  }
});

test('password login sends the grant and stores a session only on success', async () => {
  const { db, requests, values } = fixture({ respond: () => Response.json(session()) });
  const result = await db.auth.signInWithPassword({ email: 'user@example.test', password: 'test-only' });
  assert.equal(result.error, null);
  assert.equal(result.data.user.id, 'member-one');
  assert.equal(requests[0].url.searchParams.get('grant_type'), 'password');
  assert.deepEqual(JSON.parse(requests[0].body), { email: 'user@example.test', password: 'test-only' });
  assert(values.has(key));
  const failed = fixture({ respond: () => Response.json({ msg: 'Invalid credentials' }, { status: 400 }) });
  assert.equal((await failed.db.auth.signInWithPassword({ email: 'user@example.test', password: 'wrong' })).data.session, null);
  assert.equal(failed.values.size, 0);
});

test('OAuth stores a PKCE verifier before returning the redirect and removes it after exchange', async () => {
  const { db, requests, values } = fixture({ respond: () => Response.json(session()) });
  const login = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://web.example.test/auth/callback', queryParams: { prompt: 'consent' } } });
  const url = new URL(login.data.url);
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.match(url.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert(values.has(`${key}-code-verifier`));
  assert.equal((await db.auth.exchangeCodeForSession('code-test')).error, null);
  assert.equal(requests[0].url.searchParams.get('grant_type'), 'pkce');
  const body = JSON.parse(requests[0].body);
  assert.equal(body.auth_code, 'code-test');
  assert.match(body.code_verifier, /^[A-Za-z0-9_-]{64}$/);
  assert.equal(values.has(`${key}-code-verifier`), false);
  assert(values.has(key));
});

test('email signup/recovery/OTP and admin user updates use the Auth HTTP endpoints', async () => {
  const { db, requests } = fixture({ respond: url => new URL(url).pathname.endsWith('/signup') ? Response.json({ id: 'member-one' }) : Response.json(session()) });
  const signup = await db.auth.signUp({ email: 'user@example.test', password: 'test-only', options: { emailRedirectTo: 'https://web.example.test/auth/callback', data: { name: '아가톤' } } });
  assert.equal(signup.data.session, null);
  assert.equal(signup.data.user.id, 'member-one');
  assert.equal(requests[0].url.searchParams.get('redirect_to'), 'https://web.example.test/auth/callback');
  await db.auth.resetPasswordForEmail('user@example.test', { redirectTo: 'https://web.example.test/reset-password' });
  assert.equal(requests[1].url.pathname, '/auth/v1/recover');
  assert.equal(JSON.parse(requests[1].body).code_challenge_method, 's256');
  await db.auth.verifyOtp({ type: 'recovery', token_hash: 'test-hash' });
  assert.equal(requests[2].url.pathname, '/auth/v1/verify');
  const admin = createClient('https://db.example.test', 'secret-test-key');
  admin.fetch = async (url, init) => { assert.equal(new URL(url).pathname, '/auth/v1/admin/users/member-one'); assert.equal(init.headers.get('Authorization'), 'Bearer secret-test-key'); assert.equal(init.method, 'PUT'); return Response.json({ id: 'member-one' }); };
  assert.equal((await admin.auth.admin.updateUserById('member-one', { ban_duration: '24h' })).data.user.id, 'member-one');
});

test('claims require a valid signature, issuer, audience and expiry; session JSON cannot authorize', async t => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'ES256' };
  const server = http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const issuer = `${url}/auth/v1`;
  const sign = (iss = issuer, aud = 'authenticated', expiry = '5m') => new SignJWT({ sub: 'member-one' }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).setIssuer(iss).setAudience(aud).setExpirationTime(expiry).sign(privateKey);
  const { db, requests } = fixture({ url });
  assert.equal((await db.auth.getClaims(await sign())).data.claims.sub, 'member-one');
  for (const token of [await sign('https://other.test/auth/v1'), await sign(issuer, 'anon'), await sign(issuer, 'authenticated', -1), `${await sign()}broken`]) {
    assert.equal((await db.auth.getClaims(token)).data, null);
  }
  assert.equal(requests.length, 0, 'ECC verification must not call /user');
});

test('stateless clients never create refresh timers or call Auth for public reads', async t => {
  t.mock.method(globalThis, 'setInterval', () => { throw new Error('Unexpected timer'); });
  const requests = [];
  const db = createClient('https://db.example.test', 'public-test-key', { global: { fetch: async url => { requests.push(url); return Response.json([]); } } });
  await db.from('celebs').select();
  assert.equal(requests.length, 1);
  assert.match(requests[0], /\/rest\/v1\//);
  assert.equal((await db.auth.getUser()).data.user, null);
});

function browserEnvironment(t, initial) {
  const values = new Map([[key, 'base64-' + Buffer.from(JSON.stringify(initial)).toString('base64url')]]);
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    get cookie() { return [...values].map(([key, value]) => `${key}=${value}`).join('; '); },
    set cookie(value) {
      const pair = value.split(';')[0];
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      if (value.includes('Max-Age=0;')) values.delete(name);
      else values.set(name, pair.slice(index + 1));
    },
  } });
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { protocol: 'https:' } });
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else delete globalThis.document;
    if (previousLocation) Object.defineProperty(globalThis, 'location', previousLocation); else delete globalThis.location;
  });
  return values;
}

test('browser clients reread cookies after external rotation, and persist user updates', async t => {
  const values = browserEnvironment(t, session());
  const requests = [];
  const db = createBrowserClient('https://db.example.test', 'public-test-key', { isSingleton: false, global: { fetch: async (_url, init) => {
    requests.push(init);
    return Response.json({ id: 'member-one', user_metadata: { name: '아가톤' } });
  } } });
  assert.equal((await db.auth.getSession()).data.session.access_token, 'access-test');
  await db.auth.saveSession(session());
  values.set(key, 'base64-' + Buffer.from(JSON.stringify(session({ access_token: 'rotated-elsewhere' }))).toString('base64url'));
  await db.auth.getUser();
  assert.equal(requests[0].headers.get('Authorization'), 'Bearer rotated-elsewhere');
  await db.auth.updateUser({ data: { name: '아가톤' } });
  assert.equal(requests[1].method, 'PUT');
  assert.equal((await db.auth.getSession()).data.session.user.user_metadata.name, '아가톤');
  await db.auth.signOut({ scope: 'local' });
  assert.equal(values.size, 0);
});

test('browser refresh persists new cookies before releasing the cross-tab lock', async t => {
  browserEnvironment(t, session({ expires_at: 1 }));
  let pending = Promise.resolve();
  const previous = Object.getOwnPropertyDescriptor(navigator, 'locks');
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_key, run) => {
    const prior = pending;
    let release;
    pending = new Promise(resolve => { release = resolve; });
    await prior;
    try { return await run(); } finally { release(); }
  } } });
  t.after(() => { if (previous) Object.defineProperty(navigator, 'locks', previous); else delete navigator.locks; });
  let exchanges = 0;
  const options = { isSingleton: false, global: { fetch: async () => {
    exchanges++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return Response.json(session({ access_token: 'fresh-test', refresh_token: 'rotated-test' }));
  } } };
  const one = createBrowserClient('https://db.example.test', 'public-test-key', options);
  const two = createBrowserClient('https://db.example.test', 'public-test-key', options);
  const results = await Promise.all([one.auth.getSession(), two.auth.getSession()]);
  assert.equal(exchanges, 1);
  assert(results.every(result => result.data.session.access_token === 'fresh-test'));
});
