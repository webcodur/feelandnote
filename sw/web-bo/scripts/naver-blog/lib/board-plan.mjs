// 발행 허브 「블로그 편성」 화면(portrait-board.mjs가 portraits.html에 넣는다).
// 달력에 예약 글과 대기 글을 함께 놓고, 끌어서 날짜·시각을 옮긴다. 시각은 정각만 쓴다.
// 화면은 파일만 고친다: publish-queue.txt · publish-candidates.txt · publish-demote.txt · publish-reschedule.txt.
// 네이버의 실제 예약은 블로그 작업 세션이 apply-schedule-file.mjs로 옮긴다.
// 주의: 이 파일의 문자열은 String.raw다. 안에 백틱과 달러-중괄호를 쓰지 않는다.

export const PLAN_FILES = Object.freeze({ queue: 'publish-queue.txt', candidates: 'publish-candidates.txt', demote: 'publish-demote.txt', reschedule: 'publish-reschedule.txt' });

export const PLAN_CSS = String.raw`
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px;position:sticky;top:var(--hubbar,48px);z-index:4;background:var(--page);padding:8px 0}
.bar .save{background:var(--accent);border-color:var(--accent);color:var(--page);font-weight:700}.bar .save:disabled{opacity:.4;cursor:default}
#dirty{font-size:13px;color:var(--sub)}#dirname{font-size:12px;color:var(--sub);margin-left:auto}#redir{font-size:12px!important;padding:3px 10px!important}#dirty.on{color:var(--accent);font-weight:700}#dirty.bad{color:#d33;font-weight:700}
#msg{font-size:13px;color:var(--accent);min-height:18px;margin:0 0 8px;white-space:pre-wrap}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--sub);margin:0 0 10px}.legend i{display:inline-block;width:18px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;border:1px solid var(--line)}
.legend .l-res{background:var(--card);border-color:var(--ink)}.legend .l-q{border-style:dashed;border-color:var(--ok)}.legend .l-mv{border-color:var(--accent);background:var(--card)}.legend .l-bad{border-color:#d33}
.plan{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
@media (max-width:1100px){.plan{grid-template-columns:1fr}}
.cal,.side{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px}
.side{position:sticky;top:calc(var(--hubbar,48px) + 56px);max-height:calc(100vh - var(--hubbar,48px) - 70px);overflow:auto}
.side h3,.cal h3{margin:2px 4px 6px;font-size:16px}.side h3 span,.cal h3 span{color:var(--sub);font-weight:400;font-size:13px}
.side p,.cal>p{margin:0 4px 8px;color:var(--sub);font-size:13px}
.day{display:grid;grid-template-columns:74px minmax(0,1fr) 70px;gap:8px;padding:6px 2px;border-top:1px solid var(--line)}
.day:first-child{border-top:0}.dh{font-weight:700;font-size:14px;padding-top:6px}.dh i{font-style:normal;font-weight:400;color:var(--sub);margin-left:4px}
.day.today .dh{color:var(--accent)}.day.we .dh i{color:#d55}
.cells{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.slot{min-width:0;min-height:62px;border:1px dashed var(--line);border-radius:8px;padding:4px 6px 6px;display:flex;flex-direction:column;gap:3px}
.slot .hh{font-size:12px;color:var(--sub);font-weight:700}
.slot .free{font-size:12px;color:var(--sub);opacity:.6}
.slot.has{border-style:solid;background:var(--page)}.slot.bad{border-color:#d33;background:#d331}
.slot.past{opacity:.45}.slot.over{border-color:var(--accent);border-style:solid;background:var(--card);box-shadow:0 0 0 2px var(--accent) inset}
.slot.any{justify-content:center;align-items:center;color:var(--sub);font-size:12px;cursor:default;text-align:center;line-height:1.3}
@media (max-width:760px){.cells{grid-template-columns:repeat(2,minmax(0,1fr))}.day{grid-template-columns:52px minmax(0,1fr) 44px}}
.chip{min-width:0;display:flex;align-items:center;gap:6px;padding:2px 6px 2px 2px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:grab}
.chip:hover{border-color:var(--accent);box-shadow:0 1px 6px #0002}.chip.drag{opacity:.35}
.chip img,.chip .noimg,.row img,.row .noimg{width:28px;height:36px;object-fit:cover;border-radius:4px;background:var(--line);flex:none}
.chip.cur img{object-fit:contain;background:#fff}
.chip .tx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.chip b{overflow:hidden;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:keep-all;overflow-wrap:anywhere}
.chip small{font-size:11px;color:var(--accent)}
.chip.t-q{border-style:dashed;border-color:var(--ok)}.chip.moved{border-color:var(--accent)}
.late{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;padding:8px;border:1px solid #d33;border-radius:8px}.late:empty{display:none}.late .chip{flex:0 1 220px}
.pop a{color:var(--accent);font-size:12px;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:2px 9px}.pop a:hover{border-color:var(--accent);background:var(--page)}
.list{display:flex;flex-direction:column;gap:4px;min-height:40px;padding:2px}
.row{display:flex;align-items:center;gap:8px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:var(--page)}
.row b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.row small{color:var(--sub);font-size:12px;flex:none}
.row[draggable=true]{cursor:grab}.row[draggable=true]:hover{border-color:var(--accent);background:var(--card)}
.row.drag{opacity:.35}.row.over{border-top:3px solid var(--accent)}.list.over-end{outline:2px dashed var(--accent);outline-offset:-2px}
.row button,.pop button{font:inherit;font-size:12px;padding:2px 9px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--accent);cursor:pointer;flex:none}
.row button:hover,.pop button:hover{border-color:var(--accent);background:var(--page)}
.row b em,.pop h4 em{font-style:normal;font-weight:400;font-size:12px;color:var(--sub)}a.svc{flex:none;padding:0 5px;border-radius:6px;color:var(--accent);text-decoration:none;font-size:14px}a.svc:hover{background:var(--accent);color:var(--page)}.row small.noway{color:#e0a060}
.row.moved{border-color:var(--accent)}.row.off b{text-decoration:line-through;opacity:.6}
.sep{font-size:12px;color:var(--sub);padding:8px 4px 2px;border-top:1px dashed var(--line);margin-top:4px}
.box{margin:0 0 10px}.box:empty{display:none}
#changes{font-size:13px;margin:0 0 10px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;background:var(--card)}#changes:empty{display:none}
#changes b{color:var(--accent)}#changes li{margin:2px 0}#changes ul{margin:4px 0 0;padding-left:18px}
.pop{position:fixed;z-index:9;background:var(--card);border:1px solid var(--accent);border-radius:10px;box-shadow:0 8px 28px #0005;padding:10px;width:270px;font-size:13px}
.pop h4{margin:0 0 6px;font-size:14px}.pop .r{display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap}
.pop input,.pop select{font:inherit;font-size:13px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--page);color:var(--ink)}
.pop .hours{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:6px 0}.pop .hours button{padding:3px 0;border-radius:6px}.pop .hours button.std{font-weight:700;border-color:var(--accent)}
.pop .go{background:var(--accent);border-color:var(--accent);color:var(--page);font-weight:700}
`;

