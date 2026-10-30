import {sameReservation} from './lib/same-reservation.mjs';
// Exact title/library-scope revision of an already verified unified article.
import fs from 'node:fs';
import {preserveNativeTags,sameSavedPublishSettings} from './lib/preserve-native-tags.mjs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';import {fileURLToPath} from 'node:url';
import {ASSETS} from '../blog-assets.mjs';import {getBrowser} from './lib/browser.mjs';import {createExistingEditor} from './lib/existing-editor.mjs';
import {createEditorialEditor} from './lib/editorial-editor.mjs';import {compileUnifiedArticle,servicePostUrl} from './lib/unified-article.mjs';
import {titleAndFunnelPatch} from './lib/unified-title-patch.mjs';import {assertUnifiedSnapshot,assertTypography} from './apply-unified-article.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';import {assertPublishOptions} from './lib/publish-options.mjs';
import {replaceTitle,centerTitle,assertCenteredTitle} from './apply-institution-revisions.mjs';import {editorialReservation} from './apply-editorial-changes.mjs';
import {verifyUnifiedPublic} from './lib/unified-public.mjs';import {savePreparedPreview,verifiedPreviewManifest} from './lib/unified-preview.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function applyUnifiedTitleRevision(file,{apply=false,review=false}={}){
 const out=path.dirname(file),article=read(file),material=read(path.join(out,article.logNo+'-material.json')),base=read(path.join(out,'revision-base',article.logNo+'.json'));
 if(!same(compileUnifiedArticle(material),article)||!same(compileUnifiedArticle(base.material),base.article)||!base.receipt.saved||!base.receipt.verified||base.receipt.articleHash!==base.article.articleHash)throw Error('Exact verified revision base required');
 const patch=titleAndFunnelPatch(base.article,article);if(!patch)throw Error('Revision changes more than title and library scope');
 const registry=path.join(ASSETS,'naver-blog/posts.json'),post=read(registry).find(p=>String(p.logNo)===article.logNo);
 if(!post||post.title!==base.article.title||servicePostUrl(post)!==article.serviceUrl||article.title!==post.title&&!(material.titleRevision?.before===post.title&&material.titleRevision.after===article.title&&material.titleRevision.reason==='restore-existing-title-structure'))throw Error('Exact approved title target required');
 const images=article.operations.filter(o=>o.kind==='image'),manifest=verifiedPreviewManifest(base.article,base.receipt,base.preview);
 if(manifest?.articleHash!==base.article.articleHash||manifest.images.length!==images.length)throw Error('Verified original image manifest required');
 const prepared=[];for(const [i,m]of manifest.images.entries()){const bytes=fs.readFileSync(m.file);if(m.url!==images[i].url||hash(bytes)!==m.sha256)throw Error('Original image proof changed');const meta=await sharp(bytes).metadata();prepared.push({...images[i],file:m.file,marker:'revision-'+article.logNo+'-'+(i+1)+'-'+m.sha256.slice(0,12),widthOriginal:meta.width,heightOriginal:meta.height});}
 const dir=path.join(out,article.logNo+'-native-'+Date.now());fs.mkdirSync(dir);
 const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000}),page=await browser.newPage();let saved=false,step='open';
 page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));await page.setViewport({width:1440,height:1000});const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const editor=createExistingEditor(page),native=createEditorialEditor(page),table=()=>page.$$eval('.se-component.se-table tr',rows=>rows.map(r=>[...r.querySelectorAll('td,th')].map(c=>c.innerText.replace(/\u200b/g,'').trim())));
 try{
  const original=await editor.openTarget({...post,body:undefined});await assertPublishOptions(page,{preserve:original.state});await closePublishPanel(page,editor);
  const before=await readSnapshot(page);assertUnifiedSnapshot(base.article,before,await table(),prepared);await assertTypography(page,base.article);write(path.join(dir,'before.json'),{post,original,snapshot:before,table:await table()});
  step='edit-title-and-scope';
  for(const change of patch.replacements){if(change.after.length!==1)throw Error('One existing paragraph per revision required');await native.replaceParagraph(change.before.text,change.after[0].text);}

  if(post.title!==article.title)await replaceTitle(page,post.title,article.title);await centerTitle(page);await assertCenteredTitle(page);
  step='typography';
  const ready=await readSnapshot(page);assertUnifiedSnapshot(article,ready,await table(),prepared);await assertTypography(page,article);savePreparedPreview(article,prepared,out);
  await page.$eval('.se-documentTitle',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(dir,'ready-top.png')});await page.$$eval('.se-text-paragraph',(ps,t)=>ps.find(p=>p.textContent.replace(/\u200b/g,'').trim()===t)?.scrollIntoView({block:'center',behavior:'instant'}),article.operations.at(-1).text);await page.screenshot({path:path.join(dir,'ready-footer.png')});
  const token=crypto.randomBytes(16).toString('hex');write(path.join(out,article.logNo+'-native-ready.json'),{articleHash:article.articleHash,dir,token,saved:false,verified:true});console.log(JSON.stringify({stage:'title-revision-ready',logNo:article.logNo,dir,reviewRequired:review,modelCalls:0}));if(!apply)return;
  if(review){const until=Date.now()+600000;while(!fs.existsSync(path.join(dir,'screen-reviewed'))&&Date.now()<until)await wait(500);if(!fs.existsSync(path.join(dir,'screen-reviewed'))||fs.readFileSync(path.join(dir,'screen-reviewed'),'utf8')!==token)throw Error('Native screen review missing');}
  step='publish-options';await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:original.state});const settings=await preserveNativeTags(page,editor,original.state);if(!same(settings,original.state))throw Error('Publish settings changed before save: '+JSON.stringify({before:original.state,actual:settings}));
  step='save';await editor.click('button[class*=confirm_btn]');saved=true;await page.waitForFunction(id=>location.href.includes(id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},article.logNo);
  step='reopen';const reopened=await editor.openTarget({...post,title:article.title,body:undefined});await assertPublishOptions(page,{preserve:original.state});if(!sameSavedPublishSettings(reopened.state,original.state,article)||!sameReservation(reopened.reservation,editorialReservation(original.reservation,post.title,article.title)))throw Error('Saved settings or reservation differ');await closePublishPanel(page,editor);
  const after=await readSnapshot(page);assertUnifiedSnapshot(article,after,await table(),prepared);await assertTypography(page,article);
  step='public-verification';const publicResult=reopened.reservation?{status:'reserved-not-public'}:await verifyUnifiedPublic(browser,article,{anchorTargets:{},nativeImages:after.images,dir});
  const receipt={logNo:article.logNo,articleHash:article.articleHash,verified:true,saved:true,snapshot:after,table:await table(),settings:reopened.state,reservation:reopened.reservation,anchorTargets:{},publicResult,dir,modelCalls:0};
  const posts=read(registry),index=posts.findIndex(p=>String(p.logNo)===article.logNo);if(index<0||!same(posts[index],post))throw Error('Registry row changed during revision');posts[index]={...post,title:article.title,unified:{articleHash:article.articleHash,version:article.version,verifiedAt:new Date().toISOString(),reserved:!!reopened.reservation}};write(registry,posts);write(path.join(out,article.logNo+'-native-verified.json'),receipt);console.log(JSON.stringify({stage:'title-and-scope-saved-and-reopened',logNo:article.logNo,publicVerified:!reopened.reservation,modelCalls:0}));
 }catch(error){write(path.join(dir,'failure.json'),{saved,step,error:String(error)});await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});write(path.join(dir,'failure-snapshot.json'),await readSnapshot(page,{waitForImages:false}).catch(()=>null));console.error(JSON.stringify({saved,step,error:String(error),dir}));throw error;}
 finally{await page.close().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),file=args.find(a=>a.startsWith('--article='))?.slice(10);if(!file||args.some(a=>!a.startsWith('--article=')&&!['--apply','--review'].includes(a)))throw Error('--article=<JSON> [--apply] [--review]');await applyUnifiedTitleRevision(path.resolve(file),{apply:args.includes('--apply'),review:args.includes('--review')});}
