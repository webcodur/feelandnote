// 사용: node --env-file=.env scripts/naver-blog/portrait-board.mjs [--bodies] [--all] [--ids=logNo,...] (sw/web-bo에서)
// 발행 허브의 블로그 판(blog-assets(D:)/naver-blog/portraits.html)을 만든다. 두 모드다: 「블로그 편성」(발행 달력·후보군 — lib/board-plan.mjs, 끌어서 순서 조정 뒤 파일 저장)과 「블로그 글」(인물·기관 글 카드, 누르면 본문 사본).
// 모드 막대와 모양은 lib/hub-shell.mjs를 외부 채널 입구(D:/feelandnote/outreach/tools/build-hub.mjs)와 함께 쓴다.
// --bodies: 본문 사본(naver-blog/bodies/<logNo>.html)이 없거나 원장 기록이 사본보다 새 글만 다시 받는다. 공개 글은 모바일 화면, 예약 글은 편집기에서 읽기만 하고 저장하지 않는다.
// 원장(posts.json)과 DB는 읽기만 한다. 예약 여부는 원장의 scheduledAt이 실행 시각 이후인지로 판정한다.
import { createClient } from '@feelandnote/db';
import fs from 'node:fs';
import path from 'node:path';
import { ASSETS } from '../blog-assets.mjs';
import { celebSlug } from './lib/roster-data.mjs';
import { hubBar, HUB_CSS, HUB_JS } from './lib/hub-shell.mjs';
import { PLAN_CSS, PLAN_JS, PLAN_FILES, planHtml } from './lib/board-plan.mjs';
import { pathToFileURL } from 'node:url';

