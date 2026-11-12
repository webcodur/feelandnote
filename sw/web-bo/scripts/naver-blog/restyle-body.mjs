// Restyle existing unified articles in place: the person guide, book introductions,
// reading way and reviews get the service inline emphasis and bold body weight.
// Text order, photos, links, dividers, reservation and publish settings are preserved.
// --logs=<logNo,logNo|all> --work=<absolute directory> [--limit=N] [--apply] [--review] [--blurbs=<conversions.json>]
// --blurbs: convert-blurbs-plain.mjs가 검수한 간결체 전환본으로 책 소개 문단을 바꿔 붙인다. 전환본이 없는 정중체 소개가 남으면 그 글은 미룬다.
import fs from 'node:fs';import path from 'node:path';
import {textsDigest} from './lib/body-baseline.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {formattedParagraphMatches,formattedPlainText,NAVER_REVIEW_COLOR,BODY_STYLE_VERSION} from './lib/formatted-text.mjs';
import {READING_WAY_STYLE} from './lib/reading-way-section.mjs';
import {fragment} from './apply-unified-article.mjs';
import {blurbKey,POLITE_ENDING} from './convert-blurbs-plain.mjs';
import {UNIFIED_ARTICLE} from './lib/unified-article.mjs';

const REGISTRY='D:/feelandnote/blog-assets/naver-blog/posts.json';
export const EDITOR_SELECTOR='.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph';
const BASE_COLOR={intro:'#222222',blurb:'#222222',review:NAVER_REVIEW_COLOR,readingWay:READING_WAY_STYLE.bodyColor};
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,2));fs.renameSync(f+'.tmp',f);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sleep=ms=>new Promise(r=>setTimeout(r,ms));
// 본문은 현행 크기(UNIFIED_ARTICLE.font.body) 또는 모바일 개편 전 16이다. 한 문단 안에서는 한 크기여야 한다.
const isBody=p=>p.align==='left'&&p.sizes.length&&[UNIFIED_ARTICLE.font.body,16].includes(p.sizes[0])&&p.sizes.every(s=>s===p.sizes[0]);