export const planHtml = cap => String.raw`
<section class="panel" id="plan"><h2>블로그 편성</h2>
<p class="note">달력의 칸이 발행 시각이다. 글을 끌어서 다른 날·다른 시각 칸에 놓으면 옮겨지고, 찬 칸에 놓으면 두 글의 시각이 서로 바뀐다. 글을 누르면 날짜와 시각을 직접 고르거나 지금 발행·후보로 내리기를 할 수 있다. 시각은 정각만 쓴다. 여기서 고친 것은 「파일에 저장」을 눌러야 남고, 네이버의 실제 예약은 그 뒤 블로그 작업 세션이 옮긴다.</p>
<div class="bar"><button class="save" id="save" disabled>파일에 저장</button><button id="copy">변경 내용 복사</button><button id="undo">되돌리기</button><span id="dirty">바뀐 것 없음</span><span id="dirname"></span><button id="redir" hidden>저장 폴더 바꾸기</button></div>
<p id="msg"></p>
<div id="changes"></div>
<div class="legend"><span><i class="l-res"></i>예약(네이버에 걸린 글)</span><span><i class="l-q"></i>대기(아직 네이버에 없음)</span><span><i class="l-mv"></i>옮긴 글</span><span><i class="l-bad"></i>한 칸에 두 편</span></div>
<div class="plan">
<div class="cal"><h3>발행 달력 <span id="n-res"></span></h3><div class="late" id="l-late"></div><div id="cal"></div></div>
<div class="side">
<div class="box" id="b-now"></div><div class="box" id="b-down"></div>
<h3>후보군 <span id="n-c"></span></h3><p>아직 넣지 않은 인물. 달력 칸으로 끌어 놓거나 「넣기」를 누르면 대기 글이 된다. 달력의 글을 여기로 끌면 후보로 내려간다.</p>
<div class="list" id="l-c"></div>
</div></div></section>`.replace('__CAP__', String(cap));

