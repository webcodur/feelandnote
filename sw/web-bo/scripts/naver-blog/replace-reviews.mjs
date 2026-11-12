// Replace the reading-background sections of an existing person article with the current DB reviews.
// Each section between 「감상 배경」 and 「감상 근거 · 원문」 is paired with the 「작품 상세」 link that follows it.
// Paragraph counts may change; titles, photos, links, other text, reservation and publish settings are preserved.
// --logs=<logNo,logNo> --work=<absolute directory> [--apply]
import fs from 'node:fs';import path from 'node:path';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {formattedPlainText,NAVER_REVIEW_COLOR,BODY_STYLE_VERSION} from './lib/formatted-text.mjs';
import {fragment} from './apply-unified-article.mjs';
import {EDITOR_SELECTOR,bodyStyleProblems,openTarget} from './restyle-body.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
import {celebSlug} from './lib/roster-data.mjs';

const REGISTRY='D:/feelandnote/blog-assets/naver-blog/posts.json';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:[{kind:f.kind}]);
const stable=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
export const reviewParagraphs=review=>review.replace(/\r\n/g,'\n').split(/\n+/).map(t=>t.trim()).filter(Boolean).map(formattedPlainText);

// Sections are located on the flattened text list; the k-th section belongs to the k-th 「작품 상세」 link.
export function reviewSections(texts,links){
 const details=links.filter(l=>l.text==='작품 상세').map(l=>l.href.match(/\/content\/([0-9a-f-]{36})/)?.[1]);
 const sections=[];
 for(let i=0;i<texts.length;i++){if(texts[i]!=='감상 배경')continue;const end=texts.indexOf('감상 근거 · 원문',i+1);if(end<0)throw Error('Review section has no source link');sections.push({start:i+1,end,paragraphs:texts.slice(i+1,end)});}
 if(sections.length!==details.length||details.some(d=>!d))throw Error('Review sections and work links differ');
 return sections.map((s,k)=>({...s,contentId:details[k]}));
}

async function replaceOne(browser,db,post,dir,apply){
 fs.mkdirSync(dir,{recursive:true});
 const slug=celebSlug(post.slug)||celebSlug(post.url);if(!slug)throw Error('Person slug required');
 const {data:person,error}=await db.from('celebs').select('id,slug').eq('slug',slug).single();if(error)throw error;
 const page=await browser.newPage();page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 let saved=false;
 try{
  await page.setViewport({width:1440,height:1700});const editor=createExistingEditor(page),native=createEditorialEditor(page);
  const opened=await openTarget(page,post);await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),texts=flow(before).filter(o=>o.kind==='text').map(o=>o.text);
  const sections=reviewSections(texts,before.links);
  const {data:rows,error:e2}=await db.from('celeb_contents').select('content_id,review').eq('celeb_id',person.id).in('content_id',sections.map(s=>s.contentId));if(e2)throw e2;
  const plan=sections.map(s=>({...s,next:reviewParagraphs(rows.find(r=>r.content_id===s.contentId)?.review??'')})).filter(s=>s.next.length&&!same(s.next,s.paragraphs));
  write(path.join(dir,'before.json'),{post,snapshot:before,style:beforeStyle,plan});
  if(!plan.length)return{changed:false};
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
   if(!same(selected,s.paragraphs))throw Error('Selected range differs from the old review section');
   const ops=s.next.map((text,i)=>({kind:'text',text,formattedText:true,role:'body',align:'left',bold:true,color:NAVER_REVIEW_COLOR,gapBefore:i>0}));
   const html=fragment(ops);await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
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
   for(const sec of plan)for(const [i,text] of sec.next.entries()){const p=style.find(x=>x.text===text);if(!p||p.align!=='left'||p.separated!==(i>0))throw Error('Review paragraph layout differs: '+text.slice(0,40));}
   return style;
  };
  await check();await page.screenshot({path:path.join(dir,'editor-ready.png')});
  if(!apply)return{changed:false,dryRun:true,sections:plan.length};
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},post.logNo);saved=true;
  const reopened=await openTarget(page,post);await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');
  await closePublishPanel(page,editor);const style=await check();
  const all=read(REGISTRY),p=all.find(x=>x.logNo===post.logNo);if(!p||p.title!==post.title)throw Error('Registry identity changed');
  p.bodyStyle={version:BODY_STYLE_VERSION,verifiedAt:new Date().toISOString(),...textsDigest(style.map(x=>x.text))};write(REGISTRY,all);
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
if(process.argv[1]?.endsWith('replace-reviews.mjs'))await main();
