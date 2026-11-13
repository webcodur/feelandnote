// 사용: node --env-file=.env scripts/naver-blog/portrait-board.mjs [--bodies] [--all] [--ids=logNo,...] (sw/web-bo에서)
// 네이버 블로그 인물 글의 대표 사진(celebs.portrait_url)을 한 장에 모아 blog-assets(D:)/naver-blog/portraits.html로 쓴다. 카드를 누르면 본문 사본을 옆에 띄운다.
// --bodies: 본문 사본(naver-blog/bodies/<logNo>.html)이 없거나 원장 기록이 사본보다 새 글만 다시 받는다. 공개 글은 모바일 화면, 예약 글은 편집기에서 읽기만 하고 저장하지 않는다.
// 원장(posts.json)과 DB는 읽기만 한다. 예약 여부는 원장의 scheduledAt이 실행 시각 이후인지로 판정한다.
import { createClient } from '@feelandnote/db';
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { celebSlug } from './lib/roster-data.mjs';

const BLOG = 'https://blog.naver.com/dmx777/', args = process.argv.slice(2);
const dir = path.join(ASSETS, 'naver-blog'), ledger = path.join(dir, 'posts.json'), out = path.join(dir, 'portraits.html'), bodyDir = path.join(dir, 'bodies'), bodyIndex = path.join(bodyDir, 'index.json');
const live = p => p.kind === 'celeb' && !p.deletedAt && !p.mergedInto && !['deleted', 'private', 'replaced', 'skip'].includes(p.link) && !/^\[삭제\]/.test(p.title);
const when = s => { const m = String(s ?? '').match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{2}:\d{2})?/); return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? '00:00'}` : ''; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const touched = p => (JSON.stringify(p).match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g) ?? []).sort().at(-1) ?? '';

const now = new Date(), stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${now.toTimeString().slice(0, 5)}`;
const posts = JSON.parse(fs.readFileSync(ledger, 'utf8')).filter(live).map(p => ({ ...p, slug: celebSlug(p.slug) || celebSlug(p.url), at: when(p.scheduledAt) || when(p.date) }));
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY);
const slugs = [...new Set(posts.map(p => p.slug).filter(Boolean))], people = new Map();
for (let i = 0; i < slugs.length; i += 100) {
  const { data, error } = await db.from('celebs').select('slug,nickname,portrait_url').in('slug', slugs.slice(i, i + 100));
  if (error) throw error;
  for (const c of data) people.set(c.slug, c);
}
const rows = posts.map(p => ({ ...p, person: people.get(p.slug), scheduled: !!p.scheduledAt && when(p.scheduledAt) > stamp }))
  .sort((a, b) => a.scheduled !== b.scheduled ? (a.scheduled ? -1 : 1) : a.scheduled ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at));

fs.mkdirSync(bodyDir, { recursive: true });
const index = fs.existsSync(bodyIndex) ? JSON.parse(fs.readFileSync(bodyIndex, 'utf8')) : {};
if (args.includes('--bodies')) await captureBodies();

