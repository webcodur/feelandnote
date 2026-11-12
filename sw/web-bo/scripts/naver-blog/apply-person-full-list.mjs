// 기존 인물 글에 서비스 「전체 감상 목록」 구획(번호·제목·저자 표, 국내판 없음·절판 분리)만 끼워 넣는다.
// 책 소개·사진·링크는 다시 쓰지 않는다. 목차에 항목을 더하고, 마지막 책 다음 구분선 뒤에 구획을 둔다.
// 한 편: --log=<글 번호> --work=<절대경로> [--apply] [--refresh]   (--refresh: 이미 구획이 있고 서비스 책장이 바뀌었으면 표만 새로 바꾼다)
// 일괄: --targets=<절대경로 JSON {tasks:[{logNo,slug}]}> --work=<절대경로> [--limit=N]   (일괄은 항상 저장한다)
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {leaveFullListTable} from './apply-institution-revisions.mjs';
import {replaceTableAfter} from './lib/replace-table.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {fragment} from './apply-unified-article.mjs';
import {textPresentation} from './lib/unified-article.mjs';
import {insertDivider} from './publish-drafts.mjs';
import {celebSlug} from './lib/roster-data.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
import {openRegistryTarget,isFutureReservation} from './lib/open-registry-target.mjs';
import {PERSON_FULL_LIST,personFullList,personFullListSection,personFullListTableHtml} from './lib/person-full-list.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),wait=ms=>new Promise(r=>setTimeout(r,ms));
const hash=s=>crypto.createHash('sha256').update(s??'').digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2));
const registry='D:/feelandnote/blog-assets/naver-blog/posts.json';
const selector='.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph';
const SERVICE_TOC='필앤노트에서 이어보기',QUOTE_TOC='인용구',BOOK_DETAIL='작품 상세';
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:/(^| )se-table( |$)/.test(f.kind)?[{kind:'table'}]:[{kind:f.kind}]);
const stableStyles=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
const hex=rgb=>'#'+rgb.match(/\d+/g).slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
const tablesOf=page=>page.$$eval('.se-component.se-table',ts=>ts.map(t=>[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim()))));

function loadEnv(){const root=path.resolve(import.meta.dirname,'../../../..');for(const f of ['sw/web-bo/.env','sw/web/.env']){const p=path.join(root,f);if(fs.existsSync(p))for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}}}
async function query(q){const {data,error}=await q;if(error)throw Error(JSON.stringify(error));return data;}
async function chunks(db,table,fields,key,values,filter=q=>q){const rows=[];for(let i=0;i<values.length;i+=100)rows.push(...await query(filter(db.from(table).select(fields).in(key,values.slice(i,i+100)))));return rows;}

// 원장 글의 본문 책 순서(01~05)를 서비스 작품에 맞춰 표의 앞자리에 둔다. 준비 단계(prepare-unified-articles)와 같은 집합이다.
export async function personFullListFor(db,slug,featuredTitles=[]){
 const c=await query(db.from('celebs').select('id').eq('slug',slug).single());
 const relations=await query(db.from('celeb_contents').select('content_id').eq('celeb_id',c.id).eq('status','FINISHED').eq('visibility','public'));
 const types=await chunks(db,'contents','id,type','id',[...new Set(relations.map(r=>r.content_id))]),bookIds=types.filter(t=>t.type==='BOOK').map(t=>t.id);
 const rows=await chunks(db,'content_locales','content_id,locale,title,creator,sources','content_id',bookIds),pick=(id,locale)=>rows.find(r=>r.content_id===id&&r.locale===locale);
 const books=bookIds.map(id=>({content_id:id,ko:pick(id,'ko'),en:pick(id,'en')}));
 const featured=featuredTitles.map(t=>t.replace(/\s*\(원서\)$/,'')).map(t=>books.filter(b=>b.ko?.title===t||b.en?.title===t)).map(m=>m.length===1?m[0].content_id:null).filter(Boolean);
 return {...personFullList(books,featured),source:'celeb_contents:'+c.id};
}

