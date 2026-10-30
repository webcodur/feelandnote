import fs from 'node:fs';
import pg from 'pg';
import nodemailer from 'nodemailer';
import { AuthService } from './service.mjs';
import { OAuthProvider } from './oauth.mjs';
import { createAuthServer } from './http.mjs';

const config = JSON.parse(fs.readFileSync(process.env.AUTH_CONFIG_FILE || '/run/secrets/auth.json', 'utf8'));
const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 8, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
pool.on('error', error => console.error('Database connection failed', { code: error.code }));
const mailer = nodemailer.createTransport(config.smtp);
const sendMail = ({ to, type, link }) => mailer.sendMail({
  from: config.mailFrom, to, subject: type === 'recovery' ? 'feelandnote password reset' : 'Confirm your feelandnote email',
  text: `feelandnote\n\n${type === 'recovery' ? 'Reset your password' : 'Confirm your email address'}:\n${link}\n\nThis link expires in one hour. If you did not request it, ignore this message.`,
});
const service = new AuthService({ pool, config, sendMail, provider: new OAuthProvider(config) });
await service.init();
const server = createAuthServer(service);
server.listen(9999, '0.0.0.0', () => console.log('feelandnote Auth listening on port 9999'));
// Existing expired flow/token rows are bounded without introducing any schema.
const clean = setInterval(async () => {
  try {
    await pool.query("delete from auth.flow_state where created_at<now()-interval '1 hour'");
    await pool.query("delete from auth.one_time_tokens where created_at<now()-interval '1 day'");
  } catch (error) { console.error('Expired token cleanup failed', { code: error.code }); }
}, 3_600_000).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  clearInterval(clean);
  server.close(async () => { await pool.end(); process.exit(0); });
});
