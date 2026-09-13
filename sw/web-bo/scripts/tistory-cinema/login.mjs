/**
 * 티스토리 로그인을 **눌러 본 뒤** 판단한다.
 *
 *   node scripts/tistory-cinema/login.mjs
 *
 * 🔴 **관리 화면이 안 열린다고 「로그인이 없다」고 단정하지 않는다.** 세션 쿠키만 만료된
 *    경우가 대부분이고, 카카오 간편로그인에 계정이 남아 있으면 단추 두 번으로 되돌아온다.
 *    26.09.06·07에 두 번 다 그랬는데, 두 번 다 눌러 보지 않고 사람에게 넘겼다.
 *
 * 순서는 이렇다.
 * 1. 관리 화면으로 간다. 열리면 끝이다.
 * 2. 로그인 화면이면 「카카오계정으로 로그인」을 누른다.
 * 3. 간편로그인 계정 목록이 나오면 저장된 계정을 고른다.
 * 4. 관리 화면으로 되돌아오는지 기다린다.
 *
 * 여기까지 해도 안 되면 사람이 직접 해야 하는 상황(계정 목록에 없음·2단계 인증 등)이다.
 * 그때만 손을 든다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBrowser, BLOG } from './lib/browser.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MANAGE = `https://${BLOG}.tistory.com/manage/posts/`;

const atManage = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === `${BLOG}.tistory.com` && parsed.pathname.startsWith('/manage/');
  } catch { return false; }
};

/** 관리 화면에 닿을 때까지 기다린다. */
async function settle(page, seconds) {
  for (let i = 0; i < seconds; i += 1) {
    await wait(1000);
    if (atManage(page.url())) return true;
  }
  return atManage(page.url());
}

export async function ensureLogin(browser, { account = null, log = console.log } = {}) {
  // 티스토리·카카오 탭을 먼저 찾는다. 새 탭을 만들면 로그인 화면을 놓친다.
  const pages = await browser.pages();
  const page = pages.find((p) => /tistory\.com|accounts\.kakao\.com/.test(p.url())) ?? pages[0] ?? (await browser.newPage());
  await page.bringToFront();

  if (!atManage(page.url())) {
    await page.goto(MANAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(2500);
  }
  if (atManage(page.url())) { log('이미 로그인되어 있다.'); return page; }

  const kakao = await page.evaluate(() => {
    const el = [...document.querySelectorAll('a,button')]
      .find((x) => x.getClientRects().length && /카카오계정으로 로그인/.test(x.textContent));
    if (!el) return false;
    el.click(); return true;
  });
  log(`「카카오계정으로 로그인」 클릭: ${kakao}`);
  if (!kakao) throw new Error(`로그인 단추를 찾지 못했다. 현재 화면: ${page.url()}`);
  if (await settle(page, 8)) { log('로그인 통과(카카오 세션이 살아 있었다).'); return page; }

  /**
   * 간편로그인 계정 목록. 계정을 지정하지 않으면 목록의 첫 계정을 고른다 —
   * 이 프로필은 이 블로그 전용이라 다른 계정이 섞일 일이 없다.
   */
  const picked = await page.evaluate((wanted) => {
    const rows = [...document.querySelectorAll('a,button,li')]
      .filter((x) => x.getClientRects().length && /@/.test(x.textContent));
    const target = wanted
      ? rows.find((x) => x.textContent.includes(wanted))
      : rows.sort((a, b) => a.textContent.length - b.textContent.length)[0];
    if (!target) return null;
    const clickable = target.closest('a,button') ?? target;
    clickable.click();
    return clickable.textContent.trim().slice(0, 40);
  }, account);
  log(`간편로그인 계정 선택: ${picked ?? '(목록 없음)'}`);

  if (await settle(page, 45)) { log('로그인 통과.'); return page; }
  throw new Error(`로그인을 마치지 못했다. 사람이 직접 해야 한다. 현재 화면: ${page.url()}`);
}

async function main() {
  const { browser } = await getBrowser();
  try {
    const page = await ensureLogin(browser);
    console.log('현재 주소:', page.url());
  } finally { browser.disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
