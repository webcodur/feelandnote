// One background native-editor transaction. No model calls or prose generation.
// --article=<prepared JSON> [--apply] [--review] . Default: insert/check without saving.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ASSETS} from '../blog-assets.mjs';
import {getBrowser} from './lib/browser.mjs';
import {createExistingEditor} from './lib/existing-editor.mjs';
import {compileUnifiedArticle,UNIFIED_ARTICLE,textPresentation,canonicalHttpHref,servicePostUrl} from './lib/unified-article.mjs';
import {readParagraphPresentation,assertParagraphPresentation} from './lib/unified-typography.mjs';
import {prepareImages,clearBody,leaveFullListTable,centerTitle,assertCenteredTitle,centerDividers} from './apply-institution-revisions.mjs';
import {editorialReservation} from './apply-editorial-changes.mjs';
import {readSnapshot,setRepresentative,closePublishPanel} from './repair-institution-images.mjs';
import {insertImage,insertDivider} from './publish-drafts.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';
import {verifyUnifiedPublic} from './lib/unified-public.mjs';
import {savePreparedPreview} from './lib/unified-preview.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function assertUnifiedSnapshot(article,snapshot,table,prepared,anchorTargets={}){
 const text=article.operations.filter(o=>['text','link'].includes(o.kind)&&o.placement!=='cover-caption').map(o=>o.text);
 if(snapshot.title!==article.title||!same(snapshot.text,text))throw Error('Complete unified title/body differs');
 const expectedFlow=article.operations.filter(o=>o.placement!=='cover-caption').flatMap(o=>['text','link'].includes(o.kind)?[{kind:'text',text:o.text}]:o.kind==='image'?[{kind:'image'}]:o.kind==='divider'?[{kind:'divider'}]:[{kind:'table'}]);
 const actualFlow=snapshot.flow.flatMap(o=>o.kind==='se-text'?(o.paragraphs??[]).filter(Boolean).map(text=>({kind:'text',text})):o.kind==='image'?[{kind:'image'}]:o.kind==='se-horizontalLine'?[{kind:'divider'}]:o.kind==='se-table'?[{kind:'table'}]:[{kind:o.kind}]);
 if(!same(expectedFlow,actualFlow))throw Error('Unified component order/type differs or legacy media remain');
 const wantedTable=article.operations.find(o=>o.kind==='table');if(!same(table,wantedTable?[wantedTable.columns,...wantedTable.rows]:[]))throw Error('Complete institution selection table differs');
 const links=article.operations.filter(o=>o.kind==='link').map(o=>({text:o.text,href:canonicalHttpHref(o.href.startsWith('#')?anchorTargets[o.href]:o.href)}));
 if(!same(snapshot.links.map(l=>({text:l.text,href:canonicalHttpHref(l.href)})),links))throw Error('Visible link labels or destinations differ');
 const images=article.operations.filter(o=>o.kind==='image');for(const [i,op]of images.entries()){const next=article.operations[article.operations.indexOf(op)+1],caption=next?.placement==='cover-caption'?[next.text]:[];if(!same(snapshot.images[i]?.caption,caption))throw Error('Cover purchase caption differs');}if(images.length!==snapshot.images.length||images.length!==prepared.length)throw Error('Unified image count differs');
 for(const [i,image]of snapshot.images.entries()){if(!image.src.includes(prepared[i].marker)||Number(image.width)!==images[i].width||image.naturalWidth<=0||image.naturalWidth>prepared[i].widthOriginal||Math.abs(image.naturalHeight-image.naturalWidth*prepared[i].heightOriginal/prepared[i].widthOriginal)>1||image.align!=='se-section-align-center'||image.representative!==(i===0))throw Error('Unified image identity, geometry, alignment or representative differs');}
}
export async function assertTypography(page,article){
 const actual=await page.evaluate(readParagraphPresentation,'.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph');assertParagraphPresentation(article,actual);
}
function fragment(ops){return ops.map(o=>{const p=textPresentation(o),style=`font-family:나눔고딕,sans-serif;font-size:${p.size}px;line-height:1.7;text-align:${p.align};`,value=o.kind==='link'?'<a href="'+esc(o.href)+'">'+esc(o.text)+'</a>':esc(o.text).replace(/\n/g,'<br>');return (p.gapBefore?'<p><span style="font-size:16px">\u200b</span></p>':'')+`<p style="${style}"><span style="font-size:${p.size}px;font-weight:${p.bold?700:400};color:${p.color};${p.background?'background-color:'+p.background+';':''}">${p.bold?'<strong>'+value+'</strong>':value}</span></p>`;}).join('');}
const clipboardPages=new WeakMap();
async function nativeClipboard(page,html){const clipboard=clipboardPages.get(page);if(!clipboard)throw Error('Owned background clipboard page required');await clipboard.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);}
async function selectedText(page){await sleep(250);await page.keyboard.down('Control');await page.keyboard.press('KeyC');await page.keyboard.up('Control');await sleep(500);let value='';for(let attempt=0;attempt<10;attempt++){value=await page.evaluate(async()=>(await navigator.clipboard.readText()).replace(/\u200b/g,'').trim());if(value)return value;await sleep(200);}return value;}
async function appendPosition(page){
 const point=await page.evaluate(()=>{const component=[...document.querySelectorAll('.se-component:not(.se-documentTitle)')].at(-1),p=component?.querySelector('.se-text-paragraph:last-child');if(!component?.classList.contains('se-text')||!p)throw Error('A final native text paragraph is required');p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.left+5,y:r.top+r.height/2};});
 await page.mouse.click(point.x,point.y);await page.keyboard.press('End');
 const blank=await page.evaluate(()=>{const p=[...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')].at(-1),s=getSelection();return s?.isCollapsed&&p?.contains(s.anchorNode)&&!p.textContent.replace(/\u200b/g,'').trim();});
 if(!blank)throw Error('Append caret is not inside the final empty paragraph');
}
async function insertCoverCaption(page,op){
 const image=await page.$$eval('.se-component.se-image',nodes=>{const n=nodes.at(-1);n.scrollIntoView({block:'center',behavior:'instant'});const r=n.querySelector('img').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
 await page.mouse.click(image.x,image.y);await sleep(150);
 const point=await page.$$eval('.se-component.se-image',nodes=>{const p=nodes.at(-1).querySelector('.se-caption .se-text-paragraph');if(!p||p.textContent.replace(/\u200b/g,'').trim()&&!p.querySelector('.se-placeholder'))throw Error('An empty native image caption is required');const r=p.getBoundingClientRect();if(!r.height)throw Error('Native image caption is hidden');return{x:r.left+r.width/2,y:r.top+r.height/2};});
 await page.mouse.click(point.x,point.y);await nativeClipboard(page,fragment([op]));await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');
 await page.waitForFunction(text=>[...document.querySelectorAll('.se-component.se-image')].at(-1)?.querySelector('.se-caption .se-text-paragraph')?.textContent.replace(/\u200b/g,'').trim()===text,{timeout:5000},op.text);
}
async function normalizeTypography(page,article){
 const native=createEditorialEditor(page),first=article.operations.find(o=>o.kind==='text'),paragraph=await page.$('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph');if(!paragraph)throw Error('First body paragraph missing');await paragraph.evaluate(p=>p.scrollIntoView({block:'center',behavior:'instant'}));await paragraph.click();await paragraph.dispose();await sleep(250);await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await sleep(500);
 const selected=await selectedText(page);
 if(!selected.includes(first.text)||!selected.includes(article.operations.filter(o=>o.kind==='text').at(-1).text)||selected.split('\n').includes(article.title))throw Error('Complete native body selection required for typography: '+JSON.stringify({length:selected.length,head:selected.slice(0,100),tail:selected.slice(-180)}));
 await native.fontSize(UNIFIED_ARTICLE.font.body);await native.clickControl('.se-toolbar-item-align .se-property-toolbar-drop-down-button');await sleep(100);
 const left=await page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim().startsWith('왼쪽 정렬'));if(!e)throw Error('Left alignment control missing');const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.mouse.click(left.x,left.y);await sleep(150);
 const occurrences=new Map();for(const op of article.operations.filter(o=>['text','link'].includes(o.kind))){const occurrence=occurrences.get(op.text)??0;occurrences.set(op.text,occurrence+1);if(op.role!=='body'&&op.placement!=='cover-caption'){await native.selectParagraph(op.text,{occurrence});if(await selectedText(page)!==op.text)throw Error('Typography selection differs: '+op.text);await native.fontSize(UNIFIED_ARTICLE.font[op.role]);}
  const s=textPresentation(op),actual=await page.evaluate(readParagraphPresentation,'.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-image .se-caption .se-text-paragraph'),p=actual.filter(p=>p.text===op.text)[occurrence];
  if(!p||p.weights.some(w=>(w>=600)!==s.bold)){await native.selectParagraph(op.text,{occurrence});if(await selectedText(page)!==op.text)throw Error('Bold selection differs');await page.keyboard.down('Control');await page.keyboard.press('KeyB');await page.keyboard.up('Control');await sleep(100);}
  if(op.align!=='left'&&op.placement!=='cover-caption')await native.alignParagraph(op.text,op.align,{occurrence});}
}
async function centerImages(page){
 const ids=await page.$$eval('.se-component.se-image',nodes=>nodes.map(n=>n.id));
 for(const id of ids)for(let attempt=0;attempt<4;attempt++){
  if(await page.$eval('[id="'+id+'"]',n=>!!n.querySelector('.se-section-align-center')))break;
  const point=await page.$eval('[id="'+id+'"] img',n=>{n.scrollIntoView({block:'center',behavior:'instant'});const r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await page.mouse.click(point.x,point.y);await sleep(150);
  const hit=await page.evaluate(()=>{const b=[...document.querySelectorAll('button.se-context-toolbar-cycle-toggle-button')].find(b=>b.offsetParent&&/se-align-center/.test(b.className));if(!b)return false;b.click();return true;});if(!hit)throw Error('Native image alignment control missing');await sleep(300);
 }
 if(await page.$$eval('.se-component.se-image',nodes=>nodes.some(n=>!n.querySelector('.se-section-align-center'))))throw Error('Centered media required');
}
export async function applyUnifiedArticle(file,{apply=false,review=false}={}){
 const article=read(file),dir=path.join(path.dirname(file),article.logNo+'-native-'+Date.now());fs.mkdirSync(dir);const material=read(path.join(path.dirname(file),article.logNo+'-material.json'));
 if(!same(compileUnifiedArticle(material),article))throw Error('Article differs from its source material/compiler');
 const registry=path.join(ASSETS,'naver-blog/posts.json'),posts=read(registry),matches=posts.filter(p=>String(p.logNo)===article.logNo);if(matches.length!==1||matches[0].kind!==article.kind||!['ok','check'].includes(matches[0].link))throw Error('Exact active registry target required');const post=matches[0];
 if(servicePostUrl(post)!==article.serviceUrl)throw Error('Service identity differs');
 if(article.title!==post.title)throw Error('Existing title must be preserved; title revision requires a separate plan');
 // This template treats a logo as an ordinary first picture; the legacy helper's
 // separate logo branch belongs to its former revision/asset contract.
 const target={post,revision:{target:new URL(article.serviceUrl).pathname},plan:{images:article.operations.filter(o=>o.kind==='image').map(o=>({...o,role:o.role==='logo'?'portrait':o.role}))}};
 const prepared=await prepareImages(target,dir);savePreparedPreview(article,prepared.images,path.dirname(file));const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let saved=false,step='open';
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));await page.setViewport({width:1440,height:1000});const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});await browser.defaultBrowserContext().overridePermissions('https://blog.naver.com',['clipboard-read','clipboard-sanitized-write']);clipboardPages.set(page,page);const editor=createExistingEditor(page);
 const table=()=>page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
 try{
  const original=await editor.openTarget({...post,body:undefined});await assertPublishOptions(page,{preserve:original.state});await closePublishPanel(page,editor);const before=await readSnapshot(page,{waitForImages:false});write(path.join(dir,'before.json'),{post,original,snapshot:before,table:await table()});fs.writeFileSync(path.join(dir,'before.html'),await page.$$eval('.se-component',nodes=>nodes.map(e=>e.outerHTML).join('\n')));
  step='clipboard-check';await nativeClipboard(page,'<p>clipboard readiness</p>');step='clear';await clearBody(page,post.title);step='insert';const cdp=await page.createCDPSession();await cdp.send('DOM.enable');await cdp.send('Page.enable');cdp.on('Page.fileChooserOpened',event=>{cdp.__chooser=event;});await cdp.send('Page.setInterceptFileChooserDialog',{enabled:true});let batch=[],batchIndex=0,imageIndex=0;
  async function flush(){if(!batch.length)return;await appendPosition(page);const html=fragment(batch),wanted=batch.map(o=>o.text),before=await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph',ps=>ps.filter(p=>p.textContent.replace(/\u200b/g,'').trim()).length);fs.writeFileSync(path.join(dir,'fragment-'+(batchIndex++)+'.html'),html);await nativeClipboard(page,html);await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await page.waitForFunction(({wanted,before})=>{const ps=[...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')].map(p=>p.textContent.replace(/\u200b/g,'').trim()).filter(Boolean);return ps.length>=before+wanted.length&&wanted.every(t=>ps.includes(t));},{timeout:10000},{wanted,before});await page.keyboard.press('End');await page.keyboard.press('Enter');batch=[];}

  const nativeOps=article.operations;
  try{for(const op of nativeOps){if(op.placement==='cover-caption'){await flush();await insertCoverCaption(page,op);continue;}if(['text','link'].includes(op.kind)){batch.push(op);continue;}await flush();if(op.kind==='image'){const image=prepared.images[imageIndex++];await insertImage(page,cdp,image.url,image.width,image.name,{file:image.file});}else if(op.kind==='divider')await insertDivider(page);else if(op.kind==='table'){const tableHtml='<table><thead><tr>'+op.columns.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+op.rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';await nativeClipboard(page,tableHtml);await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');await page.waitForSelector('.se-component.se-table');await leaveFullListTable(page);};}await flush();}finally{await cdp.detach();}
  write(path.join(dir,'inserted.json'),await readSnapshot(page));await editor.imageSizes(prepared.images.length);await centerDividers(page);await setRepresentative(page,(await readSnapshot(page)).images[0].id);
  await centerTitle(page);await assertCenteredTitle(page);
  const anchorTargets={};step='typography';await normalizeTypography(page,article);await centerImages(page);await centerDividers(page);
  const expectedReservation=editorialReservation(original.reservation,post.title,article.title),ready=await readSnapshot(page);assertUnifiedSnapshot(article,ready,await table(),prepared.images,anchorTargets);await assertTypography(page,article);
  await page.$eval('.se-documentTitle',p=>p.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-top.png')});await page.$$eval('.se-text-paragraph',ps=>ps.find(p=>p.textContent.trim()==='목차')?.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-contents.png')});const firstReview=article.operations.find(o=>o.text==='감상 배경');if(firstReview){await page.$$eval('.se-text-paragraph',(nodes,t)=>nodes.find(p=>p.textContent.replace(/\u200b/g,'').trim()===t)?.scrollIntoView({block:'center',behavior:'instant'}),firstReview.text);await page.screenshot({path:path.join(dir,'ready-reading.png')});}
  const readyFile=path.join(path.dirname(file),article.logNo+'-native-ready.json'),token=crypto.randomBytes(16).toString('hex');write(readyFile,{articleHash:article.articleHash,dir,token,saved:false,verified:true});console.log(JSON.stringify({stage:'ready',logNo:article.logNo,dir,reviewRequired:review,modelCalls:0}));
  if(!apply)return;
  if(review){const until=Date.now()+600000;while(!fs.existsSync(path.join(dir,'screen-reviewed'))&&Date.now()<until)await sleep(500);if(!fs.existsSync(path.join(dir,'screen-reviewed'))||fs.readFileSync(path.join(dir,'screen-reviewed'),'utf8')!==token)throw Error('Native screen review missing');}
  step='publish-options';await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:original.state});if(!same(await editor.settings(),original.state))throw Error('Publish settings changed before save');
  step='save';await editor.click('button[class*=confirm_btn]');saved=true;await page.waitForFunction(id=>location.href.includes(id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},article.logNo);
  step='reopen';const reopened=await editor.openTarget({...post,title:article.title,body:undefined});await assertPublishOptions(page,{preserve:original.state});if(!same(reopened.state,original.state)||!same(reopened.reservation,expectedReservation))throw Error('Saved settings or reservation differ');await closePublishPanel(page,editor);const after=await readSnapshot(page);assertUnifiedSnapshot(article,after,await table(),prepared.images,anchorTargets);await assertTypography(page,article);
  step='public-verification';const publicResult=reopened.reservation?{status:'reserved-not-public'}:await verifyUnifiedPublic(browser,article,{anchorTargets,nativeImages:after.images,dir});
  const receipt={logNo:article.logNo,articleHash:article.articleHash,verified:true,saved:true,snapshot:after,table:await table(),settings:reopened.state,reservation:reopened.reservation,anchorTargets,publicResult,dir,modelCalls:0};write(path.join(path.dirname(file),article.logNo+'-native-verified.json'),receipt);
  const current=read(registry),index=current.findIndex(p=>String(p.logNo)===article.logNo);if(index<0||!same(current[index],post))throw Error('Registry row changed during transaction');current[index]={...current[index],title:article.title,unified:{articleHash:article.articleHash,version:article.version,verifiedAt:new Date().toISOString(),reserved:!!reopened.reservation}};fs.writeFileSync(registry,JSON.stringify(current,null,2));console.log(JSON.stringify({stage:'saved-and-reopened',logNo:article.logNo,publicVerified:!reopened.reservation,modelCalls:0}));
 }catch(error){write(path.join(dir,'failure.json'),{saved,step,error:String(error)});await readSnapshot(page).then(snapshot=>write(path.join(dir,'failure-snapshot.json'),snapshot)).catch(()=>{});await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});console.error(JSON.stringify({saved,step,error:String(error),dir}));throw error;}
 finally{clipboardPages.delete(page);await focus.detach().catch(()=>{});await page.close().catch(()=>{});await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),file=args.find(a=>a.startsWith('--article='))?.slice(10);if(!file||args.some(a=>!a.startsWith('--article=')&&!['--apply','--review'].includes(a)))throw Error('--article=<JSON> [--apply] [--review]');await applyUnifiedArticle(path.resolve(file),{apply:args.includes('--apply'),review:args.includes('--review')});}