const BLOG = 'https://blog.naver.com/dmx777/', args = process.argv.slice(2);
const dir = path.join(ASSETS, 'naver-blog'), ledger = path.join(dir, 'posts.json'), out = path.join(dir, 'portraits.html'), bodyDir = path.join(dir, 'bodies'), bodyIndex = path.join(bodyDir, 'index.json');
const live = p => ['celeb', 'curated'].includes(p.kind) && !p.deletedAt && !p.mergedInto && !['deleted', 'private', 'replaced', 'skip'].includes(p.link) && !/^\[삭제\]/.test(p.title);
const when = s => { const m = String(s ?? '').match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?\s*(\d{2}:\d{2})?/); return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? '00:00'}` : ''; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const touched = p => (JSON.stringify(p).match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g) ?? []).sort().at(-1) ?? '';

const now = new Date(), stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${now.toTimeString().slice(0, 5)}`;
const posts = JSON.parse(fs.readFileSync(ledger, 'utf8')).filter(live).map(p => ({ ...p, slug: p.kind === 'celeb' ? celebSlug(p.slug) || celebSlug(p.url) : null, curator: p.kind === 'curated' ? (p.url ?? '').match(/curated\/([^/]+)\//)?.[1] ?? null : null, at: when(p.scheduledAt) || when(p.date) }));
// 예약 대기열(naver-blog/publish-queue.txt, 한 줄에 「slug YYYY-MM-DD HH:MM」): 예약 100편 한도로 아직 블로그에 넣지 못한 글을 정한 칸 날짜에 「대기」로 끼워 보인다.
const queueFile = path.join(dir, 'publish-queue.txt'), candFile = path.join(dir, 'publish-candidates.txt'), demoteFile = path.join(dir, 'publish-demote.txt'), posted = new Set(posts.map(p => p.slug).filter(Boolean));
const lines = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split(/\r?\n/);
// 후보군(publish-candidates.txt): 묶음 설명(# 줄)과 slug 줄을 순서대로 읽는다. 이미 블로그에 있는 인물은 뺀다.
const candidates = lines(candFile).map(l => l.trim()).map(l => !l || l.startsWith('#') ? { c: l } : { slug: l.split(/\s+/)[0] }).filter(x => x.c !== undefined || !posted.has(x.slug));
const demoted = lines(demoteFile).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)[0]);
const pending = (fs.existsSync(queueFile) ? fs.readFileSync(queueFile, 'utf8') : '').split(/\r?\n/).map(l => l.trim().match(/^(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/)).filter(m => m && !posted.has(m[1])).map(m => ({ slug: m[1], at: `${m[2]}T${m[3]}`, pending: true }));
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY);
const slugs = [...new Set([...posts, ...pending, ...candidates].map(p => p.slug).filter(Boolean))], people = new Map();
for (let i = 0; i < slugs.length; i += 100) {
  const { data, error } = await db.from('celebs').select('slug,nickname,portrait_url,title,reading_way').in('slug', slugs.slice(i, i + 100));
  if (error) throw error;
  for (const c of data) people.set(c.slug, c);
}
// 기관 글은 기관 로고와 목록 이름으로 보인다.
const curatorSlugs = [...new Set(posts.map(p => p.curator).filter(Boolean))], curators = new Map();
for (let i = 0; i < curatorSlugs.length; i += 100) {
  const { data, error } = await db.from('curators').select('slug,name,logo_url').in('slug', curatorSlugs.slice(i, i + 100));
  if (error) throw error;
  for (const c of data) curators.set(c.slug, c);
}
const absLogo = u => !u ? null : /^https?:/.test(u) ? u : 'https://feelandnote.com' + u;
const face = p => p.kind === 'curated' ? { nickname: (p.title.match(/^\[[^\]]+\]\s*([^|/]+)/)?.[1] ?? p.title).trim(), portrait_url: absLogo(curators.get(p.curator)?.logo_url) } : people.get(p.slug);
const rows = [...posts.map(p => ({ ...p, person: face(p), scheduled: !!p.scheduledAt && when(p.scheduledAt) > stamp })), ...pending.map(p => ({ ...p, person: people.get(p.slug), scheduled: true }))]
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
  const targets = rows.filter(r => !r.pending).filter(r => only ? only.includes(String(r.logNo)) : args.includes('--all') || !index[r.logNo] || !fs.existsSync(path.join(bodyDir, `${r.logNo}.html`)) || touched(r) > index[r.logNo].capturedAt);
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

// ── 화면: 발행 허브의 「블로그 편성」「블로그 글」 두 모드 ──
const kindTag = r => r.kind === 'curated' ? '<i class="k k-c">기관</i>' : '';
const photo = r => r.person?.portrait_url ? `<img loading="lazy" src="${esc(r.person.portrait_url)}" alt="">` : '<span>사진 없음</span>';
const card = r => r.pending ? `<a class="item card wait" data-open="ext" data-s="1" href="https://feelandnote.com/celeb/${esc(r.slug)}" target="_blank" title="예약 대기(블로그에 아직 없음)">
<div class="ph">${photo(r)}</div>
<b>${esc(r.person?.nickname ?? r.slug)}</b><small>대기 ${esc(r.at.replace('T', ' '))}</small></a>` : `<a class="item card${r.kind === 'curated' ? ' cur' : ''}" data-open="${index[r.logNo] ? 'panel' : 'ext'}" data-s="${r.scheduled ? 1 : 0}" data-k="${r.kind}" data-id="${esc(r.logNo)}" href="${index[r.logNo] ? `bodies/${esc(r.logNo)}.html` : BLOG + esc(r.logNo)}" target="${index[r.logNo] ? 'reader' : '_blank'}" title="${esc(r.title)}">
<div class="ph">${photo(r)}</div>
<b>${kindTag(r)}${esc(r.person?.nickname ?? r.name ?? r.slug ?? r.logNo)}</b><small>${r.scheduled ? '예약 ' : ''}${esc(r.at.replace('T', ' ').replace(/ 00:00$/, ''))}${index[r.logNo] ? '' : ' · 본문 없음'}</small></a>`;
const reserved = rows.filter(r => r.scheduled && !r.pending);
const nSched = reserved.length, nWait = pending.length, missing = rows.filter(r => !r.person?.portrait_url).length, noBody = rows.filter(r => !r.pending && !index[r.logNo]).length;
// 편성 화면 자료: 예약 · 대기(글마다 시각) · 후보군(묶음 설명 줄 포함) · 아직 네이버에 반영되지 않은 시각 변경(publish-reschedule.txt)
const queueHead = lines(queueFile).filter(l => l.trim().startsWith('#'));
const names = Object.fromEntries([...people.values()].map(c => [c.slug, { n: c.nickname, i: c.portrait_url, t: c.title ?? '', w: c.reading_way?.trim() ? 1 : 0 }]));
const moves = Object.fromEntries(lines(path.join(dir, PLAN_FILES.reschedule)).map(l => l.trim().match(/^(\d+)\s+(now|\d{4}-\d{2}-\d{2} \d{2}:\d{2})\b/)).filter(Boolean).map(m => [m[1], m[2] === 'now' ? 'now' : m[2].replace(' ', 'T')]));
const plan = {
  cap: 100, blog: BLOG, files: PLAN_FILES, stamp,
  reserved: reserved.map(r => ({ id: String(r.logNo), slug: r.slug, kind: r.kind, n: r.person?.nickname ?? r.slug ?? r.title, i: r.person?.portrait_url ?? null, at: r.at, body: !!index[r.logNo] })),
  queue: pending.map(p => ({ slug: p.slug, at: p.at })), queueHead,
  candidates: candidates.map(x => x.c !== undefined ? { c: x.c } : { slug: x.slug }),
  demoted, names, moves,
};
const hubHref = path.relative(dir, path.join(ASSETS, '..', 'outreach', 'index.html')).split(path.sep).map(encodeURIComponent).join('/');

fs.writeFileSync(out, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>블로그 · 필앤노트 발행 허브</title><style>${HUB_CSS}
/* 블로그 글 */
.filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}
.filters button,.bar button{font:inherit;font-size:14px;padding:5px 13px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);cursor:pointer}
.filters button:hover,.bar button:hover{border-color:var(--accent)}.filters button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--page);font-weight:700}
#cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.card{gap:2px;padding:8px}.ph{aspect-ratio:3/4;display:grid;place-items:center;background:var(--line);border-radius:6px;overflow:hidden;margin-bottom:4px}
.ph img{width:100%;height:100%;object-fit:cover;margin:0;border-radius:0}.card.cur .ph{aspect-ratio:1/1}.card.cur .ph img{object-fit:contain;background:#fff}
#posts[data-f=s] .card[data-s="0"],#posts[data-f=c] .card:not([data-k=curated]),#posts[data-f=p] .card[data-k=curated]{display:none}
.card.wait{border-style:dashed}.card.wait .ph{opacity:.6}.card.wait small{color:var(--ok)}
i.k{font-style:normal;font-size:11px;font-weight:700;padding:0 6px;border-radius:4px;margin-right:4px;vertical-align:1px}i.k-c{background:var(--ok);color:var(--page)}
aside{position:fixed;top:0;right:0;bottom:0;width:min(720px,100%);z-index:6;background:var(--card);border-left:1px solid var(--line);box-shadow:-8px 0 24px #0003;display:none;flex-direction:column}
body.open aside{display:flex}body.open main.hub{margin-right:min(720px,100%)}
aside nav{display:flex;justify-content:flex-end;padding:8px;border-bottom:1px solid var(--line)}aside nav button{font:inherit;padding:5px 13px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);cursor:pointer}aside nav button:hover{border-color:var(--accent)}
aside iframe{flex:1;border:0;width:100%;background:var(--card)}
@media (max-width:900px){body.open main.hub{margin-right:0}}
/* 블로그 편성 */
i.k-q{background:var(--line);color:var(--ink)}${PLAN_CSS}
</style></head><body>
${hubBar({ page: 'board', hrefs: { hub: hubHref }, stamp: stamp.replace('T', ' ') + ' 생성' })}
<main class="hub">
${planHtml(plan.cap)}
<section class="panel" id="posts" data-f="s"><h2>블로그 글</h2>
<p class="note">카드의 배지가 누르면 열리는 곳이다. 「본문 ▸」은 오른쪽 칸에 본문 사본을, 「새 창 ↗」은 블로그나 서비스 화면을 연다.${missing ? ` 사진 없음 ${missing}편.` : ''}${noBody ? ` 본문 사본 없음 ${noBody}편.` : ''}</p>
<div class="filters"><button aria-pressed="true" data-f="s">예약 ${nSched}${nWait ? ` · 대기 ${nWait}` : ''}</button><button aria-pressed="false" data-f="p">인물 ${rows.filter(r => r.kind !== 'curated').length}</button><button aria-pressed="false" data-f="c">기관 ${rows.filter(r => r.kind === 'curated').length}</button><button aria-pressed="false" data-f="a">전체 ${rows.length}</button></div>
<div id="cards">${rows.map(card).join('\n')}</div></section>
</main>
<aside><nav><button id="close">닫기</button></nav><iframe name="reader" title="본문"></iframe></aside>
<script>${HUB_JS}</script>
<script id="plan-data" type="application/json">${JSON.stringify(plan).replace(/</g, '\\u003c')}</script>
<script>
// ── 블로그 글: 거르기와 본문 칸 ──
const postsEl=document.getElementById('posts');
for(const b of document.querySelectorAll('.filters button'))b.onclick=()=>{postsEl.dataset.f=b.dataset.f;for(const x of document.querySelectorAll('.filters button'))x.setAttribute('aria-pressed',x===b)};
for(const c of document.querySelectorAll('#cards .card'))c.addEventListener('click',()=>{if(c.dataset.open!=='panel')return;document.body.classList.add('open');for(const x of document.querySelectorAll('.card.on'))x.classList.remove('on');c.classList.add('on')});
const closeReader=()=>{document.body.classList.remove('open');for(const x of document.querySelectorAll('.card.on'))x.classList.remove('on')};
document.getElementById('close').onclick=closeReader;
addEventListener('keydown',e=>{if(e.key==='Escape')closeReader()});addEventListener('hashchange',closeReader);

${PLAN_JS}
</script>
</body></html>\n`);
console.log(JSON.stringify({ out, posts: rows.length, scheduled: nSched, queue: pending.length, candidates: candidates.filter(x => x.slug).length, missingPortrait: missing, missingBody: noBody }));
