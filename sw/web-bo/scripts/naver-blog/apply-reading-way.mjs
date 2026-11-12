// Add one service reading-way section to an existing article without rebuilding its books.
// --log=<post number> --work=<absolute temp directory> [--replace|--remove] [--restyle] [--apply] [--review]
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {formattedParagraphMatches} from './lib/formatted-text.mjs';
import {readingWaySection,readingWayBody,withoutReadingWay} from './lib/reading-way-section.mjs';
import {fragment} from './apply-unified-article.mjs';
import {insertDivider} from './publish-drafts.mjs';
import {celebSlug} from './lib/roster-data.mjs';
import {textsDigest} from './lib/body-baseline.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),wait=ms=>new Promise(r=>setTimeout(r,ms));
const hash=s=>crypto.createHash('sha256').update(s??'').digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2));
const selector='.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph';
const flow=s=>s.flow.flatMap(f=>f.kind==='se-text'?f.paragraphs.map(text=>({kind:'text',text})):f.kind==='se-horizontalLine'?[{kind:'divider'}]:f.kind==='image'?[{kind:'image',src:f.src}]:[{kind:f.kind}]);
const stableStyles=ps=>ps.map(({text,align,sizes,weights,colors,backgrounds})=>({text,align,sizes,weights,colors,backgrounds}));
const rgb=hex=>'rgb('+hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';

