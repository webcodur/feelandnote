// 기존 인물 글의 모바일 판형 개편. 문장·사진·링크·예약·공개 설정은 그대로 두고 아래만 바꾼다. 이미 바뀐 단계는 건너뛴다.
//  1) 목차 항목을 왼쪽 선 인용구 하나로 옮긴다(가운데 정렬 → 상자 안 왼쪽 정렬).
//  2) 「목차」 라벨 바로 아래에 서비스 DB로 렌더한 「책장 카드」 사진을 넣는다. 옛 카드(인물 안내 끝 또는 목차 아래)는 바꾼다.
//  3) 「전체 감상 목록」을 표 하나로 다시 넣는다. 국내판 없는 책은 같은 표의 회색 줄이다.
//  4) 글자 크기를 본문 16→15, 소제목 19→16으로 낮춘다(네이버 모바일은 각각 16·17px로 보인다). 「목차」 라벨은 소제목 크기로 키운다.
//  5) 첫 머리 줄 「이름 · 전체 감상 도서 N권 · 이 글에서 N권 소개」(옛 「이름 · N권 중 N권 소개」)를 이름만 남긴다(26.11.12 사용자 지시).
// 한 편: --log=<글 번호> --work=<절대경로> [--apply]
// 일괄: --targets=<절대경로 JSON {tasks:[{logNo}]}> --work=<절대경로> [--limit=N]   (일괄은 항상 저장한다)
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {UNIFIED_ARTICLE} from './lib/unified-article.mjs';
import {celebSlug} from './lib/roster-data.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
import {EDITOR_SELECTOR} from './restyle-body.mjs';
import {openRegistryTarget,isFutureReservation} from './lib/open-registry-target.mjs';
import {personFullListFor} from './apply-person-full-list.mjs';
import {PERSON_FULL_LIST,personFullListSection,personFullListTableHtml} from './lib/person-full-list.mjs';
import {leaveFullListTable} from './apply-institution-revisions.mjs';
import {fragment} from './apply-unified-article.mjs';
import {renderPersonShelfCard} from './lib/person-shelf-card.mjs';

export const MOBILE_LAYOUT = Object.freeze({
  version: 'mobile-layout-4',
  sizes: Object.freeze({16: UNIFIED_ARTICLE.font.body, 19: UNIFIED_ARTICLE.font.heading}),
  cardWidth: 480,
});
const ALL_TEXT = '.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-quotation .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph';
const CONTENTS = '목차', SERVICE_TOC = '필앤노트에서 이어보기';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),wait=ms=>new Promise(r=>setTimeout(r,ms));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2));
const registry='D:/feelandnote/blog-assets/naver-blog/posts.json';
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image'}]:f.kind==='se-quotation'?[{kind:'quote',paragraphs:f.paragraphs.filter(t=>t!=='출처 입력')}]:/(^| )se-table( |$)/.test(f.kind)?[{kind:'table'}]:[{kind:f.kind}]);
const tablesOf=page=>page.$$eval('.se-component.se-table',ts=>ts.map(t=>[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim()))));
// 책장 카드 사진: 이 도구가 올린 shelf-card-<글번호>-… 또는 통합 재작성기가 올린 revision-…-<이름> 책장.png.
const isShelfCard=src=>{if(!src)return false;let s=src;try{s=decodeURIComponent(src);}catch{}return /shelf-card-|[ _]책장\.png/.test(s);};
const stable=ps=>ps.map(({text,align,weights,colors,backgrounds})=>({text,align,weights,colors,backgrounds}));

function loadEnv(){const root=path.resolve(import.meta.dirname,'../../../..');for(const f of ['.env','sw/web-bo/.env']){const p=path.join(root,f);if(fs.existsSync(p))for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}}}
async function query(q){const {data,error}=await q;if(error)throw Error(JSON.stringify(error));return data;}

// 책장 카드 재료: 표와 같은 순서(본문 책 → 제목순)의 표지와 국내판 비율. list는 personFullListFor 결과다.
export async function shelfCardFor(db,slug,list){
 const c=await query(db.from('celebs').select('slug,nickname,title,avatar_url,portrait_url').eq('slug',slug).single()),ko=[];
 for(let i=0;i<list.contentIds.length;i+=100)ko.push(...await query(db.from('content_locales').select('content_id,title,thumbnail_url').in('content_id',list.contentIds.slice(i,i+100)).eq('locale','ko')));
 return {name:c.nickname,title:c.title||'',avatarUrl:c.avatar_url||c.portrait_url,portraitUrl:c.portrait_url||c.avatar_url,serviceUrl:'https://feelandnote.com/celeb/'+c.slug,total:list.contentIds.length,available:list.available.length,unavailable:list.unavailable.length,
  covers:list.contentIds.map(id=>ko.find(l=>l.content_id===id)).filter(l=>l?.thumbnail_url).map(l=>({url:l.thumbnail_url,title:l.title}))};
}

// 편집기 문단(빈 문단 포함 전체 목록의 위치 i)과 실제 글자 크기.
const paragraphs=page=>page.$$eval(ALL_TEXT,ps=>ps.map((p,i)=>{const copy=p.cloneNode(true);copy.querySelectorAll('.se-placeholder').forEach(e=>e.remove());const text=copy.textContent.replace(/\u200b/g,'').trim(),w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),sizes=new Set();while(w.nextNode())if(w.currentNode.textContent.replace(/\u200b/g,'').trim()&&!w.currentNode.parentElement.closest('.se-placeholder'))sizes.add(Math.round(parseFloat(getComputedStyle(w.currentNode.parentElement).fontSize)));return{i,text,comp:p.closest('.se-component')?.id,quote:!!p.closest('.se-quotation'),caption:!!p.closest('.se-caption'),sizes:[...sizes]};}).filter(p=>p.text));