// Sections start after their exact label and run over consecutive 16px left paragraphs.
export function bodyTargets(paragraphs){
 const targets=[];let section=null,readingWayLabels=0;
 for(const [index,p] of paragraphs.entries()){
  if(index===1&&isBody(p)){section='intro';}
  if(p.text==='책 소개'){section='blurb';continue;}
  if(p.text==='감상 배경'){section='review';continue;}
  if(p.text==='독서 방식'&&++readingWayLabels===2){section='readingWay';continue;}
  if(!section)continue;
  if(!isBody(p)){section=null;continue;}
  targets.push({index,section,text:p.text,op:{kind:'text',text:formattedPlainText(p.text),formattedText:true,role:'body',align:'left',bold:true,color:BASE_COLOR[section],gapBefore:false}});
 }
 return targets;
}
const stable=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:[{kind:f.kind}]);
const future=post=>{const m=post.scheduledAt?.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})/);return Boolean(m&&Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:00+09:00`)>Date.now());};

// The verified editor paragraph list is the later comparison baseline for verify-body.
// 「책 소개」 다음에 이어지는 소개 문단 묶음을 원문 그대로 찾아 간결체 전환본으로 바꾼다.
export function plainBlurbs(targets,conversions){
 const groups=[];for(const t of targets){if(t.section!=='blurb')continue;const g=groups.at(-1);if(g&&g.at(-1).index===t.index-1)g.push(t);else groups.push([t]);}
 for(const g of groups){
  const original=g.map(t=>t.text),c=conversions[blurbKey(original)];if(!c&&!original.some(t=>POLITE_ENDING.test(t)))continue;
  if(!c||c.paragraphs.length!==g.length)throw Error('Reviewed plain-style introduction missing: '+original[0].slice(0,40));
  g.forEach((t,k)=>{t.op={...t.op,text:formattedPlainText(c.paragraphs[k])};});
 }
}
export const bodyStyleProblems=style=>bodyTargets(style).filter(t=>!formattedParagraphMatches(t.op,style[t.index])).map(t=>t.section+': '+t.text.slice(0,40));
export async function openTarget(page,post){
 const editor=createExistingEditor(page);if(future(post))return editor.openTarget(post);
 await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('button[class*=publish_btn]',{timeout:25000});
 await page.waitForFunction(title=>document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/\u200b/g,'').trim()===title.trim(),{timeout:25000},post.title);
 let prior='',count=0;for(let i=0;i<30&&count<2;i++){const body=JSON.stringify(await editor.content());count=body===prior?count+1:0;prior=body;await sleep(150);}if(count<2)throw Error('Published editor did not stabilize');
 await editor.click('button[class*=publish_btn]');await page.waitForSelector('#publish-option-search',{timeout:10000});const settings=await editor.settings();if(!settings.inputs.find(x=>x.id==='open_public')?.checked)throw Error('Current published post is not public');
 return{reservation:null,state:settings};
}

async function restyle(browser,post,dir,{apply,review,conversions=null}){
 fs.mkdirSync(dir,{recursive:true});
 const page=await browser.newPage();page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 let saved=false;
 try{
  await page.setViewport({width:1440,height:1700});const editor=createExistingEditor(page),native=createEditorialEditor(page);
  const opened=await openTarget(page,post);await closePublishPanel(page,editor);
  const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR);
  if(beforeStyle.filter(p=>p.text==='목차').length!==1||!beforeStyle.some(p=>/^01\s*·\s*『/.test(p.text)))throw Error('Unified article structure required');
  const targets=bodyTargets(beforeStyle);
  if(conversions)plainBlurbs(targets,conversions);
  const pending=targets.filter(t=>!formattedParagraphMatches(t.op,beforeStyle[t.index]));
  if(!targets.some(t=>t.section==='blurb'))throw Error('No book introduction found');
  write(path.join(dir,'before.json'),{post,opened,snapshot:before,style:beforeStyle,targets});
  if(!pending.length)return{changed:false,targets:targets.length,texts:beforeStyle.map(p=>p.text),reserved:Boolean(opened.reservation)};
  const copied=async()=>{await page.evaluate(()=>navigator.clipboard.writeText(''));await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await sleep(300);return(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\u200b/g,'').trim();};
  // Repeated paragraphs (one review shared by two volumes) are addressed by occurrence.
  // Work from the bottom so earlier duplicates keep their original text and position.
  const earlier=(list,index,text)=>list.slice(0,index).filter(p=>p.text===text).length;
  for(const t of [...pending].reverse()){
   await native.selectParagraph(t.text,{occurrence:earlier(beforeStyle,t.index,t.text)});if(await copied()!==t.text)throw Error('Selected text differs: '+t.text.slice(0,40));
   const html=fragment([t.op]);await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
   await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await sleep(400);
   const after=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR),occurrence=earlier(after,t.index,t.op.text);
   if(after[t.index]?.text!==t.op.text)throw Error('Pasted paragraph moved: '+t.op.text.slice(0,40));
   await native.alignLeft(t.op.text,{occurrence});
   const current=(await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR))[t.index];
   if(!current.weights.every(w=>w>=600)){await native.selectParagraph(t.op.text,{occurrence});await page.keyboard.down('Control');await page.keyboard.press('KeyB');await page.keyboard.up('Control');await sleep(150);}
  }
  await page.keyboard.press('Escape');
  const changedText=new Map(pending.map(t=>[t.text,t.op.text]));
  const expectedFlow=flow(before).map(o=>o.kind==='text'&&changedText.has(o.text)?{...o,text:changedText.get(o.text)}:o);
  const touched=new Set(pending.map(t=>t.index));
  const check=async()=>{
   const current=await readSnapshot(page),style=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR);
   if(current.title!==before.title||!same(current.links,before.links)||current.dividers!==before.dividers||!same(flow(current),expectedFlow))throw Error('Title, text order, links or dividers changed');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Photos changed');
   if(style.length!==beforeStyle.length)throw Error('Paragraph count changed');
   const outside=stable(style.filter((p,i)=>!touched.has(i))),prior=stable(beforeStyle.filter((p,i)=>!touched.has(i)));
   if(!same(outside,prior)){const i=prior.findIndex((p,k)=>!same(p,outside[k]));throw Error('Typography outside targets changed: '+JSON.stringify({before:prior[i],after:outside[i]}));}
   for(const t of targets){const p=style[t.index];if(!formattedParagraphMatches(t.op,p)||!isBody(p))throw Error('Restyled paragraph differs: '+t.op.text.slice(0,40));}
   if(pending.some(t=>style[t.index].separated!==beforeStyle[t.index].separated))throw Error('Paragraph spacing changed');
   return{current,style};
  };
  await check();await page.screenshot({path:path.join(dir,'editor-ready.png')});
  if(review){console.log(JSON.stringify({event:'ready-for-review',logNo:post.logNo,screenshot:path.join(dir,'editor-ready.png')}));let ok=false;for(let i=0;i<1200;i++){if(fs.existsSync(path.join(dir,'screen-reviewed'))){ok=true;break;}await sleep(300);}if(!ok)throw Error('Screen review timed out');}
  if(!apply)return{changed:false,dryRun:true,pending:pending.length,targets:targets.length};
  await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');
  await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},post.logNo);saved=true;
  const reopened=await openTarget(page,post);await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');
  await closePublishPanel(page,editor);const verified=await check();
  write(path.join(dir,'saved.json'),{verified:true,texts:verified.style.map(p=>p.text)});
  return{changed:true,pending:pending.length,targets:targets.length,texts:verified.style.map(p=>p.text),reserved:Boolean(reopened.reservation),saved};
 }catch(error){await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});error.saved=saved;throw error;}
 finally{await page.close().catch(()=>{});}
}

async function verifyPublic(browser,post,texts){
 const page=await browser.newPage();try{
  await page.setViewport({width:390,height:1100});await page.setCacheEnabled(false);
  for(let attempt=0;attempt<3;attempt++){
   await page.goto(`https://m.blog.naver.com/dmx777/${post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.se-main-container',{timeout:20000});
   const actual=await page.evaluate(readParagraphPresentation,EDITOR_SELECTOR.split(',').map(s=>'.se-main-container '+s.trim()).join(', '));
   if(!same(actual.map(p=>p.text),texts)){if(attempt<2){await sleep(1500);continue;}throw Error('Published text differs from verified editor article');}
   for(const t of bodyTargets(actual))if(!formattedParagraphMatches(t.op,actual[t.index]))throw Error('Published paragraph style differs: '+t.text.slice(0,40));
   return'public';
  }
 }finally{await page.close();}
}

