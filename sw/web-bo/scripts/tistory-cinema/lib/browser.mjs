/**
 * 티스토리 편집기를 조작할 크롬을 얻는다.
 *
 * 🔴 **MCP 브라우저 확장으로는 티스토리를 몰 수 없다.** 티스토리는 스킨 적용·HTML 모드
 *    전환 같은 자리에서 네이티브 `confirm` 을 띄우는데, 그 대화상자가 뜨면 CDP 명령이
 *    통째로 막혀 렌더러가 얼어붙은 것처럼 보인다(26.09.05에 두 번 겪었다). Puppeteer 는
 *    `page.on('dialog')` 로 그 창을 받아 넘길 수 있어 같은 자리에서 멈추지 않는다.
 *    **모든 티스토리 자동화는 이 모듈을 거친다.**
 *
 * 프로필은 네이버와 나눈다(`_chrome-tistory`). 한 프로필에 두 작업이 붙으면 서로 탭을
 * 빼앗는다. 카카오 로그인은 사람이 한 번 해 두면 그 프로필에 남는다.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOCK = path.join(os.tmpdir(), 'tistory-cinema', 'browser.lock');
const STALE_MS = 30 * 60 * 1000;
const PORT = 9333;
const PROFILE = 'C:/project/_chrome-tistory';
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

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

function acquireLock() {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  if (fs.existsSync(LOCK)) {
    const age = Date.now() - fs.statSync(LOCK).mtimeMs;
    const who = fs.readFileSync(LOCK, 'utf8').trim();
    const pid = Number(who.match(/pid=(\d+)/)?.[1]);
    let owned = true;
    if (pid) { try { process.kill(pid, 0); } catch { owned = false; } }
    if (age < STALE_MS && owned) throw new Error(`다른 티스토리 작업이 돌고 있다(${who}). 끝난 뒤 실행해라`);
    console.log(`${owned ? '묵은' : '주인이 죽은'} 잠금을 지운다(${who})`);
    fs.rmSync(LOCK, { force: true });
  }
  fs.writeFileSync(LOCK, `${path.basename(process.argv[1] ?? '?')} pid=${process.pid}`);
  const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('uncaughtException', (e) => { release(); throw e; });
}

async function alive() {
  try {
    const res = await fetch(`http://localhost:${PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

export async function getBrowser({ protocolTimeout = 300000 } = {}) {
  acquireLock();
  if (await alive()) {
    const browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null, protocolTimeout });
    return { browser, launched: false };
  }
  if (!CHROME) throw new Error('크롬 실행 파일을 찾지 못했다');
  if (fs.existsSync(`${PROFILE}/SingletonLock`)) throw new Error('프로필이 잠겨 있다. 그 프로필로 뜬 크롬을 닫아라');
  console.log('티스토리용 디버그 크롬을 띄운다…');
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: false, defaultViewport: null, protocolTimeout,
    userDataDir: PROFILE, args: ARGS,
  });
  await wait(2500);
  return { browser, launched: true };
}

export const BLOG = 'feelandnote-cinema';

/** 티스토리 탭을 얻고 대화상자 핸들러를 건다. 이 핸들러가 없으면 편집기 조작이 통째로 멈춘다. */
export async function getTistoryPage(browser) {
  const pages = await browser.pages();
  const host = (p) => { try { return new URL(p.url()).hostname; } catch { return ''; } };
  const found = pages.find((p) => /tistory\.com$/.test(host(p))) ?? pages[0] ?? (await browser.newPage());
  found.on('dialog', (d) => { d.accept().catch(() => {}); });
  return found;
}

/** 로그인 상태인지 본다. 관리 화면이 열리면 로그인된 것이다. */
export async function ensureLoggedIn(page) {
  await page.goto(`https://${BLOG}.tistory.com/manage/post`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(2500);
  const url = page.url();
  if (/auth|login|account/.test(url)) {
    throw new Error('티스토리 로그인이 없다. 뜬 크롬 창에서 카카오 계정으로 로그인한 뒤 다시 실행해라');
  }
  return true;
}
