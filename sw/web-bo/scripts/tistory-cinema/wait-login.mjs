/** Check login once. Never poll the login page or auto-publish after login. */
import { getBrowser, getTistoryPage, ensureLoggedIn } from './lib/browser.mjs';
let browser;
try {
  ({ browser } = await getBrowser());
  await ensureLoggedIn(await getTistoryPage(browser));
  console.log('Login confirmed. Review fill-schedule.mjs before using --run.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  browser?.disconnect();
}
