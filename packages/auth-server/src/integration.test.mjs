import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { generateKeyPair, exportJWK, jwtVerify, createLocalJWKSet } from 'jose';
import { AuthService } from './service.mjs';
import { challenge } from './security.mjs';

// Run only against an explicitly named isolated copy, never the production database.
test('existing-schema auth: password, email, OAuth PKCE, refresh concurrency/replay, bans, logout, RLS claims', { skip: !process.env.AUTH_TEST_DATABASE_URL }, async t => {
  const connectionString = process.env.AUTH_TEST_DATABASE_URL;
  if (!new URL(connectionString).hostname.includes('verify')) throw new Error('Auth integration tests require a verify database');
  const pool = new pg.Pool({ connectionString });
  const { privateKey } = await generateKeyPair('ES256', { extractable: true }); const key = await exportJWK(privateKey); Object.assign(key, { kid: 'test-only', alg: 'ES256', key_ops: ['sign', 'verify'] });
  const emails = []; const createdUsers = [];
  const config = { issuer: 'https://db.feelandnote.com/auth/v1', jwtExp: 3600, jwtKeys: [key, { kty: 'oct', alg: 'HS256', k: 'legacy-unused' }] };
  const service = new AuthService({ pool, config, sendMail: async email => emails.push(email) }); await service.init();
  t.after(async () => { try {
    const cleanupPool = new pg.Pool({ connectionString: process.env.AUTH_TEST_ADMIN_DATABASE_URL });
    try { for (const id of createdUsers) {
      await cleanupPool.query('delete from public.member_profiles where id=$1', [id]);
      await cleanupPool.query('delete from public.user_accounts where id=$1', [id]);
      await cleanupPool.query('delete from auth.users where id=$1', [id]);
    } } finally { await cleanupPool.end(); }
  } finally { await pool.end(); } });
  const email = `verify-${Date.now()}@example.invalid`; const password = 'test-password-123';
  const registered = await service.signup({ email, password, data: { nickname: 'Auth verification' } }, 'https://feelandnote.com/auth/callback');
  createdUsers.push(registered.user.id);
  assert.equal(registered.session, null); assert.equal(emails.length, 1);
  await assert.rejects(service.passwordLogin({ email, password }, {}), { code: 'email_not_confirmed' });
  await assert.rejects(service.passwordLogin({ email, password: 'wrong' }, {}), { code: 'invalid_credentials' });
  const token = new URL(emails[0].link).searchParams.get('token_hash');
  const confirmed = await service.verify({ type: 'signup', token_hash: token }, {});
  assert.equal(confirmed.user.id, registered.user.id);
  await assert.rejects(service.verify({ type: 'signup', token_hash: token }, {}), { code: 'otp_expired' });
  const session = await service.passwordLogin({ email, password }, {});
  const claims = (await jwtVerify(session.access_token, createLocalJWKSet(service.jwks), { issuer: config.issuer, audience: 'authenticated' })).payload;
  assert.equal(claims.sub, registered.user.id); assert.equal(claims.role, 'authenticated'); assert.ok(claims.session_id);
  const [first, second] = await Promise.all([service.refresh({ refresh_token: session.refresh_token }), service.refresh({ refresh_token: session.refresh_token })]);
  assert.equal(first.refresh_token, second.refresh_token); assert.notEqual(first.refresh_token, session.refresh_token);
  assert.equal((await service.getUser(first.access_token)).id, registered.user.id);
  const third = await service.refresh({ refresh_token: first.refresh_token });
  await pool.query("update auth.refresh_tokens set updated_at=now()-interval '1 minute' where token=$1", [session.refresh_token]);
  await assert.rejects(service.refresh({ refresh_token: session.refresh_token }), { code: 'refresh_token_already_used' });
  await assert.rejects(service.getUser(third.access_token), { code: 'session_not_found' });
  const verifier = 'v'.repeat(64); const flow = await service.beginFlow('google', { code_challenge_method: 's256', code_challenge: challenge(verifier) });
  const code = await service.providerCallback(flow, 'google', { id: `verify-${Date.now()}`, email, emailVerified: true, metadata: { email, email_verified: true, name: 'OAuth verification' } });
  await assert.rejects(service.exchange({ auth_code: code, code_verifier: 'x'.repeat(64) }, {}), { code: 'bad_code_verifier' });
  const oauth = await service.exchange({ auth_code: code, code_verifier: verifier }, {});
  assert.equal(oauth.user.id, registered.user.id); assert.equal(oauth.user.identities.length, 2);
  await assert.rejects(service.exchange({ auth_code: code, code_verifier: verifier }, {}), { code: 'bad_code_verifier' });
  await service.updateUser(oauth.access_token, { password: 'new-password-123', data: { nickname: 'Changed' } });
  assert.equal((await service.getUser(oauth.access_token)).user_metadata.nickname, 'Changed');
  await assert.rejects(service.getUser(confirmed.access_token), { code: 'session_not_found' });
  await service.logout(oauth.access_token, 'local'); await assert.rejects(service.getUser(oauth.access_token), { code: 'session_not_found' });
  const relogin = await service.passwordLogin({ email, password: 'new-password-123' }, {});
  await service.recover({ email }, 'https://feelandnote.com/auth/callback?next=/reset-password');
  const recoveryToken = new URL(emails.at(-1).link).searchParams.get('token_hash');
  assert.ok((await service.verify({ type: 'recovery', token_hash: recoveryToken }, {})).access_token);
  await pool.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [registered.user.id]);
  await assert.rejects(service.passwordLogin({ email, password: 'new-password-123' }, {}), { code: 'invalid_credentials' });
  await assert.rejects(service.getUser(relogin.access_token), { code: 'invalid_credentials' });
});
