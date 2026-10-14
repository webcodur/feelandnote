import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';
import { AuthService } from './service.mjs';
import { challenge } from './security.mjs';

test('staged gateway: existing API keys, login/JWT/RLS, admin ban, PKCE, refresh, logout', { skip: !process.env.AUTH_TEST_GATEWAY_URL }, async t => {
  const base = process.env.AUTH_TEST_GATEWAY_URL;
  if (new URL(base).hostname !== 'gateway' || !process.env.AUTH_TEST_DATABASE_URL?.includes('verify')) throw new Error('Gateway tests require the isolated verify database');
  const config = JSON.parse(fs.readFileSync('/run/secrets/auth.json', 'utf8'));
  const keys = JSON.parse(fs.readFileSync('/run/secrets/gateway.json', 'utf8'));
  const pool = new pg.Pool({ connectionString: process.env.AUTH_TEST_DATABASE_URL });
  const admin = new pg.Pool({ connectionString: process.env.AUTH_TEST_ADMIN_DATABASE_URL });
  const emails = []; let id;
  t.after(async () => { try { if (id) {
    await admin.query('delete from public.member_profiles where id=$1', [id]);
    await admin.query('delete from public.user_accounts where id=$1', [id]);
    await admin.query('delete from auth.users where id=$1', [id]);
  } } finally { await pool.end(); await admin.end(); } });
  const service = new AuthService({ pool, config, sendMail: async message => emails.push(message) }); await service.init();
  const request = async (path, { body, token, server = false, method = 'GET' } = {}) => {
    const key = server ? keys.serverKey : keys.publicKey;
    const response = await fetch(`${base}${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${token || key}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const raw = await response.text(); let data; try { data = JSON.parse(raw); } catch { data = null; }
    // Deliberately omit token bodies from failed assertions.
    return { status: response.status, data };
  };
  const email = `verify-gateway-${Date.now()}@example.invalid`; const password = 'gateway-test-password';
  const registered = await service.signup({ email, password, data: { nickname: 'Gateway verification' } }, 'https://feelandnote.com/auth/callback');
  id = registered.user.id;
  const verified = await request('/auth/v1/verify', { method: 'POST', body: { type: 'signup', token_hash: new URL(emails[0].link).searchParams.get('token_hash') } });
  assert.equal(verified.status, 200);
  const loggedIn = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  assert.equal(loggedIn.status, 200); const session = loggedIn.data;
  assert.equal((await request('/auth/v1/user', { token: session.access_token })).data?.id, id);
  const anon = await request(`/rest/v1/user_accounts?select=id&id=eq.${id}`);
  assert.equal(anon.status, 200); assert.equal(anon.data.length, 0);
  const member = await request(`/rest/v1/user_accounts?select=id&id=eq.${id}`, { token: session.access_token });
  assert.equal(member.status, 200); assert.equal(member.data.length, 1); assert.equal(member.data[0].id, id);
  const privileged = await request(`/rest/v1/user_accounts?select=id&id=eq.${id}`, { server: true });
  assert.equal(privileged.status, 200); assert.equal(privileged.data.length, 1);
  const unsafe = await request('/rest/v1/member_profiles', { server: true, method: 'PATCH', body: { nickname: 'unsafe mass update' } });
  assert.equal(unsafe.status, 400);
  assert.equal((await request(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: { ban_duration: '24h' } })).status, 401);
  assert.equal((await request(`/auth/v1/admin/users/${id}`, { server: true, method: 'PUT', body: { ban_duration: '24h' } })).status, 200);
  assert.equal((await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })).status, 400);
  assert.equal((await request(`/auth/v1/admin/users/${id}`, { server: true, method: 'PUT', body: { ban_duration: 'none' } })).status, 200);
  const verifier = 'v'.repeat(64);
  const flow = await service.beginFlow('kakao', { code_challenge_method: 's256', code_challenge: challenge(verifier) });
  const code = await service.providerCallback(flow, 'kakao', { id: `verify-gateway-${Date.now()}`, email, emailVerified: true, metadata: { email, email_verified: true } });
  const oauth = await request('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: verifier } });
  assert.equal(oauth.status, 200); assert.equal(oauth.data.user.id, id);
  const refreshed = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: oauth.data.refresh_token } });
  assert.equal(refreshed.status, 200);
  assert.equal((await request('/auth/v1/logout?scope=local', { method: 'POST', token: refreshed.data.access_token })).status, 204);
  assert.equal((await request('/auth/v1/user', { token: refreshed.data.access_token })).status, 401);
});