export async function applyPersonFullList({logNo,dir,apply=false},options={}){
 if(!/^\d+$/.test(logNo??'')||!dir||!path.isAbsolute(dir))throw Error('One post number and an absolute work directory are required');
 fs.mkdirSync(dir,{recursive:true});loadEnv();
 const state=(stage,extra={})=>{write(path.join(dir,'full-list-state.json'),{stage,logNo,...extra});console.log(JSON.stringify({stage,logNo,...extra}));options.onState?.({stage,logNo,...extra});};
 const matches=read(registry).filter(p=>String(p.logNo)===String(logNo)&&p.kind==='celeb'&&['ok','check'].includes(p.link));if(matches.length!==1)throw Error('One active person post is required');
 const slugOf=p=>celebSlug(p.slug)||celebSlug(p.url)||celebSlug(read('D:/feelandnote/blog-assets/naver-blog/celeb-drafts.json').find(d=>String(d.logNo)===String(p.logNo))?.target);
 const post={...matches[0],slug:slugOf(matches[0])};if(!post.slug)throw Error('Exact service person slug is required');
 const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);
 const {browser,launched}=options.browser?{browser:options.browser,launched:false}:await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let saved=false;
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 try{
  await page.setViewport({width:1440,height:options.viewportHeight??1100});const editor=createExistingEditor(page),native=createEditorialEditor(page);state('opening');
  const open=()=>options.openTarget?options.openTarget(page,post):openRegistryTarget(page,post);const opened=await open();await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,selector),beforeFlow=flow(before);
  const featuredTitles=before.text.map(t=>t.match(/^0[1-9]\s*·\s*『(.+)』$/)?.[1]).filter(Boolean);
  const list=await personFullListFor(db,post.slug,featuredTitles),section=personFullListSection(list),sectionTexts=section.filter(o=>o.kind==='text').map(o=>o.text),wantedTables=section.filter(o=>o.kind==='table').map(o=>[o.columns,...o.rows]),sourceHash=hash(JSON.stringify({available:list.available,unavailable:list.unavailable}));
  let check;const existingTables=before.text.includes(PERSON_FULL_LIST.heading)?await tablesOf(page):null;
  if(existingTables&&same(existingTables,wantedTables)){state('existing-verified');return{post,changed:false,sourceHash,texts:beforeStyle.map(p=>p.text),reserved:Boolean(opened.reservation),tables:wantedTables.length};}
  if(existingTables){
   // 서비스 책장이 바뀌어 표만 다르면 --refresh로 표만 바꾼다. 구획 문구가 그대로일 때만 한다.
   if(!options.refresh)throw Error('A different full-list section already exists; rerun with --refresh to replace only its table');
   const found=await page.$$eval('.se-component.se-table',ts=>ts.map(t=>({id:t.id,previous:[...(t.previousElementSibling?.querySelectorAll('.se-text-paragraph')??[])].map(p=>p.textContent.replace(/\u200b/g,'').trim()).filter(Boolean).at(-1)??null}))),tableOps=section.filter(o=>o.kind==='table');
   if(found.length!==1||tableOps.length!==1||found[0].previous!==sectionTexts.at(-1))throw Error('Refresh needs one full-list table right after the unchanged section text');
   for(const text of sectionTexts)if(!before.text.includes(text))throw Error('Full-list section text changed: '+text);
   write(path.join(dir,'before-refresh.json'),{post,opened,snapshot:before,style:beforeStyle,tables:existingTables,list});
   state('refreshing');await replaceTableAfter(page,{tableId:found[0].id,previousText:sectionTexts.at(-1),html:personFullListTableHtml(tableOps[0])});
   check=async()=>{
    const current=await readSnapshot(page);if(current.title!==before.title||!same(current.links,before.links)||!same(flow(current),beforeFlow)||current.dividers!==before.dividers)throw Error('Existing title, links or section order changed');
    if(!same(await tablesOf(page),wantedTables))throw Error('Refreshed full-list table differs from the service shelf');
    const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Existing photos or representative image changed');
    const actual=await page.evaluate(readParagraphPresentation,selector);if(!same(stableStyles(actual),stableStyles(beforeStyle)))throw Error('Typography changed during table refresh');
    return{current,texts:actual.map(p=>p.text)};
   };
  }else{
  if((await tablesOf(page)).length)throw Error('Unexpected existing table in the person article');
  // 목차 경계: 인용구가 있으면 그 앞, 없으면 서비스 안내 앞.
  const tocStart=beforeFlow.findIndex(o=>o.kind==='text'&&o.text==='목차'),tocEnd=beforeFlow.findIndex((o,i)=>i>tocStart&&o.kind!=='text');
  const toc=beforeFlow.slice(tocStart+1,tocEnd).map(o=>o.text);if(tocStart<0||!toc.includes(SERVICE_TOC))throw Error('Exact existing table of contents required');
  const tocBoundary=toc.includes(QUOTE_TOC)?QUOTE_TOC:SERVICE_TOC;
  // 구획 경계: 마지막 「작품 상세」 뒤 구분선 다음 문단(인용구 또는 서비스 안내).
  const lastDetail=beforeFlow.map(o=>o.text).lastIndexOf(BOOK_DETAIL);
  if(lastDetail<0||beforeFlow[lastDetail+1]?.kind!=='divider'||beforeFlow[lastDetail+2]?.kind!=='text')throw Error('Exact divider after the last book required');
  const boundary=beforeFlow[lastDetail+2].text;
  for(const text of [tocBoundary,boundary,...sectionTexts])if(before.text.filter(t=>t===text).length!==(text===tocBoundary||text===boundary?1:0))throw Error('Insertion boundary or section text is not unique: '+text);
  const styleOf=text=>{const p=beforeStyle.find(p=>p.text===text);if(!p||p.sizes.some(s=>s!==16)||new Set(p.colors).size!==1||p.backgrounds.some(b=>b!=='transparent'))throw Error('Unsupported boundary presentation: '+JSON.stringify(p));return{kind:'text',text,role:'body',align:p.align,bold:p.weights.every(w=>w>=600),color:hex(p.colors[0]),gapBefore:false};};
  const tocOp=styleOf(tocBoundary),boundaryOp=styleOf(boundary);
  write(path.join(dir,'before-insertion.json'),{post,opened,snapshot:before,style:beforeStyle,list});
  const pasteHtml=async html=>{await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await wait(400);};
  const copiedSelection=async()=>{await page.evaluate(()=>navigator.clipboard.writeText(''));await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await wait(300);return(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\u200b/g,'').trim();};
  const replaceParagraph=async(text,ops)=>{await native.selectParagraph(text,{occurrence:0});if(await copiedSelection()!==text)throw Error('Actual selected text differs from insertion boundary');await pasteHtml(fragment(ops));};
  const caretAtStart=async text=>{
   const point=await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph',(nodes,text)=>{const p=nodes.find(p=>p.textContent.replace(/\u200b/g,'').trim()===text);if(!p)throw Error('Boundary paragraph disappeared');p.scrollIntoView({block:'center',behavior:'instant'});const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(w.nextNode())if(w.currentNode.textContent.replace(/\u200b/g,'').length){n=w.currentNode;break;}let s=0;while(n.textContent[s]==='\u200b')s++;const r=document.createRange();r.setStart(n,s);r.setEnd(n,s+1);const b=r.getBoundingClientRect();return{x:b.left-2,y:b.top+b.height/2};},text);
   await page.mouse.click(point.x,point.y);await wait(150);
   const atStart=await page.evaluate(text=>{const s=getSelection(),n=s?.anchorNode,p=(n?.nodeType===1?n:n?.parentElement)?.closest('.se-text-paragraph');if(!s?.isCollapsed||p?.textContent.replace(/\u200b/g,'').trim()!==text)return false;const r=document.createRange();r.selectNodeContents(p);r.setEnd(n,s.anchorOffset);return !r.toString().replace(/\u200b/g,'');},text);if(!atStart)throw Error('Caret is not at the start of '+text);
  };
  state('inserting');
  await replaceParagraph(tocBoundary,[{kind:'text',text:PERSON_FULL_LIST.heading,role:'body',align:tocOp.align,bold:false,gapBefore:false},tocOp]);
  const textOps=section.filter(o=>o.kind==='text'),tables=section.filter(o=>o.kind==='table');
  for(const [i,table]of tables.entries()){
   const labels=i===0?[{...textOps[0],gapBefore:false},textOps[1]]:[textOps[2]];
   await replaceParagraph(boundary,[...labels,boundaryOp]);
   const count=(await tablesOf(page)).length;await caretAtStart(boundary);await pasteHtml(personFullListTableHtml(table));
   await page.waitForFunction(n=>document.querySelectorAll('.se-component.se-table').length===n+1,{timeout:15000},count);await wait(400);await leaveFullListTable(page);
  }
  await caretAtStart(boundary);await insertDivider(page,{waitForState:true});await page.keyboard.press('Escape');
  const added=new Set(sectionTexts);
  const expected=beforeFlow.slice();expected.splice(expected.findIndex(o=>o.kind==='text'&&o.text===tocBoundary),0,{kind:'text',text:PERSON_FULL_LIST.heading});
  expected.splice(expected.findIndex(o=>o.kind==='text'&&o.text===boundary),0,...section.map(o=>o.kind==='table'?{kind:'table'}:{kind:'text',text:o.text}),{kind:'divider'});
  check=async()=>{
   const current=await readSnapshot(page);if(current.title!==before.title||!same(current.links,before.links)||!same(flow(current),expected)||current.dividers!==before.dividers+1)throw Error('Existing title, links or section order changed');
   if(!same(await tablesOf(page),wantedTables))throw Error('Saved full-list tables differ from the service shelf');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Existing photos or representative image changed');
   const actual=await page.evaluate(readParagraphPresentation,selector),outside=stableStyles(actual.filter(p=>!added.has(p.text))),prior=stableStyles(beforeStyle);
   if(!same(outside,prior)){const index=prior.findIndex((p,i)=>!same(p,outside[i]));throw Error('Typography outside the inserted section changed: '+JSON.stringify({before:prior[index],after:outside[index]}));}
   const toc=actual.filter(p=>p.text===PERSON_FULL_LIST.heading);if(toc.length!==2||toc[0].sizes.some(s=>s!==16)||toc[0].align!==tocOp.align)throw Error('Full-list table of contents entry differs');
   for(const op of textOps){const p=op===textOps[0]?toc[1]:actual.find(p=>p.text===op.text),want=textPresentation(op);if(!p||p.align!==want.align||p.sizes.some(s=>s!==want.size)||p.weights.some(w=>(w>=600)!==want.bold))throw Error('Full-list section text design differs: '+op.text);}
   return{current,texts:actual.map(p=>p.text)};
  };
  }
  const ready=await check();
  if(options.capture!==false){await page.evaluate(h=>[...document.querySelectorAll('.se-text-paragraph')].filter(p=>p.textContent.replace(/\u200b/g,'').trim()===h)[1].scrollIntoView({block:'start',behavior:'instant'}),PERSON_FULL_LIST.heading);await page.evaluate(()=>scrollBy(0,-160));await page.screenshot({path:path.join(dir,'editor-full-list-ready.png')});}
  write(path.join(dir,'ready-insertion.json'),{snapshot:ready.current,sourceHash});state('ready-for-review',{screenshot:path.join(dir,'editor-full-list-ready.png')});
  if(!apply)return{post,changed:false,dryRun:true,sourceHash};
  const latest=await personFullListFor(db,post.slug,featuredTitles);if(!same(latest.available,list.available)||!same(latest.unavailable,list.unavailable))throw Error('Service shelf changed before saving');
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},logNo);saved=true;state('saved-reopening');
  const reopened=await open();await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');await closePublishPanel(page,editor);
  const verified=await check();write(path.join(dir,'saved-insertion.json'),{verified:true,snapshot:verified.current,sourceHash});
  const posts=read(registry),p=posts.find(p=>String(p.logNo)===String(logNo));if(!p||slugOf(p)!==post.slug)throw Error('Registry identity changed');
  p.fullList={sourceHash,books:list.available.length+list.unavailable.length,unavailable:list.unavailable.length,verifiedAt:new Date().toISOString()};delete p.unified;
  // 구획 밖 서식은 그대로임을 확인했으므로 본문 검증 기준선만 새 글자 목록으로 갱신한다.
  if(p.bodyStyle)p.bodyStyle={...p.bodyStyle,...textsDigest(verified.texts)};write(registry,posts);state('saved-and-reopened');
  return{post,changed:true,sourceHash,texts:verified.texts,reserved:Boolean(reopened.reservation),tables:wantedTables};
 }catch(error){state('failed',{saved,error:String(error)});await page.screenshot({path:path.join(dir,'insertion-failure.png')}).catch(()=>{});throw error;}
 finally{await focus.detach().catch(()=>{});await page.close().catch(()=>{});if(!options.browser){await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}}
}