export async function applyMobileLayout({logNo,dir,apply=false},options={}){
 if(!/^\d+$/.test(logNo??'')||!dir||!path.isAbsolute(dir))throw Error('One post number and an absolute work directory are required');
 fs.mkdirSync(dir,{recursive:true});loadEnv();
 const state=(stage,extra={})=>{write(path.join(dir,'mobile-layout-state.json'),{stage,logNo,...extra});console.log(JSON.stringify({stage,logNo,...extra}));options.onState?.({stage,logNo,...extra});};
 const matches=read(registry).filter(p=>String(p.logNo)===String(logNo)&&p.kind==='celeb'&&['ok','check'].includes(p.link));if(matches.length!==1)throw Error('One active person post is required');
 const slugOf=p=>celebSlug(p.slug)||celebSlug(p.url)||celebSlug(read('D:/feelandnote/blog-assets/naver-blog/celeb-drafts.json').find(d=>String(d.logNo)===String(p.logNo))?.target);
 const post={...matches[0],slug:slugOf(matches[0])};if(!post.slug)throw Error('Exact service person slug is required');
 const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);
 const {browser,launched}=options.browser?{browser:options.browser,launched:false}:await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let saved=false;
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 const cdp=await page.createCDPSession();await cdp.send('DOM.enable');await cdp.send('Page.enable');cdp.on('Page.fileChooserOpened',event=>{cdp.__chooser=event;});await cdp.send('Page.setInterceptFileChooserDialog',{enabled:true});
 try{
  await page.setViewport({width:1440,height:options.viewportHeight??1700});const editor=createExistingEditor(page),native=createEditorialEditor(page);state('opening');
  const open=()=>options.openTarget?options.openTarget(page,post):openRegistryTarget(page,post);const opened=await open();await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeFlow=flow(before),beforeStyle=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),beforeTables=await tablesOf(page),beforeParagraphs=await paragraphs(page);
  // 소개 책이 서비스 후보보다 적으면(최대 5권) 판형만 바꾸지 않는다. 책을 채우는 통합 재조립이 판형까지 맡는다.
  const featuredTitles=before.text.map(t=>t.match(/^0[1-9]\s*·\s*『(.+)』$/)?.[1]).filter(Boolean);
  if(Number.isInteger(options.eligible)&&featuredTitles.length<Math.min(UNIFIED_ARTICLE.maxBooks,options.eligible)){state('needs-books',{featured:featuredTitles.length,eligible:options.eligible});return{post,changed:false,needsBooks:true,featured:featuredTitles.length,eligible:options.eligible,reserved:Boolean(opened.reservation)};}
  // 이미 바꾼 단계는 건너뛴다: 목차 인용구가 있으면 목차는 두고, 옛 책장 카드는 새 카드로 바꾸고, 표가 현행이면 표는 둔다.
  const quotes=beforeFlow.filter(o=>o.kind==='quote');
  if(quotes.length>1||quotes.length&&quotes[0].paragraphs.at(-1)!==SERVICE_TOC)throw Error('Unexpected quotation in the person article');
  const needContents=!quotes.length;
  const labels=beforeParagraphs.filter(p=>p.text===CONTENTS&&!p.quote);if(labels.length!==1)throw Error('Exactly one contents label required');
  const items=needContents?beforeParagraphs.filter(p=>p.comp===labels[0].comp&&p.i>labels[0].i):[],contentsTexts=needContents?items.map(p=>p.text):quotes[0].paragraphs;
  if(!contentsTexts.length||contentsTexts.at(-1)!==SERVICE_TOC)throw Error('Exact contents items ending with the service guide required');
  const tocStart=beforeFlow.findIndex(o=>o.kind==='text'&&o.text===CONTENTS);
  // 첫 머리 줄: 권수 안내가 붙어 있으면 이름만 남긴다.
  const headAt=beforeFlow.findIndex(o=>o.kind==='text'),headText=beforeFlow[headAt]?.text??'',headName=headText.match(/^(.+?)\s*·\s*(?:전체\s*감상\s*도서\s*\d+\s*권|\d+\s*권\s*중\s*\d+\s*권\s*소개|도서\s*기록\s*\d+\s*권)/)?.[1]?.trim(),needHead=Boolean(headName);
  if(needHead&&before.text.filter(t=>t===headText).length!==1)throw Error('Person heading is not unique');
  if(needContents&&(!same(beforeFlow.slice(tocStart+1,tocStart+1+items.length).map(o=>o.text),contentsTexts)||beforeFlow[tocStart+1+items.length]?.kind!=='divider'))throw Error('Contents must end at a divider');
  const contentsAt=beforeStyle.findIndex(p=>p.text===CONTENTS);
  if(needContents&&!same(beforeStyle.slice(contentsAt+1,contentsAt+1+items.length).map(p=>p.text),contentsTexts))throw Error('Contents paragraphs differ between readers');
  // 카드 자리: 「목차」 라벨 바로 아래. 옛 판형은 첫 구분선 바로 앞(인물 안내 끝)에 카드가 있었다. 어느 자리든 옛 카드는 걷어내고 새 카드로 바꾼다.
  const firstDivider=beforeFlow.findIndex(o=>o.kind==='divider'),oldCard=isShelfCard(before.images[1]?.src)?before.images[1]:null;
  const cardAt=oldCard?beforeFlow.map((o,i)=>o.kind==='image'?i:-1).filter(i=>i>=0)[1]:-1,legacyCard=Boolean(oldCard)&&cardAt<firstDivider,introEnd=beforeFlow[firstDivider-(legacyCard?2:1)];
  if(firstDivider<2||introEnd?.kind!=='text'||beforeFlow.slice(0,firstDivider).filter(o=>o.kind==='image').length!==(legacyCard?2:1)||before.text.filter(t=>t===introEnd.text).length!==1)throw Error('Exact person introduction before the first divider required');
  if(oldCard&&!legacyCard&&(needContents||cardAt!==tocStart+1))throw Error('Shelf card must sit directly below the contents label');
  // 전체 감상 목록: 마지막 「전체 감상 목록」 문단부터 다음 구분선까지. 표 하나·회색 줄 구성이 아니면 다시 넣는다.
  const list=await personFullListFor(db,post.slug,featuredTitles),section=personFullListSection(list),tableOp=section.find(o=>o.kind==='table'),legend=section.find(o=>o.kind==='text'&&o.role==='label');
  const flHead=beforeFlow.findLastIndex(o=>o.kind==='text'&&o.text===PERSON_FULL_LIST.heading),flEnd=beforeFlow.findIndex((o,i)=>i>flHead&&o.kind==='divider');
  if(flHead<0||flEnd<0||flHead<firstDivider)throw Error('Exact full-list section required');
  const wantedSection=[...(legend?[{kind:'text',text:legend.text}]:[]),{kind:'table'}],wantedTable=[tableOp.columns,...tableOp.rows];
  const mutedRows=()=>page.$$eval('.se-component.se-table tr',rows=>rows.slice(1).map(r=>[...r.querySelectorAll('td')].every(td=>{const spans=[...td.querySelectorAll('span')].filter(s=>s.textContent.replace(/​/g,'').trim());return spans.length&&spans.every(s=>getComputedStyle(s).color==='rgb(170, 170, 170)');})));
  const wantedMuted=tableOp.rows.map((r,k)=>k>=tableOp.rows.length-tableOp.muted);
  const needFullList=!same(beforeFlow.slice(flHead+1,flEnd),wantedSection)||!same(beforeTables,[wantedTable])||!same(await mutedRows(),wantedMuted);
  const legacyLabels=beforeFlow.slice(flHead+1,flEnd).filter(o=>o.kind==='text').map(o=>o.text);
  if(needFullList&&legacyLabels.some(t=>!PERSON_FULL_LIST.legacyLabels.some(l=>t.startsWith(l))&&t!==PERSON_FULL_LIST.legend))throw Error('Unknown text inside the full-list section');
  // 바꿀 글자 크기는 한 문단 안에서 한 가지여야 한다.
  for(const p of beforeParagraphs)if(p.sizes.length!==1)throw Error('Mixed font sizes inside a paragraph: '+p.text.slice(0,40));
  const card=await shelfCardFor(db,post.slug,list),cardPage=await browser.newPage();
  const cardFile=path.join(dir,'shelf-card.png');try{await renderPersonShelfCard(cardPage,card,cardFile);}finally{await cardPage.close();}
  const cardSha=sha(fs.readFileSync(cardFile)),uploadName=`shelf-card-${logNo}-${cardSha.slice(0,12)}.png`,upload=path.join(dir,uploadName);fs.copyFileSync(cardFile,upload);
  write(path.join(dir,'before-layout.json'),{post,opened,snapshot:before,style:beforeStyle,paragraphs:beforeParagraphs,card,needContents,oldCard:Boolean(oldCard),needFullList});

  const edge=(i,which)=>page.evaluate(({sel,i,which})=>{const p=document.querySelectorAll(sel)[i];if(!p)throw Error('Paragraph moved');p.scrollIntoView({block:'center',behavior:'instant'});const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())if(w.currentNode.textContent.replace(/​/g,'').length&&!w.currentNode.parentElement.closest('.se-placeholder'))nodes.push(w.currentNode);
   const n=which==='start'?nodes[0]:nodes.at(-1),r=document.createRange();let k=which==='start'?0:n.length;if(which==='start'){while(n.textContent[k]==='​')k++;r.setStart(n,k);r.setEnd(n,k+1);}else{while(n.textContent[k-1]==='​')k--;r.setStart(n,k-1);r.setEnd(n,k);}
   const b=r.getBoundingClientRect();if(b.top<125||b.bottom>innerHeight-20)throw Error('Paragraph edge outside the safe viewport');return which==='start'?{x:b.left+0.5,y:b.top+b.height/2}:{x:b.right-1,y:b.top+b.height/2};},{sel:ALL_TEXT,i,which});
  const copied=async()=>{await page.evaluate(()=>navigator.clipboard.writeText(''));await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await wait(300);return(await page.evaluate(()=>navigator.clipboard.readText())).split(/\r?\n/).map(t=>t.replace(/​/g,'').trim()).filter(Boolean);};
  const selectRange=async(first,last,texts)=>{const a=await edge(first.i,'start');await page.mouse.click(a.x,a.y);await wait(150);const b=await edge(last.i,'end');await page.keyboard.down('Shift');try{await page.mouse.click(b.x,b.y);}finally{await page.keyboard.up('Shift');}await wait(200);
   const got=await copied();if(!same(got,texts))throw Error('Selected paragraphs differ: '+JSON.stringify({want:texts,got}));};
  // 마지막으로 나오는 해당 문단(인용구 밖) 끝에 커서를 둔다.
  const caretAtEnd=async text=>{const ps=(await paragraphs(page)).filter(p=>p.text===text&&!p.quote&&!p.caption);if(!ps.length)throw Error('Anchor paragraph missing: '+text);const e=await edge(ps.at(-1).i,'end');await page.mouse.click(e.x,e.y);await wait(120);await page.keyboard.press('End');await wait(120);};
  const pasteHtml=async html=>{await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await wait(500);};
  // 문단 끝에서 Delete를 누르면 바로 뒤 사진·표가 먼저 골라지고 다음 Delete에 지워진다.
  const deleteFollowing=async(text,selector,id)=>{await caretAtEnd(text);for(let k=0;k<3&&await page.$('#'+id);k++){await page.keyboard.press('Delete');await wait(500);}if(await page.$('#'+id))throw Error('Component after paragraph was not removed: '+selector);
   // 지운 뒤 편집기가 다음 구분선을 선택해 두고, 그 모양 도구 막대가 바로 위 문단을 덮는다. 제목을 눌러 선택을 푼다.
   const title=await page.$eval('.se-documentTitle .se-text-paragraph',p=>{p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.right-2,y:r.top+r.height/2};});
   await page.mouse.click(title.x,title.y);await wait(200);await page.keyboard.press('End');await wait(100);};
  const dividerStyles=()=>page.$$eval('.se-component.se-horizontalLine',ns=>ns.map(n=>[...n.querySelectorAll('[class*=se-l-], .se-section')].map(e=>[...e.classList].filter(c=>c.startsWith('se-l-')||c.startsWith('se-section-align')).join(' ')).join('|')+'|'+[...n.classList].filter(c=>c.startsWith('se-l-')).join(' ')));
  const beforeDividers=await dividerStyles();

  let quoteId=null;
  // 1) 목차 항목을 지우고 그 자리에 왼쪽 선 인용구를 넣는다.
  if(needContents){
  state('contents-quote');
  await selectRange(items[0],items.at(-1),contentsTexts);await page.keyboard.press('Backspace');await wait(300);
  const quoteIds=await page.$$eval('.se-component.se-quotation',ns=>ns.map(n=>n.id));
  const quoteButton=await page.evaluate(()=>{const b=document.querySelector('.se-toolbar-item-insert-quotation button, .se-toolbar-item-insert-quotation');const r=b?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;});if(!quoteButton)throw Error('Quotation toolbar button missing');
  await page.mouse.click(quoteButton.x,quoteButton.y);await page.waitForFunction(ids=>[...document.querySelectorAll('.se-component.se-quotation')].some(n=>!ids.includes(n.id)),{timeout:10000},quoteIds);
  quoteId=await page.$$eval('.se-component.se-quotation',(ns,ids)=>ns.find(n=>!ids.includes(n.id)).id,quoteIds);
  await page.waitForSelector('.se-quotation-quotation_line-toolbar-button',{visible:true,timeout:10000});
  const lineStyle=await page.evaluate(()=>{const b=document.querySelector('.se-quotation-quotation_line-toolbar-button');const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.mouse.click(lineStyle.x,lineStyle.y);
  await page.waitForFunction(id=>document.getElementById(id)?.classList.contains('se-l-'+'quotation_line'),{timeout:10000},quoteId);
  // 첫 줄이 사라지지 않도록 커서가 인용구 본문 문단에 들어간 뒤 입력한다.
  await wait(300);
  const quoteBody=await page.$eval('#'+quoteId,n=>{const p=[...n.querySelectorAll('.se-text-paragraph')].find(p=>!p.closest('[class*=cite]'));p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.left+4,y:r.top+r.height/2};});
  await page.mouse.click(quoteBody.x,quoteBody.y);await wait(200);
  for(const [k,item]of contentsTexts.entries()){if(k)await page.keyboard.press('Enter');await page.keyboard.sendCharacter(item);await wait(80);}
  await wait(400);
  const typed=(await paragraphs(page)).filter(p=>p.comp===quoteId).map(p=>p.text);
  if(!same(typed,contentsTexts))throw Error('Contents quotation text differs: '+JSON.stringify(typed));
  // 지운 목차 자리에 남은 빈 문단은 「목차」와 인용구 사이를 벌린다. 빈 문단에서 Backspace로 줄만 없앤다.
  for(let k=0;k<3;k++){
   const blank=await page.$eval('#'+labels[0].comp,n=>{const p=[...n.querySelectorAll('.se-text-paragraph')].at(-1);if(!p||p.textContent.replace(/​/g,'').trim())return null;p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.left+4,y:r.top+r.height/2};});
   if(!blank)break;await page.mouse.click(blank.x,blank.y);await wait(120);await page.keyboard.press('Backspace');await wait(200);
  }
  const labelBlock=await page.$eval('#'+labels[0].comp,n=>[...n.querySelectorAll('.se-text-paragraph')].map(p=>p.textContent.replace(/​/g,'').trim()));
  if(!same(labelBlock.filter(Boolean),[CONTENTS])||labelBlock.at(-1)!==CONTENTS)throw Error('Contents label paragraph is not directly above the quotation');
  }else quoteId=await page.$eval('.se-component.se-quotation',n=>n.id);

  // 1-1) 첫 머리 줄을 이름만 남긴다. 고른 글자 위에 이름을 입력해 서식을 그대로 이어받는다.
  if(needHead){
   state('heading');const ps=(await paragraphs(page)).filter(p=>p.text===headText&&!p.quote);if(ps.length!==1)throw Error('Heading paragraph missing');
   await selectRange(ps[0],ps[0],[headText]);await page.keyboard.sendCharacter(headName);await wait(400);
   if(!(await paragraphs(page)).some(p=>p.text===headName&&!p.quote))throw Error('Heading name was not typed');
  }
  // 1-2) 「목차」 라벨을 소제목 크기로 키운다. 카드를 넣은 뒤에는 사진 도구 막대가 라벨을 덮어 선택이 사진으로 새므로 카드보다 먼저 한다.
  {const tp=(await paragraphs(page)).filter(p=>p.text===CONTENTS&&!p.quote);if(tp.length!==1)throw Error('Contents label missing');
   if(tp[0].sizes[0]!==UNIFIED_ARTICLE.font.heading){state('contents-size');await selectRange(tp[0],tp[0],[CONTENTS]);await native.fontSize(UNIFIED_ARTICLE.font.heading);await page.keyboard.press('Escape');}}

  // 2) 옛 카드를 걷어내고 「목차」 라벨 바로 아래에 새 책장 카드를 올린다.
  state('shelf-card');
  if(oldCard)await deleteFollowing(legacyCard?introEnd.text:CONTENTS,'old shelf card',oldCard.id);
  await caretAtEnd(CONTENTS);
  const imageIds=await page.$$eval('.se-component.se-image',ns=>ns.map(n=>n.id));
  const imageButton=await page.evaluate(()=>{const e=document.querySelector('.se-toolbar-item-image button, .se-toolbar-item-image');const r=e?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;});if(!imageButton)throw Error('Photo toolbar button missing');
  cdp.__chooser=null;await page.mouse.click(imageButton.x,imageButton.y);for(let k=0;k<24&&!cdp.__chooser;k++)await wait(250);if(!cdp.__chooser)throw Error('Photo file chooser did not open');
  await cdp.send('DOM.setFileInputFiles',{files:[upload],backendNodeId:cdp.__chooser.backendNodeId});
  await page.waitForFunction(ids=>{const n=[...document.querySelectorAll('.se-component.se-image')].find(n=>!ids.includes(n.id)),img=n?.querySelector('img');return img?.complete&&img.naturalWidth>1&&/^https?:/.test(img.src);},{timeout:60000},imageIds);
  const cardId=await page.$$eval('.se-component.se-image',(ns,ids)=>ns.find(n=>!ids.includes(n.id)).id,imageIds);
  const clickCard=async()=>{const p=await page.$eval('#'+cardId+' img',n=>{n.scrollIntoView({block:'center',behavior:'instant'});const r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.mouse.click(p.x,p.y);await wait(300);};
  await clickCard();
  const resize=await page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.offsetParent&&/크기 변경 열기/.test(x.getAttribute('aria-label')||x.textContent));const r=e?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;});if(!resize)throw Error('Photo resize control missing');
  await page.mouse.click(resize.x,resize.y);await page.waitForFunction(()=>[...document.querySelectorAll('[class*=resizing-input] input, input[class*=resizing-input]')].some(e=>e.offsetParent&&!e.disabled),{timeout:5000});
  const input=await page.evaluate(()=>{const e=[...document.querySelectorAll('[class*=resizing-input] input, input[class*=resizing-input]')].find(e=>e.offsetParent&&!e.disabled);const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
  await page.mouse.click(input.x,input.y,{clickCount:3});await wait(150);await page.keyboard.type(String(MOBILE_LAYOUT.cardWidth),{delay:40});await page.keyboard.press('Enter');
  await page.waitForFunction(({id,w})=>Math.abs(document.querySelector('#'+id+' img').getBoundingClientRect().width-w)<=30,{timeout:5000},{id:cardId,w:MOBILE_LAYOUT.cardWidth});
  for(let k=0;k<4&&!(await page.$eval('#'+cardId,n=>!!n.querySelector('.se-section-align-center')));k++){await clickCard();const hit=await page.evaluate(()=>{const b=[...document.querySelectorAll('button.se-context-toolbar-cycle-toggle-button')].find(b=>b.offsetParent&&/se-align-center/.test(b.className));if(!b)return false;b.click();return true;});if(!hit)throw Error('Photo alignment control missing');await wait(300);}
  if(!(await page.$eval('#'+cardId,n=>!!n.querySelector('.se-section-align-center'))))throw Error('Shelf card is not centered');
  await page.keyboard.press('Escape');
  // 카드 선택이 남으면 그 도구 막대가 위 「목차」 라벨을 덮는다. 제목을 눌러 선택을 푼다.
  {const t=await page.$eval('.se-documentTitle .se-text-paragraph',p=>{p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.right-2,y:r.top+r.height/2};});await page.mouse.click(t.x,t.y);await wait(200);await page.keyboard.press('End');await wait(100);}

  // 3) 전체 감상 목록: 옛 표를 뒤에서부터 지우고, 라벨을 회색 안내로 바꾸거나 지운 뒤 표 하나를 붙인다.
  if(needFullList){
   state('full-list');
   const sectionTables=await page.evaluate(head=>{const ps=[...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')].filter(p=>p.textContent.replace(/​/g,'').trim()===head);let c=ps.at(-1).closest('.se-component').nextElementSibling;const out=[];while(c&&!c.classList.contains('se-horizontalLine')){if(c.classList.contains('se-table')){let prev=c.previousElementSibling;const label=[...prev.querySelectorAll('.se-text-paragraph')].map(p=>p.textContent.replace(/​/g,'').trim()).filter(Boolean).at(-1);out.push({id:c.id,label});}c=c.nextElementSibling;}return out;},PERSON_FULL_LIST.heading);
   for(const t of [...sectionTables].reverse())await deleteFollowing(t.label,'full-list table',t.id);
   const labelsNow=legacyLabels.filter(t=>t!==PERSON_FULL_LIST.legend);
   if(legend&&!legacyLabels.includes(PERSON_FULL_LIST.legend)){
    const first=labelsNow.shift();
    if(first){await native.selectParagraph(first);if((await copied()).join('\n')!==first)throw Error('Selected label differs: '+first);await pasteHtml(fragment([{...legend,gapBefore:false}]));}
    else{await caretAtEnd(PERSON_FULL_LIST.heading);await page.keyboard.press('Enter');await pasteHtml(fragment([{...legend,gapBefore:false}]));}
   }
   if(!legend&&legacyLabels.includes(PERSON_FULL_LIST.legend))labelsNow.push(PERSON_FULL_LIST.legend);
   // 라벨 글자를 골라 지운 뒤, 남은 빈 문단이 첫 문단이 아니면 한 번 더 지워 위 문단에 붙인다.
   for(const t of labelsNow){
    const ps=(await paragraphs(page)).filter(p=>p.text===t&&!p.quote);if(ps.length!==1)throw Error('Legacy label is not unique: '+t);
    await selectRange(ps[0],ps[0],[t]);await page.keyboard.press('Backspace');await wait(200);
    const blank=await page.evaluate(()=>{const s=getSelection(),n=s?.anchorNode,p=(n?.nodeType===1?n:n?.parentElement)?.closest('.se-text-paragraph'),c=p?.closest('.se-component');return Boolean(s?.isCollapsed&&p&&!p.textContent.replace(/​/g,'').trim()&&[...c.querySelectorAll('.se-text-paragraph')].indexOf(p)>0);});
    if(blank){await page.keyboard.press('Backspace');await wait(200);}
    if((await paragraphs(page)).some(p=>p.text===t))throw Error('Legacy label remains: '+t);
   }
   const tables=await page.$$eval('.se-component.se-table',n=>n.length);
   await caretAtEnd(legend?legend.text:PERSON_FULL_LIST.heading);await pasteHtml(personFullListTableHtml(tableOp));
   await page.waitForFunction(n=>document.querySelectorAll('.se-component.se-table').length===n+1,{timeout:15000},tables);await wait(400);await leaveFullListTable(page);
  }

  // 4) 글자 크기: 같은 구성요소 안에서 이어지는 같은 크기 문단을 한 번에 고른다. 목차 인용구는 본문 크기로 맞춘다.
  state('font-sizes');
  const now=await paragraphs(page),runs=[];
  for(const p of now){
   const target=p.quote&&p.comp===quoteId?UNIFIED_ARTICLE.font.body:p.caption?null:!p.quote&&p.text===CONTENTS?UNIFIED_ARTICLE.font.heading:MOBILE_LAYOUT.sizes[p.sizes[0]];
   if(!target||p.sizes[0]===target)continue;
   const last=runs.at(-1),prev=now[now.indexOf(p)-1];
   if(last&&last.comp===p.comp&&last.target===target&&last.items.at(-1)===prev)last.items.push(p);else runs.push({comp:p.comp,target,items:[p]});
  }
  for(const run of runs){await selectRange(run.items[0],run.items.at(-1),run.items.map(p=>p.text));await native.fontSize(run.target);}
  await page.keyboard.press('Escape');

  // 기대 구성: 뒤에서부터 바꿔 앞쪽 위치가 흔들리지 않게 한다.
  const expected=beforeFlow.slice();
  if(needHead)expected[headAt]={kind:'text',text:headName};
  if(needFullList)expected.splice(flHead+1,flEnd-flHead-1,...wantedSection);
  if(needContents)expected.splice(tocStart+1,items.length,{kind:'quote',paragraphs:contentsTexts});
  if(!oldCard||legacyCard){expected.splice(tocStart+1,0,{kind:'image'});if(legacyCard)expected.splice(cardAt,1);}
  const removedTexts=new Set([...(needFullList?legacyLabels:[])]);
  // 회색 안내 문단은 양쪽에서 빼고 아래 전용 검사로 확인한다(이미 있던 안내를 한쪽만 빼면 어긋났다).
  const prior=beforeStyle.filter((p,k)=>!(needContents&&k>contentsAt&&k<=contentsAt+items.length)&&!removedTexts.has(p.text)&&!(legend&&p.text===legend.text)).map(p=>needHead&&p.text===headText?{...p,text:headName}:p);
  const check=async()=>{
   const current=await readSnapshot(page);
   if(current.title!==before.title)throw Error('Title changed');
   if(!same(current.links,before.links))throw Error('Links changed: '+JSON.stringify({before:before.links,after:current.links}));
   const got=flow(current),at=[...Array(Math.max(got.length,expected.length)).keys()].find(k=>!same(got[k],expected[k]));
   if(at!==undefined)throw Error('Component order changed at '+at+': '+JSON.stringify({expected:expected.slice(at,at+3),actual:got.slice(at,at+3)}));
   if(!same(await dividerStyles(),beforeDividers))throw Error('Divider style changed');
   if(!same(await tablesOf(page),[wantedTable]))throw Error('Full-list table differs from the service shelf');
   if(!same(await mutedRows(),wantedMuted))throw Error('Gray rows for books without a Korean edition differ');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im),wanted=identity(before.images),actual=identity(current.images);if(oldCard)wanted.splice(1,1);const cardImage=actual.splice(1,1)[0];
   if(!same(actual,wanted)||!cardImage?.src.includes(`shelf-card-${logNo}-${cardSha.slice(0,12)}`)||cardImage.representative||Number(cardImage.width)!==MOBILE_LAYOUT.cardWidth)throw Error('Photos, representative or shelf card identity differ');
   const style=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),body=style.filter(p=>!(legend&&p.text===legend.text));
   if(!same(stable(body),stable(prior))){const a=stable(prior),b=stable(body),k=[...Array(Math.max(a.length,b.length)).keys()].find(k=>!same(a[k],b[k]));throw Error('Text, alignment, weight or color changed outside the edited parts: '+JSON.stringify({at:k,before:a[k],after:b[k]}).slice(0,600));}
   for(const [k,p]of body.entries()){const was=prior[k].sizes[0],want=p.text===CONTENTS?UNIFIED_ARTICLE.font.heading:prior[k].sizes.every(s=>s===was)?(MOBILE_LAYOUT.sizes[was]??was):null;if(want===null||p.sizes.some(s=>s!==want))throw Error('Font size differs: '+p.text.slice(0,40)+' '+JSON.stringify({before:prior[k].sizes,after:p.sizes}));}
   if(legend){const l=style.filter(p=>p.text===legend.text);if(l.length!==1||l[0].align!=='center'||l[0].sizes.some(s=>s!==UNIFIED_ARTICLE.font.label))throw Error('Full-list legend differs');}
   const quote=(await paragraphs(page)).filter(p=>p.quote);if(!same(quote.map(p=>p.text),contentsTexts)||quote.some(p=>p.sizes[0]!==UNIFIED_ARTICLE.font.body))throw Error('Contents quotation differs');
   return{current,texts:style.map(p=>p.text)};
  };
  const ready=await check();
  if(options.capture!==false){for(const [name,text]of [['top',introEnd.text],['contents',CONTENTS],['full-list',PERSON_FULL_LIST.heading]]){await page.evaluate(t=>[...document.querySelectorAll('.se-component.se-text .se-text-paragraph')].filter(p=>p.textContent.replace(/​/g,'').trim()===t).at(-1)?.scrollIntoView({block:'start',behavior:'instant'}),text);await page.evaluate(()=>scrollBy(0,-200));await page.screenshot({path:path.join(dir,'editor-'+name+'.png')});}}
  write(path.join(dir,'ready-layout.json'),{snapshot:ready.current,cardSha});state('ready-for-review');
  if(!apply)return{post,changed:false,dryRun:true,cardSha};
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},logNo);saved=true;state('saved-reopening');
  const reopened=await open();await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');await closePublishPanel(page,editor);
  const verified=await check();write(path.join(dir,'saved-layout.json'),{verified:true,snapshot:verified.current,cardSha});
  const posts=read(registry),p=posts.find(p=>String(p.logNo)===String(logNo));if(!p||slugOf(p)!==post.slug)throw Error('Registry identity changed');
  p.mobileLayout={version:MOBILE_LAYOUT.version,cardSha256:cardSha,verifiedAt:new Date().toISOString()};delete p.unified;
  p.fullList={sourceHash:crypto.createHash('sha256').update(JSON.stringify({available:list.available,unavailable:list.unavailable})).digest('hex'),books:list.available.length+list.unavailable.length,unavailable:list.unavailable.length,layout:'single-table',verifiedAt:new Date().toISOString()};
  if(p.bodyStyle)p.bodyStyle={...p.bodyStyle,...textsDigest(verified.texts)};write(registry,posts);state('saved-and-reopened');
  return{post,changed:true,cardSha,texts:verified.texts,contents:contentsTexts,reserved:Boolean(reopened.reservation)};
 }catch(error){state('failed',{saved,error:String(error)});await page.screenshot({path:path.join(dir,'layout-failure.png')}).catch(()=>{});throw error;}
 finally{await cdp.detach().catch(()=>{});await focus.detach().catch(()=>{});await page.close().catch(()=>{});if(!options.browser){await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}}
}

