import { createRemoteJWKSet, jwtVerify } from 'jose';
import { challenge, equal, fail } from './security.mjs';

const providers = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token' },
  kakao: { authorize: 'https://kauth.kakao.com/oauth/authorize', token: 'https://kauth.kakao.com/oauth/token' },
};
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export class OAuthProvider {
  constructor(config, fetchImpl = fetch) { this.config = config; this.fetch = fetchImpl; }
  authorization(provider, { state, nonce, verifier }) {
    const settings = this.config.providers[provider];
    if (!providers[provider] || !settings?.clientId || !settings.clientSecret) fail(400, 'provider_disabled', 'OAuth provider is disabled');
    const url = new URL(providers[provider].authorize);
    const parameters = { client_id: settings.clientId, redirect_uri: `${this.config.issuer}/callback`, response_type: 'code', state };
    if (provider === 'google') Object.assign(parameters, { scope: 'openid email profile', nonce, code_challenge: challenge(verifier), code_challenge_method: 'S256' });
    if (provider === 'kakao') parameters.scope = 'account_email profile_image profile_nickname';
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    return url.toString();
  }
  async request(url, options) {
    const response = await this.fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000) });
    if (!response.ok) fail(502, 'oauth_provider_error', 'OAuth provider request failed');
    return response.json();
  }
  async exchange(provider, { code, nonce, verifier }) {
    const settings = this.config.providers[provider];
    if (!providers[provider] || !settings?.clientId) fail(400, 'provider_disabled', 'OAuth provider is disabled');
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: settings.clientId,
      client_secret: settings.clientSecret, redirect_uri: `${this.config.issuer}/callback`, code });
    if (provider === 'google') body.set('code_verifier', verifier);
    const tokens = await this.request(providers[provider].token, { method: 'POST', body });
    if (provider === 'google') {
      let claims;
      try { claims = (await jwtVerify(tokens.id_token, googleKeys, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: settings.clientId,
        algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
      })).payload; } catch { fail(400, 'bad_id_token', 'Google identity token is invalid'); }
      if (!equal(claims.nonce, nonce) || (claims.azp && claims.azp !== settings.clientId)) fail(400, 'bad_id_token', 'Google identity token is invalid');
      return { id: claims.sub, email: claims.email, emailVerified: claims.email_verified === true,
        metadata: { sub: claims.sub, email: claims.email, email_verified: claims.email_verified === true,
          name: claims.name, full_name: claims.name, avatar_url: claims.picture, picture: claims.picture,
          provider_id: claims.sub, iss: claims.iss } };
    }
    if (typeof tokens.access_token !== 'string') fail(400, 'bad_oauth_response', 'Kakao access token is missing');
    const profile = await this.request('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profile.id) fail(400, 'bad_oauth_response', 'Kakao identity is missing');
    const account = profile.kakao_account || {};
    const name = account.profile?.nickname || profile.properties?.nickname;
    const picture = account.profile?.profile_image_url || profile.properties?.profile_image;
    return { id: String(profile.id), email: account.email,
      emailVerified: account.is_email_valid === true && account.is_email_verified === true,
      metadata: { sub: String(profile.id), provider_id: String(profile.id), email: account.email,
        email_verified: account.is_email_valid === true && account.is_email_verified === true,
        name, full_name: name, nickname: name, avatar_url: picture, picture } };
  }
}
