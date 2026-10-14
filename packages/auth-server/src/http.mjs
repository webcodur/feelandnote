import http from 'node:http';
import { isIP } from 'node:net';
import { AuthError, BrowserState, RateLimit, randomToken, equal, redirectAllowed, fail } from './security.mjs';

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'validation_failed', 'JSON content type is required');
  const chunks = []; let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 32_768) fail(413, 'validation_failed', 'Request body is too large');
    chunks.push(chunk);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString());
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch { fail(400, 'validation_failed', 'Invalid JSON request'); }
}
export function createAuthServer(service, { logger = console } = {}) {
  const config = service.config;
  const browserState = new BrowserState(config.cookieSecret);
  const limits = new RateLimit();
  const mailLimits = new RateLimit({ interval: 3_600_000, limit: 5 });
  const redirect = value => {
    const result = value || `${config.siteUrl}/auth/callback`;
    if (!redirectAllowed(result, config.siteUrl, config.allowedOrigins)) fail(400, 'redirect_uri_mismatch', 'Redirect URL is not allowed');
    return result;
  };
  return http.createServer({ requestTimeout: 20_000, headersTimeout: 10_000, maxHeaderSize: 16_384 }, async (request, response) => {
    let path;
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin) && origin !== new URL(config.siteUrl).origin) {
      response.writeHead(403, headers).end(JSON.stringify({ error_code: 'bad_origin', msg: 'Origin is not allowed' })); return;
    }
    if (origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin',
      'Access-Control-Allow-Headers': request.headers['access-control-request-headers'] || 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Max-Age': '600' });
    if (request.method === 'OPTIONS') { response.writeHead(204, headers).end(); return; }
    const send = (value, status = 200) => response.writeHead(status, headers).end(value === undefined ? undefined : JSON.stringify(value));
    const go = (location, cookie) => response.writeHead(302, { ...headers, Location: location, ...(cookie ? { 'Set-Cookie': cookie } : {}) }).end();
    try {
      const url = new URL(request.url, 'http://localhost');
      path = url.pathname.replace(/^\/auth\/v1(?=\/|$)/, '').replace(/\/$/, '') || '/';
      if (request.method === 'GET' && path === '/health') { await service.pool.query('select 1'); send({ status: 'ok' }); return; }
      if (request.method === 'GET' && path === '/.well-known/jwks.json') {
        headers['Cache-Control'] = 'public, max-age=600'; send(service.jwks); return;
      }
      if (request.method === 'GET' && path === '/settings') {
        send({ external: { google: !!config.providers.google?.clientId, kakao: !!config.providers.kakao?.clientId, email: true }, disable_signup: false, mailer_autoconfirm: false, phone_autoconfirm: false, sms_provider: '' }); return;
      }
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
      // This socket is reachable only through the private gateway network. The gateway
      // replaces this header from Cloudflare's client address; arbitrary clients cannot set it.
      const forwarded = request.headers['x-real-ip'];
      const ip = typeof forwarded === 'string' && isIP(forwarded) ? forwarded : request.socket.remoteAddress;
      const meta = { ip, userAgent: request.headers['user-agent']?.slice(0, 1024) };
      if (!['/user', '/logout'].includes(path) && !path.startsWith('/admin/')) limits.check(`${ip}:${path}`);
      if (request.method === 'GET' && path === '/authorize') {
        const provider = url.searchParams.get('provider'); const destination = redirect(url.searchParams.get('redirect_to'));
        // Validate provider before inserting a flow row.
        const state = randomToken(); const nonce = randomToken(); const verifier = randomToken() + randomToken();
        const authorization = service.provider.authorization(provider, { state, nonce, verifier });
        const flow = await service.beginFlow(provider, Object.fromEntries(url.searchParams));
        const envelope = await browserState.seal({ state, nonce, verifier, provider, destination, flow });
        // One cookie per flow supports concurrent tabs without sharing login state.
        const authorizeUrl = new URL(authorization); authorizeUrl.searchParams.set('state', `${flow}.${state}`);
        go(authorizeUrl.toString(), `fn-oauth-${flow}=${envelope}; Path=/auth/v1/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`); return;
      }
      if (request.method === 'GET' && path === '/callback') {
        const value = url.searchParams.get('state') || ''; const [flow, state] = value.split('.');
        if (!/^[0-9a-f-]{36}$/i.test(flow || '') || !state) fail(400, 'bad_oauth_state', 'OAuth state is missing');
        const cookieName = `fn-oauth-${flow}`;
        const cookie = (request.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
        const envelope = await browserState.open(cookie);
        if (!equal(envelope.state, state) || envelope.flow !== flow) fail(400, 'bad_oauth_state', 'OAuth state does not match');
        const cleared = `${cookieName}=; Path=/auth/v1/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
        const destination = new URL(redirect(envelope.destination));
        if (url.searchParams.has('error')) { destination.searchParams.set('error', 'access_denied'); go(destination.toString(), cleared); return; }
        const code = url.searchParams.get('code');
        if (!code || code.length > 4096) fail(400, 'bad_oauth_response', 'OAuth code is missing');
        try {
          const profile = await service.provider.exchange(envelope.provider, { code, nonce: envelope.nonce, verifier: envelope.verifier });
          destination.searchParams.set('code', await service.providerCallback(flow, envelope.provider, profile));
        } catch (error) {
          // Neither provider tokens nor query strings are recorded in logs/errors.
          logger.error('OAuth callback failed', { code: error instanceof AuthError ? error.code : 'internal_error' });
          destination.searchParams.set('error', error instanceof AuthError ? error.code : 'oauth_failed');
        }
        go(destination.toString(), cleared); return;
      }
      if (request.method === 'GET' && path === '/verify') {
        const destination = new URL(redirect(url.searchParams.get('redirect_to')));
        // Existing emails point at this endpoint with an already-hashed token.
        destination.searchParams.set('token_hash', url.searchParams.get('token') || '');
        destination.searchParams.set('type', url.searchParams.get('type') || ''); go(destination.toString()); return;
      }
      if (request.method === 'GET' && path === '/user') { send(await service.getUser(token)); return; }
      if (request.method === 'POST' && path === '/logout') { await service.logout(token, url.searchParams.get('scope') || 'global'); send(undefined, 204); return; }
      if (['POST', 'PUT'].includes(request.method)) {
        const body = await readJson(request);
        if (request.method === 'POST' && path === '/token') {
          const type = url.searchParams.get('grant_type');
          if (type === 'password') send(await service.passwordLogin(body, meta));
          else if (type === 'refresh_token') send(await service.refresh(body));
          else if (type === 'pkce') send(await service.exchange(body, meta));
          else fail(400, 'unsupported_grant_type', 'Unsupported grant type');
          return;
        }
        if (request.method === 'POST' && ['/signup', '/recover'].includes(path)) {
          // Account-level limit also applies when many visitors share a proxy IP.
          mailLimits.check(`${String(body.email || '').trim().toLowerCase()}:${path}`);
          const destination = redirect(url.searchParams.get('redirect_to'));
          send(path === '/signup' ? await service.signup(body, destination) : await service.recover(body, destination)); return;
        }
        if (request.method === 'POST' && path === '/verify') { send(await service.verify(body, meta)); return; }
        if (request.method === 'PUT' && path === '/user') { send(await service.updateUser(token, body)); return; }
        if (request.method === 'PUT' && path.startsWith('/admin/users/')) { send(await service.adminUpdate(token, path.slice('/admin/users/'.length), body)); return; }
      }
      fail(404, 'not_found', 'Endpoint not found');
    } catch (error) {
      const known = error instanceof AuthError;
      if (!known) logger.error('Auth request failed', { method: request.method, path, code: error.code || 'internal_error' });
      send({ code: known ? error.status : 500, error_code: known ? error.code : 'unexpected_failure', msg: known ? error.message : 'Authentication service error' }, known ? error.status : 500);
    }
  });
}
