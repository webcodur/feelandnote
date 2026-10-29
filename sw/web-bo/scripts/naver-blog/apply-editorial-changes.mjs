// Apply an individually reviewed paragraph/cell edit plan without rebuilding the article.
// node scripts/naver-blog/apply-editorial-changes.mjs --plan=<OS-temp JSON> [--apply] [--review]
// Rules: docs/continuous/blog-naver-book.md. Stop the photo watcher before using this editor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor,EDITORIAL_FONT_SIZES,EDITORIAL_PORTRAIT_WIDTH,EDITORIAL_COVER_WIDTH} from './lib/editorial-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import sharp from 'sharp';
import {applyPhotoFrame} from './publish-drafts.mjs';
import {replaceTitle,centerTitle,assertCenteredTitle,centerDividers,assertCenteredDividers} from './apply-institution-revisions.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// A renamed reservation must keep the exact date/time suffix and list count.
export function editorialReservation(reservation,beforeTitle,afterTitle){
  if(!reservation||beforeTitle===afterTitle)return reservation;
  if(typeof reservation.row!=='string'||!reservation.row.startsWith(beforeTitle+'\n')||!/^\n\d{4}\.\d{1,2}\.\d{1,2} \d{2}:\d{2}$/.test(reservation.row.slice(beforeTitle.length))||!Number.isInteger(reservation.count)||reservation.count<1)throw new Error('Exact original reservation date/time and count required before renaming');
  return {...reservation,row:afterTitle+reservation.row.slice(beforeTitle.length)};
}

