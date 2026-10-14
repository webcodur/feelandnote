import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pg from 'pg';

test('an existing legacy refresh token survives the replacement gateway and signing keys', { skip: !process.env.AUTH_TEST_GATEWAY_URL }, async t => {
  if (!process.env.AUTH_TEST_DATABASE_URL?.includes('verify') || new URL(process.env.AUTH_TEST_GATEWAY_URL).hostname !== 'gateway') throw new Error('Legacy-session tests require an isolated copy');
  const pool = new pg.Pool({ connectionString: process.env.AUTH_TEST_DATABASE_URL }); t.after(() => pool.end());
  const keys = JSON.parse(fs.readFileSync('/run/secrets/gateway.json', 'utf8'));
  const { rows } = await pool.query(`select r.token,r.user_id from auth.refresh_tokens r
    join auth.sessions s on s.id=r.session_id join auth.users u on u.id=s.user_id
    where not r.revoked and s.refresh_token_hmac_key is null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<now()) and not u.is_anonymous and not u.is_sso_user
      and (s.not_after is null or s.not_after>now()) and s.created_at<now()-interval '1 day'
    order by r.updated_at desc limit 1`);
  assert.equal(rows.length, 1);
  const response = await fetch(`${process.env.AUTH_TEST_GATEWAY_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: keys.publicKey, Authorization: `Bearer ${keys.publicKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rows[0].token }),
  });
  assert.equal(response.status, 200); const session = await response.json();
  assert.equal(typeof session.access_token, 'string'); assert.equal(session.user.id === rows[0].user_id, true);
  const user = await fetch(`${process.env.AUTH_TEST_GATEWAY_URL}/auth/v1/user`, { headers: { apikey: keys.publicKey, Authorization: `Bearer ${session.access_token}` } });
  assert.equal(user.status, 200); assert.equal((await user.json()).id === rows[0].user_id, true);
});
