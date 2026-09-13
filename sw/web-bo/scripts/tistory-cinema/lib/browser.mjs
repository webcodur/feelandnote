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
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const LOCK = path.join(os.tmpdir(), 'tistory-cinema', 'browser.lock');
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

export function acquireBrowserLock(lock = LOCK) {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  if (fs.existsSync(lock)) {
    const who = fs.readFileSync(lock, 'utf8').trim();
    const pid = Number(who.match(/pid=(\d+)/)?.[1]);
    let owned = true;
    if (pid) { try { process.kill(pid, 0); } catch (error) { owned = error.code !== 'ESRCH'; } }
    if (owned) throw new Error(`다른 티스토리 작업이 돌고 있거나 잠금 주인을 확인할 수 없다(${who}).`);
    if (fs.readFileSync(lock, 'utf8').trim() !== who) throw new Error('잠금 소유자가 바뀌었다. 다시 확인해야 한다.');
    fs.unlinkSync(lock);
  }
  const owner = `${path.basename(process.argv[1] ?? '?')} pid=${process.pid} token=${crypto.randomUUID()}`;
  fs.writeFileSync(lock, owner, { flag: 'wx' });
  return () => {
    try { if (fs.readFileSync(lock, 'utf8') === owner) fs.unlinkSync(lock); } catch {}
  };
}

async function alive() {
  try {
    const res = await fetch(`http://localhost:${PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

export async function getBrowser({ protocolTimeout = 300000 } = {}) {
  const release = acquireBrowserLock();
  process.once('exit', release);
  try {
    if (await alive()) {
      const browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null, protocolTimeout });
      browser.once('disconnected', release);
      return { browser, launched: false };
    }
    if (!CHROME) throw new Error('크롬 실행 파일을 찾지 못했다');
    if (fs.existsSync(`${PROFILE}/SingletonLock`)) throw new Error('티스토리 전용 프로필이 사용 중이지만 디버그 포트에 연결할 수 없다.');
    console.log('티스토리용 디버그 크롬을 띄운다…');
    // Chrome must outlive a login-check CLI without keeping that Node process running.
    const child = spawn(CHROME, ARGS, { detached: true, stdio: 'ignore', windowsHide: true });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
    const deadline = Date.now() + 20000;
    while (!(await alive())) {
      if (Date.now() >= deadline) throw new Error(`티스토리 Chrome 연결이 준비되지 않았다(pid=${child.pid}).`);
      await wait(500);
    }
    const browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null, protocolTimeout });
    browser.once('disconnected', release);
    await wait(2500);
    return { browser, launched: true, pid: child.pid };
  } catch (error) {
    release();
    throw error;
  }
}

export const BLOG = 'feelandnote-cinema';

/** 마지막으로 뜬 대화상자 문구. 실패 원인을 되짚을 때 쓴다. */
export let lastDialog = null;
export const takeDialog = () => { const m = lastDialog; lastDialog = null; return m; };
const handledPages = new WeakSet();

/** 티스토리 탭을 얻고 대화상자 핸들러를 건다. 이 핸들러가 없으면 편집기 조작이 통째로 멈춘다. */
export async function getTistoryPage(browser) {
  const pages = await browser.pages();
  const host = (p) => { try { return new URL(p.url()).hostname; } catch { return ''; } };
  const found = pages.find((p) => host(p) === `${BLOG}.tistory.com`) ?? (await browser.newPage());
  if (handledPages.has(found)) return found;
  handledPages.add(found);
  /**
   * 🔴 **받되 버리지 않는다.** 예전에는 조용히 수락만 했다. 티스토리가 「하루 발행 수를
   *    넘었습니다」처럼 이유를 말해 주는데 그 문구를 버려서, 발행이 통째로 막혔을 때
   *    화면에 아무 단서도 남지 않았다(26.09.05 예약 21편 연속 실패).
   */
  found.on('dialog', (d) => {
    const msg = d.message()
    /**
     * 🔴 **「이어서 작성하시겠습니까?」만은 거절한다.**
     *
     * 수락하면 남아 있던 임시저장 글을 **불러온 채로** 편집기가 열린다. 그 위에 새 본문을
     * 밀어 넣으면 태그가 뒤엉켜(26.09.06 `max-width: 330px !impo&lt;div style…`) 저장이
     * 끝나지 않고, 발행 단추가 「저장중」인 채로 비활성이 되어 **영원히 발행되지 않는다.**
     * 한 번 실패해 초안이 남으면 그다음부터 전부 같은 자리에서 무너진다.
     */
    if (/이어서 작성/.test(msg)) {
      console.log('   [알림·거절] ' + msg.replace(/\s+/g, ' ').slice(0, 80))
      lastDialog = msg
      d.dismiss().catch(() => {})
      return
    }
    if (msg) console.log(`   [알림] ${msg.replace(/\s+/g, ' ').slice(0, 200)}`)
    lastDialog = msg
    if (d.type() === 'confirm' && !/HTML|모드|서식/.test(msg)) d.dismiss().catch(() => {})
    else d.accept().catch(() => {})
  });
  return found;
}

/** 로그인 상태인지 본다. 관리 화면이 열리면 로그인된 것이다. */
export async function ensureLoggedIn(page) {
  if (!new RegExp(`^https://${BLOG}\\.tistory\\.com/manage/posts/?(?:[?#]|$)`).test(page.url())) {
    await page.goto(`https://${BLOG}.tistory.com/manage/posts/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await wait(2500);
  const url = page.url();
  if (/auth|login|account/.test(url)) {
    throw new Error('티스토리 로그인이 없다. 뜬 크롬 창에서 카카오 계정으로 로그인한 뒤 다시 실행해라');
  }
  if (new URL(url).hostname !== `${BLOG}.tistory.com` || !new URL(url).pathname.startsWith('/manage/')) {
    throw new Error('필앤노트 시네마 관리 화면이 열리지 않았다. 로그인 상태를 확인해야 한다.');
  }
  return true;
}
