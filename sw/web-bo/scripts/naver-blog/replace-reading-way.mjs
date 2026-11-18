// 인물 글의 「독서 방식」 구획 본문만 지금 DB 본문으로 갈아 끼운다. 본문을 비우지 않고 사진을 다시 올리지 않는다(26.11.18 사용자 지시: 할 수 있는 건 붙여넣기로).
// 구획은 마지막 「독서 방식」 머리 줄 다음 문단부터 첫 구분선 앞까지다. 인용구 목차 판형(통합 양식)을 다룬다 — 옛 문단 목차 판형은 apply-reading-way.mjs가 맡는다.
// 문단 수는 달라져도 된다. 제목·사진·링크·다른 글·예약·발행 설정은 그대로여야 저장한다. 방식은 replace-reviews.mjs와 같다.
// --logs=<글번호,글번호> --work=<절대경로> [--apply]
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {BODY_STYLE_VERSION} from './lib/formatted-text.mjs';
import {readingWaySection} from './lib/reading-way-section.mjs';
import {fragment} from './apply-unified-article.mjs';
import {EDITOR_SELECTOR,bodyStyleProblems,openTarget} from './restyle-body.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
import {celebSlug} from './lib/roster-data.mjs';

const REGISTRY='D:/feelandnote/blog-assets/naver-blog/posts.json';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:[{kind:f.kind}]);
const stable=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
// 글줄 목록(구분선·사진 포함)에서 마지막 「독서 방식」 줄이 머리이고, 그 뒤 첫 비글줄(구분선이어야 한다) 앞까지가 본문이다. 번호는 글줄만 센다.
export function readingWayRange(flowOps){
 const head=flowOps.map((o,i)=>o.kind==='text'&&o.text==='독서 방식'?i:-1).filter(i=>i>=0).at(-1);if(head===undefined)throw Error('독서 방식 구획이 없다');
 const stop=flowOps.findIndex((o,i)=>i>head&&o.kind!=='text');if(stop<0||flowOps[stop].kind!=='divider')throw Error('독서 방식 본문이 구분선으로 끝나지 않는다');
 const body=flowOps.slice(head+1,stop);if(!body.length)throw Error('독서 방식 본문이 비어 있다');
 const start=flowOps.slice(0,head+1).filter(o=>o.kind==='text').length;return{start,end:start+body.length,paragraphs:body.map(o=>o.text)};
}

