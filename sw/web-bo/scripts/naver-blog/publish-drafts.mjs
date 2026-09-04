// 네이버 블로그 새 글 발행. data/naver-blog/drafts.json 의 status=draft 항목을 양식대로 올린다.
// 사용: node scripts/naver-blog/publish-drafts.mjs [최대건수] [--dry] [--target=경로]
//       [--start=YYYY-MM-DD --dow=2,5 --time=HH:MM]  예약 발행. 시작일부터 지정 요일에 한 편씩 예약한다(분은 10분 단위).
//       예) --start=2026-09-09 --dow=2,5 --time=09:00  → 화·금 오전 9시로 차례차례 예약
// 양식·주기는 docs/continuous/naver-blog.md 를 따른다.
//   --dry : 제목·본문 입력과 발행 패널 설정까지만 하고 발행하지 않는다(스크린샷 저장).
// 디버그 포트 9222 크롬에 네이버 로그인 상태여야 한다. 크롬은 --disable-features=CalculateNativeWinOcclusion 로 띄운다.
import { getBrowser, getNaverPage } from './lib/browser.mjs';
import fs from 'node:fs';
import sharp from 'sharp';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const SC = path.join(os.tmpdir(), 'naver-blog'); fs.mkdirSync(SC, { recursive: true });
const DRAFTS = process.env.NB_DRAFTS ?? path.join(ROOT, 'data/naver-blog/drafts.json');
const POSTS = path.join(ROOT, 'data/naver-blog/posts.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyTarget = args.find((a) => a.startsWith('--target='))?.slice(9);
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const startDay = opt('start'), dowRaw = opt('dow'), atTime = opt('time');
const scheduling = Boolean(startDay && atTime);
if (scheduling && !/^\d{4}-\d{2}-\d{2}$/.test(startDay)) throw new Error('--start 는 YYYY-MM-DD');
if (scheduling && !/^\d{2}:[0-5]0$/.test(atTime)) throw new Error('--time 은 HH:MM 이고 분은 10분 단위');
const dows = (dowRaw ?? '2,5').split(',').map(Number); // 1=월 … 7=일
// 예약 슬롯을 필요한 만큼 만든다
function slots(n) {
  const out = []; const d = new Date(`${startDay}T00:00:00`);
  for (let guard = 0; out.length < n && guard < 400; guard++, d.setDate(d.getDate() + 1)) {
    const w = d.getDay() === 0 ? 7 : d.getDay();
    if (!dows.includes(w)) continue;
    const [hh, mm] = atTime.split(':').map(Number);
    const slot = new Date(d); slot.setHours(hh, mm, 0, 0);
    if (slot.getTime() > Date.now() + 60000) out.push(slot);   // 과거 시각은 건너뛴다
  }
  return out;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { headers: { 'user-agent': 'Mozilla/5.0' } };

const drafts = JSON.parse(fs.readFileSync(DRAFTS, 'utf8'));
const posts = fs.existsSync(POSTS) ? JSON.parse(fs.readFileSync(POSTS, 'utf8')) : [];   // 중복 검사에 쓴다
const saveAll = () => { fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 1)); fs.writeFileSync(POSTS, JSON.stringify(posts, null, 1)); };

// 본문 단락 전부(제목 제외). 카드가 끼어 텍스트 블록이 갈려도 순서대로 모은다.
const bodyParas = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle'))
    .flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')].map((p) => p.textContent.replace(/\u200b/g, '').trim())));
// 캐럿이 든 단락 텍스트(없으면 null)
const caretPara = (page) => page.evaluate(() => {
  const a = getSelection().anchorNode; const p = a && (a.nodeType === 1 ? a : a.parentElement).closest('.se-text-paragraph');
  return p ? p.textContent.replace(/\u200b/g, '').trim() : null;
});

async function ensureVisible(page) {
  const cdp = await page.createCDPSession();
  try { const { windowId } = await cdp.send('Browser.getWindowForTarget'); await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } }); } catch {}
  await cdp.detach().catch(() => {});
  await page.bringToFront(); await wait(400);
  const vis = await page.evaluate(() => document.visibilityState);
  if (vis !== 'visible') console.log('경고: 탭이 보이지 않는다(' + vis + ')');
}

// 이어쓰기 팝업("작성 중인 글")이 뜨면 취소
async function dismissResume(page) {
  const btn = await page.evaluateHandle(() => {
    const layer = [...document.querySelectorAll('[class*=layer], [role=dialog], [class*=popup]')].find((e) => e.offsetParent && /작성 중|임시저장|불러오/.test(e.textContent));
    return layer ? [...layer.querySelectorAll('button')].find((b) => /취소|아니오|닫기/.test(b.textContent)) ?? null : null;
  });
  if (btn && (await btn.asElement())) { await btn.asElement().click(); await wait(600); return true; }
  return false;
}

