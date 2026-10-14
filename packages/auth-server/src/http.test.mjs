import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthServer } from './http.mjs';

test('HTTP boundary enforces origin/body/redirect checks and exposes only public keys', async t => {
  const calls = [];
  const service = {
    config: { siteUrl: 'https://feelandnote.com', allowedOrigins: ['http://localhost:3000'], cookieSecret: 'cookie-test', providers: {} },
    jwks: { keys: [{ kty: 'EC', x: 'public', y: 'public' }] }, pool: { query: async () => ({}) },
    passwordLogin: async (body, meta) => { calls.push({ body, meta }); return { user: { id: 'one' } }; },
    signup: async () => { throw new Error('must not run'); },
  };
  const logs = []; const server = createAuthServer(service, { logger: { error: (...values) => logs.push(values) } });
  server.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.deepEqual(await (await fetch(`${base}/.well-known/jwks.json`)).json(), service.jwks);
  const send = (body, headers = {}, path = '/token?grant_type=password') => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  assert.equal((await send('{}', { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await send('{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await send('invalid')).status, 400);
  assert.equal((await send('[]')).status, 400);
  assert.equal((await send('x'.repeat(33_000))).status, 413);
  assert.equal((await send('{}', {}, '/signup?redirect_to=https://evil.test')).status, 400);
  const result = await send(JSON.stringify({ email: 'test@example.com', password: 'secret-password' }), { Origin: 'http://localhost:3000' });
  assert.equal(result.status, 200); assert.equal(result.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
  assert.equal(calls.length, 1); assert.equal(logs.length, 0);
  assert.equal((await fetch(`${base}/callback?state=bad&code=provider-secret`)).status, 400);
  assert.equal(logs.length, 0);
});