export async function applyReadingWay(args,options={}){
 const logNo=args.find(a=>a.startsWith('--log='))?.slice(6),dir=args.find(a=>a.startsWith('--work='))?.slice(7);
 if(!/^\d+$/.test(logNo??'')||!dir||!path.isAbsolute(dir)||args.some(a=>!a.startsWith('--log=')&&!a.startsWith('--work=')&&!['--apply','--review','--restyle','--replace','--remove'].includes(a)))throw Error('One --log and an absolute --work are required');
 const removing=args.includes('--remove');if(removing&&args.some(a=>['--replace','--restyle'].includes(a)))throw Error('Removal cannot be combined with replacement or restyling');
 let restyle=args.includes('--restyle');
 fs.mkdirSync(dir,{recursive:true});
 const state=(stage,extra={})=>{write(path.join(dir,'reading-way-state.json'),{stage,logNo,...extra});console.log(JSON.stringify({stage,logNo,...extra}));options.onState?.({stage,logNo,...extra});};
 const root=path.resolve(import.meta.dirname,'../../../..');for(const f of ['sw/web-bo/.env','sw/web/.env']){const p=path.join(root,f);if(fs.existsSync(p))for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}}
 const registry='D:/feelandnote/blog-assets/naver-blog/posts.json',matches=read(registry).filter(p=>p.logNo===logNo&&p.kind==='celeb'&&['ok','check'].includes(p.link));if(matches.length!==1)throw Error('One active person post is required');
 const slugOf=p=>celebSlug(p.slug)||celebSlug(p.url)||celebSlug(read('D:/feelandnote/blog-assets/naver-blog/celeb-drafts.json').find(d=>String(d.logNo)===String(p.logNo))?.target);
 const post={...matches[0],slug:slugOf(matches[0])};if(!post.slug)throw Error('Exact service person slug is required');
 const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);const {data:person,error}=await db.from('celebs').select('id,slug,reading_way,reading_way_en').eq('slug',post.slug).single();if(error)throw error;
 if(removing&&(person.reading_way?.trim()||person.reading_way_en?.trim()))throw Error('Removal requires empty Korean and English DB reading ways');
 const section=removing?[]:readingWaySection({id:person.id,readingWay:{text:person.reading_way,source:'celebs:'+person.id+':reading_way'}}),paragraphs=section.map(o=>o.text),added=new Set(paragraphs);
 const {browser,launched}=options.browser?{browser:options.browser,launched:false}:await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let saved=false;
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));
 const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);
 try{
  await page.setViewport({width:1440,height:options.viewportHeight??1100});const editor=createExistingEditor(page),native=createEditorialEditor(page);state('opening');const open=()=>options.openTarget?options.openTarget(page,post):editor.openTarget(post);const opened=await open();await closePublishPanel(page,editor);const before=await readSnapshot(page),beforeStyle=await page.evaluate(readParagraphPresentation,selector);
  // 인용구 목차 판형은 이 도구의 문단 목차·19/16 서식 가정과 다르다. 통합 재조립으로 독서 방식을 함께 다시 쓴다.
  if(before.flow.some(f=>f.kind==='se-quotation'))throw Error('Quotation contents layout: rebuild with prepare-unified-articles --reading-way, then run-unified-articles');
  const existing=before.text.filter(t=>t==='독서 방식').length===2?readingWayBody(flow(before)):null;
  if(removing&&!existing)throw Error('Exact verified existing section required for removal');
  if(removing){if(!post.readingWay?.sourceHash)throw Error('Previously verified section required for removal');added.add('독서 방식');for(const text of existing.paragraphs)added.add(text);}
  const formattingMatches=section.slice(1).every(op=>formattedParagraphMatches(op,beforeStyle.find(p=>p.text===op.text)));
  const sameBody=existing&&same(existing.paragraphs,paragraphs.slice(1));
  const replacing=Boolean(existing&&(args.includes('--replace')&&!sameBody||sameBody&&(args.includes('--replace')||restyle||options.autoExisting)&&!formattingMatches));
  if((args.includes('--replace')||restyle)&&existing)restyle=!replacing;
  if(replacing){
   if(!post.readingWay?.sourceHash)throw Error('A previously verified reading-way section is required for replacement');
   for(const text of existing.paragraphs)added.add(text);
   const outside=flow(before).filter((op,i)=>i<existing.start||i>=existing.end);
   if(new Set(paragraphs.slice(1)).size!==paragraphs.length-1||outside.some(op=>op.kind==='text'&&paragraphs.slice(1).includes(op.text)))throw Error('New reading-way body collides with text outside its section');
  }
  if(options.autoExisting&&existing&&!removing){
   restyle=!replacing;
   const headings=beforeStyle.filter(p=>p.text==='독서 방식'),body=section.slice(1).map(op=>({op,actual:beforeStyle.find(p=>p.text===op.text)}));
   if(same(existing.paragraphs,paragraphs.slice(1))&&headings[1]?.sizes.every(s=>s===19)&&headings[1].colors.every(c=>c===rgb(section[0].color))&&headings[1].weights.every(w=>w>=600)&&body.every(({op,actual:p})=>p&&p.sizes.every(s=>s===16)&&formattedParagraphMatches(op,p)&&p.align==='left')){
    state('existing-verified');return{post,changed:false,sourceHash:hash(person.reading_way),texts:beforeStyle.map(p=>p.text),section,reserved:Boolean(opened.reservation)};
   }
  }
  if(restyle){if(before.text.filter(t=>t==='독서 방식').length!==2||paragraphs.slice(1).some(t=>before.text.filter(s=>s===t).length!==1))throw Error('Exact existing reading-way section required for restyling');}
  else if(!replacing&&!removing&&before.text.some(t=>t==='독서 방식'))throw Error('A reading-way section already exists; inspect it instead of adding another');
  const first=before.text.find(t=>/^01\s*·\s*『/.test(t));if(!first||before.text.filter(t=>t===first).length!==1||before.text.filter(t=>t==='목차').length!==1)throw Error('Exact existing table of contents and first book required');
  write(path.join(dir,'before-insertion.json'),{post,opened,snapshot:before,style:beforeStyle});
  const pasteSelection=async(ops)=>{
   const html=fragment(ops);await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
   await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await wait(400);
  };
  const copiedSelection=async()=>{
   await page.evaluate(()=>navigator.clipboard.writeText(''));await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await wait(300);
   return(await page.evaluate(()=>navigator.clipboard.readText())).replace(/\u200b/g,'').trim();
  };
  const paste=async(text,ops,occurrence=0)=>{
   await native.selectParagraph(text,{occurrence});if(await copiedSelection()!==text)throw Error('Actual selected text differs from insertion boundary');await pasteSelection(ops);
  };
  state(removing?'removing':replacing?'replacing':restyle?'restyling':'inserting');
  if(removing){
   await native.selectParagraph('독서 방식',{occurrence:0});if(await copiedSelection()!=='독서 방식')throw Error('Removal TOC selection differs');await native.clearParagraph('독서 방식',{occurrence:0});
   const bookStyle=beforeStyle.find(p=>p.text===first);if(!bookStyle||bookStyle.align!=='center'||bookStyle.sizes.some(s=>s!==19)||bookStyle.weights.some(w=>w<600)||new Set(bookStyle.colors).size!==1)throw Error('First book heading has unsupported presentation');
   await native.selectParagraph('독서 방식',{occurrence:0});
   const tail=await page.evaluate(({selector,text})=>{
    const ps=[...document.querySelectorAll(selector)].filter(p=>p.textContent.replace(/\u200b/g,'').trim()===text);if(ps.length!==1)throw Error('Removal book boundary missing');const p=ps[0];p.scrollIntoView({block:'center',behavior:'instant'});
    const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())if(w.currentNode.textContent.replace(/\u200b/g,'').length)ns.push(w.currentNode);const n=ns.at(-1);let end=n.length;while(n.textContent[end-1]==='\u200b')end--;const r=document.createRange();r.setStart(n,end-1);r.setEnd(n,end);const b=r.getBoundingClientRect();if(b.top<125||b.bottom>innerHeight-20)throw Error('Removal boundary outside viewport');return{x:b.right-1,y:b.top+b.height/2};
   },{selector,text:first});
   await page.keyboard.down('Shift');try{await page.mouse.click(tail.x,tail.y);}finally{await page.keyboard.up('Shift');}
   const selected=(await copiedSelection()).split(/\r?\n/).map(t=>t.trim()).filter(Boolean);if(!same(selected,['독서 방식',...existing.paragraphs,first]))throw Error('Actual removal range differs from section through first book heading');
   const color='#'+bookStyle.colors[0].match(/\d+/g).slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
   await pasteSelection([{kind:'text',text:first,role:'heading',align:'center',bold:true,color,gapBefore:false}]);
  }
  else if(replacing){
   await native.selectParagraph(existing.paragraphs[0]);
   if(existing.paragraphs.length>1){
    const tail=await page.evaluate(({selector,text})=>{
     const matches=[...document.querySelectorAll(selector)].filter(p=>p.textContent.replace(/\u200b/g,'').trim()===text);if(matches.length!==1)throw Error('Exact last reading-way paragraph missing');
     const p=matches[0];p.scrollIntoView({block:'center',behavior:'instant'});const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())if(w.currentNode.textContent.replace(/\u200b/g,'').length)ns.push(w.currentNode);
     const n=ns.at(-1);let end=n.length;while(n.textContent[end-1]==='\u200b')end--;const r=document.createRange();r.setStart(n,end-1);r.setEnd(n,end);const b=r.getBoundingClientRect();if(b.top<125||b.bottom>innerHeight-20)throw Error('Reading-way end is outside viewport');return{x:b.right-1,y:b.top+b.height/2};
    },{selector,text:existing.paragraphs.at(-1)});
    await page.keyboard.down('Shift');try{await page.mouse.click(tail.x,tail.y);}finally{await page.keyboard.up('Shift');}await wait(200);
   }
   const selected=(await copiedSelection()).split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
   if(!same(selected,existing.paragraphs))throw Error('Actual selected range differs from the complete old reading-way body');
   await pasteSelection(section.slice(1).map((op,i)=>i?op:{...op,gapBefore:false}));
  }
  else if(restyle){await paste('독서 방식',[section[0]],1);for(const paragraph of section.slice(1))await paste(paragraph.text,[{...paragraph,gapBefore:false}]);}
  else{await paste('목차',[{kind:'text',text:'목차',role:'label',align:'center',bold:true,gapBefore:false},{kind:'text',text:'독서 방식',role:'body',align:'center',bold:false,gapBefore:false}]);await paste(first,[...section,{kind:'text',text:first,role:'heading',align:'center',bold:true,gapBefore:true}]);}
  const bold=async(text,wanted,occurrence=0)=>{
   const current=(await page.evaluate(readParagraphPresentation,selector)).filter(p=>p.text===text)[occurrence];if(!current)throw Error('Bold target missing');if(current.weights.every(w=>(w>=600)===wanted))return;
   await native.selectParagraph(text,{occurrence});await page.keyboard.down('Control');await page.keyboard.press('KeyB');await page.keyboard.up('Control');await wait(150);
  };
  if(!removing){await bold('독서 방식',false,0);await bold('독서 방식',true,1);
  for(const paragraph of section.slice(1)){await native.alignLeft(paragraph.text);await bold(paragraph.text,paragraph.bold);}}
  if(!restyle&&!replacing&&!removing){const boundary=await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph',(nodes,text)=>{
   const p=nodes.find(p=>p.textContent.replace(/\u200b/g,'').trim()===text);if(!p)throw Error('First book boundary disappeared');p.scrollIntoView({block:'center',behavior:'instant'});
   const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;while(walker.nextNode())if(walker.currentNode.textContent.replace(/\u200b/g,'').length){n=walker.currentNode;break;}if(!n)throw Error('First book text node missing');let start=0;while(n.textContent[start]==='\u200b')start++;const r=document.createRange();r.setStart(n,start);r.setEnd(n,start+1);const rect=r.getBoundingClientRect();return{x:rect.left-2,y:rect.top+rect.height/2};
  },first);await page.mouse.click(boundary.x,boundary.y);await wait(150);
  const atStart=await page.evaluate(text=>{const s=getSelection(),n=s?.anchorNode,p=(n?.nodeType===1?n:n?.parentElement)?.closest('.se-text-paragraph');if(!s?.isCollapsed||p?.textContent.replace(/\u200b/g,'').trim()!==text)return false;const r=document.createRange();r.selectNodeContents(p);r.setEnd(n,s.anchorOffset);return !r.toString().replace(/\u200b/g,'');},first);if(!atStart)throw Error('Divider caret is not at the first book boundary');
  await insertDivider(page,{waitForState:true});}await page.keyboard.press('Escape');
  const expected=removing?withoutReadingWay(flow(before)):flow(before);if(replacing)expected.splice(existing.start,existing.end-existing.start,...paragraphs.slice(1).map(text=>({kind:'text',text})));else if(!restyle&&!removing){const toc=expected.findIndex(o=>o.text==='목차');expected.splice(toc+1,0,{kind:'text',text:'독서 방식'});const book=expected.findIndex(o=>o.text===first);expected.splice(book,0,...paragraphs.map(text=>({kind:'text',text})),{kind:'divider'});}
  const check=async()=>{
   const current=await readSnapshot(page);if(current.title!==before.title||!same(current.links,before.links)||!same(flow(current),expected)||current.dividers!==before.dividers+(removing?-1:Number(!restyle&&!replacing)))throw Error('Existing title, text, links or section order changed');
   if(removing?current.text.includes('독서 방식'):!same(readingWayBody(flow(current)).paragraphs,paragraphs.slice(1)))throw Error('Saved reading-way section differs from the exact DB body');
   const identity=images=>images.map(({displayWidth,displayHeight,...im})=>im);if(!same(identity(current.images),identity(before.images)))throw Error('Existing photos or representative image changed');
   const actual=await page.evaluate(readParagraphPresentation,selector),outside=stableStyles(actual.filter(p=>!added.has(p.text))),prior=stableStyles(beforeStyle.filter(p=>!added.has(p.text)));if(!same(outside,prior)){const index=prior.findIndex((p,i)=>!same(p,outside[i]));throw Error('Typography outside the inserted section changed: '+JSON.stringify({before:prior[index],after:outside[index]}));}
   if(removing)return current;
   const heading=actual.filter(p=>p.text==='독서 방식');if(heading.length!==2||heading[0].sizes.some(s=>s!==16)||heading[1].sizes.some(s=>s!==19)||heading[1].colors.some(c=>c!==rgb(section[0].color))||heading[1].weights.some(w=>w<600))throw Error('Reading-way heading design differs');
   for(const op of section.slice(1)){const p=actual.find(p=>p.text===op.text);if(!p||p.align!=='left'||p.sizes.some(s=>s!==16)||!formattedParagraphMatches(op,p)||!p.separated)throw Error('Reading-way paragraph design differs: '+JSON.stringify(p));}
   return current;
  };
  const ready=await check();if(options.capture!==false){await page.evaluate(({removing,first})=>[...document.querySelectorAll('.se-text-paragraph')].filter(p=>p.textContent.replace(/\u200b/g,'').trim()===(removing?first:'독서 방식'))[removing?0:1].scrollIntoView({block:'start',behavior:'instant'}),{removing,first});await page.evaluate(()=>scrollBy(0,-180));await page.screenshot({path:path.join(dir,'editor-reading-way-ready.png')});}
  write(path.join(dir,'ready-insertion.json'),{snapshot:ready,sourceHash:hash(person.reading_way)});state('ready-for-review',{screenshot:path.join(dir,'editor-reading-way-ready.png')});
  if(args.includes('--review')){let reviewed=false;for(let i=0;i<600;i++){if(fs.existsSync(path.join(dir,'screen-reviewed'))){reviewed=true;break;}await wait(300);}if(!reviewed)throw Error('Screen review timed out');}
  if(args.includes('--apply')){
   const latest=await db.from('celebs').select('reading_way,reading_way_en').eq('id',person.id).single();if(latest.error||latest.data.reading_way!==person.reading_way||(removing&&latest.data.reading_way_en!==person.reading_way_en))throw Error('Service reading way changed before saving');
   await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:opened.state});if(!same(await editor.settings(),opened.state))throw Error('Publication settings changed');await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},logNo);saved=true;state('saved-reopening');
   const reopened=await open();await assertPublishOptions(page,{preserve:opened.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,opened.reservation))throw Error('Saved settings or reservation changed');await closePublishPanel(page,editor);const verified=await check();write(path.join(dir,'saved-insertion.json'),{verified:true,snapshot:verified,sourceHash:hash(person.reading_way)});
   const savedTexts=(await page.evaluate(readParagraphPresentation,selector)).map(p=>p.text);
   const posts=read(registry),p=posts.find(p=>p.logNo===logNo);if(!p||slugOf(p)!==post.slug)throw Error('Registry identity changed');p.readingWay={sourceHash:hash(person.reading_way),verifiedAt:new Date().toISOString()};delete p.unified;
   // Only the reading-way section changed and outside typography was asserted unchanged; refresh the verify-body baseline.
   if(p.bodyStyle)p.bodyStyle={...p.bodyStyle,...textsDigest(savedTexts)};write(registry,posts);state('saved-and-reopened');return{post,changed:true,sourceHash:hash(person.reading_way),texts:(await page.evaluate(readParagraphPresentation,selector)).map(p=>p.text),section,removed:removing,reserved:Boolean(reopened.reservation)};
  }
 }catch(error){state('failed',{saved,error:String(error)});await page.screenshot({path:path.join(dir,'insertion-failure.png')}).catch(()=>{});throw error;}
 finally{await focus.detach().catch(()=>{});await page.close().catch(()=>{});if(!options.browser){await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await applyReadingWay(process.argv.slice(2));
