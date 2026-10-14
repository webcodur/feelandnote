import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserState, RateLimit, redirectAllowed, equal, validatePassword, normalizeEmail, publicUser, usableUser } from './security.mjs';

test('redirects reject hostile origins, credentials, schemes, and prefix lookalikes', () => {
  const allowed = value => redirectAllowed(value, 'https://feelandnote.com', ['http://localhost:3000']);
  for (const value of ['https://feelandnote.com/auth/callback?next=%2Freset-password', 'http://localhost:3000/auth/callback']) assert.ok(allowed(value));
  for (const value of ['https://feelandnote.com.evil.test', 'https://evil.test/https://feelandnote.com', 'javascript:alert(1)', 'https://user@feelandnote.com', '//feelandnote.com']) assert.equal(allowed(value), false);
});
test('encrypted OAuth browser state rejects tampering, wrong key, and missing cookie', async () => {
  const state = new BrowserState('test-secret'); const token = await state.seal({ state: 'state', flow: 'flow', verifier: 'secret' });
  assert.equal((await state.open(token)).verifier, 'secret');
  assert.ok(!token.includes('secret'));
  await assert.rejects(state.open(`${token.slice(0, 60)}X${token.slice(61)}`));
  await assert.rejects(new BrowserState('wrong-secret').open(token));
  await assert.rejects(state.open(undefined));
});
test('rate limits expire, cap cardinality, and reject over quota', () => {
  let now = 100; const rate = new RateLimit({ limit: 2, interval: 100, maximum: 2, now: () => now });
  rate.check('one'); rate.check('one'); assert.throws(() => rate.check('one'), { status: 429 });
  rate.check('two'); assert.throws(() => rate.check('three'), { status: 429 });
  now = 201; rate.check('three'); rate.check('one');
});
test('credentials preserve existing minimum while rejecting bcrypt truncation and malformed email', () => {
  validatePassword('abcdef');
  assert.throws(() => validatePassword('abcde')); assert.throws(() => validatePassword('가'.repeat(25)));
  assert.equal(normalizeEmail('User@Example.com'), 'user@example.com');
  assert.throws(() => normalizeEmail('user@example.com\r\nBcc:evil@example.com'));
  assert.equal(equal('token', 'token'), true); assert.equal(equal('token', 'tokex'), false); assert.equal(equal('token', 't'), false);
});
test('user serialization cannot disclose credentials, ban state, or arbitrary columns', () => {
  const value = publicUser({ id: 'one', encrypted_password: 'hash', recovery_token: 'secret', banned_until: '2099', raw_user_meta_data: { nickname: 'User' } });
  assert.equal(value.user_metadata.nickname, 'User');
  assert.equal(value.encrypted_password, undefined); assert.equal(value.recovery_token, undefined);
  assert.throws(() => usableUser({ banned_until: '2099-01-01' })); assert.throws(() => usableUser({ deleted_at: '2026-01-01' }));
});
