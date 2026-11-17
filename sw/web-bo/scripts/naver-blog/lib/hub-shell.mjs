// 발행 허브 공통 틀. 외부 채널 입구(D:/feelandnote/outreach/index.html, build-hub.mjs)와 블로그 판(naver-blog/portraits.html, portrait-board.mjs)이 같은 모드 막대·모양을 쓴다.
// 규칙(26.11.16 사용자 지시): 「모드」와 「개별 아이템」은 눌렀을 때 일어나는 일이 다르므로 모양도 다르게 한다.
//  - 모드: 상단 막대의 각진 탭. 누르면 화면이 그 모드로 바뀐다(한 번에 한 모드만 보인다).
//  - 아이템: 둥근 카드. 누르면 무엇이 열리는지 오른쪽 위 배지로 밝힌다 — panel(옆 칸에 본문), ext(새 창), file(파일·폴더).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

// page: 그 모드가 사는 화면(board = 블로그 판, hub = 외부 채널 입구)
export const HUB_MODES = Object.freeze([
  {id: 'plan', label: '블로그 편성', page: 'board'},
  {id: 'posts', label: '블로그 글', page: 'board'},
  {id: 'comments', label: '블로그 댓글', page: 'hub'},
  {id: 'sns', label: 'SNS 카드', page: 'hub'},
  {id: 'shorts', label: '쇼츠', page: 'hub'},
  {id: 'longform', label: '롱폼', page: 'hub'},
  {id: 'promo', label: '홍보 영상', page: 'hub'},
  {id: 'intro', label: '소개 글', page: 'hub'},
  {id: 'etc', label: '문서·폴더', page: 'hub'},
]);

/** 상단 막대. page: 지금 화면, hrefs: {board, hub} 각 화면의 주소(같은 화면이면 ''), available: 이 화면에서 실제로 있는 모드 id(다른 화면 모드는 늘 보인다) */
export function hubBar({page, hrefs, available = null, stamp = ''}) {
  const tabs = HUB_MODES.filter(m => m.page !== page || !available || available.includes(m.id))
    .map(m => `<a class="mode" data-mode="${m.id}" ${m.page === page ? 'data-here="1" ' : ''}href="${esc(m.page === page ? '' : hrefs[m.page])}#${m.id}">${esc(m.label)}</a>`).join('');
  return `<header class="hub"><h1>필앤노트 발행 허브</h1><nav class="modes" aria-label="모드"><span class="modes-k">모드</span>${tabs}</nav>${stamp ? `<small>${esc(stamp)}</small>` : ''}</header>`;
}

export const HUB_CSS = `
:root{--page:#f6f4ef;--card:#fff;--ink:#1d1b18;--sub:#6b665e;--line:#e2ddd3;--accent:#9a6b12;--mode:#1d1b18;--mode-ink:#f6f4ef;--ok:#2f6b4f}
@media (prefers-color-scheme:dark){:root{--page:#151412;--card:#1f1d1a;--ink:#f1ede4;--sub:#a39c8f;--line:#35312b;--accent:#f0c35a;--mode:#f1ede4;--mode-ink:#151412;--ok:#7cc4a0}}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font-family:"Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;font-size:15px;line-height:1.5;word-break:keep-all}
header.hub{position:sticky;top:0;z-index:5;background:var(--page);border-bottom:2px solid var(--mode);padding:10px 20px 0;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:flex-end}
header.hub h1{font-size:17px;margin:0 0 9px}
header.hub small{color:var(--sub);font-size:12px;margin:0 0 9px auto}
/* 모드: 각진 탭. 지금 모드는 검게 채운다 */
.modes{display:flex;flex-wrap:wrap;gap:2px;align-items:flex-end}
.modes-k{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--sub);padding:0 8px 9px 0}
a.mode{display:block;padding:7px 14px 8px;border:1px solid var(--line);border-bottom:0;border-radius:6px 6px 0 0;background:var(--card);color:var(--sub);text-decoration:none;font-weight:700;font-size:14px}
a.mode:hover{color:var(--ink);border-color:var(--mode);background:var(--line)}
a.mode[aria-current=page]{background:var(--mode);border-color:var(--mode);color:var(--mode-ink)}
main.hub{max-width:1360px;margin:auto;padding:18px 20px 80px}
section.panel{display:none}section.panel.on{display:block}
section.panel>h2{font-size:21px;margin:0 0 2px}
.note{color:var(--sub);margin:0 0 14px;font-size:14px}
/* 아이템: 둥근 카드. 배지가 눌렀을 때 일어나는 일을 말한다 */
.item{position:relative;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;color:var(--ink);text-decoration:none;cursor:pointer}
.item:hover{border-color:var(--accent);box-shadow:0 2px 0 var(--accent)}
.item.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.item[data-open]::after{position:absolute;top:6px;right:6px;z-index:1;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;background:var(--page);border:1px solid var(--line);color:var(--sub)}
.item[data-open=panel]::after{content:'본문 ▸'}
.item[data-open=ext]::after{content:'새 창 ↗'}
.item[data-open=file]::after{content:'파일'}
.item:hover::after{border-color:var(--accent);color:var(--accent)}
.item img,.item video{width:100%;border-radius:8px;display:block;margin-bottom:8px;background:var(--line)}
.item span,.item small{color:var(--sub);font-size:13px}
/* 아이템 안의 보조 동작: 작은 알약 단추 */
.acts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.acts a,.acts button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--line);border-radius:999px;padding:2px 11px;background:var(--card);color:var(--accent);text-decoration:none}
.acts a:hover,.acts button:hover{border-color:var(--accent);background:var(--page)}
.acts .main{background:var(--accent);color:var(--page);border-color:var(--accent);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
`;

// 주소의 #모드로 화면을 바꾼다. 이 화면에 없는 모드면 첫 모드를 연다.
export const HUB_JS = `
(()=>{const panels=[...document.querySelectorAll('section.panel')],tabs=[...document.querySelectorAll('a.mode')];
const show=()=>{const want=location.hash.slice(1),p=panels.find(x=>x.id===want)||panels[0];if(!p)return;
for(const x of panels)x.classList.toggle('on',x===p);for(const t of tabs){if(t.dataset.mode===p.id)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current')}
document.title=(tabs.find(t=>t.dataset.mode===p.id)?.textContent||'')+' · 필앤노트 발행 허브';scrollTo(0,0)};
addEventListener('hashchange',show);show()})();
`;