// 제목을 친다. 긴 제목은 나눠 치고, 결과가 다르면 지우고 다시 친다.
const titleText = (page) => page.evaluate(() => { const p = document.querySelector('.se-documentTitle .se-text-paragraph'); if (!p || p.querySelector('.se-placeholder')) return ''; return p.textContent.replace(/​/g, '').trim(); });
async function typeTitle(page, title) {
  for (let attempt = 0; attempt < 3; attempt++) {
    for (let i = 0; i < title.length; i += 30) { await page.keyboard.type(title.slice(i, i + 30), { delay: 15 }); await wait(150); }
    await wait(500);
    if ((await titleText(page)) === title) return;
    for (let z = 0; z < 300 && (await titleText(page)) !== ''; z++) { await page.keyboard.press('Backspace'); await wait(15); }
  }
  throw new Error(`제목 입력 실패: ${JSON.stringify((await titleText(page)).slice(0, 40))}`);
}

// [img:주소] 또는 [img:주소|폭] — 이미지를 내려받아 편집기에 넣는다.
const IMG_RE = /^\[img:([^|\]]+)(?:\|(\d+))?(?:\|([^\]]+))?\]$/;   // [img:주소|폭|이름]
const isImg = (l) => IMG_RE.test(l.trim());
const IMGDIR = path.join(os.tmpdir(), 'naver-blog', 'img');
fs.mkdirSync(IMGDIR, { recursive: true });

// 파일 이름이 그대로 대체 텍스트가 되므로 뜻이 통하는 이름을 붙인다.
/**
 * 이미지를 받아 올릴 파일로 만든다.
 *
 * 🔴 아바타는 배경을 지운 투명 이미지다. 그대로 올리면 네이버가 JPEG 로 바꾸며 투명한 자리를
 *    검정으로 채워 얼굴만 뜬 시커먼 그림이 된다. 블로그는 흰 바탕이므로 받아서 흰색으로 합친다.
 *    webp 도 네이버가 받지 않을 수 있어 함께 jpeg 로 바꾼다.
 */
