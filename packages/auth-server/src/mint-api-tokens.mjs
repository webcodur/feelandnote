import fs from 'node:fs';
import { importJWK, SignJWT } from 'jose';

const config = JSON.parse(fs.readFileSync('/run/secrets/auth.json', 'utf8'));
const keys = Array.isArray(config.jwtKeys) ? config.jwtKeys : config.jwtKeys.keys;
const jwk = keys.find(key => key.d && key.alg === 'ES256');
const key = await importJWK({ ...jwk, key_ops: ['sign'] }, jwk.alg);
const result = {};
for (const [name, role] of [['anonJwt', 'anon'], ['serviceJwt', 'service_role']]) {
  result[name] = await new SignJWT({ role }).setProtectedHeader({ alg: jwk.alg, kid: jwk.kid, typ: 'JWT' })
    .setIssuer(config.issuer).setIssuedAt().setExpirationTime('5y').sign(key);
}
// Caller captures this pipe into a private file; never run it in an interactive terminal.
process.stdout.write(JSON.stringify(result));
