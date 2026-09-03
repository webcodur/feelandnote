/**
 * 네이버 편집기를 조작할 크롬을 얻는다
 *
 * 사용자가 띄워 둔 디버그 크롬(9222)에 붙는 것이 먼저다. 하루 종일 켜 두고 쓰는 창이라
 * 이미 떠 있으면 그대로 쓴다. 꺼져 있으면 **같은 프로필로 직접 띄운다** —
 * 네이버 로그인이 그 프로필에 들어 있어 다른 프로필로 띄우면 로그인이 없다.
 *
 * 26.09.03에 사용자가 창을 닫아 예약 발행이 통째로 멈춘 적이 있다. 그때는 사람이
 * 다시 띄워야 했다. 이 모듈이 그 수고를 없앤다.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

import os from 'node:os';
import path from 'node:path';

// 🔴 네이버 편집기 작업을 둘 이상 동시에 돌리면 같은 탭을 서로 조작해 무너진다.
//    26.09.03에 예약 작업과 재조정 작업을 같이 돌려 둘 다 중간에 죽었다.
const LOCK = path.join(os.tmpdir(), 'naver-blog', 'browser.lock');
const STALE_MS = 30 * 60 * 1000;   // 30분 넘은 잠금은 죽은 작업이 남긴 것으로 본다

function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  if (fs.existsSync(LOCK)) {
    const age = Date.now() - fs.statSync(LOCK).mtimeMs;
    const who = fs.readFileSync(LOCK, "utf8").trim();
    // 강제 종료된 작업은 잠금을 지우지 못하고 죽는다. 주인이 살아 있는지 먼저 본다.
    const pid = Number(who.match(/pid=(\d+)/)?.[1]);
    let owned = true;
    if (pid) { try { process.kill(pid, 0); } catch { owned = false; } }
    if (age < STALE_MS && owned) {
      throw new Error(`다른 네이버 작업이 브라우저를 쓰고 있다(${who}, ${Math.round(age / 1000)}초 전). 끝난 뒤 다시 실행해라`);
    }
    console.log(`${owned ? '묵은' : '주인이 죽은'} 잠금을 지운다(${who})`);
    fs.rmSync(LOCK, { force: true });
  }
  fs.writeFileSync(LOCK, `${path.basename(process.argv[1] ?? "?")} pid=${process.pid}`);
  const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
  process.on("exit", release);
  process.on("SIGINT", () => { release(); process.exit(130); });
  process.on("uncaughtException", (e) => { release(); throw e; });
}

const PORT = 9222;
const PROFILE = 'C:/project/_chrome-naver';
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

// 창이 다른 창에 완전히 가려지면 렌더링이 멈춰 클릭이 처리되지 않는다. 그것을 끄는 옵션이다.
const ARGS = [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--disable-features=CalculateNativeWinOcclusion',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--no-first-run',
  '--no-default-browser-check',
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function alive() {
  try {
    const res = await fetch(`http://localhost:${PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

/**
 * @param {object} [opts]
 * @param {number} [opts.protocolTimeout] 긴 글은 DOM 조회 한 번이 1분을 넘는다. 넉넉히 준다.
 * @returns {Promise<{browser: import('puppeteer').Browser, launched: boolean}>}
 *   launched 가 true 면 이 스크립트가 띄운 것이다 — 끝나고 close 해도 된다.
 *   false 면 사용자 창이므로 **끄지 말고 disconnect 만 한다.**
 */
export async function getBrowser({ protocolTimeout = 300000 } = {}) {
  acquireLock();
  if (await alive()) {
    const browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null, protocolTimeout });
    return { browser, launched: false };
  }

  if (!CHROME) throw new Error('크롬 실행 파일을 찾지 못했다');
  if (fs.existsSync(`${PROFILE}/SingletonLock`)) {
    throw new Error('프로필이 잠겨 있다. 그 프로필로 뜬 크롬이 있는지 확인해라');
  }
  console.log('디버그 크롬이 꺼져 있다. 같은 프로필로 띄운다…');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,          // 네이버 편집기는 실제 렌더링이 필요하다
    defaultViewport: null,
    protocolTimeout,
    userDataDir: PROFILE,
    args: ARGS,
  });
  await wait(2500);
  return { browser, launched: true };
}

/**
 * 네이버 페이지를 얻는다. 없으면 새 탭을 연다.
 *
 * 🔴 호스트를 정확히 비교한다. `includes('blog.naver.com')` 로 찾으면
 *    `section.blog.naver.com`(블로그 홈)까지 걸려 로그인이 풀린 것으로 오진한다.
 *    편집 폼이 열린 탭을 가장 먼저 쓴다.
 */
export async function getNaverPage(browser) {
  const pages = await browser.pages();
  const host = (p) => { try { return new URL(p.url()).hostname; } catch { return ''; } };
  const mine = pages.filter((p) => host(p) === 'blog.naver.com');
  const found = mine.find((p) => /PostUpdateForm|PostWriteForm/.test(p.url())) ?? mine[0];
  if (found) return found;
  const page = pages[0] ?? (await browser.newPage());
  await page.goto('https://blog.naver.com/dmx777', { waitUntil: 'domcontentloaded' });
  await wait(1500);
  return page;
}

/** 로그인 상태인지 본다. 로그인이 풀렸으면 사람이 해야 한다. */
export async function ensureLoggedIn(page) {
  const html = await page.evaluate(() => document.documentElement.innerHTML.slice(0, 4000));
  if (/nid\.naver\.com|로그인이 필요/.test(html)) {
    throw new Error('네이버 로그인이 풀렸다. 뜬 창에서 직접 로그인한 뒤 다시 실행해라(로그인 상태 유지를 켜라)');
  }
}
