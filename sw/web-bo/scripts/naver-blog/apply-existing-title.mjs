import {sameReservation} from './lib/same-reservation.mjs';
// Restore a title without waiting for book-summary preparation. Never counts as body completion.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {ASSETS} from '../blog-assets.mjs';import {getBrowser} from './lib/browser.mjs';import {createExistingEditor} from './lib/existing-editor.mjs';
import {readSnapshot,closePublishPanel} from './repair-institution-images.mjs';
import {assertPublishOptions} from './lib/publish-options.mjs';import {preserveNativeTags} from './lib/preserve-native-tags.mjs';import {editorialReservation} from './apply-editorial-changes.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';import {unchangedEditorBody} from './lib/unchanged-editor-body.mjs';import {verifyPublishedTitle} from './lib/unified-public.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const options={};for(const arg of process.argv.slice(2)){if(arg==='--apply'){options.apply=true;continue;}const m=arg.match(/^--(plan|log-no|out|verify-dir)=(.+)$/);if(!m)throw Error('--plan= --log-no= --out= [--apply] [--verify-dir=]');options[m[1]]=m[2];}
if(!options.plan||!options.out||!path.isAbsolute(options.plan)||!path.isAbsolute(options.out)||!/^\d+$/.test(options['log-no']))throw Error('Exact title plan and output required');
const row=read(options.plan).rows.find(r=>r.logNo===options['log-no']),registry=path.join(ASSETS,'naver-blog/posts.json'),post=read(registry).find(p=>String(p.logNo)===row?.logNo);
if(!row||!post||post.kind!=='celeb')throw Error('Title plan identity missing');
if(post.title===row.after){console.log(JSON.stringify({stage:'title-already-restored',logNo:row.logNo,modelCalls:0}));process.exit(0);}
if(post.title!==row.before)throw Error('Title changed outside the reviewed plan');
const dir=path.join(options.out,row.logNo+'-native-'+Date.now());fs.mkdirSync(dir);const {browser,launched}=await getBrowser({background:true}),page=await browser.newPage();let saved=false,step='open';
page.on('dialog',d=>(d.type()==='beforeunload'?d.accept():d.dismiss()).catch(()=>{}));await page.setViewport({width:1440,height:1000});const focus=await page.createCDPSession();await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
const editor=createExistingEditor(page),selector='.se-component:not(.se-documentTitle) .se-text-paragraph';
try{
 if(options['verify-dir']){
  const priorDir=path.resolve(options['verify-dir']);if(!path.isAbsolute(options['verify-dir'])||path.dirname(priorDir)!==path.resolve(options.out)||!path.basename(priorDir).startsWith(row.logNo+'-native-')||read(path.join(priorDir,'failure.json')).saved!==true)throw Error('Exact saved transaction required');
  const prior=read(path.join(priorDir,'before.json'));if(!same(prior.post,post)||prior.afterTitle!==row.after)throw Error('Saved transaction identity differs');saved=true;step='recover-saved';
  const reopened=await editor.openTarget({...post,title:row.after,body:undefined});await assertPublishOptions(page,{preserve:prior.original.state});if(!same(reopened.state,prior.original.state)||!sameReservation(reopened.reservation,editorialReservation(prior.original.reservation,post.title,row.after)))throw Error('Saved title settings or reservation differ');await closePublishPanel(page,editor);
  const after=await readSnapshot(page,{waitForImages:false});if(after.title!==row.after||!same(unchangedEditorBody(prior.snapshot),unchangedEditorBody(after))||!same(prior.typography,await page.evaluate(readParagraphPresentation,selector)))throw Error('Saved title changed existing body');
  const publicResult=reopened.reservation?{status:'reserved-not-public'}:await verifyPublishedTitle(browser,{logNo:row.logNo,title:row.after},dir);
  const posts=read(registry),index=posts.findIndex(p=>String(p.logNo)===row.logNo);if(index<0||!same(posts[index],post))throw Error('Registry changed during title verification');posts[index]={...post,title:row.after};write(registry,posts);
  const folder=path.join(options.out,'title-only-verified');fs.mkdirSync(folder,{recursive:true});write(path.join(folder,row.logNo+'.json'),{logNo:row.logNo,title:row.after,saved:true,verified:true,bodyUnchanged:true,bodyHash:hash(unchangedEditorBody(after)),settings:reopened.state,reservation:reopened.reservation,publicResult,dir,recoveredFrom:priorDir,modelCalls:0});console.log(JSON.stringify({stage:'title-only-saved-verification-recovered',logNo:row.logNo,bodyUnchanged:true,modelCalls:0}));
 }else{
 const original=await editor.openTarget({...post,body:undefined});await assertPublishOptions(page,{preserve:original.state});await closePublishPanel(page,editor);const before=await readSnapshot(page,{waitForImages:false}),typography=await page.evaluate(readParagraphPresentation,selector);write(path.join(dir,'before.json'),{post,original,snapshot:before,typography,afterTitle:row.after});
 step='title';const titleSelector='.se-documentTitle .se-text-paragraph',titleAlign=()=>page.$eval(titleSelector,p=>getComputedStyle(p).textAlign),originalAlign=await titleAlign();
 const field=await page.$(titleSelector);await field.evaluate(p=>p.scrollIntoView({block:'center',behavior:'instant'}));await field.click();await field.dispose();await page.keyboard.down('Control');await page.keyboard.press('KeyA');await page.keyboard.up('Control');await page.keyboard.press('Backspace');
 if(await page.$eval(titleSelector,p=>{const copy=p.cloneNode(true);copy.querySelectorAll('.se-placeholder').forEach(n=>n.remove());return copy.textContent.replace(/\u200b/g,'').trim();}))throw Error('Title field did not clear');
 await page.keyboard.type(row.after);const ready=await readSnapshot(page,{waitForImages:false});if(ready.title!==row.after||await titleAlign()!==originalAlign||!same(unchangedEditorBody(before),unchangedEditorBody(ready))||!same(typography,await page.evaluate(readParagraphPresentation,selector)))throw Error('Title revision changed existing body');await page.screenshot({path:path.join(dir,'ready-title.png')});if(!options.apply)process.exitCode=0;
 else{
  step='publish-options';await editor.click('button[class*=publish_btn]');await assertPublishOptions(page,{preserve:original.state});if(!same(await preserveNativeTags(page,editor,original.state),original.state))throw Error('Publish settings changed before title save');
  step='save';await editor.click('button[class*=confirm_btn]');saved=true;await page.waitForFunction(id=>location.href.includes(id)&&location.href.includes('isAfterUpdateOnly=true'),{timeout:30000},row.logNo);
  step='reopen';const reopened=await editor.openTarget({...post,title:row.after,body:undefined});await assertPublishOptions(page,{preserve:original.state});if(!same(reopened.state,original.state)||!sameReservation(reopened.reservation,editorialReservation(original.reservation,post.title,row.after)))throw Error('Restored title settings or reservation differ');await closePublishPanel(page,editor);
  const after=await readSnapshot(page,{waitForImages:false});if(after.title!==row.after||!same(unchangedEditorBody(before),unchangedEditorBody(after))||!same(typography,await page.evaluate(readParagraphPresentation,selector)))throw Error('Saved title changed existing body');
  step='public-title';const publicResult=reopened.reservation?{status:'reserved-not-public'}:await verifyPublishedTitle(browser,{logNo:row.logNo,title:row.after},dir);
  const posts=read(registry),index=posts.findIndex(p=>String(p.logNo)===row.logNo);if(index<0||!same(posts[index],post))throw Error('Registry changed during title restoration');posts[index]={...post,title:row.after};write(registry,posts);
  const folder=path.join(options.out,'title-only-verified');fs.mkdirSync(folder,{recursive:true});write(path.join(folder,row.logNo+'.json'),{logNo:row.logNo,title:row.after,saved:true,verified:true,bodyUnchanged:true,bodyHash:hash(unchangedEditorBody(after)),settings:reopened.state,reservation:reopened.reservation,publicResult,dir,modelCalls:0});console.log(JSON.stringify({stage:'title-only-saved-and-reopened',logNo:row.logNo,bodyUnchanged:true,modelCalls:0}));
 }
 }
}catch(error){write(path.join(dir,'failure.json'),{saved,step,error:String(error)});await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error;}
finally{await page.close().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