async function replaceOne(browser,db,post,dir,apply){
 fs.mkdirSync(dir,{recursive:true});
 const slug=celebSlug(post.slug)||celebSlug(post.url);if(!slug)throw Error('Person slug required');
 const {data:person,error}=await db.from('celebs').select('id,slug,reading_way').eq('slug',slug).single();if(error)throw error;if(!person.reading_way?.trim())throw Error('DB 독서 방식이 비어 있다');
 const page=await browser.newPage();page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 let saved=false;
 try{
  await page.setViewport({width:1440,height:1700});const editor=createExistingEditor(page),native=createEditorialEditor(page);
  const opened=await openTarget(page,post);await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),texts=flow(before).filter(o=>o.kind==='text').map(o=>o.text);
  const nextOps=readingWaySection({id:person.id,readingWay:{text:person.reading_way,source:'celebs:'+person.id+':reading_way'}}).slice(1);
  const range=readingWayRange(flow(before)),plan=same(nextOps.map(o=>o.text),range.paragraphs)?[]:[{...range,next:nextOps.map(o=>o.text),ops:nextOps}];
  write(path.join(dir,'before.json'),{post,snapshot:before,style:beforeStyle,plan});
  // 편집기의 구획이 DB 본문과 이미 같으면 저장하지 않고 원장의 검증 기록만 맞춘다(다음 대조에서 다시 걸리지 않게).
  if(!plan.length){const all=read(REGISTRY),p=all.find(x=>x.logNo===post.logNo);if(p&&apply){p.readingWay={sourceHash:hash(person.reading_way),verifiedAt:new Date().toISOString()};write(REGISTRY,all);}return{changed:false};}
  const replaced=new Set(plan.flatMap(s=>s.paragraphs));
  // 같은 문장이 여러 구획에 있을 수 있다(같은 출처의 앞 해설 등). 구획 위치까지의 등장 순번으로 정확한 문단을 고른다.
  const nth=(index,text)=>texts.slice(0,index).filter(x=>x===text).length;
  const copied=async()=>{await page.evaluate(()=>navigator.clipboard.writeText(''));await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await sleep(300);return(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\u200b/g,'').trim();};
  // Bottom-up so earlier sections keep their positions.
  for(const s of [...plan].reverse()){
   await native.selectParagraph(s.paragraphs[0],{occurrence:nth(s.start,s.paragraphs[0])});
   if(s.paragraphs.length>1){
    const tail=await page.evaluate(({selector,text,occurrence})=>{
     const ps=[...document.querySelectorAll(selector)].filter(p=>p.textContent.replace(/\u200b/g,'').trim()===text);if(!ps[occurrence])throw Error('Last review paragraph missing');
     const p=ps[occurrence];p.scrollIntoView({block:'center',behavior:'instant'});const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())if(w.currentNode.textContent.replace(/\u200b/g,'').length)ns.push(w.currentNode);
     const n=ns.at(-1);let end=n.length;while(n.textContent[end-1]==='\u200b')end--;const r=document.createRange();r.setStart(n,end-1);r.setEnd(n,end);const b=r.getBoundingClientRect();if(b.top<125||b.bottom>innerHeight-20)throw Error('Review end is outside viewport');return{x:b.right-1,y:b.top+b.height/2};
    },{selector:EDITOR_SELECTOR,text:s.paragraphs.at(-1),occurrence:nth(s.start+s.paragraphs.length-1,s.paragraphs.at(-1))});
    await page.keyboard.down('Shift');try{await page.mouse.click(tail.x,tail.y);}finally{await page.keyboard.up('Shift');}await sleep(200);
   }
   const selected=(await copied()).split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
   if(!same(selected,s.paragraphs))throw Error('고른 범위가 옛 독서 방식 본문과 다르다');
   const html=fragment(s.ops.map((o,i)=>({...o,gapBefore:i>0})));await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
   await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await sleep(500);
   for(const text of s.next){await native.alignLeft(text);const cur=(await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR)).find(p=>p.text===text);if(cur&&!cur.weights.every(w=>w>=600)){await native.selectParagraph(text);await page.keyboard.down('Control');await page.keyboard.press('KeyB');await page.keyboard.up('Control');await sleep(150);}}
  }
  await page.keyboard.press('Escape');
  const expected=[...texts];for(const s of [...plan].reverse())expected.splice(s.start,s.end-s.start,...s.next);
  const added=new Set(plan.flatMap(s=>s.next));
  const check=async()=>{
   const current=await readSnapshot(page),style=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR);
   const now=flow(current).filter(o=>o.kind==='text').map(o=>o.text);
   if(current.title!==before.title||!same(current.links,before.links)||current.dividers!==before.dividers||!same(now,expected))throw Error('Title, text order, links or dividers changed');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Photos changed');
   if(!same(stable(style.filter(p=>!added.has(p.text))),stable(beforeStyle.filter(p=>!replaced.has(p.text))))){throw Error('Typography outside replaced reviews changed');}
   const problems=bodyStyleProblems(style);if(problems.length)throw Error('Body style differs: '+problems[0]);
   for(const sec of plan)for(const [i,text] of sec.next.entries()){const p=style.find(x=>x.text===text);if(!p||p.align!=='left'||(i>0&&!p.separated))throw Error('독서 방식 문단 배치가 다르다: '+text.slice(0,40));}
   return style;
  };
  await check();await page.screenshot({path:path.join(dir,'editor-ready.png')});
  if(!apply)return{changed:false,dryRun:true,sections:plan.length};
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},post.logNo);saved=true;
  const reopened=await openTarget(page,post);await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');
  await closePublishPanel(page,editor);const style=await check();
  const all=read(REGISTRY),p=all.find(x=>x.logNo===post.logNo);if(!p||p.title!==post.title)throw Error('Registry identity changed');
  p.bodyStyle={version:BODY_STYLE_VERSION,verifiedAt:new Date().toISOString(),...textsDigest(style.map(x=>x.text))};p.readingWay={sourceHash:hash(person.reading_way),verifiedAt:new Date().toISOString()};write(REGISTRY,all);
  return{changed:true,sections:plan.length,reserved:Boolean(reopened.reservation)};
 }catch(error){await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});error.saved=saved;throw error;}
 finally{await page.close().catch(()=>{});}
}

export async function main(args=process.argv.slice(2)){
 const arg=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
 const logs=arg('logs'),work=arg('work'),apply=args.includes('--apply');
 if(!logs||!work||!path.isAbsolute(work)||args.some(a=>!/^--(logs|work)=/.test(a)&&a!=='--apply'))throw Error('--logs and an absolute --work are required');
 const root=path.resolve(import.meta.dirname,'../../../..');for(const f of ['sw/web-bo/.env','sw/web/.env']){const p=path.join(root,f);if(fs.existsSync(p))for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}}
 const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);
 const posts=read(REGISTRY);
 const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
 await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 try{
  for(const id of logs.split(',')){
   const post=posts.find(p=>p.logNo===id&&p.kind==='celeb'&&['ok','check'].includes(p.link));if(!post)throw Error('Active person post not found: '+id);
   const result=await replaceOne(browser,db,post,path.join(work,id),apply);
   console.log(JSON.stringify({event:'done',logNo:id,title:post.title,...result}));
  }
 }finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
}
if(process.argv[1]?.endsWith('replace-reading-way.mjs'))await main();
