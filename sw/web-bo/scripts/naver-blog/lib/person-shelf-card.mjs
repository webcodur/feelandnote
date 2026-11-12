// 인물 글의 고유 이미지 「책장 카드」: 서비스와 같은 어두운 면·금색 포인트로 인물 사진, 감상 권수, 표지 진열, 국내판 비율을 한 장에 담는다.
// 서비스 DB 값만 쓰고 생성 모델을 부르지 않는다. 렌더는 로컬 브라우저 스크린샷이다.
import fs from 'node:fs';import path from 'node:path';

export const PERSON_SHELF_CARD = Object.freeze({
  width: 1080, height: 1350, maxCovers: 7,
  // sw/web/src/app/globals.css 의 서비스 색.
  colors: Object.freeze({ bg: '#121110', ink: '#e8e6e1', muted: '#aaa7a0', gold: '#d4af37', goldBright: '#f9d76e', goldDim: '#8a732a' }),
});
const WORDMARK = path.resolve(import.meta.dirname, '../../../../web/public/brand/feelnote-wordmark-v4.png');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 가운데가 첫 책, 이후 오른쪽·왼쪽을 번갈아 펼친다.
function coverflow(covers) {
  return covers.map((cover, i) => {
    const step = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? 1 : -1;
    const x = side * (150 + (step - 1) * 120), angle = -side * 38, scale = 1 - step * 0.1, z = 10 - step;
    return `<div class="cover" style="transform:translateX(${x}px) rotateY(${angle}deg) scale(${scale.toFixed(2)});z-index:${z};filter:brightness(${(1 - step * 0.12).toFixed(2)})"><img src="${escape(cover.url)}" alt=""></div>`;
  }).join('');
}

// card: {name, title, portraitUrl, avatarUrl, serviceUrl, total, available, unavailable, covers:[{url,title}]}
export function personShelfCardHtml(card) {
  if (!card?.name || !(card.portraitUrl || card.avatarUrl) || !Number.isInteger(card.total) || card.total < 1) throw Error('Shelf card person and total required');
  if (card.available + card.unavailable !== card.total) throw Error('Shelf card split differs from total');
  const { width, height, maxCovers, colors: c } = PERSON_SHELF_CARD;
  const covers = card.covers.slice(0, maxCovers);
  const wordmark = 'data:image/png;base64,' + fs.readFileSync(WORDMARK).toString('base64');
  return `<!doctype html><html lang="ko"><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;overflow:hidden;position:relative;background:${c.bg};font-family:Pretendard,"Malgun Gothic",sans-serif;color:${c.ink}}
.hero{position:absolute;inset:0 0 auto 0;height:820px;background:url("${escape(card.portraitUrl || card.avatarUrl)}") center 22%/cover no-repeat;-webkit-mask-image:linear-gradient(to bottom,#000 38%,transparent 100%)}
.shade{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,transparent 40%,${c.bg} 100%),linear-gradient(to bottom,rgba(18,17,16,.35),transparent 30%)}
.glow{position:absolute;left:50%;top:930px;width:900px;height:420px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(212,175,55,.18),transparent)}
.brand{position:absolute;left:64px;top:56px;width:320px;height:37px;overflow:hidden}
.brand img{position:absolute;width:422px;left:-55px;top:-85px}
.tag{position:absolute;right:64px;top:58px;font-size:22px;letter-spacing:.32em;color:${c.gold};font-weight:600}
.who{position:absolute;left:64px;right:64px;top:470px}
.title{font-size:30px;color:${c.gold};font-weight:600;letter-spacing:.04em}
.name{font-size:104px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:10px;text-shadow:0 4px 30px rgba(0,0,0,.6)}
.count{margin-top:22px;display:flex;align-items:baseline;gap:14px;font-size:32px;color:${c.muted}}
.count b{font-size:64px;font-weight:800;color:${c.goldBright};letter-spacing:-.02em}
.rule{position:absolute;left:64px;right:64px;top:800px;height:1px;background:linear-gradient(90deg,transparent,${c.goldDim},transparent)}
.stage{position:absolute;left:0;right:0;top:850px;height:330px;perspective:1500px;display:flex;justify-content:center}
.cover{position:absolute;width:200px;height:300px;border-radius:4px;box-shadow:0 22px 40px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.06);-webkit-box-reflect:below 6px linear-gradient(transparent 72%,rgba(255,255,255,.16))}
.cover img{width:100%;height:100%;object-fit:cover;border-radius:4px;display:block;background:#2c2a26}
.foot{position:absolute;left:64px;right:64px;bottom:58px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.pills{display:flex;gap:12px;flex-wrap:wrap}
.pill{border:1.5px solid ${c.goldDim};border-radius:999px;padding:10px 22px;font-size:24px;color:${c.ink};background:rgba(212,175,55,.06)}
.pill b{color:${c.goldBright};font-weight:700;margin-left:6px}
.url{font-size:23px;color:${c.muted};white-space:nowrap}.url b{color:${c.gold};font-weight:600}
</style>
<body>
<div class="hero"></div><div class="shade"></div><div class="glow"></div>
<div class="brand"><img src="${wordmark}" alt=""></div><div class="tag">READING SHELF</div>
<div class="who">${card.title ? `<div class="title">${escape(card.title)}</div>` : ''}<div class="name">${escape(card.name)}</div>
<div class="count">감상한 책<b>${card.total}</b>권</div></div>
<div class="rule"></div>
<div class="stage">${coverflow(covers)}</div>
<div class="foot"><div class="pills"><span class="pill">국내판<b>${card.available}</b></span>${card.unavailable ? `<span class="pill">미번역·절판<b>${card.unavailable}</b></span>` : ''}</div>
<div class="url">feelandnote.com <b>전체 책장 보기 →</b></div></div>
</body></html>`;
}

// page: puppeteer page. 모든 이미지와 글꼴을 기다린 뒤 PNG를 쓴다.
export async function renderPersonShelfCard(page, card, file) {
  const { width, height } = PERSON_SHELF_CARD;
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(personShelfCardHtml(card), { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => [...document.images].every(i => i.complete), { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.$$eval('img', imgs => imgs.filter(i => !i.naturalWidth).map(i => i.src.slice(0, 80)));
  const hero = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = src; }), card.portraitUrl || card.avatarUrl);
  if (broken.length || !hero) throw Error('Shelf card image failed: ' + [...broken, hero ? '' : 'portrait'].join(', '));
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
}