// 공개 모바일 화면: 문장 목록, 목차 인용구, 사진 수, 본문 글자 크기(15 → 16px)를 확인하고 찍어 둔다.
export async function verifyMobileLayoutPublic(browser,result,dir,{capture=false}={}){
 if(result.reserved||!result.changed)return result.reserved?'reserved':'unchanged';const page=await browser.newPage();try{
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});await page.setCacheEnabled(false);await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  for(let attempt=0;attempt<3;attempt++){
   await page.goto(`https://m.blog.naver.com/dmx777/${result.post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.se-main-container',{timeout:20000});
   const shown=await page.evaluate(()=>{const t=p=>p.textContent.replace(/\u200b/g,'').trim(),body=[...document.querySelectorAll('.se-main-container .se-component.se-text .se-text-paragraph')].filter(p=>t(p)).map(p=>({text:t(p),size:Math.round(parseFloat(getComputedStyle(p.querySelector('span')??p).fontSize))}));return{body,quote:[...document.querySelectorAll('.se-main-container .se-component.se-quotation .se-text-paragraph')].map(t).filter(Boolean)};});
   const texts=shown.body.map(p=>p.text),bodyText=result.texts.find(t=>t.length>80);
   if(same(shown.quote,result.contents)&&same(texts,result.texts.filter(t=>shown.body.some(p=>p.text===t)))&&shown.body.find(p=>p.text===bodyText)?.size===16){
    if(capture){await page.evaluate(()=>[...document.querySelectorAll('.se-text-paragraph')].find(p=>p.textContent.replace(/\u200b/g,'').trim()==='목차')?.scrollIntoView({block:'start',behavior:'instant'}));await page.evaluate(()=>scrollBy(0,-700));await page.screenshot({path:path.join(dir,'public-mobile.png'),fullPage:false});}
    return'public';
   }
   if(attempt<2){await wait(1500);continue;}throw Error('Published mobile layout differs from the verified native article');
  }
 }finally{await page.close();}
}

async function runBatch(args){
 const arg=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),targets=arg('targets'),work=arg('work'),limit=arg('limit')?Number(arg('limit')):Infinity;
 if(!targets||!work||![targets,work].every(path.isAbsolute)||!(limit>0)||args.some(a=>!/^--(targets|work|limit)=/.test(a)))throw Error('Explicit --targets and --work required');
 const selected=read(targets).tasks;if(!Array.isArray(selected)||!selected.length||selected.some(t=>!/^\d+$/.test(t.logNo))||new Set(selected.map(t=>t.logNo)).size!==selected.length)throw Error('Exact unique post numbers required');
 fs.mkdirSync(work,{recursive:true});const stateFile=path.join(work,'batch-state.json'),state=fs.existsSync(stateFile)?read(stateFile):{total:selected.length,completed:[],failed:[]};
 if(state.total!==selected.length||state.completed.some(t=>!selected.some(s=>s.logNo===t.logNo)))throw Error('Target file differs from this batch');
 state.failed=[];state.stage='running';state.startedAt??=new Date().toISOString();
 const report=()=>{state.updatedAt=new Date().toISOString();const temp=stateFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,stateFile);};report();
 const posts=read(registry),postOf=t=>posts.find(p=>String(p.logNo)===String(t.logNo));
 const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
 try{
  const done=new Set(state.completed.map(t=>t.logNo)),remaining=selected.filter(t=>!done.has(t.logNo)).sort((a,b)=>Number(isFutureReservation(postOf(a)??{}))-Number(isFutureReservation(postOf(b)??{})));let count=0;
  for(const target of remaining){
   if(count>=limit||fs.existsSync(path.join(work,'stop'))){state.stage='chunk-complete';break;}
   const started=Date.now(),folder=path.join(work,target.logNo),capture=state.completed.length<3||state.completed.length%20===0;state.current={...target,phase:'opening'};report();
   try{
    const result=await applyMobileLayout({logNo:target.logNo,dir:folder,apply:true},{browser,capture,eligible:target.eligible,onState:event=>{state.current={...target,phase:event.stage};report();}});
    state.current.phase='verifying-public';report();const visibility=result.needsBooks?'needs-books':await verifyMobileLayoutPublic(browser,result,folder,{capture});
    state.completed.push({logNo:target.logNo,visibility,...(result.needsBooks?{featured:result.featured,eligible:result.eligible}:{}),seconds:Math.round((Date.now()-started)/1000),cardSha:result.cardSha});state.current=null;count++;report();
    console.log(JSON.stringify({event:'completed',completed:state.completed.length,total:state.total,logNo:target.logNo,seconds:Math.round((Date.now()-started)/1000)}));
    for(const name of fs.readdirSync(folder)){const file=path.join(folder,name);if(fs.statSync(file).isFile()&&name.endsWith('.json'))fs.unlinkSync(file);}
   }catch(error){state.failed.push({...target,error:String(error)});state.stage='failed';report();throw error;}
  }
  if(state.completed.length===state.total)state.stage='complete';else if(state.stage==='running')state.stage='chunk-complete';state.current=null;report();
 }finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(a=>a.startsWith('--targets=')))await runBatch(args);
 else{
  const logNo=args.find(a=>a.startsWith('--log='))?.slice(6),dir=args.find(a=>a.startsWith('--work='))?.slice(7);if(args.some(a=>!/^--(log|work)=/.test(a)&&a!=='--apply'))throw Error('--log=<post> --work=<absolute dir> [--apply]');
  const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
  try{const result=await applyMobileLayout({logNo,dir,apply:args.includes('--apply')},{browser});if(result.changed)console.log(JSON.stringify({visibility:await verifyMobileLayoutPublic(browser,result,dir,{capture:true})}));}
  finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
 }
}