async function download(url, name) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`이미지 내려받기 실패 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('이미지가 너무 작다');
  const safe = (name ?? '이미지').replace(/[\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || '이미지';

  const meta = await sharp(buf).metadata().catch(() => null);
  if (meta && (meta.hasAlpha || meta.format === 'webp')) {
    const f = path.join(IMGDIR, `${safe}-${Date.now().toString(36)}.jpg`);
    await sharp(buf).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toFile(f);
    return f;
  }

  const ext = /png/i.test(res.headers.get('content-type') ?? '') ? 'png' : 'jpg';
  const f = path.join(IMGDIR, `${safe}-${Date.now().toString(36)}.${ext}`);
  fs.writeFileSync(f, buf); return f;
}

// 이미지 하나를 넣고 폭을 맞춘 뒤 가운데로 놓는다.
async function insertImage(page, cdp, url, width, name) {
  const file = await download(url, name);
  const count = () => page.evaluate(() => document.querySelectorAll('.se-component.se-image').length);
  const before = await count();
  const btn = await page.evaluate(() => { const e = document.querySelector('.se-toolbar-item-image button, .se-toolbar-item-image'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (!btn) throw new Error('사진 단추를 찾지 못했다');
  cdp.__chooser = null;
  await page.mouse.click(btn.x, btn.y);
  for (let i = 0; i < 24 && !cdp.__chooser; i++) await wait(250);
  if (!cdp.__chooser) throw new Error('파일 선택창이 열리지 않았다');
  await cdp.send('DOM.setFileInputFiles', { files: [file], backendNodeId: cdp.__chooser.backendNodeId });
  let ok = false;
  for (let k = 0; k < 30; k++) { await wait(1500); if ((await count()) > before) { ok = true; break; } }
  if (!ok) throw new Error('이미지가 삽입되지 않았다');
  await wait(1200);

  // 방금 넣은 이미지를 골라 폭과 정렬을 맞춘다.
  const pos = await page.evaluate(() => { const cs = [...document.querySelectorAll('.se-component.se-image')]; const c = cs[cs.length - 1]; c.scrollIntoView({ block: 'center', behavior: 'instant' }); const i = c.querySelector('img') ?? c; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.click(pos.x, pos.y); await wait(900);
  const size = await page.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /크기 변경 열기/.test(x.getAttribute('aria-label') || x.textContent)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (size) {
    await page.mouse.click(size.x, size.y); await wait(900);
    const wi = await page.$('[class*=resizing-input] input, input[class*=resizing-input]');
    if (wi) {
      await wi.click({ clickCount: 3 }); await wait(200);
      await page.keyboard.type(String(width), { delay: 40 }); await page.keyboard.press('Enter'); await wait(1400);
      const got = await page.evaluate(() => { const cs = [...document.querySelectorAll('.se-component.se-image img')]; return Math.round(cs[cs.length - 1].getBoundingClientRect().width); });
      if (Math.abs(got - width) > 30) console.log(`  경고: 폭 ${got} (요청 ${width})`);
    }
  }
  /**
   * 🔴 이미지 정렬은 컴포넌트의 `se-l-*` 가 아니라 안쪽 `.se-section` 의
   *    `se-section-align-*` 이 쥔다. 컴포넌트는 늘 `se-l-default` 라 그것만 보면
   *    영영 「안 바뀐다」고 판정한다. 26.09.04에 여섯 장 모두 왼쪽으로 나갔다.
   *
   *    단추도 함정이다. 글자가 「가운데 정렬가운데 정렬」처럼 두 번 나오고, 클래스가
   *    `se-align-center` 인 단추의 글자는 「왼쪽 정렬」이다. 글자로 찾지 말고,
   *    돌려가며 바꾸는 단추(se-context-toolbar-cycle-toggle-button)를 가운데가 될
   *    때까지 누른다.
   */
  const alignNowImg = () => page.evaluate(() => {
    const cs = [...document.querySelectorAll('.se-component.se-image')];
    const sec = cs[cs.length - 1]?.querySelector('.se-section');
    return String(sec?.className ?? '').match(/se-section-align-(\w+)/)?.[1] ?? null;
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await alignNowImg()) === 'center') break;
    // 🔴 좌표 클릭은 먹지 않는다. 이 툴바는 화면 맨 위에 떠 다른 것에 가린다.
    //    요소를 직접 눌러야 한다. 순환 단추가 둘이라 클래스가 se-align-center 인 쪽을 고른다.
    const hit = await page.evaluate(() => {
      const e = [...document.querySelectorAll('button.se-context-toolbar-cycle-toggle-button')]
        .find((x) => x.offsetParent && /se-align-center/.test(String(x.className)));
      if (!e) return false;
      e.click();
      return true;
    });
    if (!hit) {
      // 이미지가 골라져 있지 않으면 툴바가 없다. 다시 눌러 고른다.
      const again = await page.evaluate(() => {
        const cs = [...document.querySelectorAll('.se-component.se-image')];
        const c = cs[cs.length - 1];
        if (!c) return null;
        c.scrollIntoView({ block: 'center', behavior: 'instant' });
        const i = c.querySelector('img') ?? c;
        const r = i.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (again) { await page.mouse.click(again.x, again.y); await wait(1200); }
      continue;
    }
    await wait(1300);
  }
  if ((await alignNowImg()) !== 'center') throw new Error(`이미지를 가운데로 놓지 못했다(현재 ${await alignNowImg()})`);
  // 캐럿을 본문 끝으로 되돌린다.
  const back = await page.evaluate(() => { const ps = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')]; const q = ps[ps.length - 1]; if (!q) return null; q.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = q.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  if (back) { await page.mouse.click(back.x, back.y); await wait(400); }
  fs.unlinkSync(file);
}

// 원고 서식 표시. **굵게** · [c]가운데 정렬[/c] · [q]인용구[/q] · 한 줄 --- 은 구분선.
const strip = (l) => l.replace(/\*\*/g, '').replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').replace(/^\[q\]/, '').replace(/\[\/q\]$/, '');
const isDivider = (l) => /^[━─—–-]{3,}$/.test(l.replace(/[s​]/g, ''));   // --- 와 ━━━ 둘 다 받는다
const isCenter = (l) => /^\[c\].*\[\/c\]$/.test(l.trim());
// [q]…[/q] — 인용구로 감싼다. 간결체 덩어리를 나레이터의 정중체와 눈으로 가른다.
const isQuote = (l) => /^\[q\].*\[\/q\]$/.test(l.trim());

async function insertDivider(page) {
  const before = await page.evaluate(() => document.querySelectorAll('.se-component.se-horizontalLine').length);
  const pos = await page.evaluate(() => { const e = document.querySelector('[class*=se-toolbar-item-insert-h] button, [class*=se-toolbar-item-insert-h]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (!pos) throw new Error('구분선 단추를 찾지 못했다');
  await page.mouse.click(pos.x, pos.y); await wait(1200);
  const after = await page.evaluate(() => document.querySelectorAll('.se-component.se-horizontalLine').length);
  if (after <= before) throw new Error('구분선이 들어가지 않았다');
}

/**
 * 인용구 블록을 넣고 그 안에 글을 친다.
 *
 * 나레이터는 정중체, 인물 정리와 감상은 간결체다. 아무 표시 없이 맞붙으면 문체가 덜컹거린다.
 * 간결체 덩어리를 인용구로 감싸 눈으로 갈라 두면 전환이 자연스럽다.
 */
async function insertQuote(page, text) {
  const count = () => page.evaluate(() => document.querySelectorAll('.se-component.se-quotation').length);
  const before = await count();
  const pos = await page.evaluate(() => {
    const e = document.querySelector('.se-toolbar-item-insert-quotation button, .se-toolbar-item-insert-quotation');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!pos) throw new Error('인용구 단추를 찾지 못했다');
  await page.mouse.click(pos.x, pos.y); await wait(1000);

  // 인용구 모양을 고르는 목록이 뜨면 첫 번째(세로줄)를 고른다
  const picked = await page.evaluate(() => {
    const li = [...document.querySelectorAll('.se-toolbar-item-insert-quotation li, [class*=quotation] [role=menuitem]')].filter((e) => e.offsetParent);
    if (!li.length) return false;
    const r = li[0].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (picked && picked.x) { await page.mouse.click(picked.x, picked.y); await wait(900); }

  for (let i = 0; i < 30 && (await count()) <= before; i++) await wait(300);
  if ((await count()) <= before) throw new Error('인용구가 들어가지 않았다');
  await wait(600);

  for (let j = 0; j < text.length; j += 60) { await page.keyboard.type(text.slice(j, j + 60), { delay: 12 }); await wait(120); }
  await wait(500);
  const got = await page.evaluate(() => {
    const q = [...document.querySelectorAll('.se-component.se-quotation')].pop();
    return q ? q.textContent.replace(/​/g, '').trim() : '';
  });
  if (!got.includes(text.slice(0, 20))) throw new Error(`인용구 입력 실패: ${JSON.stringify(got.slice(0, 30))}`);

  // 인용구 밖으로 빠져나온다. 인용구 안에서는 정렬 툴바가 사라져 다음 줄 처리가 막힌다.
  await page.keyboard.down('Control'); await page.keyboard.press('End'); await page.keyboard.up('Control');
  await wait(400);
  await page.keyboard.press('Enter'); await wait(600);

  // 캐럿이 아직 인용구 안이면 맨 끝 본문 단락을 눌러 빠져나온다
  for (let i = 0; i < 6; i++) {
    const inQuote = await page.evaluate(() => {
      const a = getSelection().anchorNode;
      const el = a && (a.nodeType === 1 ? a : a.parentElement);
      return !!el?.closest('.se-component.se-quotation');
    });
    if (!inQuote) break;
    const pos = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle)')]
        .filter((c) => !c.closest('.se-quotation'));
      const last = ps.pop()?.querySelector('.se-text-paragraph');
      if (!last) return null;
      last.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = last.getBoundingClientRect();
      return { x: r.left + 20, y: r.top + r.height / 2 };
    });
    if (!pos) { await page.keyboard.press('ArrowDown'); await wait(300); continue; }
    await page.mouse.click(pos.x, pos.y); await wait(400);
  }
  await wait(300);
}

// 툴바의 정렬 드롭다운 단추는 현재 정렬을 클래스로 드러낸다(se-align-center-toolbar-button).
// 그것을 읽어 원하는 정렬과 다를 때만 바꾼다. 변수로 기억하면 이미지·구분선 삽입 뒤 어긋난다.
const alignNow = (page) => page.evaluate(() => {
  const e = document.querySelector('.se-toolbar-item-align .se-property-toolbar-drop-down-button');
  return e ? (String(e.className).match(/se-align-(\w+)-toolbar-button/)?.[1] ?? null) : null;
});

// 🔴 정렬은 다음 단락으로 이어진다. 가운데 정렬한 뒤 되돌리지 않으면 본문 전체가 가운데로 간다.
async function setAlign(page, want) {
  if ((await alignNow(page)) === want) return;
  const label = want === 'center' ? '가운데 정렬' : '왼쪽 정렬';
  // 인용구·이미지 안에 캐럿이 있으면 글자 서식 툴바가 통째로 사라진다. 본문 단락으로 나온 뒤 잡는다.
  let t = null;
  for (let i = 0; i < 8 && !t; i++) {
    t = await page.evaluate(() => { const e = document.querySelector('.se-toolbar-item-align .se-property-toolbar-drop-down-button'); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (t) break;
    const moved = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle)')].filter((c) => !c.closest('.se-quotation'));
      const last = ps.pop()?.querySelector('.se-text-paragraph');
      if (!last) return false;
      last.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = last.getBoundingClientRect();
      const ev = { x: r.left + 20, y: r.top + r.height / 2 };
      window.__alignClick = ev;
      return true;
    });
    if (moved) {
      const p = await page.evaluate(() => window.__alignClick);
      await page.mouse.click(p.x, p.y);
    }
    await wait(500);
  }
  if (!t) throw new Error('정렬 단추를 찾지 못했다');
  await page.mouse.click(t.x, t.y); await wait(900);
  // 항목 글자는 「가운데 정렬선택됨」처럼 상태 라벨이 붙는다. 완전일치로 찾으면 빗나간다.
  const c = await page.evaluate((lab) => { const e = [...document.querySelectorAll('button')].find((x) => x.offsetParent && (x.textContent || '').trim().startsWith(lab)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, label);
  if (!c) throw new Error(`${label} 항목을 찾지 못했다`);
  await page.mouse.click(c.x, c.y); await wait(800);
  if ((await alignNow(page)) !== want) throw new Error(`${label}이 적용되지 않았다`);
}

// 굵게 구간을 지키며 한 줄을 친다.
async function typeSegments(page, line) {
  const parts = line.replace(/^\[c\]/, '').replace(/\[\/c\]$/, '').split('**');
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i], bold = i % 2 === 1;
    if (!seg) continue;
    if (bold) { await page.keyboard.down('Control'); await page.keyboard.press('KeyB'); await page.keyboard.up('Control'); await wait(150); }
    for (let j = 0; j < seg.length; j += 60) { await page.keyboard.type(seg.slice(j, j + 60), { delay: 12 }); await wait(120); }
    if (bold) { await page.keyboard.down('Control'); await page.keyboard.press('KeyB'); await page.keyboard.up('Control'); await wait(150); }
  }
}

// 지금 캐럿이 놓인 단락의 글자(마지막 본문 단락)
const lastPara = (page) => page.evaluate(() => {
  const ps = [...document.querySelectorAll('.se-component.se-text')].filter((c) => !c.classList.contains('se-documentTitle'))
    .flatMap((c) => [...c.querySelectorAll('.se-text-paragraph')]);
  return ps.length ? ps[ps.length - 1].textContent.replace(/​/g, '').trim() : null;
});

// 한 줄을 친다. 긴 줄은 나눠 치고, 결과가 다르면 지우고 다시 친다.
async function typeLine(page, line) {
  const before = (await bodyParas(page)).length;
  await setAlign(page, isCenter(line) ? 'center' : 'left');   // 치기 전에 정렬을 정한다
  for (let attempt = 0; attempt < 3; attempt++) {
    if (line) {
      await typeSegments(page, line);
      await wait(500);
      const got = await lastPara(page);
      if (got !== strip(line)) {                       // 누락·자동 분리가 났다. 그 단락을 비우고 다시 친다.
        if (attempt === 2) throw new Error(`줄 입력 실패: ${JSON.stringify((got ?? '').slice(0, 40))} ≠ ${JSON.stringify(strip(line).slice(0, 40))}`);
        const extra = (await bodyParas(page)).length - before;
        for (let k = 0; k < extra; k++) { for (let z = 0; z < 400; z++) { if ((await lastPara(page)) === '') break; await page.keyboard.press('Backspace'); await wait(15); } await page.keyboard.press('Backspace'); await wait(60); }
        for (let z = 0; z < 400 && (await lastPara(page)) !== ''; z++) { await page.keyboard.press('Backspace'); await wait(15); }
        continue;
      }
    }
    break;
  }
  await page.keyboard.press('Enter'); await wait(line.includes('http') ? 1800 : 300);
  for (let k = 0; k < 2 && (await bodyParas(page)).length <= before; k++) { await page.keyboard.press('Enter'); await wait(700); }
}

async function selectCategory(page, name) {
  const norm = (t) => t.replace(/하위 카테고리/g, '').trim();
  const opened = () => page.evaluate(() => [...document.querySelectorAll('[class*=option_category] li')].filter((e) => e.offsetParent).length > 0);
  if (!(await opened())) { await (await page.$('[class*=option_category] [class*=selectbox_button]')).click(); await wait(700); }
  if (!(await opened())) return false;
  const pos = await page.evaluate((n) => {
    const li = [...document.querySelectorAll('[class*=option_category] li')].find((e) => e.textContent.replace(/하위 카테고리/g, '').trim() === n);
    if (!li) return null; li.scrollIntoView({ block: 'center' });
    const el = li.querySelector('label') ?? li; const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, name);
  if (!pos) return false;
  await wait(300);
  const pos2 = await page.evaluate((n) => { const li = [...document.querySelectorAll('[class*=option_category] li')].find((e) => e.textContent.replace(/하위 카테고리/g, '').trim() === n); const r = (li.querySelector('label') ?? li).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);
  await page.mouse.click(pos2.x, pos2.y); await wait(600);
  const now = await page.evaluate(() => document.querySelector('[class*=option_category] [class*=selectbox_button]')?.textContent ?? '');
  return norm(now) === name;
}

// 발행 전 자체 점검. 하나라도 걸리면 그 글은 올리지 않는다.
async function preflight(d) {
  const bad = [];
  const body = d.body ?? '';
  if (!d.title || d.title.length < 8) bad.push('제목이 너무 짧다');
  if (d.title && d.title.length > 90) bad.push(`제목이 너무 길다(${d.title.length}자)`);
  if (!Array.isArray(d.tags) || d.tags.length < 3) bad.push('태그가 3개 미만');
  if (!d.category) bad.push('카테고리 없음');

  // 이미 블로그에 있는 인물인지
  if (d.kind === 'celeb') {
    const slug = d.target.split('/').pop();
    const dup = posts.find((p) => p.kind === 'celeb' && p.slug === slug && ['ok', 'manual'].includes(p.link));
    if (dup) bad.push(`이미 블로그에 있는 인물: ${dup.logNo} ${(dup.title ?? '').slice(0, 30)}`);
  }
  // 같은 대상으로 이미 올린 글
  if (posts.some((p) => p.url && p.url.endsWith(d.target) && p.link === 'ok')) bad.push('같은 대상 글이 이미 있다');

  // 우리 사이트 링크가 살아 있는지
  const links = [...new Set((body.match(/https:\/\/feelandnote\.com\/[^\s)\]]+/g) ?? []))];
  if (links.length === 0) bad.push('사이트 링크가 없다');
  for (const u of links.slice(0, 4)) {
    try { const r = await fetch(u, { method: 'HEAD', headers: { 'user-agent': 'Mozilla/5.0' } }); if (!r.ok) bad.push(`죽은 링크 ${r.status}: ${u.slice(-40)}`); }
    catch { bad.push(`링크 확인 실패: ${u.slice(-40)}`); }
  }
  // 이미지 표시 검사
  for (const ln of body.split('\n')) {
    const m = ln.trim().match(IMG_RE);
    if (!m) continue;
    if (!/^https?:\/\//.test(m[1])) bad.push('이미지 주소가 이상하다');
    const w = Number(m[2] ?? 0);
    if (w && (w < 80 || w > 700)) bad.push(`이미지 폭이 범위 밖(${w})`);
    const name = (m[3] ?? '').trim();
    if (!name) bad.push('이미지 이름이 없다(대체 텍스트가 임시 파일명이 된다)');
    else if (/^[a-z0-9\-_.]+$/i.test(name)) bad.push(`이미지 이름이 기계 이름이다: ${name}`);
  }
  // 서식 표시가 짝이 맞는지
  for (const ln of body.split('\n')) {
    if ((ln.match(/\*\*/g) ?? []).length % 2 !== 0) bad.push(`굵게 표시 짝이 안 맞는다: ${ln.slice(0, 30)}`);
    if (ln.includes('[c]') !== ln.includes('[/c]')) bad.push(`가운데 정렬 표시 짝이 안 맞는다: ${ln.slice(0, 30)}`);
  }
  return bad;
}

// 발행 패널에서 예약 시간을 설정한다. 날짜 칸은 readonly 라 jQuery 달력에서 고른다.
async function setSchedule(page, when) {
  const pos = await page.evaluate(() => { const l = [...document.querySelectorAll('[class*=option_time] label')].find((e) => e.textContent.trim() === '예약'); if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; });
  if (!pos) throw new Error('예약 라디오를 찾지 못했다');
  await page.mouse.click(pos.x, pos.y); await wait(900);

  const y = when.getFullYear(), mo = when.getMonth() + 1, day = when.getDate();
  const hh = String(when.getHours()).padStart(2, '0'), mm = String(when.getMinutes()).padStart(2, '0');
  const ymd = `${y}. ${String(mo).padStart(2, '0')}. ${String(day).padStart(2, '0')}`;

  await (await page.$('input[class*=input_date]')).click(); await wait(900);
  const header = () => page.evaluate(() => document.querySelector('.ui-datepicker-title, .ui-datepicker-header')?.textContent.match(/(\d{4})년\s*(\d{1,2})월/)?.slice(1, 3).map(Number) ?? null);
  for (let i = 0; i < 24; i++) {
    const h = await header(); if (!h) throw new Error('달력을 찾지 못했다');
    if (h[0] === y && h[1] === mo) break;
    const back = h[0] * 12 + h[1] > y * 12 + mo;
    const ok = await page.evaluate((prev) => { const b = [...document.querySelectorAll('.ui-datepicker a, .ui-datepicker button')].find((e) => (e.getAttribute('aria-label') || e.textContent).trim() === (prev ? '이전 달' : '다음 달')); if (!b) return false; b.click(); return true; }, back);
    if (!ok) throw new Error('달력 이동 단추를 찾지 못했다');
    await wait(500);
  }
  const picked = await page.evaluate((d) => {
    const cell = [...document.querySelectorAll('.ui-datepicker td')].find((td) => !td.classList.contains('ui-state-disabled') && td.textContent.trim() === String(d));
    const btn = cell?.querySelector('button, a') ?? cell;
    if (!btn) return false; btn.click(); return true;
  }, day);
  if (!picked) throw new Error(`달력에서 ${mo}/${day} 를 고르지 못했다(지난 날짜일 수 있다)`);
  await wait(700);

  await page.select('select[class*=hour_option]', hh); await wait(300);
  await page.select('select[class*=minute_option]', mm); await wait(300);
  const now = await page.evaluate(() => ({
    date: document.querySelector('input[class*=input_date]')?.value.trim(),
    h: document.querySelector('select[class*=hour_option]')?.value,
    m: document.querySelector('select[class*=minute_option]')?.value,
    pre: [...document.querySelectorAll('[class*=option_time] input[type=radio]')].find((r) => r.checked)?.value }));
  if (now.pre !== 'pre') throw new Error('예약이 선택되지 않았다');
  if (now.h !== hh || now.m !== mm) throw new Error(`시각 불일치 ${now.h}:${now.m} ≠ ${hh}:${mm}`);
  if (now.date.replace(/\s/g, '') !== ymd.replace(/\s/g, '')) throw new Error(`날짜 불일치 ${now.date} ≠ ${ymd}`);
  return `${now.date} ${hh}:${mm}`;
}

async function addTags(page, tags) {
  const input = await page.$('input[class*=tag_input]');
  await input.click(); await wait(200);
  for (const t of tags) { await page.keyboard.type(t.replace(/^#/, ''), { delay: 8 }); await page.keyboard.press('Enter'); await wait(250); }
  return page.evaluate(() => [...document.querySelectorAll('[class*=option_tag] [class*=tag]')].map((e) => e.textContent.trim()).filter((t) => t.startsWith('#')).length);
}

const { browser, launched } = await getBrowser({ protocolTimeout: 300000 });
const page = await getNaverPage(browser);
page.on('dialog', (d) => { d.accept().catch(() => {}); });
const cdp = await page.createCDPSession();
await cdp.send('DOM.enable'); await cdp.send('Page.enable');
cdp.on('Page.fileChooserOpened', (e) => { cdp.__chooser = e; });
await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
/**
 * 이미 올라간 글의 본문만 초안대로 다시 쓴다(`--rewrite <logNo…>`).
 *
 * 단락을 하나씩 손보다 감상이 사라지거나 두 번 들어가는 사고가 났다. 통째로 갈아 끼우면
 * 중복·유실·깨진 글자·낡은 이미지가 한 번에 정리된다. 제목·카테고리·예약 시각은 건드리지 않는다.
 */
const rewriteIds = args.includes('--rewrite') ? args.filter((a) => /^\d{9,}$/.test(a)) : [];
if (rewriteIds.length) {
  const cdpR = cdp;
  let ok = 0, fail = 0;
  for (const logNo of rewriteIds) {
    const d = drafts.find((x) => String(x.logNo) === String(logNo));
    if (!d) { console.log(`건너뜀 ${logNo} — 초안에 없다`); continue; }
    const slug = (d.target || '').replace('/celeb/', '');
    try {
      await ensureVisible(page);
      await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${logNo}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.se-component.se-text .se-text-paragraph', { timeout: 40000 });
      await wait(4500);

      // 본문을 통째로 비운다 — 제목 칸은 건드리지 않는다.
      await page.evaluate(() => {
        const first = [...document.querySelectorAll('.se-component.se-text')].find((c) => !c.classList.contains('se-documentTitle'));
        const p = first?.querySelector('.se-text-paragraph');
        if (!p) return;
        const r = document.createRange(); r.selectNodeContents(p); r.collapse(true);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      });
      await wait(400);
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await wait(400);
      // 전체 선택 뒤 지워도 마지막 단락에 글자가 남을 수 있다. 빈 줄만 남을 때까지 지운다.
      // 다 비우면 편집기가 자리표시 문구를 보여 준다. 그것은 글이 아니다.
      const PLACEHOLDER = /글감과 함께|나의 일상을 기록/;
      const realLines = async () => (await bodyParas(page)).filter((t) => t && !PLACEHOLDER.test(t));
      for (let z = 0; z < 400; z++) {
        if (!(await realLines()).length) break;
        await page.keyboard.press('Backspace'); await wait(60);
      }
      await wait(800);
      const leftover = await realLines();
      if (leftover.length) throw new Error(`본문이 비워지지 않았다(${leftover.length}줄 남음: ${leftover[0].slice(0, 30)})`);

      // 초안대로 다시 쓴다
      for (const ln of d.body.split('\n')) {
        if (isDivider(ln)) { await insertDivider(page); continue; }
      if (isQuote(ln)) { await insertQuote(page, strip(ln).trim()); continue; }
        if (isQuote(ln)) { await insertQuote(page, strip(ln).trim()); continue; }
        const im = ln.trim().match(IMG_RE);
        if (im) { await insertImage(page, cdpR, im[1], Number(im[2] ?? 400), im[3]); continue; }
        await typeLine(page, ln);
      }
      await wait(800);
      const got = (await bodyParas(page)).filter(Boolean);
      const want = d.body.split('\n').filter((l) => l && !isDivider(l) && !isImg(l)).map(strip);
      if (got.length !== want.length || !got.every((g, i) => g === want[i])) {
        throw new Error(`본문 불일치(${got.length} ≠ ${want.length})`);
      }

      await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
      const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(7000);
      const okPos = await page.evaluate(() => {
        const b = [...document.querySelectorAll('.se-popup button')].find((x) => x.textContent.trim() === '확인');
        if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (okPos) { await page.mouse.click(okPos.x, okPos.y); await wait(4000); }
      d.rewrittenAt = new Date().toISOString();
      saveAll();
      ok++;
      console.log(`OK ${slug} — 본문 다시 씀`);
    } catch (e) {
      fail++;
      console.log(`실패 ${slug}: ${String(e).split('\n')[0].slice(0, 180)}`);
    }
  }
  console.log(`\n다시 쓰기 완료 — 성공 ${ok} / 실패 ${fail}`);
  if (launched) await browser.close(); else browser.disconnect();
  process.exit(0);
}

let n = 0;
const pending = drafts.filter((d) => d.status === 'draft' || d.status === 'republish').filter((d) => !onlyTarget || d.target === onlyTarget);
const slotList = scheduling ? slots(Math.min(limit, pending.length)) : [];
if (scheduling) console.log('예약 슬롯:', slotList.map((x) => `${x.getMonth() + 1}/${x.getDate()}`).join(' '), atTime);

for (const d of drafts) {
  let schedText = '';
  if (n >= limit) break;
  if (d.status !== 'draft' && d.status !== 'republish') continue;
  if (onlyTarget && d.target !== onlyTarget) continue;
  try {
    const bad = await preflight(d);
    if (bad.length) { console.log('점검 실패', d.title.slice(0, 34)); for (const x of bad) console.log('   -', x); d.status = 'blocked'; d.blocked = bad; saveAll(); continue; }
    await ensureVisible(page);
    await page.goto('https://blog.naver.com/dmx777/postwrite', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.se-documentTitle .se-text-paragraph', { timeout: 30000 }); await wait(4000);
    await dismissResume(page);

    // 제목
    const t = await page.evaluate(() => { const r = document.querySelector('.se-documentTitle .se-text-paragraph').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
    await page.mouse.click(t.x, t.y); await wait(300);
    await typeTitle(page, d.title);

    // 본문
    const b = await page.evaluate(() => { const p = [...document.querySelectorAll('.se-component.se-text')].find((c) => !c.classList.contains('se-documentTitle')).querySelector('.se-text-paragraph'); const r = p.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
    await page.mouse.click(b.x, b.y); await wait(300);
    const lines = d.body.split('\n');
    for (const ln of lines) {
      if (isDivider(ln)) { await insertDivider(page); continue; }
      const im = ln.trim().match(IMG_RE);
      if (im) { await insertImage(page, cdp, im[1], Number(im[2] ?? 400), im[3]); continue; }
      await typeLine(page, ln);
    }
    await wait(800);
    const got = (await bodyParas(page)).filter(Boolean);
    const want = lines.filter((l) => l && !isDivider(l) && !isImg(l)).map(strip);
    const same = got.length === want.length && got.every((g, i) => g === want[i]);
    if (!same) throw new Error('본문 불일치: ' + JSON.stringify({ got: got.slice(0, 3).map((x) => x.slice(0, 40)), want: want.slice(0, 3).map((x) => x.slice(0, 40)), gl: got.length, wl: want.length }));

    // 발행 패널
    await (await page.$('button[class*=publish_btn]')).click(); await wait(1500);
    if (!(await selectCategory(page, d.category))) throw new Error('카테고리 선택 실패: ' + d.category);
    const tagCount = await addTags(page, d.tags);
    if (scheduling) { const when = slotList[n]; if (!when) throw new Error('예약 슬롯 부족'); schedText = await setSchedule(page, when); }
    const searchOn = await page.evaluate(() => document.querySelector('#publish-option-search')?.checked);
    const isPublic = await page.evaluate(() => [...document.querySelectorAll('[class*=option_open_type] input[type=radio]')].findIndex((r) => r.checked) === 0);
    if (!searchOn || !isPublic) throw new Error(`발행 설정 이상 search=${searchOn} public=${isPublic}`);

    if (dry) {
      await page.screenshot({ path: `${SC}/nb-newpost-dry.png` });
      console.log('DRY-OK', d.title, '| 카테고리', d.category, '| 태그', tagCount, '| 단락', got.length, schedText ? '| 예약 ' + schedText : '');
      break;
    }
    const cb = await page.$('button[class*=confirm_btn]'); const box = await cb.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await wait(7000);
    const url = page.url();
    const logNo = url.match(/logNo=(\d+)/)?.[1];
    if (!logNo) throw new Error('발행 후 URL 이상: ' + url);
    const html = await (await fetch(`https://blog.naver.com/PostView.naver?blogId=dmx777&logNo=${logNo}`, UA)).text();
    const live = html.includes(`feelandnote.com${d.target}`);
    d.status = live ? 'published' : 'check'; d.logNo = logNo; d.publishedAt = new Date().toISOString();
    // 예약 시각을 남긴다. 한 번 잡힌 예약은 편집으로 못 바꾸므로, 다음 글의 빈 슬롯을 이 기록으로 고른다.
    posts.push({ logNo, date: new Date().toISOString().slice(0, 10).replace(/-/g, '. ') + '.', title: d.title, kind: d.kind, slug: null, url: 'https://feelandnote.com' + d.target, link: live ? 'ok' : 'check', ...(schedText ? { scheduledAt: schedText } : {}) });
    saveAll();
    console.log(live ? 'OK   ' : 'CHECK', logNo, d.title, schedText ? '| 예약 ' + schedText : '');
    n++; await wait(10000);
  } catch (e) {
    console.log('실패', d.title, String(e).split(String.fromCharCode(10))[0].slice(0, 160));
    d.status = 'error'; d.error = String(e).slice(0, 200); saveAll();
    break; // 새 글 발행은 한 건이라도 실패하면 멈추고 사람이 본다
  }
}
await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
if (launched) await browser.close(); else browser.disconnect();   // 사용자 창은 끄지 않는다