export function prepareEditorialChanges(original, plan) {
  if (!original?.post || !original.snapshot || !Array.isArray(original.table) || !Array.isArray(plan.edits) || (!plan.edits.length && (!Array.isArray(plan.formats) || !plan.formats.length))) throw new Error('Complete original and reviewed edits or typography required');
  if (String(plan.logNo)!==String(original.post.logNo) || !['celeb','curated'].includes(original.post.kind)) throw new Error('Editorial target identity differs');
  if(plan.title!==undefined&&(typeof plan.title!=='string'||!plan.title.trim()||plan.title!==plan.title.trim()||plan.title.length>100||/[\r\n]|https?:\/\//.test(plan.title)))throw new Error('Only a reviewed single-line post title can change');
  const paragraphs=original.snapshot.flow.flatMap(f=>f.paragraphs??[]);
  const seen=new Set();
  for(const e of plan.edits){
    const count=paragraphs.filter(p=>p===e.before).length,key=e.before+'\0'+(e.occurrence??'unique');
    if(typeof e.before!=='string'||typeof e.after!=='string'||!e.before.trim()||(!e.after.trim()&&!(e.remove===true&&e.after===''))||(e.remove===true&&e.after!=='')||e.before===e.after||seen.has(key)||(e.occurrence===undefined?count!==1:!Number.isInteger(e.occurrence)||e.occurrence<0||e.occurrence>=count||original.snapshot.text.filter(p=>p===e.before).length!==count)) throw new Error('Each edit needs one unique existing paragraph or an exact body occurrence');
    if(plan.edits.some(other=>other!==e&&other.before===e.before&&(other.occurrence===undefined||e.occurrence===undefined)))throw new Error('Repeated body edits require explicit occurrences');
    if(e.remove===true&&(!original.snapshot.flow.some(f=>['se-text','se-quotation'].includes(f.kind)&&f.paragraphs?.includes(e.before))||original.table.some(row=>row.includes(e.before))))throw new Error('Only an explicitly reviewed body or reading-note paragraph can be removed');
    if(/https?:\/\//.test(e.before+' '+e.after))throw new Error('Service/source links need a separately reviewed link operation');
    seen.add(key);
  }
  if(plan.edits.some((e,i)=>e.after.split('\n').some(p=>plan.edits.some((other,j)=>j!==i&&other.before===p))))throw new Error('Edit output overlaps another input');
  for(const s of plan.formats??[])if(!s.text||!Object.values(EDITORIAL_FONT_SIZES).includes(s.size))throw new Error('Unreviewed formatting');
  const mapper=()=>{const occurrences=new Map();return p=>{const occurrence=occurrences.get(p)??0;occurrences.set(p,occurrence+1);const edit=plan.edits.find(e=>e.before===p&&(e.occurrence===undefined||e.occurrence===occurrence));return edit?.remove===true?[]:edit?.after.split('\n')??[p];};};
  const flowMap=mapper();
  const snapshot={...original.snapshot,title:plan.title??original.snapshot.title,text:original.snapshot.text.flatMap(mapper()),flow:original.snapshot.flow.map(f=>f.paragraphs?{...f,paragraphs:f.paragraphs.flatMap(flowMap)}:f)};
  const table=original.table.map(row=>row.map(cell=>{const replacement=plan.edits.find(e=>e.before===cell);if(replacement?.after.includes('\n'))throw new Error('Table cells cannot split into paragraphs');return replacement?.after??cell;}));
  if(plan.tableRowInsert){
    const r=plan.tableRowInsert, tables=original.snapshot.flow.filter(f=>f.kind==='se-table'),digest=crypto.createHash('sha256').update(JSON.stringify(original.table)).digest('hex');
    if(original.post.kind!=='curated'||tables.length!==1||r.beforeRowsSha256!==digest||!Number.isInteger(r.index)||r.index<1||r.index>table.length||!Array.isArray(r.row)||r.row.length!==table[0]?.length||r.row.some(c=>typeof c!=='string'||!c.trim()||c!==c.trim()||/[\r\n\t]|https?:\/\//.test(c))||original.table.some(row=>same(row,r.row))||!same(tables[0].paragraphs,original.table.flat().filter(Boolean)))throw new Error('Only one reviewed missing row in an exact complete institution table can be inserted');
    table.splice(r.index,0,r.row);
    snapshot.flow=snapshot.flow.map(f=>f.kind==='se-table'?{...f,paragraphs:table.flat().filter(Boolean)}:f);
  }
  const afterParagraphs=snapshot.flow.flatMap(f=>f.paragraphs??[]);
  if(plan.introGap&&(original.post.kind!=='celeb'||snapshot.text[2]!=='인물의 서재'||plan.introGap.profile!==snapshot.text[3]||plan.introGap.intro!==snapshot.text[4]||afterParagraphs.filter(p=>p===plan.introGap.intro).length!==1))throw new Error('Introduction spacing must name the exact reviewed profile and introduction');
  for(const s of plan.formats??[])if(!Number.isInteger(s.occurrence??0)||(s.occurrence??0)<0||afterParagraphs.filter(p=>p===s.text).length<=(s.occurrence??0)||![undefined,'left','center'].includes(s.align))throw new Error('Formatted paragraph or occurrence differs');
  if(plan.portraitWidth!==undefined&&(original.post.kind!=='celeb'||plan.portraitWidth!==EDITORIAL_PORTRAIT_WIDTH||!original.snapshot.images[0]?.representative||!/(?:portrait|local)-/.test(original.snapshot.images[0].src)))throw new Error('Only the verified protagonist portrait can be resized');
  const imageWidths=plan.imageWidths??[];
  if(!Array.isArray(imageWidths)||new Set(imageWidths.map(r=>r.index)).size!==imageWidths.length)throw new Error('Reviewed cover positions must be unique');
  for(const r of imageWidths){const image=original.snapshot.images[r.index];if(!Number.isInteger(r.index)||r.index<=0||!image||image.componentKind!=='image'||image.representative||image.src!==r.beforeSrc||r.width!==EDITORIAL_COVER_WIDTH)throw new Error('Only an explicitly identified book cover can be resized');}
  const imageReplacements=plan.imageReplacements??[];
  if(!Array.isArray(imageReplacements)||imageReplacements.length>1)throw new Error('Review one cover replacement at a time');
  for(const r of imageReplacements){const old=original.snapshot.images[r.index];if(!Number.isInteger(r.index)||r.index<=0||!old||old.componentKind!=='image'||old.representative||old.src!==r.beforeSrc||!path.isAbsolute(r.file??'')||!/^[a-f0-9]{64}$/.test(r.sha256??'')||!/^cover-[a-z0-9-]+$/.test(r.marker??'')||!Number.isInteger(r.width)||r.width<80||r.width>400)throw new Error('Cover replacement identity or asset differs');}
  if(imageReplacements.some(r=>imageWidths.some(w=>w.index===r.index)))throw new Error('A replacement already defines its cover width');
  return {snapshot,table,reservation:editorialReservation(original.original?.reservation,original.snapshot.title,snapshot.title),portraitWidth:plan.portraitWidth,imageWidths,imageReplacements};
}

export function assertEditorialChangeResult(original, expected, snapshot, table) {
  if(expected.imageReplacements?.some(r=>!r.bound))throw new Error('Replacement cover has not been verified and bound');
  for(const key of ['title','text','links','flow','dividers'])if(!same(snapshot[key],expected.snapshot[key]))throw new Error('Complete article differs: '+key);
  const identity=(i,index)=>({id:i.id,componentKind:i.componentKind,src:i.src,...((expected.portraitWidth&&index===0)||expected.imageWidths?.some(r=>r.index===index)?{}:{width:i.width,height:i.height}),naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,caption:i.caption,representative:i.representative,align:i.align});
  if(!same(snapshot.images.map(identity),expected.snapshot.images.map(identity)))throw new Error('Image source, order, dimensions or representative changed');
  if(expected.portraitWidth){const image=snapshot.images[0];if(Number(image.width)!==expected.portraitWidth||Math.abs(image.displayWidth-expected.portraitWidth)>1||Math.abs(image.displayHeight-image.displayWidth*image.naturalHeight/image.naturalWidth)>1)throw new Error('Portrait display size or aspect ratio differs');}
  for(const r of expected.imageWidths??[]){const image=snapshot.images[r.index];if(Number(image.width)!==r.width||Math.abs(image.displayWidth-r.width)>1||Math.abs(image.displayHeight-image.displayWidth*image.naturalHeight/image.naturalWidth)>1)throw new Error('Book cover display size or aspect ratio differs');}
  if(!same(table,expected.table))throw new Error('Complete table differs');
}

async function resizeEditorialImage(page,image,width){
 const selector=`.se-component[id="${image.id}"] img.se-image-resource`;
 await page.$eval(selector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(selector);
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.offsetParent&&/크기 변경 열기/.test(b.getAttribute('aria-label')||b.textContent)),{timeout:10000});
 const control=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/크기 변경 열기/.test(b.getAttribute('aria-label')||b.textContent));if(!b)throw new Error('Image sizing control missing');const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.mouse.click(control.x,control.y);
 const input=await page.waitForSelector('[class*=resizing-input] input, input[class*=resizing-input]',{visible:true});await input.click({clickCount:3});await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.type(String(width));await page.keyboard.press('Enter');await input.dispose();await page.keyboard.press('Escape');
}

async function introGapCount(page,{profile,intro}){
 return page.$$eval('.se-component:not(.se-documentTitle) .se-text-paragraph',(nodes,{profile,intro})=>{
  const text=nodes.map(p=>p.textContent.replace(/\u200b/g,'').trim()),matches=text.flatMap((t,i)=>t===intro?[i]:[]);
  if(matches.length!==1)throw Error('Exact introduction missing or duplicated');
  let previous=matches[0]-1,count=0;while(previous>=0&&!text[previous]){count++;previous--;}
  if(text[previous]!==profile||!nodes[matches[0]].closest('.se-text'))throw Error('Profile and introduction boundaries differ');
  return count;
 },{profile,intro});
}

async function ensureIntroGap(page,gap){
 if(await introGapCount(page,gap)>0)return;
 const before=await readSnapshot(page);
 const point=await page.$$eval('.se-component:not(.se-documentTitle) .se-text-paragraph',(nodes,text)=>{
  const p=nodes.find(p=>p.textContent.replace(/\u200b/g,'').trim()===text);p.scrollIntoView({block:'center',behavior:'instant'});
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let first;
  while(walker.nextNode())if(walker.currentNode.textContent.replace(/\u200b/g,'').length){first=walker.currentNode;break;}
  if(!first)throw Error('Introduction text node absent');let start=0;while(first.textContent[start]==='\u200b')start++;
  const range=document.createRange();range.setStart(first,start);range.setEnd(first,start+1);const r=range.getBoundingClientRect();
  if(r.top<125||r.bottom>innerHeight-20)throw Error('Introduction outside safe viewport');return{x:r.left-2,y:r.top+r.height/2};
 },gap.intro);
 await page.mouse.click(point.x,point.y);
 await new Promise(resolve=>setTimeout(resolve,150));
 const atStart=await page.evaluate(text=>{const s=getSelection(),a=s?.anchorNode,e=a?.nodeType===1?a:a?.parentElement,p=e?.closest('.se-text-paragraph');if(!s?.isCollapsed||p?.textContent.replace(/\u200b/g,'').trim()!==text)return false;const r=document.createRange();r.selectNodeContents(p);r.setEnd(a,s.anchorOffset);return !r.toString().replace(/\u200b/g,'');},gap.intro);
 if(!atStart)throw Error('Caret is not at exact introduction start');
 await page.keyboard.press('Enter');
 await new Promise(resolve=>setTimeout(resolve,150));
 if(await introGapCount(page,gap)!==1||!same(await readSnapshot(page),before))throw Error('Introduction spacing changed article content');
}

async function insertEditorialTableRow(page,insertion){
 const previous=await page.$$eval('.se-component.se-table tr',(rows,index)=>{
   const cell=rows[index-1]?.querySelector('td,th');if(!cell)throw Error('Preceding table row missing');cell.scrollIntoView({block:'center',behavior:'instant'});const r=cell.getBoundingClientRect();return{x:r.left+10,y:r.top+r.height/2};
 },insertion.index);await page.mouse.click(previous.x,previous.y);
 const label=(insertion.index-1)+'행 다음에 행 추가';
 await page.waitForFunction(label=>[...document.querySelectorAll('button.se-cell-add-button')].some(b=>b.textContent.trim()===label),{timeout:10000},label);
 await new Promise(resolve=>setTimeout(resolve,200));
 // The column resize handle overlaps the centre of the row-add circle. Hit-test inside
 // the actual button and click only its exposed portion, never the resize overlay.
 const point=await page.evaluate(label=>{const b=[...document.querySelectorAll('button.se-cell-add-button')].find(b=>b.textContent.trim()===label),r=b.getBoundingClientRect(),y=r.top+r.height/2;if(!b.offsetParent||!r.width||!r.height||y<125||y>innerHeight-20)throw Error('Exact add-row button is not visible');for(const fraction of [.5,.15,.85]){const x=r.left+r.width*fraction,hit=document.elementFromPoint(x,y);if(hit===b||b.contains(hit))return{x,y};}throw Error('Exact add-row button is obscured');},label);await page.mouse.click(point.x,point.y);
 await page.waitForFunction(index=>{const row=document.querySelectorAll('.se-component.se-table tr')[index];return row&&[...row.querySelectorAll('td,th')].every(c=>!c.innerText.replace(/\u200b/g,'').trim());},{timeout:10000},insertion.index);
 for(const [column,text]of insertion.row.entries()){
   const point=await page.$$eval('.se-component.se-table tr',(rows,{index,column})=>{const p=rows[index].querySelectorAll('td,th')[column].querySelector('.se-text-paragraph');p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.left+2,y:r.top+Math.min(8,r.height/2)};},{index:insertion.index,column});await page.mouse.click(point.x,point.y);await page.keyboard.sendCharacter(text);
   await page.waitForFunction(({index,column,text})=>document.querySelectorAll('.se-component.se-table tr')[index].querySelectorAll('td,th')[column].innerText.replace(/\u200b/g,'').trim()===text,{timeout:10000},{index:insertion.index,column,text});
 }
}

// Bind only after the native upload and its single frame have passed their geometry checks.
export function bindEditorialCover(expected, replacement, image){
 const old=expected.snapshot.images[replacement.index];
 if(!old||!image||image.componentKind!==old.componentKind||image.representative!==old.representative||!same(image.caption,old.caption)||image.align!==old.align||Number(image.width)!==replacement.width||image.naturalWidth!==replacement.naturalWidth+40||image.naturalHeight!==replacement.naturalHeight+40||Math.abs(image.displayWidth-replacement.width)>1||Math.abs(image.displayHeight-image.displayWidth*image.naturalHeight/image.naturalWidth)>1||image.src===old.src)throw new Error('Replacement cover geometry or placement differs');
 expected.snapshot={...expected.snapshot,images:expected.snapshot.images.map((v,i)=>i===replacement.index?structuredClone(image):v),flow:expected.snapshot.flow.map(f=>f.kind==='image'&&f.src===old.src?{...f,src:image.src}:f)};
 replacement.bound=true;
}

async function replaceEditorialCover(page,editor,expected,r){
 const old=expected.snapshot.images[r.index],selector=`.se-component[id="${old.id}"] img.se-image-resource`;
 await page.$eval(selector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(selector);
 const button='button.se-image-replacement-toolbar-button[data-name="image-replacement"]';await page.waitForSelector(button,{visible:true,timeout:10000});
 const cdp=await page.createCDPSession();let chooser;
 try{await cdp.send('Page.enable');cdp.on('Page.fileChooserOpened',v=>chooser=v);await cdp.send('Page.setInterceptFileChooserDialog',{enabled:true});await page.click(button);for(let i=0;i<40&&!chooser;i++)await new Promise(resolve=>setTimeout(resolve,200));if(!chooser?.backendNodeId)throw new Error('Cover file chooser missing');await cdp.send('DOM.setFileInputFiles',{files:[r.file],backendNodeId:chooser.backendNodeId});await page.waitForFunction(({marker,w,h})=>{const matches=[...document.querySelectorAll('.se-component.se-image img.se-image-resource')].filter(i=>i.src.includes(marker));return matches.length===1&&matches[0].complete&&matches[0].naturalWidth===w&&matches[0].naturalHeight===h;},{timeout:45000},{marker:r.marker,w:r.naturalWidth,h:r.naturalHeight});}
 finally{await cdp.send('Page.setInterceptFileChooserDialog',{enabled:false}).catch(()=>{});await cdp.detach();}
 const uploaded=await readSnapshot(page),cover=uploaded.images[r.index];if(uploaded.images.length!==expected.snapshot.images.length||!cover?.src.includes(r.marker))throw new Error('Cover uploaded at a different position');
 if(!(await applyPhotoFrame(page,5,{imageId:cover.id})))throw new Error('Cover frame missing');
 const sizes=uploaded.images.map((im,i)=>[im.naturalWidth+(i===r.index?40:0),im.naturalHeight+(i===r.index?40:0)]);await editor.imageSizes(uploaded.images.length,sizes);
 const imageSelector=`.se-component[id="${cover.id}"] img.se-image-resource`;await page.$eval(imageSelector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(imageSelector);
 const control=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&/크기 변경 열기/.test(b.getAttribute('aria-label')||b.textContent));if(!b)throw new Error('Cover size control missing');const x=b.getBoundingClientRect();return{x:x.left+x.width/2,y:x.top+x.height/2};});await page.mouse.click(control.x,control.y);
 const input=await page.waitForSelector('[class*=resizing-input] input, input[class*=resizing-input]',{visible:true});await input.click({clickCount:3});await page.keyboard.type(String(r.width));await page.keyboard.press('Enter');await input.dispose();await page.keyboard.press('Escape');
 const after=await readSnapshot(page);bindEditorialCover(expected,r,after.images[r.index]);assertEditorialChangeResult(null,expected,after,await page.$$eval('.se-component.se-table tr',rows=>rows.map(row=>[...row.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim()))));
}

async function main(){
 const args=process.argv.slice(2),planArg=args.find(a=>a.startsWith('--plan='));
 if(!planArg||args.some(a=>!a.startsWith('--plan=')&&!['--apply','--review'].includes(a))||args.filter(a=>a.startsWith('--plan=')).length!==1)throw new Error('--plan=<reviewed JSON> [--apply] [--review]');
 const file=path.resolve(planArg.slice(7)),dir=path.dirname(file),plan=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!path.isAbsolute(plan.originalFile))throw new Error('Absolute original snapshot path required');
 const original=JSON.parse(fs.readFileSync(plan.originalFile,'utf8')),expected=prepareEditorialChanges(original,plan);
 for(const r of expected.imageReplacements){const bytes=fs.readFileSync(r.file),meta=await sharp(bytes).metadata();if(crypto.createHash('sha256').update(bytes).digest('hex')!==r.sha256||!['jpeg','png'].includes(meta.format)||!path.basename(r.file).startsWith(r.marker))throw new Error('Reviewed cover bytes or filename changed');r.naturalWidth=meta.width;r.naturalHeight=meta.height;}
 const posts=JSON.parse(fs.readFileSync(path.join(ASSETS,'naver-blog','posts.json'),'utf8')),active=posts.filter(p=>String(p.logNo)===String(plan.logNo));
 if(active.length!==1||active[0].kind!==original.post.kind||active[0].title!==original.post.title||active[0].url!==original.post.url||active[0].slug!==original.post.slug||!['ok','check'].includes(active[0].link))throw new Error('Active service post differs from the reviewed original');
 const {browser}=await getBrowser({background:true}),page=await browser.newPage();let step='open',saved=false;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 page.on('dialog',async d=>{if(d.type()==='beforeunload')await d.accept();else await d.dismiss();});
 const table=()=>page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
 const assertFormats=async()=>{
  if(plan.introGap&&await introGapCount(page,plan.introGap)<1)throw new Error('Profile and introduction have no paragraph gap');
  if(!plan.formats?.length)return;
  const actual=await page.$$eval('.se-component:not(.se-documentTitle) .se-text-paragraph',nodes=>nodes.map(p=>({text:p.textContent.replace(/\u200b/g,'').trim(),align:getComputedStyle(p).textAlign,sizes:[...p.querySelectorAll('span:not(.se-placeholder)')].filter(s=>s.textContent.trim()).map(s=>parseFloat(getComputedStyle(s).fontSize))})));
  for(const f of plan.formats){const got=actual.filter(p=>p.text===f.text)[f.occurrence??0];if(!got?.sizes.length||got.sizes.some(size=>size!==f.size)||(f.align&&got.align!==f.align))throw new Error('Reviewed typography differs: '+f.text.slice(0,40));}
 };
 try{
  await page.setViewport({width:1440,height:1000});const c=await page.createCDPSession();await c.send('Emulation.setFocusEmulationEnabled',{enabled:true});await c.detach();
  const editor=createExistingEditor(page),native=createEditorialEditor(page),opened=await editor.openTarget({...active[0],title:original.snapshot.title,body:undefined});await assertPublishOptions(page,{preserve:original.original.state});await closePublishPanel(page,editor);
  const before=await readSnapshot(page);assertEditorialChangeResult(original,{snapshot:original.snapshot,table:original.table},before,await table());
  if(!same(opened.state,original.original.state)||!same(opened.reservation,original.original.reservation))throw new Error('Publish settings or reservation changed since inspection');
  // Work backwards through repeated text so removing one occurrence never shifts a pending one.
  for(const edit of [...plan.edits].sort((a,b)=>(b.occurrence??0)-(a.occurrence??0))){step='replace-paragraph';if(edit.remove===true)await native.clearParagraph(edit.before,{occurrence:edit.occurrence??0});else await native.replaceParagraph(edit.before,edit.after,{occurrence:edit.occurrence??0});}
  if(plan.tableRowInsert){step='insert-reviewed-table-row';await insertEditorialTableRow(page,plan.tableRowInsert);}
  if(plan.title){step='replace-title';await replaceTitle(page,before.title,plan.title);await centerTitle(page);await assertCenteredTitle(page);}
  for(const f of plan.formats??[]){step='format-paragraph';await native.formatParagraph(f.text,f.size,f.occurrence??0);if(f.align)await native.alignParagraph(f.text,f.align,{occurrence:f.occurrence??0});}
  if(plan.introGap){step='space-introduction';await ensureIntroGap(page,plan.introGap);}
  if(plan.portraitWidth){step='portrait-width';await resizeEditorialImage(page,before.images[0],plan.portraitWidth);}
  for(const r of expected.imageWidths){step='cover-width';await resizeEditorialImage(page,before.images[r.index],r.width);}
  for(const r of expected.imageReplacements){step='replace-reviewed-cover';await replaceEditorialCover(page,editor,expected,r);}
  if(plan.formats?.length){step='center-dividers';await centerDividers(page);await assertCenteredDividers(page);}
  await page.keyboard.press('Escape');step='verify-ready';const ready=await readSnapshot(page);assertEditorialChangeResult(original,expected,ready,await table());await assertFormats();
  fs.writeFileSync(path.join(dir,plan.logNo+'-changes-ready.json'),JSON.stringify({snapshot:ready,table:await table()},null,2));
  for(const [index,text]of (plan.capture??plan.edits.map(e=>e.after.split('\n')[0])).entries()){
   await page.evaluate(text=>[...document.querySelectorAll('.se-text-paragraph')].find(p=>p.textContent.replace(/\u200b/g,'').trim()===text)?.scrollIntoView({block:'center',behavior:'instant'}),text);await wait(200);await page.screenshot({path:path.join(dir,plan.logNo+'-changes-ready-'+index+'.png')});
  }
  if(args.includes('--review')){
   const token=crypto.randomUUID();fs.writeFileSync(path.join(dir,plan.logNo+'-review-token'),token);console.log(JSON.stringify({stage:'ready-for-screen-review',logNo:plan.logNo}));let reviewed=false;const until=Date.now()+300000;
   while(Date.now()<until){const f=path.join(dir,plan.logNo+'-screen-reviewed');if(fs.existsSync(f)&&fs.readFileSync(f,'utf8')===token){reviewed=true;break;}await wait(300);}if(!reviewed)throw new Error('Native screen review timed out');
  }
  if(args.includes('--apply')){
   await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:original.original.state});{const now=await editor.settings();if(!same(now,opened.state))throw new Error('Settings changed before save '+JSON.stringify({opened:opened.state,now}));}step='save';await editor.click('button[class*=confirm_btn]');await page.waitForFunction(id=>location.href.includes('logNo='+id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},String(plan.logNo));saved=true;
   step='reopen';const reopened=await editor.openTarget({...active[0],title:expected.snapshot.title,body:undefined});await assertPublishOptions(page,{preserve:original.original.state});if(!same(reopened.state,opened.state)||!same(reopened.reservation,expected.reservation))throw new Error('Saved settings or reservation differ');await closePublishPanel(page,editor);const after=await readSnapshot(page);assertEditorialChangeResult(original,expected,after,await table());await assertFormats();if(plan.title)await assertCenteredTitle(page);if(plan.formats?.length)await assertCenteredDividers(page);
   fs.writeFileSync(path.join(dir,plan.logNo+'-changes-applied.json'),JSON.stringify({verified:true,snapshot:after,table:await table(),settings:reopened.state,reservation:reopened.reservation},null,2));console.log(JSON.stringify({stage:'saved-and-reopened',logNo:plan.logNo,edits:plan.edits.length}));
  }else console.log(JSON.stringify({stage:'dry-ready',logNo:plan.logNo}));
 }catch(error){fs.writeFileSync(path.join(dir,plan.logNo+'-changes-failure.json'),JSON.stringify({step,saved,error:String(error)},null,2));await page.screenshot({path:path.join(dir,plan.logNo+'-changes-failure.png')}).catch(()=>{});throw error;}
 finally{await page.close();await browser.disconnect();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){await main();process.exit(0);}