// 편집기와 공개 화면이 같은 SmartEditor 구성요소를 쓰므로 한 추출기로 읽는다. 글자 크기·굵기·회색·정렬만 옮긴다.
function extract() {
  const z = s => s.replace(/​/g, ''), e = s => z(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const inline = node => [...node.childNodes].map(n => {
    if (n.nodeType === 3) return e(n.textContent);
    if (n.nodeType !== 1) return '';
    const inner = inline(n), cs = getComputedStyle(n);
    if (n.tagName === 'A' && n.href) return `<a href="${e(n.href)}" target="_blank" rel="noopener">${inner}</a>`;
    if (n.tagName === 'BR') return '<br>';
    return Number(cs.fontWeight) >= 600 && !n.querySelector('*') ? `<b>${inner}</b>` : inner;
  }).join('');
  const para = (p, tag = 'p') => {
    const span = [...p.querySelectorAll('span')].find(s => z(s.textContent).trim()) ?? p, cs = getComputedStyle(span), html = inline(p).trim();
    if (!html) return '';
    const gray = cs.color === 'rgb(170, 170, 170)' || cs.color === 'rgb(153, 153, 153)';
    return `<${tag} style="font-size:${parseFloat(cs.fontSize)}px;text-align:${getComputedStyle(p).textAlign}${gray ? ';color:var(--mute)' : ''}">${html}</${tag}>`;
  };
  const out = [];
  for (const c of document.querySelectorAll('.se-component:not(.se-documentTitle)')) {
    if (c.parentElement.closest('.se-component')) continue;
    const k = c.classList;
    if (k.contains('se-horizontalLine')) out.push('<hr>');
    else if (k.contains('se-image') || k.contains('se-imageStrip') || k.contains('se-imageGroup')) for (const img of c.querySelectorAll('img')) { const src = img.getAttribute('data-lazy-src') || img.currentSrc || img.src; if (/^https?:/.test(src)) out.push(`<figure><img loading="lazy" src="${e(src)}" alt=""></figure>`); }
    else if (k.contains('se-table')) out.push('<table>' + [...c.querySelectorAll('tr')].map(r => '<tr>' + [...r.querySelectorAll('td,th')].map(td => { const s = td.querySelector('span'), gray = s && getComputedStyle(s).color === 'rgb(170, 170, 170)'; return `<td${gray ? ' class="m"' : ''}>${[...td.querySelectorAll('.se-text-paragraph')].map(p => inline(p).trim()).filter(Boolean).join('<br>')}</td>`; }).join('') + '</tr>').join('') + '</table>');
    else if (k.contains('se-quotation')) out.push('<blockquote>' + [...c.querySelectorAll('.se-text-paragraph')].map(p => para(p)).join('') + '</blockquote>');
    else if (k.contains('se-oglink')) { const a = c.querySelector('a'), t = c.querySelector('.se-oglink-title')?.textContent; if (a) out.push(`<p><a href="${e(a.href)}" target="_blank" rel="noopener">${e(t || a.href)}</a></p>`); }
    else out.push(...[...c.querySelectorAll('.se-text-paragraph')].map(p => para(p)));
  }
  return out.filter(Boolean).join('\n');
}

async function captureBodies() {
  const only = args.find(a => a.startsWith('--ids='))?.slice(6).split(',');
  const targets = rows.filter(r => only ? only.includes(String(r.logNo)) : args.includes('--all') || !index[r.logNo] || !fs.existsSync(path.join(bodyDir, `${r.logNo}.html`)) || touched(r) > index[r.logNo].capturedAt);
  console.log(JSON.stringify({ event: 'bodies', targets: targets.length }));
  if (!targets.length) return;
  const { getBrowser } = await import('./lib/browser.mjs'), { openRegistryTarget, isFutureReservation } = await import('./lib/open-registry-target.mjs');
  const { browser, launched } = await getBrowser({ background: true, protocolTimeout: 120000 });
  let page;
  const fresh = async () => { await page?.close().catch(() => {}); page = await browser.newPage(); page.on('dialog', d => d.accept().catch(() => {})); await page.setViewport({ width: 900, height: 1200 }); };
  try {
    await fresh();
    for (const r of targets) {
      try {
        const reserved = isFutureReservation(r);
        if (reserved) await openRegistryTarget(page, r);
        else { await page.goto(`https://m.blog.naver.com/dmx777/${r.logNo}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForSelector('.se-main-container', { timeout: 20000 }); }
        const body = await page.evaluate(extract);
        if (body.length < 200) throw Error('본문이 비었다');
        const capturedAt = new Date().toISOString();
        fs.writeFileSync(path.join(bodyDir, `${r.logNo}.html`), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title><style>
:root{--bg:#fff;--fg:#222;--mute:#999;--line:#e5e5e5}@media (prefers-color-scheme:dark){:root{--bg:#1b1b1a;--fg:#e8e7e4;--mute:#8d8a84;--line:#353330}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.75 system-ui,'Malgun Gothic',sans-serif}main{max-width:680px;margin:0 auto;padding:16px}
h1{font-size:20px;line-height:1.4}header small{color:var(--mute)}p{margin:0 0 .4em;min-height:.5em}figure{margin:12px 0}img{max-width:100%;height:auto;display:block;margin:0 auto}
hr{border:0;border-top:1px solid var(--line);margin:24px 0}blockquote{margin:12px 0;padding:8px 16px;border-left:3px solid var(--line)}
table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}td{border:1px solid var(--line);padding:4px 6px;vertical-align:top}td.m{color:var(--mute)}a{color:inherit}
</style></head><body><main><header><h1>${esc(r.title)}</h1><small>${reserved ? '예약 ' + esc(r.at.replace('T', ' ')) + ' · 편집기 사본' : '공개 글 사본'} · ${esc(capturedAt.slice(0, 16).replace('T', ' '))} UTC 수집 · <a href="${BLOG}${esc(r.logNo)}" target="_blank" rel="noopener">블로그에서 열기</a></small></header>
${body}
</main></body></html>\n`);
        index[r.logNo] = { capturedAt, reserved };
        fs.writeFileSync(bodyIndex, JSON.stringify(index, null, 1));
        console.log(JSON.stringify({ event: 'body', logNo: r.logNo, reserved, chars: body.length }));
      } catch (error) {
        console.log(JSON.stringify({ event: 'body-failed', logNo: r.logNo, error: String(error.message ?? error).slice(0, 200) }));
        await fresh();
      }
      await page.goto('about:blank').catch(() => {});
    }
  } finally { await page?.close().catch(() => {}); if (launched) await browser.close(); }
}

const card = r => `<a class="card" data-s="${r.scheduled ? 1 : 0}" data-id="${esc(r.logNo)}" href="${index[r.logNo] ? `bodies/${esc(r.logNo)}.html` : BLOG + esc(r.logNo)}" target="${index[r.logNo] ? 'reader' : '_blank'}" title="${esc(r.title)}">
<div class="ph">${r.person?.portrait_url ? `<img loading="lazy" src="${esc(r.person.portrait_url)}" alt="${esc(r.person.nickname)}">` : '<span>사진 없음</span>'}</div>
<b>${esc(r.person?.nickname ?? r.name ?? r.slug ?? r.logNo)}</b><small>${r.scheduled ? '예약 ' : ''}${esc(r.at.replace('T', ' ').replace(/ 00:00$/, ''))}${index[r.logNo] ? '' : ' · 본문 없음'}</small></a>`;
const nSched = rows.filter(r => r.scheduled).length, missing = rows.filter(r => !r.person?.portrait_url).length, noBody = rows.filter(r => !index[r.logNo]).length;

fs.writeFileSync(out, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 인물 사진</title><style>
:root{--bg:#f6f5f2;--fg:#1d1c1a;--mute:#6b6862;--card:#fff;--line:#e3e0da;--acc:#2f6b4f}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ecebe8;--mute:#9a978f;--card:#222120;--line:#33312e;--acc:#7cc4a0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,'Malgun Gothic',sans-serif}
header{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--line)}
h1{font-size:16px;margin:0 8px 0 0}header small{color:var(--mute);margin-left:auto}
button{font:inherit;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);cursor:pointer}
button:hover{border-color:var(--acc)}button[aria-pressed=true]{background:var(--acc);border-color:var(--acc);color:var(--bg)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:16px}
.card{display:flex;flex-direction:column;gap:2px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:8px;color:inherit;text-decoration:none}
.card:hover{border-color:var(--acc);transform:translateY(-1px)}.card.on{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc)}
.ph{aspect-ratio:3/4;display:grid;place-items:center;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:4px}
.ph img{width:100%;height:100%;object-fit:cover}.ph span{color:var(--mute)}
small{color:var(--mute)}body[data-f=s] .card[data-s="0"]{display:none}
aside{position:fixed;top:0;right:0;bottom:0;width:min(720px,100%);z-index:3;background:var(--card);border-left:1px solid var(--line);box-shadow:-8px 0 24px #0003;display:none;flex-direction:column}
body.open aside{display:flex}body.open main{margin-right:min(720px,100%)}
aside nav{display:flex;justify-content:flex-end;padding:8px;border-bottom:1px solid var(--line)}aside iframe{flex:1;border:0;width:100%;background:var(--card)}
@media (max-width:900px){body.open main{margin-right:0}}
</style></head><body data-f="s"><header><h1>블로그 인물 사진</h1>
<button aria-pressed="true" data-f="s">예약 ${nSched}</button><button aria-pressed="false" data-f="a">전체 ${rows.length}</button>
<small>${esc(stamp.replace('T', ' '))} 생성${missing ? ` · 사진 없음 ${missing}` : ''}${noBody ? ` · 본문 없음 ${noBody}` : ''}</small></header>
<main>${rows.map(card).join('\n')}</main>
<aside><nav><button id="close">닫기</button></nav><iframe name="reader" title="본문"></iframe></aside>
<script>
for(const b of document.querySelectorAll('header button'))b.onclick=()=>{document.body.dataset.f=b.dataset.f;for(const x of document.querySelectorAll('header button'))x.setAttribute('aria-pressed',x===b)};
for(const c of document.querySelectorAll('.card'))c.addEventListener('click',()=>{if(!c.getAttribute('href').startsWith('bodies/'))return;document.body.classList.add('open');for(const x of document.querySelectorAll('.card.on'))x.classList.remove('on');c.classList.add('on')});
document.getElementById('close').onclick=()=>{document.body.classList.remove('open');for(const x of document.querySelectorAll('.card.on'))x.classList.remove('on')};
addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('close').click()});
</script>
</body></html>\n`);
console.log(JSON.stringify({ out, posts: rows.length, scheduled: nSched, missingPortrait: missing, missingBody: noBody }));