export const PLAN_JS = String.raw`
const D=JSON.parse(document.getElementById('plan-data').textContent),$=id=>document.getElementById(id);
// 허브 메뉴 높이만큼 아래에 저장 막대를 붙인다(메뉴는 창이 좁으면 두 줄이 된다).
const setBar=()=>document.documentElement.style.setProperty('--hubbar',(document.querySelector('header.hub')?.offsetHeight??0)+'px');setBar();addEventListener('resize',setBar);
const STD=['09:00','12:00','15:00','21:00'],WD=['일','월','화','수','목','금','토'];
const h=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const nowAt=()=>{const d=new Date();return ymd(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
const fmt=at=>at==='now'?'지금 발행':Number(at.slice(5,7))+'/'+Number(at.slice(8,10))+' '+at.slice(11);
const fresh=()=>({res:new Map(D.reserved.map(r=>[r.id,D.moves[r.id]??r.at])),down:new Set(D.demoted),q:D.queue.map(x=>({...x})),c:D.candidates.map(x=>({...x}))});
const snapshot=s=>JSON.stringify({res:[...s.res].sort(),down:[...s.down].sort(),q:[...s.q].sort((a,b)=>a.slug<b.slug?-1:1),c:s.c});
let S=fresh();const base=snapshot(fresh());
// 편집 보관: 달력을 고칠 때마다 브라우저(localStorage)에 적어 두고, 화면을 다시 열면 되살린다.
// 새로 고침, 판을 다시 만든 뒤, 저장에 실패한 뒤에도 편집이 사라지지 않는다(26.11.17 사용자: 저장이 안 되고 다 날아갔다).
// 저장에 성공한 편집은 같은 판에서는 그대로 보여 주고(파일에는 들어갔지만 판은 아직 옛 자료다), 판을 다시 만들면 버린다.
const DRAFT='fn-blog-plan-draft';let savedSnap=null;
const keep=saved=>{try{if(snapshot(S)===base)localStorage.removeItem(DRAFT);else localStorage.setItem(DRAFT,JSON.stringify({stamp:D.stamp,saved:!!saved,res:[...S.res],down:[...S.down],q:S.q,c:S.c}))}catch{}};
// 화면이 모르는 후보를 후보군에 더한다(판을 만든 뒤 파일에 새로 들어온 인물). 묶음 설명 줄이 이미 있으면 그 묶음 끝에, 없으면 맨 끝에 설명과 함께 붙인다.
function addCands(list){const have=new Set([...D.reserved,...S.q,...S.c].map(x=>x.slug).filter(Boolean));let head=null,n=0;
 for(const x of list){if(x.c!==undefined){if(x.c)head=x.c;continue}if(!x.slug||have.has(x.slug))continue;have.add(x.slug);n++;
  let i=head?S.c.findIndex(y=>y.c===head):-1;
  if(i<0){if(head)S.c.push({c:''},{c:head});S.c.push({slug:x.slug})}
  else{i++;while(i<S.c.length&&S.c[i].slug)i++;S.c.splice(i,0,{slug:x.slug})}}
 return n}
function restore(){let d;try{d=JSON.parse(localStorage.getItem(DRAFT)??'null')}catch{}if(!d)return null;
 if(d.saved&&d.stamp!==D.stamp){try{localStorage.removeItem(DRAFT)}catch{}return null}   // 저장한 편집이고 판이 새로 만들어졌다: 새 판에 이미 들어 있다
 const ids=new Set(D.reserved.map(r=>r.id)),reservedSlugs=new Set(D.reserved.map(r=>r.slug).filter(Boolean));
 for(const [id,at] of d.res??[])if(ids.has(id))S.res.set(id,at);
 S.down=new Set((d.down??[]).filter(x=>reservedSlugs.has(x)));
 if(Array.isArray(d.q))S.q=d.q.filter(x=>x?.slug&&x.at&&!reservedSlugs.has(x.slug));
 if(Array.isArray(d.c))S.c=d.c.filter(x=>x&&(x.c!==undefined||(x.slug&&!reservedSlugs.has(x.slug)&&!S.q.some(q=>q.slug===x.slug))));
 addCands(D.candidates);
 if(d.saved)savedSnap=snapshot(S);return d}
const say=t=>{$('msg').textContent=t||''};
const person=slug=>D.names[slug]??{n:slug,i:null};
const svc=slug=>'https://feelandnote.com/celeb/'+encodeURIComponent(slug),link=slug=>slug?'<a class="svc" draggable="false" href="'+h(svc(slug))+'" target="_blank" title="서비스의 인물 화면을 새 탭으로 연다">↗</a>':'';
// 달력에 놓인 글: 예약(내리기·지금 발행 표시한 것 제외)과 대기
function items(){const out=[];
 for(const r of D.reserved){if(r.slug&&S.down.has(r.slug))continue;const at=S.res.get(r.id);if(at==='now')continue;out.push({t:'res',key:r.id,at,n:r.n,i:r.i,kind:r.kind,slug:r.slug,orig:r.at})}
 for(const x of S.q){const p=person(x.slug);out.push({t:'q',key:x.slug,at:x.at,n:p.n,i:p.i,kind:'celeb',slug:x.slug,orig:D.queue.find(o=>o.slug===x.slug)?.at??null})}
 return out}
const find=(t,key)=>items().find(x=>x.t===t&&x.key===key);
const setAt=(x,at)=>{if(x.t==='res')S.res.set(x.key,at);else S.q.find(q=>q.slug===x.key).at=at};
const chip=x=>'<div class="chip t-'+x.t+(x.kind==='curated'?' cur':'')+(x.orig!==x.at?' moved':'')+'" draggable="true" data-t="'+x.t+'" data-key="'+h(x.key)+'" title="'+h(x.n)+' — 누르면 시각을 고른다">'
 +(x.i?'<img loading="lazy" src="'+h(x.i)+'" alt="">':'<span class="noimg"></span>')+'<span class="tx"><b>'+(x.kind==='curated'?'<i class="k k-c">기관</i>':'')+(x.t==='q'?'<i class="k k-q">대기</i>':'')+h(x.n)+'</b>'
 +(x.orig&&x.orig!==x.at?'<small>'+h(fmt(x.orig))+'에서 옮김</small>':x.orig?'':'<small>새로 넣음</small>')+'</span></div>';
function render(){
 const all=items(),now=nowAt(),today=now.slice(0,10),by=new Map();
 for(const x of all.filter(x=>x.at>=now))by.set(x.at,[...(by.get(x.at)??[]),x]);
 // 시각이 지난 대기 글만 붉은 칸에 모은다. 지난 예약 글은 이미 발행된 것이라(화면이 오래된 경우) 달력에서 뺀다.
 const lateQ=all.filter(x=>x.at<now&&x.t==='q');
 $('l-late').innerHTML=lateQ.map(chip).join('');
 let last=today;for(const x of all)if(x.at.slice(0,10)>last)last=x.at.slice(0,10);
 const end=new Date(last+'T00:00');end.setDate(end.getDate()+4);const min=new Date(today+'T00:00');min.setDate(min.getDate()+13);if(end<min)end.setTime(min.getTime());
 let html='';
 for(const d=new Date(today+'T00:00');d<=end;d.setDate(d.getDate()+1)){
  const day=ymd(d),hours=[...new Set([...STD,...[...by.keys()].filter(a=>a.startsWith(day)).map(a=>a.slice(11))])].sort();
  html+='<div class="day'+(day===today?' today':'')+([0,6].includes(d.getDay())?' we':'')+'"><div class="dh">'+(d.getMonth()+1)+'/'+d.getDate()+'<i>'+WD[d.getDay()]+'</i></div><div class="cells">'
   +hours.map(hh=>{const at=day+'T'+hh,its=by.get(at)??[],past=at<now;
     return '<div class="slot'+(its.length?' has':'')+(its.length>1?' bad':'')+(past?' past':'')+'" data-at="'+at+'"><span class="hh">'+hh+'</span>'+(its.length?its.map(chip).join(''):'<span class="free">'+(past?'지남':'비어 있음')+'</span>')+'</div>'}).join('')
   +'</div><div class="slot any" data-day="'+day+'" title="글을 여기에 놓으면 시각을 고른다">다른<br>시각</div></div>'}
 $('cal').innerHTML=html;
 const downs=D.reserved.filter(r=>r.slug&&S.down.has(r.slug)),nows=D.reserved.filter(r=>S.res.get(r.id)==='now'&&!(r.slug&&S.down.has(r.slug)));
 $('b-now').innerHTML=nows.length?'<h3>지금 발행할 글 <span>'+nows.length+'편</span></h3><div class="list">'+nows.map(r=>'<div class="row moved" draggable="true" data-t="res" data-key="'+h(r.id)+'" title="달력 칸으로 끌면 그 시각에 예약으로 되돌린다">'+(r.i?'<img src="'+h(r.i)+'" alt="">':'<span class="noimg"></span>')+'<b>'+h(r.n)+'</b>'+link(r.slug)+'<button data-unnow="'+h(r.id)+'">취소</button></div>').join('')+'</div>':'';
 $('b-down').innerHTML=downs.length?'<h3>예약에서 내릴 글 <span>'+downs.length+'편</span></h3><div class="list">'+downs.map(r=>'<div class="row off" draggable="true" data-t="res" data-key="'+h(r.id)+'" title="달력 칸으로 끌면 그 시각에 예약으로 되살린다">'+(r.i?'<img src="'+h(r.i)+'" alt="">':'<span class="noimg"></span>')+'<b>'+h(r.n)+'</b><small>'+h(fmt(r.at))+'</small>'+link(r.slug)+'<button data-undown="'+h(r.slug)+'">되살리기</button></div>').join('')+'</div>':'';
 const wasC=new Set(D.candidates.filter(x=>x.slug).map(x=>x.slug));
 $('l-c').innerHTML=S.c.map((x,i)=>x.c!==undefined?(x.c?'<div class="sep" data-i="'+i+'">'+h(x.c.replace(/^#\s*/,''))+'</div>':''):(p=>'<div class="row'+(wasC.has(x.slug)?'':' moved')+'" draggable="true" data-t="c" data-key="'+h(x.slug)+'" data-i="'+i+'">'+(p.i?'<img loading="lazy" src="'+h(p.i)+'" alt="">':'<span class="noimg"></span>')+'<b title="'+h((p.t?p.t+' · ':'')+x.slug)+'">'+h(p.n)+(p.t?' <em>'+h(p.t)+'</em>':'')+'</b>'+(p.w===0?'<small class="noway" title="독서 방식 원고가 없다. 글을 내려면 먼저 써야 한다">독서 방식 없음</small>':'')+link(x.slug)+'<button data-put="'+h(x.slug)+'" title="가장 가까운 빈 인물 칸(09:00·21:00)에 넣는다">넣기</button></div>')(person(x.slug))).join('');
 const nRes=all.filter(x=>x.t==='res'&&x.at>=now).length,bad=[...by.values()].filter(v=>v.length>1).length,late=lateQ.length;
 $('n-res').textContent='예약 '+nRes+' / '+D.cap+' · 대기 '+S.q.length+'편';$('n-c').textContent=S.c.filter(x=>x.slug).length+'명';
 const ch=changes();
 $('changes').innerHTML=ch.length?'<b>네이버·파일에 반영할 변경 '+ch.length+'건</b><ul>'+ch.map(c=>'<li>'+h(c)+'</li>').join('')+'</ul>':'';
 const snap=snapshot(S),dirty=snap!==base&&snap!==savedSnap,d=$('dirty');keep(snap===savedSnap);
 d.className=bad?'bad':dirty?'on':'';d.textContent=bad?'한 칸에 두 편인 곳이 '+bad+'곳 있다 — 풀어야 저장된다':dirty?'저장하지 않은 변경이 있다(이 브라우저에 보관 중)':snap===savedSnap&&snap!==base?'저장함 — 네이버 반영을 기다린다':late?'시각이 지난 대기 글이 '+late+'편 있다(달력 위 붉은 칸) — 새 칸으로 끌어 옮긴다':'바뀐 것 없음';
 $('save').disabled=!dirty||bad>0;
}
// 원장(실제 예약)·대기열 파일과 견준 변경 목록
function changes(){const out=[];
 for(const r of D.reserved){const cur=S.res.get(r.id);
  if(r.slug&&S.down.has(r.slug))out.push('예약에서 내림: '+r.n+' ('+fmt(r.at)+')');
  else if(cur==='now')out.push('지금 발행: '+r.n+' (원래 '+fmt(r.at)+')');
  else if(cur!==r.at)out.push('예약 시각 변경: '+r.n+'  '+fmt(r.at)+' → '+fmt(cur))}
 for(const x of S.q){const o=D.queue.find(q=>q.slug===x.slug);if(!o)out.push('대기에 넣음: '+person(x.slug).n+'  '+fmt(x.at));else if(o.at!==x.at)out.push('대기 시각 변경: '+person(x.slug).n+'  '+fmt(o.at)+' → '+fmt(x.at))}
 for(const o of D.queue)if(!S.q.some(q=>q.slug===o.slug))out.push('대기에서 후보로: '+person(o.slug).n);
 return out}
// 달력 칸에 놓기. 찬 칸에 달력의 글을 놓으면 두 글의 시각을 바꾼다.
function place(d,at){
 if(at<nowAt())return say('이미 지난 시각이다.');
 const occ=items().filter(x=>x.at===at&&!(x.t===d.t&&x.key===d.key));
 if(d.t==='c'){if(occ.length)return say('이미 찬 칸이다. 빈 칸에 놓는다.');S.c=S.c.filter(x=>x.slug!==d.key);S.q.push({slug:d.key,at});say(person(d.key).n+'을(를) '+fmt(at)+' 대기로 넣었다.')}
 else{let back=false;if(d.t==='res'){const r=D.reserved.find(r=>r.id===d.key);if(r?.slug&&S.down.delete(r.slug))back=true;if(r&&S.res.get(r.id)==='now'){S.res.set(r.id,r.at);back=true}}
  const me=find(d.t,d.key);if(!me)return;if(me.at===at){if(back){say(me.n+'을(를) '+fmt(at)+' 예약으로 되돌렸다.');render()}return}const prev=me.at;setAt(me,at);
  if(occ.length===1&&prev>=nowAt()){setAt(occ[0],prev);say(me.n+' ↔ '+occ[0].n+' 시각을 서로 바꿨다.')}else say(me.n+': '+fmt(prev)+' → '+fmt(at))}
 render()}
const firstSlot=()=>{const i=S.c.findIndex(x=>x.slug);return i<0?S.c.length:i};
function toCandidates(d,at){
 if(d.t==='c'){const i=S.c.findIndex(x=>x.slug===d.key),it=S.c.splice(i,1)[0];if(at!==undefined&&at>i)at--;S.c.splice(at??S.c.length,0,it)}
 else if(d.t==='q'){S.q=S.q.filter(x=>x.slug!==d.key);S.c.splice(at??firstSlot(),0,{slug:d.key});say(person(d.key).n+'을(를) 후보로 내렸다.')}
 else{const r=D.reserved.find(r=>r.id===d.key);if(!r.slug)return say('기관 글은 후보군으로 내릴 수 없다. 시각만 옮긴다.');S.down.add(r.slug);say(r.n+'을(를) 예약에서 내릴 글로 표시했다.')}
 render()}
// 가장 가까운 빈 인물 칸(09:00·21:00)
function nextFree(){const used=new Set(items().map(x=>x.at)),now=nowAt(),d=new Date();for(let i=0;i<400;i++){for(const hh of ['09:00','21:00']){const at=ymd(d)+'T'+hh;if(at>now&&!used.has(at))return at}d.setDate(d.getDate()+1)}}
// ── 작은 창: 시각 고르기 ──
let pop=null;const closePop=()=>{pop?.remove();pop=null};
function openPop(anchor,html,wire){closePop();pop=document.createElement('div');pop.className='pop';pop.innerHTML=html;document.body.append(pop);
 const r=anchor.getBoundingClientRect(),w=270,ph=pop.offsetHeight;pop.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+'px';pop.style.top=(r.bottom+ph+8>innerHeight?Math.max(8,r.top-ph-6):r.bottom+6)+'px';wire(pop)}
const hourGrid=()=>'<div class="hours">'+Array.from({length:24},(_,i)=>'<button data-hh="'+pad(i)+':00"'+(STD.includes(pad(i)+':00')?' class="std"':'')+'>'+pad(i)+'</button>').join('')+'</div>';
function pickHour(anchor,day,d){openPop(anchor,'<h4>'+Number(day.slice(5,7))+'/'+Number(day.slice(8,10))+' 몇 시에 넣을까</h4>'+hourGrid()+'<div class="r"><button data-x>닫기</button></div>',p=>{
 p.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.hh){closePop();place(d,day+'T'+b.dataset.hh)}else closePop()}})}
function editItem(anchor,x){const day=x.at.slice(0,10),hh=x.at.slice(11),href=x.t==='res'?D.blog+x.key:'https://feelandnote.com/celeb/'+encodeURIComponent(x.key);
 const who=x.slug??(x.t==='res'?null:x.key),ttl=who?person(who).t:'';
 openPop(anchor,'<h4>'+h(x.n)+(ttl?' <em>'+h(ttl)+'</em>':'')+'</h4><div class="r">지금: '+h(fmt(x.at))+(x.orig&&x.orig!==x.at?' (원래 '+h(fmt(x.orig))+')':'')+'</div>'
  +'<div class="r"><input type="date" id="p-day" min="'+nowAt().slice(0,10)+'" value="'+day+'"><select id="p-hh">'+Array.from({length:24},(_,i)=>'<option'+(pad(i)+':00'===hh?' selected':'')+'>'+pad(i)+':00</option>').join('')+'</select><button class="go" data-go>옮기기</button></div>'
  +'<div class="r">'+(x.t==='res'?'<button data-now>지금 발행</button>':'')+(x.slug?'<button data-down>후보로 내리기</button>':'')+(x.orig&&x.orig!==x.at?'<button data-back>원래 시각으로</button>':'')+(x.t==='res'?'<a href="'+h(href)+'" target="_blank">블로그 글 ↗</a>':'')+(who?'<a href="'+h(svc(who))+'" target="_blank">인물 화면 ↗</a>':'')+'<button data-x>닫기</button></div>',p=>{
  p.onclick=e=>{const b=e.target.closest('button');if(!b)return;const d={t:x.t,key:x.key};
   if(b.dataset.go!==undefined){const v=p.querySelector('#p-day').value;if(!v)return;closePop();place(d,v+'T'+p.querySelector('#p-hh').value)}
   else if(b.dataset.now!==undefined){closePop();S.res.set(x.key,'now');say(x.n+'을(를) 지금 발행할 글로 표시했다.');render()}
   else if(b.dataset.down!==undefined){closePop();toCandidates(d)}
   else if(b.dataset.back!==undefined){closePop();place(d,x.orig)}
   else closePop()}})}
// ── 누르기 ──
$('plan').addEventListener('click',e=>{const b=e.target.closest('button');
 if(b?.dataset.undown){S.down.delete(b.dataset.undown);render();return}
 if(b?.dataset.unnow){const r=D.reserved.find(r=>r.id===b.dataset.unnow);S.res.set(r.id,D.moves[r.id]&&D.moves[r.id]!=='now'?D.moves[r.id]:r.at);render();return}
 if(b?.dataset.put){const at=nextFree();if(at)place({t:'c',key:b.dataset.put},at);return}
 const c=e.target.closest('.chip');if(c){const x=find(c.dataset.t,c.dataset.key);if(x)editItem(c,x)}});
document.addEventListener('mousedown',e=>{if(pop&&!e.target.closest('.pop')&&!e.target.closest('.chip'))closePop()});
addEventListener('keydown',e=>{if(e.key==='Escape')closePop()});
// ── 끌어 놓기 ──
let drag=null;const clearOver=()=>{for(const x of document.querySelectorAll('.over,.over-end'))x.classList.remove('over','over-end')};
document.addEventListener('dragstart',e=>{const r=e.target.closest?.('#plan [draggable=true]');if(!r)return;closePop();drag={t:r.dataset.t,key:r.dataset.key};r.classList.add('drag');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',r.dataset.key)});
document.addEventListener('dragend',()=>{drag=null;clearOver();for(const x of document.querySelectorAll('.drag'))x.classList.remove('drag')});
// 끄는 동안 화면 위아래 끝에 가까이 가면 저절로 굴린다(끄는 중에는 휠이 먹지 않는다). 후보군 칸 안에서는 그 칸을 굴린다.
let scY=null,scEl=null,scRun=0;
const scEdge=(y,top,bottom)=>{const z=90,a=y-top,b=bottom-y;return a<z?-Math.ceil((z-Math.max(a,0))/4):b<z?Math.ceil((z-Math.max(b,0))/4):0};
const scTick=()=>{if(!drag||scY===null){scRun=0;return}
  const r=scEl?.getBoundingClientRect(),inner=r?scEdge(scY,r.top,Math.min(r.bottom,innerHeight)):0;
  if(inner&&(inner<0?scEl.scrollTop>0:scEl.scrollTop+scEl.clientHeight<scEl.scrollHeight))scEl.scrollTop+=inner;
  else{const bar=Math.min(document.querySelector('#plan .bar')?.getBoundingClientRect().bottom||0,innerHeight/3),v=scEdge(scY,Math.max(bar,0),innerHeight);if(v)scrollBy(0,v)}
  scRun=requestAnimationFrame(scTick)};
document.addEventListener('dragover',e=>{if(!drag)return;scY=e.clientY;scEl=e.target.closest?.('.side');if(!scRun)scRun=requestAnimationFrame(scTick)});
document.addEventListener('dragend',()=>{scY=null});
document.addEventListener('dragover',e=>{if(!drag)return;const slot=e.target.closest?.('.slot'),list=e.target.closest?.('#l-c');
 if(slot&&!slot.classList.contains('past')){e.preventDefault();clearOver();slot.classList.add('over')}
 else if(list){e.preventDefault();clearOver();const row=e.target.closest('[data-i]');if(row)row.classList.add('over');else list.classList.add('over-end')}});
document.addEventListener('drop',e=>{if(!drag)return;const d=drag,slot=e.target.closest?.('.slot'),list=e.target.closest?.('#l-c');
 if(slot&&!slot.classList.contains('past')){e.preventDefault();drag=null;clearOver();if(slot.dataset.day)pickHour(slot,slot.dataset.day,d);else place(d,slot.dataset.at)}
 else if(list){e.preventDefault();drag=null;clearOver();const row=e.target.closest('[data-i]');toCandidates(d,row?Number(row.dataset.i):undefined)}});
// ── 저장 ──
function files(){const t=new Date(),stamp=String(t.getFullYear()).slice(2)+'.'+pad(t.getMonth()+1)+'.'+pad(t.getDate()),NL='\n';
 const q=[...D.queueHead,...[...S.q].sort((a,b)=>a.at<b.at?-1:1).map(x=>x.slug+' '+x.at.replace('T',' '))].join(NL)+NL;
 const c=S.c.map(x=>x.c!==undefined?x.c:x.slug).join(NL).replace(/\n{3,}/g,NL+NL).replace(/\s+$/,'')+NL;
 const d=['# 예약에서 내려 후보군으로 돌릴 인물(편성 화면에서 표시, '+stamp+' 저장). 블로그 작업 세션이 예약 글을 지우고 publish-candidates.txt로 옮긴 뒤 이 줄을 지운다.',...[...S.down].sort()].join(NL)+NL;
 const mv=D.reserved.filter(r=>!(r.slug&&S.down.has(r.slug))&&S.res.get(r.id)!==r.at).map(r=>{const cur=S.res.get(r.id);return r.id+' '+(cur==='now'?'now':cur.replace('T',' '))+'  # '+r.n+' (기존 '+fmt(r.at)+')'});
 const m=['# 예약 글의 발행 시각 변경(편성 화면에서 표시, '+stamp+' 저장). 한 줄에 「글번호 YYYY-MM-DD HH:MM」 또는 「글번호 now」(지금 발행).','# 블로그 작업 세션이 apply-schedule-file.mjs로 네이버에 반영하고, 반영된 줄은 도구가 지운다.',...mv].join(NL)+NL;
 return {[D.files.queue]:q,[D.files.candidates]:c,[D.files.demote]:d,[D.files.reschedule]:m}}
$('undo').onclick=()=>{S=fresh();savedSnap=null;closePop();say('편집을 모두 되돌렸다.');render()};
$('copy').onclick=async()=>{const f=files(),t=Object.entries(f).map(([n,v])=>'=== '+n+' ===\n'+v).join('\n');try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();document.execCommand('copy');a.remove()}say('네 파일 내용을 복사했다. 작업 세션에 붙여 넣으면 반영한다.')};
// 저장 폴더는 한 번만 고른다. 고른 폴더를 브라우저에 기억해 두고(IndexedDB), 다음부터는 바로 덮어쓴다.
// 브라우저가 권한을 다시 물으면 폴더 고르기가 아니라 「허용」 한 번만 누르면 된다. 「저장 폴더 바꾸기」로 다시 고를 수 있다.
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('fn-blog-board',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const kv=async(mode,fn)=>{const db=await idb();return new Promise((ok,no)=>{const t=db.transaction('kv',mode),q=fn(t.objectStore('kv'));t.oncomplete=()=>ok(q.result);t.onerror=()=>no(t.error)})};
const savedDir=()=>kv('readonly',s=>s.get('dir')).catch(()=>null),keepDir=h=>kv('readwrite',s=>s.put(h,'dir')).catch(()=>{});
async function pickDir(){const dir=await showDirectoryPicker({id:'naver-blog',mode:'readwrite'});
 try{await dir.getFileHandle('posts.json')}catch{say('고른 폴더에 posts.json이 없다. D:\feelandnote\blog-assets\naver-blog 폴더를 고른다.');return null}
 await keepDir(dir);showDir(dir);return dir}
async function targetDir(){let dir=await savedDir();
 if(dir){try{await dir.getFileHandle('posts.json')}catch{dir=null}}
 if(!dir)return pickDir();
 if(await dir.queryPermission({mode:'readwrite'})!=='granted'&&await dir.requestPermission({mode:'readwrite'})!=='granted'){say('폴더에 쓸 권한을 받지 못했다. 다시 누르고 「허용」을 고른다.');return null}
 return dir}
const showDir=d=>{$('dirname').textContent=d?'저장 폴더: '+d.name:'';$('redir').hidden=!d};
$('redir').onclick=async()=>{try{if(await pickDir())say('저장 폴더를 바꿨다.')}catch(e){if(e.name!=='AbortError')say('폴더를 바꾸지 못했다: '+e.message)}};
if(window.showDirectoryPicker)savedDir().then(showDir);
$('save').onclick=async()=>{
 if(!window.showDirectoryPicker)return say('이 브라우저는 폴더에 바로 저장하지 못한다. 「변경 내용 복사」를 쓴다.');
 try{const dir=await targetDir();if(!dir)return;
  let added=0;try{const t=await(await(await dir.getFileHandle(D.files.candidates)).getFile()).text();added=addCands(t.split(/\r?\n/).map(l=>l.trim()).map(l=>!l||l.startsWith('#')?{c:l}:{slug:l.split(/\s+/)[0]}))}catch{}
  for(const [name,text] of Object.entries(files())){const fh=await dir.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(text);await w.close()}
  savedSnap=snapshot(S);render();say('저장했다('+new Date().toTimeString().slice(0,5)+(added?', 파일에 새로 들어와 있던 후보 '+added+'명을 후보군에 더했다':'')+'): '+Object.values(D.files).join(' · ')+'. 네이버의 실제 예약은 블로그 작업 세션이 옮긴 뒤에 바뀐다.');
 }catch(e){say(e.name==='AbortError'?'폴더를 고르지 않아 저장하지 않았다. 편집은 이 브라우저에 그대로 있다.':'저장 실패: '+e.name+' — '+e.message+' / 편집은 이 브라우저에 그대로 있다. 「변경 내용 복사」로 넘길 수도 있다.')}};
const back=restore();
render();
if(back&&!back.saved)say('저장하지 않은 편집 '+changes().length+'건을 되살렸다. 필요 없으면 「되돌리기」를 누른다.');
`;