export async function main(args=process.argv.slice(2)){
 const arg=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
 const logs=arg('logs'),work=arg('work'),blurbs=arg('blurbs'),conversions=blurbs?read(blurbs):null,limit=arg('limit')?Number(arg('limit')):Infinity,apply=args.includes('--apply'),review=args.includes('--review');
 if(!logs||!work||!path.isAbsolute(work)||!(limit>0)||args.some(a=>!/^--(logs|work|limit|blurbs)=/.test(a)&&!['--apply','--review'].includes(a)))throw Error('--logs and an absolute --work are required');
 const posts=read(REGISTRY).filter(p=>['celeb','curated'].includes(p.kind)&&['ok','check'].includes(p.link));
 const wanted=logs==='all'?posts.filter(p=>p.bodyStyle?.version!==BODY_STYLE_VERSION):logs.split(',').map(id=>{const p=posts.find(p=>p.logNo===id);if(!p)throw Error('Active post not found: '+id);return p;});
 fs.mkdirSync(work,{recursive:true});const stateFile=path.join(work,'state.json'),state=fs.existsSync(stateFile)?read(stateFile):{completed:[],deferred:[]};
 const report=()=>{state.updatedAt=new Date().toISOString();write(stateFile,state);};
 const done=new Set([...state.completed,...state.deferred].map(t=>t.logNo)),queue=wanted.filter(p=>!done.has(p.logNo)).sort((a,b)=>Number(future(a))-Number(future(b)));
 state.total=wanted.length;report();
 const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
 await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 try{
  let count=0;
  for(const post of queue){
   if(count>=limit||fs.existsSync(path.join(work,'stop')))break;
   const started=Date.now(),dir=path.join(work,post.logNo);state.current=post.logNo;report();
   try{
    const result=await restyle(browser,post,dir,{apply,review,conversions});
    const visibility=result.dryRun?'dry-run':result.reserved?'reserved':await verifyPublic(browser,post,result.texts);
    if(apply){const all=read(REGISTRY),p=all.find(p=>p.logNo===post.logNo);if(!p||p.title!==post.title)throw Error('Registry identity changed');p.bodyStyle={version:BODY_STYLE_VERSION,verifiedAt:new Date().toISOString(),...textsDigest(result.texts)};write(REGISTRY,all);}
    if(apply)state.completed.push({logNo:post.logNo,title:post.title,...result,texts:undefined,visibility,seconds:Math.round((Date.now()-started)/1000)});count++;
    console.log(JSON.stringify({event:'completed',logNo:post.logNo,title:post.title,changed:result.changed,pending:result.pending??0,visibility,done:state.completed.length,total:state.total}));
   }catch(error){
    if(error.saved){state.failed={logNo:post.logNo,error:String(error)};report();throw error;}
    if(apply)state.deferred.push({logNo:post.logNo,title:post.title,error:String(error).slice(0,300)});console.log(JSON.stringify({event:'deferred',logNo:post.logNo,title:post.title,error:String(error).slice(0,200)}));
   }
   state.current=null;report();
  }
 }finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
 console.log(JSON.stringify({event:'finished',completed:state.completed.length,deferred:state.deferred.length,total:state.total}));
}
if(process.argv[1]?.endsWith('restyle-body.mjs'))await main();
