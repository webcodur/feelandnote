import fs from 'node:fs';
import nodemailer from 'nodemailer';
const config = JSON.parse(fs.readFileSync('/run/secrets/auth.json', 'utf8'));
const transport = nodemailer.createTransport(config.smtp);
try { await transport.verify(); console.log(JSON.stringify({ smtp_verified: true, email_sent: false })); }
catch (error) { console.log(JSON.stringify({ smtp_verified: false, code: error.code, status: error.responseCode })); process.exitCode = 1; }
finally { transport.close(); }
