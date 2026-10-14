import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { importJWK, SignJWT, createLocalJWKSet, jwtVerify } from 'jose';
import { AuthError, fail, randomToken, digest, challenge, equal, validatePassword, normalizeEmail, publicUser, usableUser } from './security.mjs';

export class AuthService {
  constructor({ pool, config, sendMail, provider }) { Object.assign(this, { pool, config, sendMail, provider }); }
  async init() {
    const keys = Array.isArray(this.config.jwtKeys) ? this.config.jwtKeys : this.config.jwtKeys.keys;
    this.signingJwk = keys.find(key => key.d && key.alg === 'ES256') || keys.find(key => key.d);
    if (!this.signingJwk?.kid || !['ES256', 'RS256'].includes(this.signingJwk.alg)) throw new Error('Asymmetric signing key is required');
    this.signingKey = await importJWK({ ...this.signingJwk, key_ops: ['sign'] }, this.signingJwk.alg);
    this.jwks = { keys: keys.map(key => {
      const { d, p, q, dp, dq, qi, oth, k, key_ops, ...publicKey } = key;
      return { ...publicKey, key_ops: ['verify'] };
    }).filter(key => ['EC', 'RSA'].includes(key.kty)) };
    this.verifier = createLocalJWKSet(this.jwks);
    // Equal work when an email does not exist; never expose password hashes over HTTP.
    this.dummyHash = await bcrypt.hash(randomToken(), 10);
  }
  async tx(work) {
    const db = await this.pool.connect();
    try { await db.query('begin'); const result = await work(db); await db.query('commit'); return result; }
    catch (error) { await db.query('rollback'); throw error; }
    finally { db.release(); }
  }
  async user(db, id, lock = false) {
    const { rows } = await db.query(`select * from auth.users where id=$1 ${lock ? 'for update' : ''}`, [id]);
    usableUser(rows[0]); return rows[0];
  }
  async serializedUser(db, row) {
    const { rows } = await db.query('select * from auth.identities where user_id=$1 order by created_at', [row.id]);
    return publicUser(row, rows);
  }
  async accessClaims(token, { admin = false } = {}) {
    try {
      const { payload } = await jwtVerify(token, this.verifier, {
        algorithms: ['ES256', 'RS256'], issuer: this.config.issuer,
        ...(admin ? {} : { audience: 'authenticated' }), requiredClaims: ['exp', 'iat'],
      });
      if (admin ? payload.role !== 'service_role' : (!payload.sub || payload.role !== 'authenticated' || !payload.session_id)) throw new Error('Invalid role');
      return payload;
    } catch { fail(401, 'bad_jwt', 'Invalid access token'); }
  }
  async authenticated(db, token) {
    const claims = await this.accessClaims(token);
    const { rows } = await db.query('select * from auth.sessions where id=$1 and user_id=$2 and (not_after is null or not_after>now())', [claims.session_id, claims.sub]);
    if (!rows.length) fail(401, 'session_not_found', 'Session not found');
    return { claims, row: await this.user(db, claims.sub) };
  }
  async sessionResponse(db, row, sessionId, refreshToken, method = 'password') {
    const user = await this.serializedUser(db, row);
    const issuedAt = Math.floor(Date.now() / 1000);
    const accessToken = await new SignJWT({
      role: 'authenticated', email: row.email || '', phone: row.phone || '',
      app_metadata: row.raw_app_meta_data || {}, user_metadata: row.raw_user_meta_data || {},
      aal: 'aal1', amr: [{ method, timestamp: issuedAt }], session_id: sessionId, is_anonymous: false,
    }).setProtectedHeader({ alg: this.signingJwk.alg, kid: this.signingJwk.kid, typ: 'JWT' })
      .setIssuer(this.config.issuer).setAudience('authenticated').setSubject(row.id)
      .setIssuedAt(issuedAt).setExpirationTime(issuedAt + this.config.jwtExp).sign(this.signingKey);
    return { access_token: accessToken, token_type: 'bearer', expires_in: this.config.jwtExp,
      expires_at: issuedAt + this.config.jwtExp, refresh_token: refreshToken, user };
  }
  async createSession(db, row, meta, method) {
    const id = randomUUID(); const refresh = randomToken();
    await db.query("insert into auth.sessions(id,user_id,created_at,updated_at,refreshed_at,aal,user_agent,ip) values($1,$2,now(),now(),now(),'aal1',$3,$4)", [id, row.id, meta.userAgent || '', meta.ip || null]);
    await db.query('insert into auth.refresh_tokens(token,user_id,session_id,revoked,created_at,updated_at) values($1,$2,$3,false,now(),now())', [refresh, row.id, id]);
    const { rows } = await db.query('update auth.users set last_sign_in_at=now(),updated_at=now() where id=$1 returning *', [row.id]);
    return this.sessionResponse(db, rows[0], id, refresh, method);
  }
  async passwordLogin(body, meta) {
    const email = normalizeEmail(body.email);
    const { rows } = await this.pool.query('select * from auth.users where lower(email)=$1 and is_sso_user=false', [email]);
    const password = typeof body.password === 'string' && Buffer.byteLength(body.password) <= 72 ? body.password : '';
    if (!await bcrypt.compare(password, rows[0]?.encrypted_password || this.dummyHash)) fail(400, 'invalid_credentials', 'Invalid login credentials');
    usableUser(rows[0]);
    if (!rows[0].email_confirmed_at) fail(400, 'email_not_confirmed', 'Email not confirmed');
    return this.tx(async db => this.createSession(db, await this.user(db, rows[0].id, true), meta, 'password'));
  }
  async refresh(body) {
    if (typeof body.refresh_token !== 'string' || body.refresh_token.length > 512) fail(400, 'refresh_token_not_found', 'Invalid refresh token');
    const result = await this.tx(async db => {
      // Lock the session first so concurrent requests for parent/child tokens serialize.
      const { rows: initial } = await db.query('select session_id from auth.refresh_tokens where token=$1', [body.refresh_token]);
      if (!initial[0]?.session_id) fail(400, 'refresh_token_not_found', 'Invalid refresh token');
      const { rows: sessions } = await db.query('select * from auth.sessions where id=$1 for update', [initial[0].session_id]);
      const session = sessions[0];
      if (!session || session.refresh_token_hmac_key || (session.not_after && new Date(session.not_after) <= new Date())) fail(400, 'session_not_found', 'Session not found');
      const { rows } = await db.query('select * from auth.refresh_tokens where token=$1 for update', [body.refresh_token]);
      const previous = rows[0];
      if (!previous) fail(400, 'refresh_token_not_found', 'Invalid refresh token');
      const row = await this.user(db, session.user_id);
      if (previous.revoked) {
        const { rows: active } = await db.query('select * from auth.refresh_tokens where session_id=$1 and not revoked order by id desc limit 1', [session.id]);
        const current = active[0];
        const recent = Date.now() - new Date(previous.updated_at).getTime() <= 10_000;
        if (current && (current.parent === previous.token || recent)) return this.sessionResponse(db, row, session.id, current.token, 'token_refresh');
        // Commit revocation before responding with an error; throwing inside tx would undo it.
        await db.query('update auth.refresh_tokens set revoked=true,updated_at=now() where session_id=$1', [session.id]);
        await db.query('delete from auth.sessions where id=$1', [session.id]);
        return { replay: true };
      }
      const next = randomToken();
      await db.query('update auth.refresh_tokens set revoked=true,updated_at=now() where id=$1', [previous.id]);
      await db.query('insert into auth.refresh_tokens(token,user_id,session_id,parent,revoked,created_at,updated_at) values($1,$2,$3,$4,false,now(),now())', [next, row.id, session.id, previous.token]);
      await db.query('update auth.sessions set refreshed_at=now(),updated_at=now() where id=$1', [session.id]);
      return this.sessionResponse(db, row, session.id, next, 'token_refresh');
    });
    if (result.replay) fail(400, 'refresh_token_already_used', 'Refresh token reuse detected');
    return result;
  }
  async getUser(token) {
    const { row } = await this.authenticated(this.pool, token);
    return this.serializedUser(this.pool, row);
  }
  async logout(token, scope) {
    if (!['global', 'local', 'others'].includes(scope)) fail(400, 'validation_failed', 'Invalid logout scope');
    const claims = await this.accessClaims(token);
    await this.pool.query(`delete from auth.sessions where user_id=$1 ${scope === 'local' ? 'and id=$2' : scope === 'others' ? 'and id<>$2' : ''}`, scope === 'global' ? [claims.sub] : [claims.sub, claims.session_id]);
  }
  async updateUser(token, body) {
    if (body.email || body.phone || body.app_metadata || body.role || body.ban_duration) fail(400, 'validation_failed', 'Unsupported user attribute');
    let hash;
    if (body.password !== undefined) { validatePassword(body.password); hash = await bcrypt.hash(body.password, 10); }
    return this.tx(async db => {
      const { claims } = await this.authenticated(db, token);
      const row = await this.user(db, claims.sub, true);
      const metadata = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? { ...row.raw_user_meta_data, ...body.data } : row.raw_user_meta_data;
      const { rows } = await db.query('update auth.users set encrypted_password=coalesce($2,encrypted_password),raw_user_meta_data=$3,updated_at=now() where id=$1 returning *', [row.id, hash || null, metadata]);
      if (hash) await db.query('delete from auth.sessions where user_id=$1 and id<>$2', [row.id, claims.session_id]);
      return this.serializedUser(db, rows[0]);
    });
  }
  async adminUpdate(token, id, body) {
    await this.accessClaims(token, { admin: true });
    if (!/^[0-9a-f-]{36}$/i.test(id)) fail(400, 'validation_failed', 'Invalid user id');
    let hash;
    if (body.password !== undefined) { validatePassword(body.password); hash = await bcrypt.hash(body.password, 10); }
    const duration = body.ban_duration;
    let banUntil;
    if (duration !== undefined) {
      if (duration === 'none') banUntil = null;
      else if (/^\d+h$/.test(duration)) banUntil = new Date(Date.now() + Math.min(Number(duration.slice(0, -1)), 876000) * 3600_000);
      else fail(400, 'validation_failed', 'Unsupported ban duration');
    }
    return this.tx(async db => {
      const { rows } = await db.query('select * from auth.users where id=$1 for update', [id]);
      const row = rows[0]; if (!row) fail(404, 'user_not_found', 'User not found');
      const { rows: updated } = await db.query('update auth.users set encrypted_password=coalesce($2,encrypted_password),raw_user_meta_data=$3,raw_app_meta_data=$4,banned_until=$5,email_confirmed_at=$6,updated_at=now() where id=$1 returning *', [id, hash || null,
        { ...row.raw_user_meta_data, ...body.user_metadata }, { ...row.raw_app_meta_data, ...body.app_metadata },
        duration === undefined ? row.banned_until : banUntil, body.email_confirm ? new Date() : row.email_confirmed_at]);
      if (hash || banUntil) await db.query('delete from auth.sessions where user_id=$1', [id]);
      return { user: await this.serializedUser(db, updated[0]) };
    });
  }
  async signup(body, redirect) {
    const email = normalizeEmail(body.email); validatePassword(body.password);
    const hash = await bcrypt.hash(body.password, 10);
    const id = randomUUID(); const token = randomToken();
    const user = await this.tx(async db => {
      const { rows: existing } = await db.query('select id from auth.users where lower(email)=$1 and is_sso_user=false', [email]);
      if (existing.length) fail(422, 'user_already_exists', 'User already registered');
      const metadata = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {};
      const { rows } = await db.query("insert into auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous,created_at,updated_at) values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,$3,$4,$5,false,false,now(),now()) returning *", [id, email, hash, { provider: 'email', providers: ['email'] }, metadata]);
      await db.query("insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at) values($1,$2,$3,$4,'email',now(),now())", [randomUUID(), id, id, { sub: id, email, email_verified: false }]);
      await this.storeEmailToken(db, id, 'confirmation_token', token, email);
      return this.serializedUser(db, rows[0]);
    });
    await this.emailLink(email, token, 'signup', redirect);
    return { user, session: null };
  }
  async storeEmailToken(db, id, type, token, email) {
    await db.query('insert into auth.one_time_tokens(id,user_id,token_type,token_hash,relates_to,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now()) on conflict(user_id,token_type) do update set token_hash=excluded.token_hash,relates_to=excluded.relates_to,created_at=now(),updated_at=now()', [randomUUID(), id, type, digest(token), email]);
    const column = type === 'recovery_token' ? 'recovery_sent_at' : 'confirmation_sent_at';
    await db.query(`update auth.users set ${column}=now(),updated_at=now() where id=$1`, [id]);
  }
  async emailLink(email, token, type, redirect) {
    const link = new URL(redirect); link.searchParams.set('token_hash', token); link.searchParams.set('type', type);
    await this.sendMail({ to: email, type, link: link.toString() });
  }
  async recover(body, redirect) {
    const email = normalizeEmail(body.email);
    const { rows } = await this.pool.query('select * from auth.users where lower(email)=$1 and is_sso_user=false and deleted_at is null', [email]);
    const row = rows[0];
    if (!row || !row.email_confirmed_at) return {};
    if (row.recovery_sent_at && Date.now() - new Date(row.recovery_sent_at) < 60_000) fail(429, 'over_email_send_rate_limit', 'Too many email requests');
    const token = randomToken();
    await this.tx(db => this.storeEmailToken(db, row.id, 'recovery_token', token, email));
    await this.emailLink(email, token, 'recovery', redirect); return {};
  }
  async verify(body, meta) {
    if (!['signup', 'email', 'recovery'].includes(body.type) || typeof body.token_hash !== 'string' || body.token_hash.length > 512) fail(400, 'otp_expired', 'Invalid or expired email token');
    const type = body.type === 'recovery' ? 'recovery_token' : 'confirmation_token';
    return this.tx(async db => {
      // Accept the old service's already-issued SHA256 token hashes during migration.
      const { rows } = await db.query("delete from auth.one_time_tokens where token_type=$1 and token_hash in ($2,$3) and created_at>now()-interval '1 hour' returning *", [type, digest(body.token_hash), body.token_hash]);
      if (rows.length !== 1) fail(403, 'otp_expired', 'Token has expired or is invalid');
      const row = await this.user(db, rows[0].user_id, true);
      if (rows[0].relates_to !== row.email) fail(403, 'otp_expired', 'Token has expired or is invalid');
      const { rows: updated } = await db.query("update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()),confirmation_token='',recovery_token='',updated_at=now() where id=$1 returning *", [row.id]);
      await db.query("update auth.identities set identity_data=identity_data || '{\"email_verified\":true}'::jsonb,updated_at=now() where user_id=$1 and provider='email'", [row.id]);
      return this.createSession(db, updated[0], meta, body.type === 'recovery' ? 'recovery' : 'otp');
    });
  }
  async beginFlow(provider, pkce) {
    if (pkce.code_challenge_method !== 's256' || !/^[A-Za-z0-9_-]{43}$/.test(pkce.code_challenge || '')) fail(400, 'bad_code_challenge', 'S256 PKCE is required');
    const id = randomUUID();
    await this.pool.query("insert into auth.flow_state(id,auth_code,code_challenge_method,code_challenge,provider_type,authentication_method,created_at,updated_at) values($1,$2,'s256',$3,$4,'oauth',now(),now())", [id, randomToken(), pkce.code_challenge, provider]);
    return id;
  }
  async providerCallback(flowId, provider, profile) {
    return this.tx(async db => {
      const { rows: flows } = await db.query("select * from auth.flow_state where id=$1 and provider_type=$2 and authentication_method='oauth' and created_at>now()-interval '10 minutes' for update", [flowId, provider]);
      const flow = flows[0];
      if (!flow || flow.user_id || flow.auth_code_issued_at) fail(400, 'flow_state_not_found', 'OAuth flow is invalid or expired');
      const { rows: identities } = await db.query('select * from auth.identities where provider=$1 and provider_id=$2', [provider, profile.id]);
      let row;
      if (identities[0]) row = await this.user(db, identities[0].user_id, true);
      else {
        // Only a provider-verified email can link an existing account.
        if (!profile.emailVerified || !profile.email) fail(400, 'email_not_confirmed', 'Provider must verify your email address');
        const email = normalizeEmail(profile.email);
        await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [email]);
        const { rows: users } = await db.query('select * from auth.users where lower(email)=$1 and is_sso_user=false for update', [email]);
        row = users[0];
        if (row) {
          usableUser(row);
          if (!row.email_confirmed_at) fail(400, 'email_not_confirmed', 'Confirm your existing email account before linking OAuth');
        } else {
          const { rows } = await db.query("insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,is_sso_user,is_anonymous,created_at,updated_at) values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),$3,$4,false,false,now(),now()) returning *", [randomUUID(), email, { provider, providers: [provider] }, profile.metadata]);
          row = rows[0];
        }
        await db.query('insert into auth.identities(id,provider_id,user_id,provider,identity_data,last_sign_in_at,created_at,updated_at) values($1,$2,$3,$4,$5,now(),now(),now())', [randomUUID(), profile.id, row.id, provider, profile.metadata]);
      }
      await db.query('update auth.identities set identity_data=$3,last_sign_in_at=now(),updated_at=now() where provider=$1 and provider_id=$2', [provider, profile.id, profile.metadata]);
      const { rows: providers } = await db.query('select provider from auth.identities where user_id=$1 order by provider', [row.id]);
      await db.query('update auth.users set raw_app_meta_data=$2,updated_at=now() where id=$1', [row.id, { ...row.raw_app_meta_data, providers: providers.map(identity => identity.provider) }]);
      const code = randomToken();
      await db.query('update auth.flow_state set user_id=$2,auth_code=$3,auth_code_issued_at=now(),updated_at=now() where id=$1', [flowId, row.id, code]);
      return code;
    });
  }
  async exchange(body, meta) {
    if (typeof body.auth_code !== 'string' || body.auth_code.length > 512 || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier || '')) fail(400, 'bad_code_verifier', 'Invalid PKCE verifier');
    return this.tx(async db => {
      const { rows } = await db.query("select * from auth.flow_state where auth_code=$1 and created_at>now()-interval '10 minutes' for update", [body.auth_code]);
      const flow = rows[0];
      if (!flow?.user_id || !flow.auth_code_issued_at || flow.code_challenge_method !== 's256' || !equal(challenge(body.code_verifier), flow.code_challenge)) fail(400, 'bad_code_verifier', 'PKCE verification failed');
      await db.query('delete from auth.flow_state where id=$1', [flow.id]);
      return this.createSession(db, await this.user(db, flow.user_id, true), meta, 'oauth');
    });
  }
}
