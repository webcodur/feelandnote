import test from 'node:test';
import assert from 'node:assert/strict';
import { OAuthProvider } from './oauth.mjs';
import { challenge } from './security.mjs';

const config = { issuer: 'https://db.feelandnote.com/auth/v1', providers: {
  google: { clientId: 'google-id', clientSecret: 'google-secret' },
  kakao: { clientId: 'kakao-id', clientSecret: 'kakao-secret' },
} };
test('provider redirects preserve registered callback/consent scopes and bind Google nonce/PKCE', () => {
  const provider = new OAuthProvider(config);
  const google = new URL(provider.authorization('google', { state: 'state', nonce: 'nonce', verifier: 'verifier' }));
  assert.equal(google.searchParams.get('redirect_uri'), `${config.issuer}/callback`);
  assert.equal(google.searchParams.get('nonce'), 'nonce'); assert.equal(google.searchParams.get('code_challenge'), challenge('verifier'));
  const kakao = new URL(provider.authorization('kakao', { state: 'state', nonce: 'nonce', verifier: 'verifier' }));
  assert.equal(kakao.searchParams.get('scope'), 'account_email profile_image profile_nickname');
  assert.equal(kakao.searchParams.get('state'), 'state');
  assert.throws(() => provider.authorization('unknown', {}), { code: 'provider_disabled' });
});
test('Kakao email linking requires both validity and verification, and token exchanges do not follow redirects', async () => {
  const calls = [];
  let verified = false;
  const provider = new OAuthProvider(config, async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.includes('/token') ? { access_token: 'provider-token' } : {
      id: 123, kakao_account: { email: 'test@example.com', is_email_valid: true, is_email_verified: verified, profile: { nickname: 'Test' } },
    }));
  });
  assert.equal((await provider.exchange('kakao', { code: 'code' })).emailVerified, false);
  verified = true;
  assert.equal((await provider.exchange('kakao', { code: 'code' })).emailVerified, true);
  assert.ok(calls.every(call => call.options.redirect === 'error' && call.options.signal));
  assert.equal(calls[0].options.body.get('client_secret'), 'kakao-secret');
});