async function verifyPublic(browser,result){
 if(result.reserved||!result.changed)return result.reserved?'reserved':'unchanged';const page=await browser.newPage();try{
  await page.setViewport({width:390,height:1100});await page.setCacheEnabled(false);
  for(let attempt=0;attempt<3;attempt++){
   await page.goto(`https://m.blog.naver.com/dmx777/${result.post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.se-main-container',{timeout:20000});
   const texts=(await page.evaluate(readParagraphPresentation,'.se-main-container .se-component.se-text .se-text-paragraph')).map(p=>p.text);
   const tables=await page.$$eval('.se-main-container .se-table table',ts=>ts.map(t=>[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim()))));
   if(same(tables,result.tables)&&texts.filter(t=>t===PERSON_FULL_LIST.heading).length===2)return'public';
   if(attempt<2){await wait(1500);continue;}throw Error('Published full-list section differs from the verified native article');
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
    const result=await applyPersonFullList({logNo:target.logNo,dir:folder,apply:true},{browser,capture,viewportHeight:1700,onState:event=>{state.current={...target,phase:event.stage};report();}});
    state.current.phase='verifying-public';report();const visibility=await verifyPublic(browser,result);
    state.completed.push({logNo:target.logNo,changed:result.changed,visibility,seconds:Math.round((Date.now()-started)/1000),sourceHash:result.sourceHash});state.current=null;count++;report();
    console.log(JSON.stringify({event:'completed',completed:state.completed.length,total:state.total,logNo:target.logNo,seconds:Math.round((Date.now()-started)/1000)}));
    for(const name of fs.readdirSync(folder)){const file=path.join(folder,name);if(fs.statSync(file).isFile()&&!name.endsWith('.png'))fs.unlinkSync(file);}
   }catch(error){state.failed.push({...target,error:String(error)});state.stage='failed';report();throw error;}
  }
  if(state.completed.length===state.total)state.stage='complete';else if(state.stage==='running')state.stage='chunk-complete';state.current=null;report();
 }finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(a=>a.startsWith('--targets=')))await runBatch(args);
 else{const logNo=args.find(a=>a.startsWith('--log='))?.slice(6),dir=args.find(a=>a.startsWith('--work='))?.slice(7);if(args.some(a=>!/^--(log|work)=/.test(a)&&a!=='--apply'&&a!=='--refresh'))throw Error('--log=<post> --work=<absolute dir> [--apply] [--refresh]');await applyPersonFullList({logNo,dir,apply:args.includes('--apply')},{refresh:args.includes('--refresh')});}
}
